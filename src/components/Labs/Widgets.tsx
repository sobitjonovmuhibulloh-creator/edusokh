"use client";

/**
 * Fizik tajriba shaklida bo'lmagan interaktiv mashqlar:
 *  EquationBalancer — kimyoviy tenglamani tenglashtirish (atomlar sanog'i jonli)
 *  LogicGates       — mantiqiy elementlar va rostlik jadvali
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { L, type Lang } from "@/lib/i18n";
import type { Measure } from "@/lib/labs/types";
import { LAB_TEXT } from "@/lib/labs/ui-text";

const btn = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-lg font-bold dark:border-slate-600";

/* ───────────────────────── Kimyoviy tenglama ───────────────────────── */

interface Reaction {
  left: string[];
  right: string[];
  /** To'g'ri (eng kichik) koeffitsiyentlar — faqat test uchun, tekshiruv atomlar bo'yicha */
  solution: number[];
}

const REACTIONS: Reaction[] = [
  { left: ["H2", "O2"], right: ["H2O"], solution: [2, 1, 2] },
  { left: ["CH4", "O2"], right: ["CO2", "H2O"], solution: [1, 2, 1, 2] },
  { left: ["Fe", "O2"], right: ["Fe2O3"], solution: [4, 3, 2] },
  { left: ["Na", "Cl2"], right: ["NaCl"], solution: [2, 1, 2] },
  { left: ["Al", "O2"], right: ["Al2O3"], solution: [4, 3, 2] },
  { left: ["N2", "H2"], right: ["NH3"], solution: [1, 3, 2] },
  { left: ["C3H8", "O2"], right: ["CO2", "H2O"], solution: [1, 5, 3, 4] },
  { left: ["Zn", "HCl"], right: ["ZnCl2", "H2"], solution: [1, 2, 1, 1] },
];

const ATOM_COLOR: Record<string, string> = { H: "#e2e8f0", O: "#ef4444", C: "#334155", N: "#3b82f6", Fe: "#b45309", Na: "#a855f7", Cl: "#22c55e", Al: "#94a3b8", Zn: "#64748b" };
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const pretty = (f: string) => f.replace(/\d/g, (d) => SUB[Number(d)]);

function parse(formula: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) out[m[1]] = (out[m[1]] ?? 0) + (m[2] ? Number(m[2]) : 1);
  return out;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export function EquationBalancer({ lang, onMeasure }: { lang: Lang; onMeasure?: (m: Measure) => void }) {
  const T = (k: keyof typeof LAB_TEXT) => L(LAB_TEXT[k], lang);
  const [ri, setRi] = useState(0);
  const r = REACTIONS[ri];
  const species = useMemo(() => [...r.left, ...r.right], [r]);
  const [coef, setCoef] = useState<number[]>(() => species.map(() => 1));
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setCoef(REACTIONS[ri].left.concat(REACTIONS[ri].right).map(() => 1));
    setChecked(false);
  }, [ri]);

  const counts = useMemo(() => {
    const elements = Array.from(new Set(species.flatMap((f) => Object.keys(parse(f)))));
    return elements.map((el) => {
      const side = (list: string[], off: number) => list.reduce((s, f, i) => s + (coef[off + i] ?? 1) * (parse(f)[el] ?? 0), 0);
      return { el, left: side(r.left, 0), right: side(r.right, r.left.length) };
    });
  }, [coef, r, species]);
  const equal = counts.every((c) => c.left === c.right);
  const lowest = coef.reduce(gcd) === 1;
  const balanced = equal && lowest;

  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;
  useEffect(() => {
    onMeasureRef.current?.({ ...Object.fromEntries(counts.flatMap((c) => [[`${c.el}←`, c.left], [`${c.el}→`, c.right]])), ok: balanced ? 1 : 0 });
  }, [counts, balanced]);

  const set = (i: number, d: number) => {
    setChecked(false);
    setCoef((c) => c.map((v, j) => (j === i ? Math.max(1, Math.min(9, v + d)) : v)));
  };

  const term = (f: string, i: number) => (
    <div key={f + i} className="grid justify-items-center gap-1">
      <div className="flex items-center gap-1">
        <button className={btn} onClick={() => set(i, -1)} aria-label="−">
          −
        </button>
        <span className="min-w-[1.5ch] text-center font-mono text-2xl font-bold text-brand-600">{coef[i] ?? 1}</span>
        <button className={btn} onClick={() => set(i, 1)} aria-label="+">
          +
        </button>
      </div>
      <span className="font-mono text-2xl font-bold">{pretty(f)}</span>
      {/* Molekulalar: har koeffitsiyent uchun bitta guruh */}
      <div className="flex max-w-[11rem] flex-wrap justify-center gap-1.5" aria-hidden>
        {Array.from({ length: coef[i] ?? 1 }, (_, k) => (
          <span key={k} className="flex gap-0.5 rounded-full bg-slate-100 px-1 py-0.5 dark:bg-slate-700">
            {Object.entries(parse(f)).flatMap(([el, n]) =>
              Array.from({ length: n }, (_, z) => <span key={el + z} className="inline-block h-2.5 w-2.5 rounded-full border border-slate-400" style={{ background: ATOM_COLOR[el] ?? "#999" }} title={el} />),
            )}
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <label className="grid gap-1 text-sm sm:max-w-xs">
        <span className="font-semibold">{T("reaction")}</span>
        <select className="rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 dark:border-slate-600" value={ri} onChange={(e) => setRi(Number(e.target.value))}>
          {REACTIONS.map((x, i) => (
            <option key={i} value={i}>
              {x.left.map(pretty).join(" + ")} → {x.right.map(pretty).join(" + ")}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-start justify-center gap-3">
        {r.left.map((f, i) => (
          <div key={f} className="flex items-start gap-3">
            {i > 0 && <span className="pt-10 text-2xl font-bold">+</span>}
            {term(f, i)}
          </div>
        ))}
        <span className="pt-10 text-2xl font-bold">→</span>
        {r.right.map((f, i) => (
          <div key={f} className="flex items-start gap-3">
            {i > 0 && <span className="pt-10 text-2xl font-bold">+</span>}
            {term(f, r.left.length + i)}
          </div>
        ))}
      </div>
      <table className="mx-auto text-sm">
        <thead>
          <tr className="text-slate-500">
            <th className="px-3 text-left">{T("atoms")}</th>
            <th className="px-3">{T("left")}</th>
            <th className="px-3">{T("right")}</th>
          </tr>
        </thead>
        <tbody>
          {counts.map((c) => (
            <tr key={c.el} className={c.left === c.right ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}>
              <td className="px-3 font-mono font-bold">{c.el}</td>
              <td className="px-3 text-center font-mono">{c.left}</td>
              <td className="px-3 text-center font-mono">{c.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white" onClick={() => setChecked(true)}>
          {T("check")}
        </button>
        {checked && (
          <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${balanced ? "bg-emerald-600 text-white" : "bg-red-100 text-red-700"}`} role="status">
            {balanced ? `✓ ${T("balanced")}` : equal ? T("notLowest") : T("notBalanced")}
          </span>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Mantiqiy elementlar ───────────────────────── */

type Gate = "AND" | "OR" | "NOT" | "XOR" | "NAND" | "NOR";
const GATES: { id: Gate; uz: string; tg: string; ru: string; fn: (a: number, b: number) => number }[] = [
  { id: "AND", uz: "VA (AND)", tg: "ВА (AND)", ru: "И (AND)", fn: (a, b) => a & b },
  { id: "OR", uz: "YOKI (OR)", tg: "Ё (OR)", ru: "ИЛИ (OR)", fn: (a, b) => a | b },
  { id: "NOT", uz: "EMAS (NOT)", tg: "НЕ (NOT)", ru: "НЕ (NOT)", fn: (a) => 1 - a },
  { id: "XOR", uz: "XOR", tg: "XOR", ru: "Исключающее ИЛИ (XOR)", fn: (a, b) => a ^ b },
  { id: "NAND", uz: "VA-EMAS (NAND)", tg: "ВА-НЕ (NAND)", ru: "И-НЕ (NAND)", fn: (a, b) => 1 - (a & b) },
  { id: "NOR", uz: "YOKI-EMAS (NOR)", tg: "Ё-НЕ (NOR)", ru: "ИЛИ-НЕ (NOR)", fn: (a, b) => 1 - (a | b) },
];

export function LogicGates({ lang, onMeasure }: { lang: Lang; onMeasure?: (m: Measure) => void }) {
  const T = (k: keyof typeof LAB_TEXT) => L(LAB_TEXT[k], lang);
  const [gate, setGate] = useState<Gate>("AND");
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const g = GATES.find((x) => x.id === gate) ?? GATES[0];
  const unary = gate === "NOT";
  const y = g.fn(a, unary ? 0 : b);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;
  useEffect(() => onMeasureRef.current?.(unary ? { A: a, Y: y } : { A: a, B: b, Y: y }), [a, b, y, unary]);

  const sw = (label: string, v: number, set: (v: number) => void) => (
    <button
      onClick={() => set(1 - v)}
      aria-pressed={v === 1}
      className={`flex h-14 w-20 flex-col items-center justify-center rounded-xl border-2 font-mono font-bold ${v ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 dark:border-slate-600"}`}
    >
      <span className="text-xs">{label}</span>
      <span className="text-xl">{v}</span>
    </button>
  );

  const rows = unary ? [[0, 0], [1, 0]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap gap-2" role="group" aria-label={T("gate")}>
        {GATES.map((x) => (
          <button key={x.id} onClick={() => setGate(x.id)} aria-pressed={gate === x.id} className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${gate === x.id ? "border-cobalt-500 bg-cobalt-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
            {x[lang]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="grid gap-3">
          {sw("A", a, setA)}
          {!unary && sw("B", b, setB)}
        </div>
        <svg viewBox="0 0 160 100" className="h-28 w-44" aria-hidden>
          <line x1="0" y1={unary ? 50 : 30} x2="45" y2={unary ? 50 : 30} stroke={a ? "#059669" : "#94a3b8"} strokeWidth="4" />
          {!unary && <line x1="0" y1="70" x2="45" y2="70" stroke={b ? "#059669" : "#94a3b8"} strokeWidth="4" />}
          <rect x="45" y="15" width="70" height="70" rx="12" fill="#1f4fa3" />
          <text x="80" y="57" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="monospace">
            {gate}
          </text>
          <line x1="115" y1="50" x2="160" y2="50" stroke={y ? "#059669" : "#94a3b8"} strokeWidth="4" />
        </svg>
        <div className="grid justify-items-center gap-1">
          <span className={`grid h-16 w-16 place-items-center rounded-full border-4 font-mono text-2xl font-bold ${y ? "border-yellow-400 bg-yellow-300 text-slate-900 shadow-[0_0_30px_#facc15]" : "border-slate-300 text-slate-400 dark:border-slate-600"}`}>{y}</span>
          <span className="text-xs text-slate-500">{T("output")} Y</span>
        </div>
      </div>
      <div className="grid justify-items-center gap-1">
        <b className="text-sm">{T("truthTable")}</b>
        <table className="font-mono text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="px-3">A</th>
              {!unary && <th className="px-3">B</th>}
              <th className="px-3">Y</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([ra, rb]) => {
              const active = ra === a && (unary || rb === b);
              return (
                <tr key={`${ra}${rb}`} className={active ? "bg-saffron-100 font-bold text-slate-900" : ""}>
                  <td className="px-3 text-center">{ra}</td>
                  {!unary && <td className="px-3 text-center">{rb}</td>}
                  <td className="px-3 text-center">{g.fn(ra, rb)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
