/**
 * Anti-cheat dvigateli: har bir o'quvchi uchun savollar tartibi va A/B/C/D variantlari
 * Fisher–Yates algoritmi bilan alohida aralashtiriladi.
 *
 * Aralashtirish urug'dan (seed) deterministik: urug' bazada saqlanadi, shuning uchun
 * o'quvchi sahifani yangilasa ham variant o'zgarmaydi va natijani qayta tekshirish mumkin.
 * Server ham, brauzer (simulyator) ham shu bitta faylni ishlatadi.
 */

export interface TestOption {
  id: string;
  text: string;
}

export interface TestQuestion {
  id: string;
  text: string;
  options: TestOption[];
  correctOptionId: string;
  explanation?: string;
}

/** O'quvchiga yuboriladigan savol: to'g'ri javob olib tashlangan */
export interface StudentQuestion {
  id: string;
  text: string;
  options: TestOption[];
}

export interface AttemptLayout {
  seed: string;
  questionOrder: string[];
  optionOrders: Record<string, string[]>;
}

/* ───── Urug'li tasodifiy sonlar generatori ───── */

/** Satrdan 32-bitli xesh (xmur3) */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** [0, 1) oralig'ida son qaytaruvchi tezkor PRNG (mulberry32) */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rngFromSeed = (seed: string): (() => number) => mulberry32(xmur3(seed)());

/** Kriptografik tasodifiy urug' (Node 19+ va brauzerda globalThis.crypto mavjud) */
export function newSeed(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ───── Fisher–Yates ───── */

export function fisherYates<T>(arr: readonly T[], rand: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Asl tartibdan albatta farq qiladigan aralashtirish (2+ element bo'lsa) */
export function shuffleDifferent<T>(arr: readonly T[], rand: () => number): T[] {
  if (arr.length < 2) return arr.slice();
  for (let tries = 0; tries < 8; tries++) {
    const s = fisherYates(arr, rand);
    if (s.some((v, i) => v !== arr[i])) return s;
  }
  return arr.slice(1).concat(arr[0]);
}

/* ───── Variant yaratish ───── */

export function buildLayout(
  seed: string,
  questions: readonly TestQuestion[],
  opts: { shuffleQuestions?: boolean; shuffleOptions?: boolean } = {},
): AttemptLayout {
  const { shuffleQuestions = true, shuffleOptions = true } = opts;
  const rand = rngFromSeed(seed);
  const ids = questions.map((q) => q.id);
  const questionOrder = shuffleQuestions ? shuffleDifferent(ids, rand) : ids;
  const optionOrders: Record<string, string[]> = {};
  for (const q of questions) {
    const optIds = q.options.map((o) => o.id);
    optionOrders[q.id] = shuffleOptions ? shuffleDifferent(optIds, rand) : optIds;
  }
  return { seed, questionOrder, optionOrders };
}

export const layoutSignature = (l: AttemptLayout): string =>
  l.questionOrder.join(",") + "#" + l.questionOrder.map((id) => l.optionOrders[id].join(".")).join("|");

/**
 * Sinfdagi har bir o'quvchiga variant beradi. Kombinatsiyalar yetarli bo'lsa,
 * ikki o'quvchiga bir xil variant tushmasligiga harakat qiladi (20 urinishgacha).
 */
export function distributeVariants<S extends { id: string }>(
  students: readonly S[],
  questions: readonly TestQuestion[],
  opts: { shuffleQuestions?: boolean; shuffleOptions?: boolean } = {},
): Map<string, AttemptLayout> {
  const seen = new Set<string>();
  const out = new Map<string, AttemptLayout>();
  for (const s of students) {
    let layout = buildLayout(newSeed(), questions, opts);
    for (let tries = 1; seen.has(layoutSignature(layout)) && tries < 20; tries++) {
      layout = buildLayout(newSeed(), questions, opts);
    }
    seen.add(layoutSignature(layout));
    out.set(s.id, layout);
  }
  return out;
}

/** O'quvchi ko'radigan savollar: aralashtirilgan tartibda, to'g'ri javobsiz */
export function studentView(questions: readonly TestQuestion[], layout: AttemptLayout): StudentQuestion[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return layout.questionOrder.flatMap((qid) => {
    const q = byId.get(qid);
    if (!q) return [];
    const optById = new Map(q.options.map((o) => [o.id, o]));
    const options = (layout.optionOrders[qid] ?? q.options.map((o) => o.id))
      .map((oid) => optById.get(oid))
      .filter((o): o is TestOption => Boolean(o));
    return [{ id: q.id, text: q.text, options }];
  });
}

/** Javoblar savol/variant ID'lari bo'yicha saqlanadi, shuning uchun aralashtirish baholashga ta'sir qilmaydi */
export function gradeAnswers(
  questions: readonly TestQuestion[],
  answers: Record<string, string | undefined>,
): { score: number; max: number } {
  let score = 0;
  for (const q of questions) if (answers[q.id] === q.correctOptionId) score++;
  return { score, max: questions.length };
}

/** O'qituvchi uchun kalit: shu o'quvchi variantidagi to'g'ri javob harflari, masalan "CADBB" */
export function answerKeyLetters(questions: readonly TestQuestion[], layout: AttemptLayout): string {
  const byId = new Map(questions.map((q) => [q.id, q]));
  return layout.questionOrder
    .map((qid) => {
      const q = byId.get(qid);
      const idx = q ? (layout.optionOrders[qid] ?? []).indexOf(q.correctOptionId) : -1;
      return idx >= 0 ? "ABCDEFGH"[idx] : "?";
    })
    .join("");
}

/** 5 ballik baho (O'zbekiston maktablarida keng qo'llanadigan chegaralar) */
export function markFromPercent(pct: number): 2 | 3 | 4 | 5 {
  if (pct >= 86) return 5;
  if (pct >= 71) return 4;
  if (pct >= 56) return 3;
  return 2;
}

/** Sinf PIN-kodi: SOX-9B-2026-K7Q. Oxirgi qism tasodifiy, taxmin qilib bo'lmaydi. */
export function makeClassPin(className: string, year = new Date().getFullYear()): string {
  const cls = className.replace(/[^0-9A-Za-zА-Яа-яЁё]/g, "").toUpperCase();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O va 1/I chalkashmasligi uchun
  const bytes = new Uint8Array(3);
  globalThis.crypto.getRandomValues(bytes);
  const tail = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `SOX-${cls}-${year}-${tail}`;
}
