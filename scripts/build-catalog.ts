/**
 * Darsliklar katalogini yig'adi: Sinf → Fan → Darslik → Bob → Mavzu → Materiallar.
 *   npm run catalog:build
 *
 * Kirish:
 *   public/books/index.json        — darsliklar ro'yxati (rasmiy portal havolalari)
 *   scripts/toc/_books-meta.json   — portal javoblari: yuklangan sana, hajm, 404
 *   scripts/toc/<kitobId>.json     — PDF'dan qo'lda o'qilgan mundarija (yo'q bo'lsa — "ma'lumot kerak")
 *   scripts/toc/lab-links.json     — mavzu → 3D laboratoriya (qo'lda tekshirilgan moslik)
 *   public/lessons/*.json          — darslar (nazariya, slayd matni, savollar); nomi aynan mos kelgandagina bog'lanadi
 *   data/slides/index.json         — slaydlar kutubxonasi (topicId bo'yicha)
 *   data/topic-videos.json         — o'qituvchi qo'shgan videolar
 * Chiqish:
 *   public/catalog/index.json      — barcha darsliklar (qisqa)
 *   public/catalog/books/<id>.json — bob va mavzular, materiallar va holat belgilari
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SubjectCode } from "../src/lib/curriculum";
import type { BookLang, CatalogChapter, CatalogTopic, TextbookDetail, TextbookSummary, TocFile, TopicMaterials } from "../src/lib/catalog/types";
import type { LessonsIndexItem, SubjectLessons, TopicVideo } from "../src/lib/lesson-content";
import type { SlideDeckFile } from "../src/lib/slide-library";

const readJson = async <T>(file: string, fallback: T): Promise<T> => (existsSync(file) ? (JSON.parse(await readFile(file, "utf8")) as T) : fallback);
const bookId = (url: string) => path.basename(new URL(url).pathname).replace(/\.pdf$/i, "");
/** Nomlarni solishtirish uchun: "§17. Om qonuni" va "Om qonuni" bir xil hisoblanadi */
const norm = (s: string) => s.replace(/^§\s*\d+\.?\s*/, "").replace(/[ʻʼ'`‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

interface BookRow {
  grade: number;
  lang: BookLang;
  subject: SubjectCode;
  title: string;
  sourceUrl: string;
}

async function main() {
  const books = await readJson<BookRow[]>("public/books/index.json", []);
  const meta = await readJson<Record<string, { status: number | string; uploadedAt: string | null; bytes: number | null }>>("scripts/toc/_books-meta.json", {});
  const labLinks = await readJson<Record<string, string[]>>("scripts/toc/lab-links.json", {});
  const lessonsIndex = await readJson<LessonsIndexItem[]>("public/lessons/index.json", []);
  const lessons = await Promise.all(lessonsIndex.map(async (i) => ({ item: i, data: await readJson<SubjectLessons | null>(path.join("public/lessons", i.file), null) })));
  const decks = await readJson<SlideDeckFile[]>("data/slides/index.json", []);
  const teacherVideos = await readJson<Record<string, TopicVideo>>("data/topic-videos.json", {});

  // 1) Darsliklar: bir xil fayl bir nechta sinfga tegishli bo'lishi mumkin
  const byId = new Map<string, BookRow & { grades: number[] }>();
  for (const b of books) {
    const id = bookId(b.sourceUrl);
    const prev = byId.get(id);
    if (prev) prev.grades = Array.from(new Set([...prev.grades, b.grade])).sort((x, y) => x - y);
    else byId.set(id, { ...b, grades: [b.grade] });
  }

  await rm("public/catalog", { recursive: true, force: true });
  await mkdir("public/catalog/books", { recursive: true });

  const summaries: TextbookSummary[] = [];
  const stats = { books: 0, verified: 0, missing: 0, topics: 0, linked: { lesson: 0, slides: 0, video: 0, lab: 0 }, unmatchedLessons: [] as string[] };

  for (const [id, b] of byId) {
    const m = meta[id];
    const toc = await readJson<TocFile | null>(`scripts/toc/${id}.json`, null);
    const missing = m && m.status !== 200;

    // Shu darslikka mos dars fayli: sinf, fan va til bir xil bo'lsa
    const lesson = lessons.find((l) => l.data && b.grades.includes(l.item.grade) && l.item.subject === b.subject && (b.lang === "uz" || b.lang === "tg") && l.item.langs.includes(b.lang));

    let n = 0;
    const chapters: CatalogChapter[] = (toc?.chapters ?? []).map((ch) => ({
      title: ch.title,
      topics: ch.topics.map((tp): CatalogTopic => {
        n += 1;
        const topicId = `${id}:${n}`;
        const materials: TopicMaterials = {};
        let theory = false;
        let test = false;
        let lessonSlides = false;

        // Dars: raqami VA nomi mos kelsagina bog'laymiz (noto'g'ri biriktirmaslik uchun)
        const entry = lesson?.data?.topics.find((e) => e.n === n);
        const tl = entry && (b.lang === "uz" || b.lang === "tg") ? entry[b.lang] : undefined;
        if (lesson && entry && tl && norm(tl.title) === norm(tp.title)) {
          materials.lesson = { file: lesson.item.file, n };
          theory = tl.slides.length > 1 || Boolean(tl.goal);
          test = tl.questions.length > 0;
          lessonSlides = tl.slides.length > 1;
          if (entry.labKey) materials.labs = [`model:${entry.labKey}`];
          const tv = teacherVideos[`${lesson.item.grade}-${lesson.item.subject}-${n}-${b.lang}`];
          const v = tv ?? tl.video;
          if (v) materials.video = v;
          stats.linked.lesson++;
        } else if (lesson && entry) {
          stats.unmatchedLessons.push(`${topicId}: "${tp.title}" ≠ "${tl?.title ?? "—"}"`);
        }

        const ownDecks = decks.filter((d) => d.topicId === topicId).map((d) => d.id);
        if (ownDecks.length) materials.slideDecks = ownDecks;
        const labs = [...(materials.labs ?? []), ...(labLinks[topicId] ?? [])];
        if (labs.length) materials.labs = Array.from(new Set(labs));

        if (ownDecks.length) stats.linked.slides++;
        if (materials.video) stats.linked.video++;
        if (materials.labs) stats.linked.lab++;
        return {
          id: topicId,
          n,
          title: tp.title,
          page: tp.page,
          materials,
          flags: { listed: true, sourceVerified: true, theory, slides: lessonSlides || ownDecks.length > 0, video: Boolean(materials.video), lab: Boolean(materials.labs?.length), test },
        };
      }),
    }));

    const summary: TextbookSummary = {
      id,
      grades: b.grades,
      subject: b.subject,
      lang: b.lang,
      title: b.title,
      sourceUrl: b.sourceUrl,
      sourceName: "Xalq ta'limi vazirligi axborot-ta'lim portali (old.eduportal.uz)",
      uploadedAt: m?.uploadedAt ?? null,
      bytes: m?.bytes ?? null,
      year: toc?.year ?? null,
      publisher: toc?.publisher ?? null,
      imprint: toc?.imprint ?? null,
      toc: missing ? "missing" : toc ? "verified" : "needed",
      chapterCount: chapters.length,
      topicCount: n,
    };
    const detail: TextbookDetail = { ...summary, pageOffset: toc?.pageOffset ?? null, pagesPerPdfPage: toc?.pagesPerPdfPage ?? 1, tocSource: toc?.source ?? null, chapters };
    await writeFile(`public/catalog/books/${id}.json`, JSON.stringify(detail));
    summaries.push(summary);
    stats.books++;
    if (summary.toc === "verified") stats.verified++;
    if (summary.toc === "missing") stats.missing++;
    stats.topics += n;
  }

  // scripts/toc da bor, lekin darsliklar ro'yxatida yo'q fayllar — xato yozilgan ID
  const orphan = (await readdir("scripts/toc")).filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "lab-links.json" && !byId.has(f.replace(/\.json$/, "")));
  for (const key of Object.keys(labLinks)) if (!key.startsWith("_") && !byId.has(key.split(":")[0])) orphan.push(`lab-links: ${key}`);

  summaries.sort((a, b) => a.grades[0] - b.grades[0] || a.subject.localeCompare(b.subject) || a.lang.localeCompare(b.lang) || a.title.localeCompare(b.title));
  await writeFile("public/catalog/index.json", JSON.stringify({ generatedAt: new Date().toISOString(), books: summaries }));

  // Hisobot jadvali (Excel'da ochiladi): har bir darslik holati
  const STATUS = { verified: "mundarija tekshirilgan", needed: "ma'lumot kerak", missing: "manbada yo'q (404)" };
  const esc = (v: unknown) => (/[",\n]/.test(String(v ?? "")) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));
  const rows = [
    ["id", "sinf", "fan", "til", "nomi", "nashr_yili", "nashriyot", "portalga_yuklangan", "holat", "boblar", "mavzular", "manba"],
    ...summaries.map((s) => [s.id, s.grades.join("–"), s.subject, s.lang, s.title, s.year ?? "", s.publisher ?? "", s.uploadedAt ?? "", STATUS[s.toc], s.chapterCount, s.topicCount, s.sourceUrl]),
  ];
  await writeFile("docs/darsliklar-holati.csv", "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n") + "\n");

  console.log(`✓ ${stats.books} ta darslik: mundarija tekshirilgan ${stats.verified}, ma'lumot kerak ${stats.books - stats.verified - stats.missing}, manbada yo'q ${stats.missing}`);
  console.log(`  mavzular: ${stats.topics}; bog'langan: dars ${stats.linked.lesson}, slayd ${stats.linked.slides}, video ${stats.linked.video}, laboratoriya ${stats.linked.lab}`);
  if (stats.unmatchedLessons.length) console.warn(`  ⚠ nomi mos kelmagani uchun bog'lanmagan darslar (${stats.unmatchedLessons.length}):\n    ${stats.unmatchedLessons.slice(0, 10).join("\n    ")}`);
  if (orphan.length) console.warn(`  ⚠ ro'yxatda yo'q kitob ID'lari: ${orphan.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
