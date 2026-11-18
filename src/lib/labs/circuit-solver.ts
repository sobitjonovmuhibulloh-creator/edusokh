/**
 * Elektr zanjirini hisoblash (tugun potensiallari usuli). Ekranga bog'liq emas — 3D va 2D
 * ko'rinishlar, testlar bir xil funksiyadan foydalanadi.
 *
 * Har bir element ikki qisqichli (a, b). Simlar qisqichlarni tugunlarga birlashtiradi.
 * Tok manbai — EYuK E va ichki qarshilik r (Norton ekvivalenti: 1/r o'tkazuvchanlik + E/r tok manbai),
 * shuning uchun tenglamalar sistemasi faqat o'tkazuvchanliklardan iborat: G·φ = J.
 */

export type PartKind = "battery" | "bulb" | "resistor" | "switch" | "ammeter" | "voltmeter";

export interface Part {
  id: string;
  kind: PartKind;
  /** Taxtadagi joyi (sm emas, shartli birlik) va burilishi (0, 90, 180, 270) */
  x: number;
  y: number;
  rot: number;
  /** battery: EYuK (V); bulb/resistor: qarshilik (Ω); switch: 1 — yopiq, 0 — ochiq */
  value: number;
}

/** Sim: ikki qisqich. Qisqich nomi — "<partId>:a" yoki "<partId>:b" */
export interface Wire {
  id: string;
  from: string;
  to: string;
}

export interface PartResult {
  /** a → b yo'nalishidagi tok (A). Tok manbai uchun — "+" qisqichdan chiqayotgan tok */
  current: number;
  /** φa − φb (V) */
  voltage: number;
  power: number;
  /** Faqat asboblar uchun: ko'rsatkich (A yoki V) */
  reading?: number;
  /** Lampochka yonyaptimi */
  lit?: boolean;
}

export interface CircuitResult {
  parts: Record<string, PartResult>;
  /** Qisqa tutashuv: tok manbaidan juda katta tok o'tmoqda */
  shortCircuit: boolean;
  /** Hech bo'lmasa bitta yopiq kontur bor va tok o'tmoqda */
  flowing: boolean;
}

export const INTERNAL_R = 0.5; // tok manbaining ichki qarshiligi, Ω
const SWITCH_ON_R = 1e-3;
const AMMETER_R = 1e-3;
const VOLTMETER_R = 1e7;
const LEAK_G = 1e-9; // osilib qolgan tugunlar uchun (matritsa maxsus bo'lmasligi uchun)
/** Lampochka shu quvvatdan (W) yuqorida yonadi deb hisoblanadi */
export const BULB_MIN_POWER = 0.05;

export const terminal = (partId: string, t: "a" | "b") => `${partId}:${t}`;

/** Element qarshiligi (Ω); Infinity — tok o'tmaydi */
function resistanceOf(p: Part): number {
  switch (p.kind) {
    case "battery": return INTERNAL_R;
    case "bulb":
    case "resistor": return Math.max(p.value, 1e-3);
    case "switch": return p.value ? SWITCH_ON_R : Infinity;
    case "ammeter": return AMMETER_R;
    case "voltmeter": return VOLTMETER_R;
  }
}

/** Gauss usuli (qisman tanlash bilan). A o'zgaradi. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    [b[c], b[piv]] = [b[piv], b[c]];
    const d = A[c][c] || 1e-30;
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / d;
      if (!f) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / (A[r][r] || 1e-30);
  }
  return x;
}

export function solveCircuit(parts: Part[], wires: Wire[]): CircuitResult {
  // 1) Qisqichlarni simlar bo'yicha tugunlarga birlashtiramiz (union–find)
  const parent = new Map<string, string>();
  const find = (t: string): string => {
    let r = t;
    while (parent.get(r) !== r) r = parent.get(r) ?? r;
    parent.set(t, r);
    return r;
  };
  for (const p of parts) for (const t of ["a", "b"] as const) parent.set(terminal(p.id, t), terminal(p.id, t));
  for (const w of wires) {
    if (!parent.has(w.from) || !parent.has(w.to)) continue;
    parent.set(find(w.from), find(w.to));
  }
  const nodeIndex = new Map<string, number>();
  for (const t of parent.keys()) {
    const r = find(t);
    if (!nodeIndex.has(r)) nodeIndex.set(r, nodeIndex.size);
  }
  const node = (partId: string, t: "a" | "b") => nodeIndex.get(find(terminal(partId, t))) as number;

  // 2) G·φ = J
  const n = nodeIndex.size;
  const G = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? LEAK_G : 0)));
  const J = new Array<number>(n).fill(0);
  for (const p of parts) {
    const R = resistanceOf(p);
    if (!Number.isFinite(R)) continue;
    const a = node(p.id, "a");
    const b = node(p.id, "b");
    if (a === b) continue;
    const g = 1 / R;
    G[a][a] += g;
    G[b][b] += g;
    G[a][b] -= g;
    G[b][a] -= g;
    if (p.kind === "battery") {
      J[a] += p.value / R; // "+" qisqich — a
      J[b] -= p.value / R;
    }
  }
  const phi = n ? solveLinear(G, J) : [];

  // 3) Har bir element uchun tok, kuchlanish, quvvat
  const out: Record<string, PartResult> = {};
  let shortCircuit = false;
  let flowing = false;
  for (const p of parts) {
    const a = node(p.id, "a");
    const b = node(p.id, "b");
    const u = (phi[a] ?? 0) - (phi[b] ?? 0);
    const R = resistanceOf(p);
    let i = Number.isFinite(R) && a !== b ? u / R : 0;
    if (p.kind === "battery") {
      // Manbadan chiqayotgan tok: (E − U_qisqich) / r. Qisqichlari bir tugunda bo'lsa — to'g'ridan-to'g'ri qisqa tutashuv
      i = a === b ? p.value / R : (p.value - u) / R;
      if (Math.abs(i) > 0.8 * (p.value / R)) shortCircuit = shortCircuit || p.value > 0;
      if (Math.abs(i) > 1e-4) flowing = true;
    }
    const r: PartResult = { current: i, voltage: u, power: Math.abs(p.kind === "battery" ? p.value * i : u * i) };
    if (p.kind === "ammeter") r.reading = i;
    if (p.kind === "voltmeter") r.reading = u;
    if (p.kind === "bulb") r.lit = r.power >= BULB_MIN_POWER;
    out[p.id] = r;
  }
  return { parts: out, shortCircuit, flowing };
}
