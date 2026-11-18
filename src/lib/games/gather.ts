/**
 * Mavzu uchun o'yin ma'lumotlarini yig'adi (brauzerda):
 *   1) dars testi (public/lessons, katalogda bog'langan bo'lsa),
 *   2) mavzuga bog'langan to'liq laboratoriya testi (src/lib/labs/content.ts),
 *   3) EduSokh to'plamlari (sets.ts) va o'qituvchi to'plami (/api/games/sets).
 * Savollar materialning asl tilida qoladi.
 */
import type { CatalogTopic, TextbookDetail } from "../catalog/types";
import type { SubjectLessons } from "../lesson-content";
import { CATALOG } from "../labs/catalog";
import { LAB_CONTENT } from "../labs/content";
import { AUTHORED_SETS } from "./sets";
import type { GameGroup, GamePair, GameQuestion, GameSet } from "./types";

export interface GameData {
  questions: GameQuestion[];
  pairs: GamePair[];
  groups: GameGroup[];
  sources: { name: string; count: number }[];
}

export async function gatherGameData(book: TextbookDetail, topic: CatalogTopic): Promise<GameData> {
  const lang = book.lang === "tg" ? "tg" : "uz";
  const questions: GameQuestion[] = [];
  const sources: GameData["sources"] = [];

  if (topic.materials.lesson && (book.lang === "uz" || book.lang === "tg")) {
    try {
      const d = (await (await fetch(`/lessons/${topic.materials.lesson.file}`)).json()) as SubjectLessons;
      const tl = d.topics.find((t) => t.n === topic.materials.lesson?.n)?.[book.lang];
      const qs = (tl?.questions ?? []).map((q) => ({ q: q.q, options: q.options, answer: q.answer, src: "Dars testi" }));
      questions.push(...qs);
      if (qs.length) sources.push({ name: "Dars testi", count: qs.length });
    } catch {
      /* dars fayli o'qilmadi — boshqa manbalar bilan davom etamiz */
    }
  }

  for (const id of topic.materials.labs ?? []) {
    const lab = CATALOG.find((c) => c.id === id);
    const content = lab?.content ? LAB_CONTENT[lab.content] : undefined;
    if (!content) continue;
    const qs = content.quiz.map((q) => ({ q: q.q[lang], options: q.options.map((o) => o[lang]), answer: q.answer, src: "Laboratoriya" }));
    questions.push(...qs);
    sources.push({ name: "Laboratoriya testi", count: qs.length });
  }

  const authored = AUTHORED_SETS[topic.id];
  let teacher: GameSet = { topicId: topic.id };
  try {
    teacher = (await (await fetch(`/api/games/sets?topicId=${encodeURIComponent(topic.id)}`, { cache: "no-store" })).json()) as GameSet;
  } catch {
    /* server bo'lmasa — o'qituvchi to'plamisiz */
  }
  if (teacher.questions?.length) {
    questions.push(...teacher.questions);
    sources.push({ name: "O'qituvchi savollari", count: teacher.questions.length });
  }

  // Bir xil savollarni takrorlamaymiz
  const seen = new Set<string>();
  const uniq = questions.filter((q) => (seen.has(q.q) ? false : (seen.add(q.q), true)));
  const pairs = [...(teacher.pairs ?? []), ...(authored?.pairs ?? [])];
  const groups = teacher.groups?.length ? teacher.groups : (authored?.groups ?? []);
  if (authored?.pairs?.length || authored?.groups?.length) sources.push({ name: "EduSokh to'plami", count: (authored.pairs?.length ?? 0) + (authored.groups?.length ?? 0) });
  return { questions: uniq, pairs, groups, sources };
}

/** Juftliklar bo'lmasa — savol va to'g'ri javobdan (qisqa bo'lsa) */
export function pairsOrDerived(d: GameData): GamePair[] {
  if (d.pairs.length) return d.pairs;
  return d.questions.filter((q) => q.q.length < 90).map((q) => ({ a: q.q, b: q.options[q.answer] }));
}

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}
