/**
 * Qo'lda yozilgan dars mazmunini (scripts/content/*) public/lessons/*.json ga yozadi.
 *   npm run lessons:manual
 * AI kaliti talab qilinmaydi. Mavjud YouTube video keshlari (.cache/lessons/<sinf>-<fan>/video-*.json) saqlanib qoladi;
 * .env da YOUTUBE_API_KEY bo'lsa, videosi yo'q mavzularga video qidiriladi (kunlik kvota tugasa, ertaga qayta ishga tushiring).
 */
import axios from "axios";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SubjectCode } from "../src/lib/curriculum";
import { SUBJECTS } from "../src/lib/curriculum";
import type { ContentLang, LessonsIndexItem, SubjectLessons, TopicEntry, TopicLang } from "../src/lib/lesson-content";
import { findVideo } from "../src/lib/youtube";
import { TOPICS_A } from "./content/fizika-8-a";
import { TOPICS_B } from "./content/fizika-8-b";
import type { ManualSubject, Q } from "./content/types";

const SUBJECTS_DATA: ManualSubject[] = [
  {
    grade: 8,
    subject: "fizika",
    offset: 0,
    endPage: 166,
    chapters: [
      { uz: "I bob. Elektr zaryad. Elektr maydon", tg: "Боби I. Заряди электрикӣ. Майдони электрикӣ" },
      { uz: "II bob. Elektr toki", tg: "Боби II. Ҷараёни электрикӣ" },
      { uz: "III bob. Elektr tokining ishi va quvvati", tg: "Боби III. Кор ва тавоноии ҷараёни электрикӣ" },
      { uz: "IV bob. Turli muhitlarda elektr toki", tg: "Боби IV. Ҷараёни электрикӣ дар муҳитҳои гуногун" },
      { uz: "V bob. Magnit maydon", tg: "Боби V. Майдони магнитӣ" },
    ],
    topics: [...TOPICS_A, ...TOPICS_B],
  },
];

if (existsSync(".env")) (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile?.call(process, ".env");
const youtubeKey = process.env.YOUTUBE_API_KEY;
let youtubeQuotaLeft = true;

async function videoFor(file: string, query: string, lang: ContentLang): Promise<TopicLang["video"]> {
  if (existsSync(file)) return JSON.parse(await readFile(file, "utf8")) as TopicLang["video"];
  if (!youtubeKey || !youtubeQuotaLeft) return null;
  try {
    const v = await findVideo(query, lang, youtubeKey);
    await writeFile(file, JSON.stringify(v));
    return v;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 403) {
      youtubeQuotaLeft = false;
      console.warn("YouTube kunlik kvotasi tugadi — qolgan videolar ertaga (skriptni qayta ishga tushiring).");
    } else console.error(`✗ video: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

const LANGS: ContentLang[] = ["uz", "tg"];
const MAX_PAGES = 6;

/** To'g'ri javobni har savolda boshqa o'ringa qo'yamiz (deterministik, har safar bir xil) */
function placeOptions(q: Q, seed: number) {
  const [text, correct, ...wrong] = q;
  const pos = seed % 4;
  const options = [...wrong];
  options.splice(pos, 0, correct);
  return { q: text, options, answer: pos };
}

async function main() {
  const books = JSON.parse(await readFile("public/books/index.json", "utf8")) as { grade: number; subject: string | null; lang: string; storageUrl: string }[];
  const indexFile = "public/lessons/index.json";
  let index = existsSync(indexFile) ? (JSON.parse(await readFile(indexFile, "utf8")) as LessonsIndexItem[]) : [];
  await mkdir("public/lessons", { recursive: true });

  for (const sub of SUBJECTS_DATA) {
    const topics = [...sub.topics].sort((a, b) => a.n - b.n);
    const cacheDir = path.resolve(".cache", "lessons", `${sub.grade}-${sub.subject}`);
    await mkdir(cacheDir, { recursive: true });
    const entries: TopicEntry[] = [];
    for (const [i, t] of topics.entries()) {
      const next = topics[i + 1]?.p ?? sub.endPage;
      const start = t.p - sub.offset;
      const end = Math.max(start, Math.min(next - 1 - sub.offset, start + MAX_PAGES - 1));
      const entry: TopicEntry = {
        n: t.n,
        chapter: sub.chapters[t.c].uz,
        chapterI18n: { uz: sub.chapters[t.c].uz, tg: sub.chapters[t.c].tg },
        labKey: t.lab ?? null,
      };
      for (const lang of LANGS) {
        const c = t[lang];
        const book = books.find((b) => b.grade === sub.grade && b.subject === sub.subject && b.lang === lang);
        const videoFile = path.join(cacheDir, `video-${lang}-${t.n}.json`);
        const lesson: TopicLang = {
          title: c.t,
          goal: c.g,
          keyConcepts: c.k,
          slides: [{ title: c.t, bullets: [c.g] }, ...c.s.map(([title, ...bullets]) => ({ title, bullets }))],
          questions: c.q.map((q, qi) => placeOptions(q, t.n * 3 + qi)),
          homework: c.h,
          pdfPages: [start, end],
          printedPage: t.p,
          textbookUrl: book?.storageUrl ?? "",
          video: await videoFor(videoFile, `${sub.grade}-${lang === "tg" ? "синф" : "sinf"} ${SUBJECTS[sub.subject as SubjectCode][lang].toLowerCase()} ${c.t}`, lang),
        };
        entry[lang] = lesson;
      }
      entries.push(entry);
    }

    const out: SubjectLessons = { grade: sub.grade, subject: sub.subject as SubjectCode, model: "manual", generatedAt: new Date().toISOString(), topics: entries };
    const fileName = `${sub.grade}-${sub.subject}.json`;
    await writeFile(path.join("public/lessons", fileName), JSON.stringify(out, null, 2));
    const item: LessonsIndexItem = { grade: sub.grade, subject: sub.subject as SubjectCode, file: fileName, topics: entries.length, langs: LANGS };
    index = [...index.filter((x) => x.file !== fileName), item];
    console.log(`✓ public/lessons/${fileName}: ${entries.length} ta mavzu, ${entries.reduce((a, e) => a + (e.uz?.slides.length ?? 0) + (e.tg?.slides.length ?? 0), 0)} ta slayd`);
  }
  index.sort((a, b) => a.grade - b.grade || a.subject.localeCompare(b.subject));
  await writeFile(indexFile, JSON.stringify(index, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
