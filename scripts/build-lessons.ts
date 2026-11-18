/**
 * Rasmiy darslikdan mundarija, slaydlar, savollar va videolarni yaratish.
 *
 *   npm run lessons:build -- --grade 8 --subject fizika                 (bitta fan, to'liq)
 *   npm run lessons:build -- --grade 8 --subject all --toc-only         (sinfning barcha fanlari: faqat mundarija + video)
 *   npm run lessons:build -- --grade all --subject all --toc-only       (1–11-sinflar, barcha fanlar mundarijasi)
 *   npm run lessons:build -- --grade 8 --subject fizika --limit 3       (faqat dastlabki 3 mavzu)
 *   ... --model claude-sonnet-5-5                                      (boshqa model; standart claude-opus-5-5)
 *
 * Talab: .env faylida ANTHROPIC_API_KEY; videolar uchun YOUTUBE_API_KEY (ixtiyoriy).
 * Darsliklar skanerlangan (matn qatlami yo'q), shuning uchun kerakli betlar kichik PDF qilib
 * kesilib, Claude'ga rasm sifatida o'qitiladi. Natijalar .cache/ da saqlanadi — skript to'xtab
 * qolsa, qayta ishga tushirilganda to'lov qilingan qismlar takrorlanmaydi.
 */
import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SUBJECTS, type SubjectCode } from "../src/lib/curriculum";
import { CONTENT_LANGS, type ContentLang, type LessonsIndexItem, type SubjectLessons, type TopicEntry, type TopicLang } from "../src/lib/lesson-content";
import { findVideo } from "../src/lib/youtube";

if (existsSync(".env")) (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile?.call(process, ".env");

const DEFAULT_MODEL = "claude-opus-5-5";
/** $ / 1M token: [kirish, chiqish] — taxminiy narxni chiqarish uchun */
const PRICES: Record<string, [number, number]> = { "claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10], "claude-haiku-5-5": [0.1, 0.5] };
const MAX_TOPIC_PAGES = 6;
const CONCURRENCY = 3;
const LANG_NAMES: Record<ContentLang, string> = {
  uz: "Uzbek (Latin script)",
  tg: "Tajik (Cyrillic script, the literary Tajik used in Tajik-medium schools of Uzbekistan)",
};
const LAB_KEYS: Record<string, string> = {
  circuit: "electric circuit, Ohm's law, current, voltage, resistance",
  induction: "electromagnetic induction, Faraday, magnet and coil",
  lens: "converging lens, image formation, optics",
  projectile: "motion, velocity, free fall, projectile",
  atom: "atomic structure, electron shells",
  molecule: "molecules, chemical bonds",
  reaction: "chemical reaction, conservation of mass",
  cell: "plant and animal cell",
  skeleton: "human skeleton",
  heart: "heart and blood circulation",
  solids: "3D solids, volume, surface area",
  section: "cross-sections of a cube",
  solar: "solar system, planets",
  seasons: "seasons, Earth's axial tilt",
  "earth-layers": "Earth's internal layers",
  robot: "robot arm, kinematics",
  monument: "historical minaret",
  vocab: "vocabulary objects",
};

/* ───── Argumentlar ───── */

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const gradeArg = arg("grade") ?? "";
const subjectArg = arg("subject") ?? "";
const limit = Number(arg("limit")) || Infinity;
const tocOnly = args.includes("--toc-only");
const MODEL = arg("model") ?? DEFAULT_MODEL;
const langs = (arg("langs")?.split(",") ?? [...CONTENT_LANGS]) as ContentLang[];
const grades = gradeArg === "all" ? Array.from({ length: 11 }, (_, i) => i + 1) : [Number(gradeArg)];
if (!grades.every((g) => g >= 1 && g <= 11) || !(subjectArg === "all" || subjectArg in SUBJECTS)) {
  console.error("Foydalanish: npm run lessons:build -- --grade 8|all --subject fizika|all [--toc-only] [--limit N] [--langs uz,tg] [--model claude-opus-5-5]");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.error("ANTHROPIC_API_KEY topilmadi. Uni loyiha papkasidagi .env fayliga yozing (namuna: .env.example).");
  process.exit(1);
}
const youtubeKey = process.env.YOUTUBE_API_KEY;

/** Bitta ish: bir sinfning bir fani */
interface Job {
  grade: number;
  subject: SubjectCode;
  cacheDir: string;
  subjectName: string;
}

interface BookRow {
  grade: number;
  subject: string | null;
  lang: string;
  sourceUrl: string;
  storageUrl: string;
}

/* ───── Claude ───── */

const client = new Anthropic();
const usage = { input: 0, output: 0 };

async function askJson<T>(system: string, content: unknown[], schema: object): Promise<T> {
  // fallbacks: "default" — xavfsizlik klassifikatori rad etsa, server tavsiya etilgan zaxira modelda qayta bajaradi
  const params = {
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content }],
  };
  const res = await client.beta.messages.create(params as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming);
  usage.input += res.usage.input_tokens;
  usage.output += res.usage.output_tokens;
  if (res.stop_reason === "refusal") throw new Error("model so'rovni rad etdi");
  if (res.stop_reason === "max_tokens") throw new Error("javob uzunlik chegarasida kesildi");
  return JSON.parse(res.content.map((b) => (b.type === "text" ? b.text : "")).join("")) as T;
}

const pdfBlock = (base64: string) => ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } });

/* ───── PDF ───── */

async function loadTextbook(job: Job, book: BookRow): Promise<PDFDocument> {
  // Sayt (/api/books/file) ham shu papkadan foydalanadi — kitob bir marta yuklanadi
  const local = path.resolve(".cache", "books", path.basename(new URL(book.sourceUrl).pathname));
  if (!existsSync(local)) {
    console.log(`  ↓ ${book.sourceUrl}`);
    const res = await axios.get<ArrayBuffer>(book.sourceUrl, { responseType: "arraybuffer", timeout: 600_000, maxContentLength: 300 * 1024 * 1024 });
    await mkdir(path.dirname(local), { recursive: true });
    await writeFile(local, Buffer.from(res.data));
  }
  return PDFDocument.load(await readFile(local), { ignoreEncryption: true });
}

/** Berilgan betlardan (1 dan boshlab) kichik PDF yasaydi, base64 */
async function slice(doc: PDFDocument, pages: number[]): Promise<string> {
  const out = await PDFDocument.create();
  const copied = await out.copyPages(doc, pages.map((p) => p - 1));
  copied.forEach((p) => out.addPage(p));
  return Buffer.from(await out.save()).toString("base64");
}

/* ───── 1-bosqich: mundarija ───── */

interface TocTopic {
  chapter: string;
  title: string;
  printedPage: number;
}
interface Toc {
  topics: TocTopic[];
  offset: number;
  total: number;
}

const TOC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["topics", "pageSamples"],
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["chapter", "title", "printedPage"],
        properties: { chapter: { type: "string" }, title: { type: "string" }, printedPage: { type: "integer" } },
      },
    },
    pageSamples: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["pdfPage", "printedPage"],
        properties: { pdfPage: { type: "integer" }, printedPage: { type: "integer" } },
      },
    },
  },
} as const;

async function readToc(job: Job, doc: PDFDocument, lang: ContentLang): Promise<Toc> {
  const file = path.join(job.cacheDir, `${lang}-toc.json`);
  if (existsSync(file)) return JSON.parse(await readFile(file, "utf8")) as Toc;
  const total = doc.getPageCount();
  const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i).filter((p) => p >= 1 && p <= total);
  const mid = Math.floor(total / 3);
  const attempts = [
    [...range(1, 8), ...range(mid, mid + 1), ...range(total - 9, total)],
    [...range(9, 20), ...range(2 * mid, 2 * mid + 1), ...range(total - 19, total - 10)],
  ];
  for (const pages of attempts) {
    const res = await askJson<{ topics: TocTopic[]; pageSamples: { pdfPage: number; printedPage: number }[] }>(
      "You extract the table of contents from scanned school textbooks. Read the page images carefully and copy titles exactly as printed, in the book's own language and script.",
      [
        pdfBlock(await slice(doc, pages)),
        {
          type: "text",
          text: [
            `This is a ${LANG_NAMES[lang]} grade ${job.grade} textbook (${job.subjectName}).`,
            `The attached document holds these pages of the original PDF, in order: ${pages.join(", ")}.`,
            "1) Find the table of contents (Mundarija / Мундариҷа / Мундарижа). List every lesson-level entry in order — numbered paragraphs (§), lessons, laboratory works and practical works — with the printed page number where it starts and the chapter (or section) heading it belongs to (empty string if none). Skip the preface, the chapter headings themselves, answers, glossary and the contents page. If there is no table of contents here, return an empty topics list.",
            "2) pageSamples: for every attached page where a printed page number is visible, give its original PDF page number (from the list above) and the printed number.",
          ].join("\n"),
        },
      ],
      TOC_SCHEMA,
    );
    if (res.topics.length === 0) continue;
    const counts = new Map<number, number>();
    for (const s of res.pageSamples) counts.set(s.pdfPage - s.printedPage, (counts.get(s.pdfPage - s.printedPage) ?? 0) + 1);
    const offset = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
    const toc: Toc = { topics: res.topics, offset, total };
    await writeFile(file, JSON.stringify(toc, null, 2));
    return toc;
  }
  throw new Error(`${lang}: mundarija topilmadi`);
}

/** Mavzu betlari: mundarijadagi boshlanish betidan keyingi mavzugacha (eng ko'pi MAX_TOPIC_PAGES) */
function topicPages(toc: Toc, i: number): [number, number] {
  const t = toc.topics[i];
  const start = Math.min(toc.total, Math.max(1, t.printedPage + toc.offset));
  const nextStart = i + 1 < toc.topics.length ? toc.topics[i + 1].printedPage + toc.offset : start + MAX_TOPIC_PAGES;
  const end = Math.min(toc.total, Math.max(start, Math.min(nextStart - 1, start + MAX_TOPIC_PAGES - 1)));
  return [start, end];
}

/* ───── 2-bosqich: har bir mavzu ───── */

type TopicDraft = Omit<TopicLang, "pdfPages" | "printedPage" | "textbookUrl" | "video"> & { labKey: string; videoQuery: string };

const TOPIC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "goal", "keyConcepts", "slides", "questions", "homework", "labKey", "videoQuery"],
  properties: {
    title: { type: "string" },
    goal: { type: "string" },
    keyConcepts: { type: "array", items: { type: "string" } },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "bullets", "note"],
        properties: { title: { type: "string" }, bullets: { type: "array", items: { type: "string" } }, note: { type: "string" } },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["q", "options", "answer"],
        properties: { q: { type: "string" }, options: { type: "array", items: { type: "string" } }, answer: { type: "integer" } },
      },
    },
    homework: { type: "string" },
    labKey: { type: "string", enum: [...Object.keys(LAB_KEYS), "none"] },
    videoQuery: { type: "string" },
  },
} as const;

const topicSystem = (job: Job, lang: ContentLang) =>
  [
    `You are an experienced ${SUBJECTS[job.subject].ru} teacher in a ${lang === "tg" ? "Tajik" : "Uzbek"}-medium general school in Sokh district, Fergana region, Uzbekistan. From the attached official textbook pages you prepare materials for one 45-minute lesson.`,
    `Write every field strictly in ${LANG_NAMES[lang]}, using the terminology, symbols and formula notation of the textbook itself.`,
    "Stay faithful to the textbook; do not state anything it contradicts. You may add one everyday example that pupils in a rural Fergana valley district (Sokh: mountains, river, orchards, apricots, farming) would recognise.",
    "slides: 6 to 8. Slide 1 = topic title and lesson goal; the last slide = short summary. Each slide has 2–5 short bullets (at most about 12 words each). Write formulas in plain Unicode (I = U / R, v₀, m², ρ). note = one sentence telling the teacher how to use the slide.",
    "keyConcepts: 3–6 terms or formulas. questions: exactly 3 multiple-choice items, 4 options each, exactly one correct (answer = 0-based index), checking the main ideas. homework: point to the textbook's own questions/exercises on these pages if present.",
    "labKey: the 3D lab that directly illustrates this topic, or \"none\". Labs: " + Object.entries(LAB_KEYS).map(([k, v]) => `${k} (${v})`).join("; ") + ".",
    `videoQuery: a short YouTube search phrase in the same language with grade, subject and topic, e.g. "${job.grade}-sinf ${SUBJECTS[job.subject].uz.toLowerCase()} ...".`,
  ].join("\n");

async function buildTopic(job: Job, doc: PDFDocument, lang: ContentLang, toc: Toc, i: number): Promise<TopicDraft> {
  const file = path.join(job.cacheDir, `${lang}-${i + 1}.json`);
  if (existsSync(file)) return JSON.parse(await readFile(file, "utf8")) as TopicDraft;
  const t = toc.topics[i];
  const [start, end] = topicPages(toc, i);
  const pages = Array.from({ length: end - start + 1 }, (_, k) => start + k);
  const draft = await askJson<TopicDraft>(topicSystem(job, lang), [
    pdfBlock(await slice(doc, pages)),
    {
      type: "text",
      text: `Grade: ${job.grade}\nSubject: ${job.subjectName}\nChapter: ${t.chapter}\nTopic (from the table of contents): ${t.title}\nThe attached pages are original PDF pages ${start}–${end} (printed page ${t.printedPage} onward). The lesson covers only this topic; ignore text that belongs to the next topic.`,
    },
  ], TOPIC_SCHEMA);
  // Sxema sonlarni cheklay olmaydi — shu yerda tekshiramiz
  draft.questions = draft.questions.filter((q) => q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length);
  await writeFile(file, JSON.stringify(draft, null, 2));
  return draft;
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

/** Kunlik YouTube kvotasi tugasa, qolgan qidiruvlarni to'xtatamiz */
let youtubeQuotaLeft = true;

async function videoFor(job: Job, lang: ContentLang, n: number, query: string): Promise<TopicLang["video"]> {
  if (!youtubeKey || !youtubeQuotaLeft) return null;
  const file = path.join(job.cacheDir, `video-${lang}-${n}.json`);
  if (existsSync(file)) return JSON.parse(await readFile(file, "utf8")) as TopicLang["video"];
  try {
    const v = await findVideo(query, lang, youtubeKey);
    await writeFile(file, JSON.stringify(v));
    return v;
  } catch (e) {
    const status = axios.isAxiosError(e) ? e.response?.status : undefined;
    if (status === 403) {
      youtubeQuotaLeft = false;
      console.warn("   YouTube kunlik kvotasi tugadi — qolgan videolar ertaga (skriptni qayta ishga tushiring).");
    } else console.error(`   ✗ video ${lang}-${n}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/* ───── Bitta fan ───── */

async function runJob(job: Job, books: BookRow[]): Promise<void> {
  await mkdir(job.cacheDir, { recursive: true });
  const perLang: Partial<Record<ContentLang, { toc: Toc; drafts: (TopicDraft | undefined)[]; url: string }>> = {};

  for (const lang of langs) {
    const book = books.find((b) => b.grade === job.grade && b.subject === job.subject && b.lang === lang);
    if (!book) {
      console.log(`[${lang}] darslik yo'q — o'tkazildi`);
      continue;
    }
    const doc = await loadTextbook(job, book);
    const toc = await readToc(job, doc, lang);
    console.log(`[${lang}] ${toc.topics.length} ta mavzu (bet siljishi: ${toc.offset})`);
    const drafts: (TopicDraft | undefined)[] = [];
    if (!tocOnly) {
      const idx = toc.topics.map((_, i) => i).slice(0, limit);
      let done = 0;
      await pool(idx, CONCURRENCY, async (i) => {
        try {
          drafts[i] = await buildTopic(job, doc, lang, toc, i);
        } catch (e) {
          console.error(`   ✗ ${i + 1}: ${e instanceof Error ? e.message : String(e)}`);
        }
        process.stdout.write(`\r[${lang}] slaydlar ${++done}/${idx.length}`);
      });
      process.stdout.write("\n");
    } else {
      // Mavjud keshdagi tayyor mavzularni yo'qotmaslik uchun ularni ham o'qiymiz
      for (let i = 0; i < toc.topics.length; i++) {
        const f = path.join(job.cacheDir, `${lang}-${i + 1}.json`);
        if (existsSync(f)) drafts[i] = JSON.parse(await readFile(f, "utf8")) as TopicDraft;
      }
    }
    perLang[lang] = { toc, drafts, url: book.storageUrl };
  }

  const counts = langs.map((l) => perLang[l]?.toc.topics.length ?? 0);
  if (counts.filter(Boolean).length > 1 && new Set(counts.filter(Boolean)).size > 1)
    console.warn(`Diqqat: tillardagi mavzular soni farq qiladi (${langs.map((l, k) => `${l}=${counts[k]}`).join(", ")}) — juftlashni tekshiring.`);
  const n = Math.min(Math.max(0, ...counts), limit);
  if (n === 0) return;

  // O'zbekcha va tojikcha mavzularni tartib raqami bo'yicha juftlaymiz
  const topics: TopicEntry[] = [];
  for (let i = 0; i < n; i++) {
    const entry: TopicEntry = { n: i + 1, chapter: "", labKey: null };
    for (const lang of langs) {
      const data = perLang[lang];
      const t = data?.toc.topics[i];
      if (!data || !t) continue;
      const d = data.drafts[i];
      entry.chapter ||= t.chapter;
      if (!entry.labKey && d && d.labKey !== "none") entry.labKey = d.labKey;
      const query = d?.videoQuery || `${job.grade}-${lang === "tg" ? "синф" : "sinf"} ${(lang === "tg" ? SUBJECTS[job.subject].tg : SUBJECTS[job.subject].uz).toLowerCase()} ${t.title}`;
      entry[lang] = {
        title: d?.title || t.title,
        goal: d?.goal ?? "",
        keyConcepts: d?.keyConcepts ?? [],
        slides: d?.slides ?? [],
        questions: d?.questions ?? [],
        homework: d?.homework ?? "",
        pdfPages: topicPages(data.toc, i),
        printedPage: t.printedPage,
        textbookUrl: data.url,
        video: await videoFor(job, lang, i + 1, query),
      };
    }
    if (entry.uz || entry.tg) topics.push(entry);
  }

  const out: SubjectLessons = { grade: job.grade, subject: job.subject, model: MODEL, generatedAt: new Date().toISOString(), topics };
  await mkdir("public/lessons", { recursive: true });
  const fileName = `${job.grade}-${job.subject}.json`;
  await writeFile(path.join("public/lessons", fileName), JSON.stringify(out, null, 2));
  const indexFile = "public/lessons/index.json";
  const index = existsSync(indexFile) ? (JSON.parse(await readFile(indexFile, "utf8")) as LessonsIndexItem[]) : [];
  const item: LessonsIndexItem = { grade: job.grade, subject: job.subject, file: fileName, topics: topics.length, langs: langs.filter((l) => topics.some((t) => t[l])) };
  const merged = [...index.filter((x) => x.file !== fileName), item].sort((a, b) => a.grade - b.grade || a.subject.localeCompare(b.subject));
  await writeFile(indexFile, JSON.stringify(merged, null, 2));
  const withSlides = topics.filter((t) => langs.some((l) => (t[l]?.slides.length ?? 0) > 0)).length;
  console.log(`✓ public/lessons/${fileName}: ${topics.length} ta mavzu, slaydli: ${withSlides}`);
}

/* ───── Asosiy jarayon ───── */

async function main() {
  const books = JSON.parse(await readFile("public/books/index.json", "utf8")) as BookRow[];
  const jobs: Job[] = [];
  for (const g of grades) {
    const subjects =
      subjectArg === "all"
        ? Array.from(new Set(books.filter((b) => b.grade === g && b.subject && langs.includes(b.lang as ContentLang)).map((b) => b.subject as SubjectCode)))
        : [subjectArg as SubjectCode];
    for (const s of subjects) {
      // Qo'lda yozilgan fanlar (npm run lessons:manual) ustidan yozilmaydi; majburlash uchun --force
      const done = path.join("public/lessons", `${g}-${s}.json`);
      if (!args.includes("--force") && existsSync(done) && (JSON.parse(await readFile(done, "utf8")) as SubjectLessons).model === "manual") {
        console.log(`– ${g}-sinf ${SUBJECTS[s].uz}: qo'lda yozilgan, o'tkazib yuborildi`);
        continue;
      }
      jobs.push({ grade: g, subject: s, cacheDir: path.resolve(".cache", "lessons", `${g}-${s}`), subjectName: `${SUBJECTS[s].uz} / ${SUBJECTS[s].tg}` });
    }
  }
  console.log(`${jobs.length} ta ish (${tocOnly ? "faqat mundarija va video" : "to'liq: mundarija, slaydlar, savollar, video"}), model: ${MODEL}`);
  for (const [k, job] of jobs.entries()) {
    console.log(`\n=== [${k + 1}/${jobs.length}] ${job.grade}-sinf ${SUBJECTS[job.subject].uz} ===`);
    try {
      await runJob(job, books);
    } catch (e) {
      console.error(`✗ ${job.grade}-${job.subject}: ${e instanceof Error ? e.message : String(e)}`);
    }
    report();
  }
}

function report() {
  const [pin, pout] = PRICES[MODEL] ?? PRICES[DEFAULT_MODEL];
  const cost = (usage.input * pin + usage.output * pout) / 1e6;
  console.log(`   Jami tokenlar: kirish ${usage.input}, chiqish ${usage.output} · taxminiy narx: $${cost.toFixed(2)}`);
}

main().catch((e) => {
  console.error(e);
  report();
  process.exit(1);
});
