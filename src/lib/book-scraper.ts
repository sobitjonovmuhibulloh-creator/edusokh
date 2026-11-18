/**
 * Darsliklarni avtomatik yig'uvchi (server tomonida, `npm run books:sync`).
 *
 * Ishlash tartibi: manbalarning ro'yxat sahifalarini o'qiydi → PDF havolalarini topadi →
 * metama'lumotni (sinf, fan, til) aniqlaydi → `public/books/index.json` va
 * (DATABASE_URL bo'lsa) Textbook jadvalini yangilaydi.
 *
 * Ikki rejim:
 *  - index (standart): faqat ro'yxat tuziladi, kitob rasmiy manbadan ochiladi (diskda joy olmaydi);
 *  - download (`npm run books:sync -- --download`): PDF'lar BOOKS_DIR ga yuklab olinadi
 *    (internet sekin maktablar uchun; barcha sinflar ~1,5 GB).
 *
 * Odob qoidalari: robots.txt ga rioya qiladi, so'rovlar orasida pauza qiladi, faqat
 * ruxsat etilgan domenlardagi fayllarni oladi va bir faylni ikki marta qayta ishlamaydi.
 */
import axios from "axios";
import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { SUBJECTS, type SubjectCode } from "./curriculum";
import type { Lang } from "./i18n";

export interface BookMeta {
  grade: number;
  lang: Lang;
  subject: SubjectCode | null;
  title: string;
}

export interface BookSource {
  id: string;
  name: string;
  /** Ro'yxat sahifalari: PDF havolalari shu sahifalardan qidiriladi */
  listingUrls: string[];
  enabled: boolean;
  /** Fayllar joylashgan domenlar (standart: ro'yxat sahifasining domeni) */
  allowedHosts?: string[];
  /** Qaysi havolalar darslik ekanini aniqlash (standart: .pdf bilan tugaydiganlar) */
  linkPattern?: RegExp;
  /** Havolani yagona ko'rinishga keltirish (masalan, http → https) */
  normalizeUrl?: (url: URL) => URL;
  /** Manbaga xos metama'lumot; null — bu havola o'tkazib yuboriladi */
  parseMeta?: (url: URL, linkText: string) => BookMeta | null;
}

/* ───── Rasmiy manba: Xalq ta'limi vazirligi axborot-ta'lim portali ───── */

// Sinf → portal sahifasi ID'si ("Darsliklarning elektron variantlari" → "Amaldagi darsliklar")
const EDUPORTAL_GRADE_PAGES: Record<number, number> = { 1: 8, 2: 9, 3: 13, 4: 12, 5: 14, 6: 6, 7: 7, 8: 17, 9: 18, 10: 11, 11: 19 };
const EDUPORTAL_LANGS: Record<string, Lang> = { uzb: "uz", rus: "ru", tojik: "tg" };

// Fayl nomi prefiksi → fan (eng uzun moslik g'olib)
const EDUPORTAL_SUBJECTS: [string, SubjectCode][] = (
  [
    ["ona_tili", "ona_tili"], ["ozbek_tili", "ozbek_tili"], ["tojik_tili", "tojik_tili"], ["rus_tili", "rus_tili"],
    ["ingliz_tili", "ingliz_tili"], ["nemis_tili", "nemis_tili"], ["fransuz_tili", "fransuz_tili"],
    ["alifbe", "ona_tili"], ["yozuv_daftari", "ona_tili"], ["nutq_ostirish", "ona_tili"], ["oqish", "oqish"],
    ["adabiyot", "adabiyot"], ["matematika", "matematika"], ["algebra", "algebra"], ["geometriya", "geometriya"],
    ["fizika", "fizika"], ["astronomiya", "astronomiya"], ["kimyo", "kimyo"], ["umumiy_kimyo", "kimyo"], ["organik_kimyo", "kimyo"],
    ["biologiya", "biologiya"], ["botanika", "biologiya"], ["zoologiya", "biologiya"], ["odam_va_uning_salomatligi", "biologiya"],
    ["tabiatshunoslik", "tabiiy_fanlar"], ["atrofimizdagi_olam", "tabiiy_fanlar"],
    ["geografiya", "geografiya"], ["jahon_ijtimoiy_iqtisodiy_geografiyasi", "geografiya"], ["ijtimoiy_iqtisodiy_geografiya", "geografiya"],
    ["ozbekiston_tarixi", "tarix"], ["jahon_tarixi", "tarix"], ["qadimgi_dunyo_tarixi", "tarix"], ["tarixdan_hikoyalar", "tarix"], ["dunyo_dinlari_tarixi", "tarix"],
    ["davlat_va_huquq_asoslari", "huquq"], ["konstitutsiyaviy_huquq_asoslari", "huquq"], ["ozbekiston_davlati_va_huquqi_asoslari", "huquq"],
    ["iqtisodiy_bilim_asoslari", "iqtisod"], ["tadbirkorlik_asoslari", "iqtisod"],
    ["informatika", "informatika"], ["texnologiya", "texnologiya"], ["mehnat", "texnologiya"], ["chizmachilik", "chizmachilik"],
    ["tasviriy_sanat", "tasviriy"], ["musiqa", "musiqa"], ["jismoniy_tarbiya", "jismoniy"],
    ["chaqiruvga_qadar", "chqbt"],
    ["tarbiya", "tarbiya"], ["odobnoma", "tarbiya"], ["vatan_tuygusi", "tarbiya"], ["manaviyat_asoslari", "tarbiya"], ["milliy_istiqlol_goyasi", "tarbiya"], ["milliy_goya", "tarbiya"],
  ] as [string, SubjectCode][]
).sort((a, b) => b[0].length - a[0].length);

export function parseEduportal(url: URL, linkText: string): BookMeta | null {
  const m = url.pathname.match(/\/darsliklar\/(\d{1,2})\/([^/]+)\.pdf$/i);
  if (!m) return null;
  const grade = Number(m[1]);
  const base = decodeURIComponent(m[2]).toLowerCase();
  const lang = EDUPORTAL_LANGS[base.split("_").pop() ?? ""];
  if (!lang || grade < 1 || grade > 11) return null; // qoraqalpoq, turkman, qirg'iz, qozoq tillari kerak emas
  const subject = EDUPORTAL_SUBJECTS.find(([prefix]) => base.startsWith(prefix))?.[1] ?? null;
  let title = linkText.replace(/\s+/g, " ").trim() || (subject ? SUBJECTS[subject].uz : base);
  if (/daftar/.test(base) && !/daftar/i.test(title)) title += " (ish daftari)";
  if (/metodika/.test(base) && !/metod/i.test(title)) title += " (metodik qo'llanma)";
  const part = base.match(/_(\d)qism/);
  if (part && !/qism/i.test(title)) title += ` (${part[1]}-qism)`;
  return { grade, lang, subject, title };
}

export const SOURCES: BookSource[] = [
  {
    id: "eduportal",
    name: "Xalq ta'limi vazirligi axborot-ta'lim portali — amaldagi darsliklar",
    listingUrls: Object.values(EDUPORTAL_GRADE_PAGES).map((id) => `https://old.eduportal.uz/Eduportal/batafsil1/${id}?menu=33`),
    allowedHosts: ["eduportal.uz", "old.eduportal.uz"],
    enabled: true,
    // Sahifadagi havolalar http://eduportal.uz/... — ular https://old.eduportal.uz ga yo'naltiriladi
    normalizeUrl: (u) => new URL(u.pathname + u.search, "https://old.eduportal.uz"),
    parseMeta: parseEduportal,
  },
];

export interface BookRecord {
  title: string;
  grade: number;
  subject: SubjectCode | null;
  lang: Lang;
  sourceUrl: string;
  /** Kitob qayerdan ochiladi: rasmiy manba (index rejimi) yoki /books/... (download rejimi) */
  storageUrl: string;
  sha256: string;
  bytes: number;
  fetchedAt: string;
}

export interface SyncReport {
  added: BookRecord[];
  skipped: { url: string; reason: string }[];
  errors: { url: string; error: string }[];
}

const USER_AGENT = "EduSokhBookBot/0.1 (+maktab ta'lim platformasi)";
const DELAY_MS = 1500;
const MAX_PDF_BYTES = 200 * 1024 * 1024;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const http = axios.create({ headers: { "User-Agent": USER_AGENT }, timeout: 120_000, maxRedirects: 5 });

/* ───── robots.txt ───── */

const robotsCache = new Map<string, string[]>();

/** "User-agent: *" bo'limidagi Disallow qoidalarini qaytaradi (oddiy, prefiks bo'yicha) */
async function disallowedPrefixes(origin: string): Promise<string[]> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;
  let rules: string[] = [];
  try {
    const { data } = await http.get<string>(`${origin}/robots.txt`, { responseType: "text" });
    let applies = false;
    for (const raw of String(data).split(/\r?\n/)) {
      const line = raw.split("#")[0].trim();
      const [k, ...rest] = line.split(":");
      const key = k?.toLowerCase();
      const value = rest.join(":").trim();
      if (key === "user-agent") applies = value === "*" || USER_AGENT.toLowerCase().startsWith(value.toLowerCase());
      else if (applies && key === "disallow" && value) rules.push(value);
    }
  } catch {
    rules = []; // robots.txt yo'q — cheklov yo'q deb hisoblanadi
  }
  robotsCache.set(origin, rules);
  return rules;
}

async function allowedByRobots(url: URL): Promise<boolean> {
  const rules = await disallowedPrefixes(url.origin);
  return !rules.some((p) => url.pathname.startsWith(p));
}

/* ───── Umumiy metama'lumot aniqlash (parseMeta bo'lmagan manbalar uchun) ───── */

const TAJIK_LETTERS = /[ӣӯқғҳҷ]/i;
const CYRILLIC = /[а-яё]/i;

export function detectLang(text: string): Lang {
  if (TAJIK_LETTERS.test(text)) return "tg";
  if (CYRILLIC.test(text)) return "ru";
  return "uz";
}

export function detectGrade(text: string): number | null {
  const m = text.match(/(\d{1,2})\s*[-–]?\s*(sinf|синф|класс|kl\b|grade)/i) ?? text.match(/(?:sinf|синф|класс|grade)\s*[-–]?\s*(\d{1,2})/i);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 11 ? n : null;
}

export function detectSubject(text: string): SubjectCode | null {
  const lower = text.toLowerCase();
  let best: { code: SubjectCode; len: number } | null = null;
  for (const [code, names] of Object.entries(SUBJECTS) as [SubjectCode, Record<Lang, string>][]) {
    for (const name of Object.values(names)) {
      const n = name.toLowerCase();
      if (lower.includes(n) && (!best || n.length > best.len)) best = { code, len: n.length };
    }
  }
  return best?.code ?? null;
}

function genericMeta(url: URL, linkText: string): BookMeta | null {
  const text = `${linkText} ${decodeURIComponent(url.pathname.split("/").pop() ?? "")}`;
  const grade = detectGrade(text);
  if (!grade) return null;
  return { grade, lang: detectLang(text), subject: detectSubject(text), title: linkText.trim() || text.trim() };
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9а-яёӣӯқғҳҷ]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "kitob";

/* ───── Asosiy jarayon ───── */

interface FoundLink {
  url: URL;
  meta: BookMeta;
}

async function collectLinks(source: BookSource, report: SyncReport): Promise<FoundLink[]> {
  const pattern = source.linkPattern ?? /\.pdf($|\?)/i;
  const out: FoundLink[] = [];
  const seen = new Set<string>();
  for (const listing of source.listingUrls) {
    const listingUrl = new URL(listing);
    const hosts = source.allowedHosts ?? [listingUrl.hostname];
    if (!(await allowedByRobots(listingUrl))) {
      report.skipped.push({ url: listing, reason: "robots.txt taqiqlaydi" });
      continue;
    }
    try {
      const { data } = await http.get<string>(listing, { responseType: "text" });
      const $ = cheerio.load(data);
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;
        let url: URL;
        try {
          url = new URL(href, listingUrl);
        } catch {
          return;
        }
        if (!hosts.includes(url.hostname) || !pattern.test(url.pathname + url.search)) return;
        if (source.normalizeUrl) url = source.normalizeUrl(url);
        if (seen.has(url.href)) return;
        seen.add(url.href);
        const linkText = $(el).text().replace(/\s+/g, " ").trim();
        const meta = (source.parseMeta ?? genericMeta)(url, linkText);
        if (meta) out.push({ url, meta });
        else report.skipped.push({ url: url.href, reason: "kerakli til/sinf emas yoki aniqlanmadi" });
      });
    } catch (e) {
      report.errors.push({ url: listing, error: e instanceof Error ? e.message : String(e) });
    }
    await sleep(DELAY_MS);
  }
  return out;
}

async function loadIndex(file: string): Promise<BookRecord[]> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as BookRecord[];
  } catch {
    return [];
  }
}

export async function syncBooks(
  opts: { sources?: BookSource[]; booksDir?: string; limit?: number; download?: boolean } = {},
): Promise<SyncReport> {
  const sources = (opts.sources ?? SOURCES).filter((s) => s.enabled);
  const booksDir = path.resolve(opts.booksDir ?? process.env.BOOKS_DIR ?? "public/books");
  const publicRoot = path.resolve("public");
  const indexFile = path.join(booksDir, "index.json");
  const report: SyncReport = { added: [], skipped: [], errors: [] };
  if (sources.length === 0) {
    report.skipped.push({ url: "-", reason: "Yoqilgan manba yo'q (book-scraper.ts → SOURCES)" });
    return report;
  }

  await mkdir(booksDir, { recursive: true });
  const index = await loadIndex(indexFile);
  const byUrl = new Map(index.map((b, i) => [b.sourceUrl, i]));
  let budget = opts.limit ?? Infinity;

  for (const source of sources) {
    for (const { url, meta } of await collectLinks(source, report)) {
      if (budget <= 0) break;
      const href = url.toString();
      const existing = byUrl.get(href);
      // Index rejimida mavjud yozuvni o'tkazamiz; download rejimida hali yuklanmaganlarini yuklaymiz
      if (existing !== undefined && (!opts.download || index[existing].storageUrl.startsWith("/"))) {
        report.skipped.push({ url: href, reason: "avval qo'shilgan" });
        continue;
      }
      if (!(await allowedByRobots(url))) {
        report.skipped.push({ url: href, reason: "robots.txt taqiqlaydi" });
        continue;
      }
      const rec: BookRecord = { ...meta, sourceUrl: href, storageUrl: href, sha256: "", bytes: 0, fetchedAt: new Date().toISOString() };
      if (opts.download) {
        try {
          const res = await http.get<ArrayBuffer>(href, { responseType: "arraybuffer", maxContentLength: MAX_PDF_BYTES });
          const buf = Buffer.from(res.data);
          if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("fayl PDF emas");
          rec.sha256 = createHash("sha256").update(buf).digest("hex");
          rec.bytes = buf.length;
          const dir = path.join(booksDir, String(meta.grade));
          await mkdir(dir, { recursive: true });
          const filePath = path.join(dir, `${slugify(`${meta.title}-${meta.lang}`)}-${rec.sha256.slice(0, 8)}.pdf`);
          await writeFile(filePath, buf);
          rec.storageUrl = filePath.startsWith(publicRoot) ? "/" + path.relative(publicRoot, filePath).split(path.sep).join("/") : filePath;
        } catch (e) {
          report.errors.push({ url: href, error: e instanceof Error ? e.message : String(e) });
          await sleep(DELAY_MS);
          continue;
        }
        await sleep(DELAY_MS);
      }
      if (existing !== undefined) index[existing] = rec;
      else {
        byUrl.set(href, index.length);
        index.push(rec);
      }
      report.added.push(rec);
      budget--;
    }
  }

  index.sort((a, b) => a.grade - b.grade || a.lang.localeCompare(b.lang) || a.title.localeCompare(b.title));
  await writeFile(indexFile, JSON.stringify(index, null, 2), "utf8");
  if (process.env.DATABASE_URL && report.added.length > 0) await saveToDatabase(report.added);
  return report;
}

async function saveToDatabase(records: BookRecord[]): Promise<void> {
  const { prisma } = await import("./prisma");
  for (const r of records) {
    const grade = await prisma.grade.findUnique({ where: { number: r.grade } });
    if (!grade) continue;
    const subject = r.subject ? await prisma.subject.findUnique({ where: { code_gradeId: { code: r.subject, gradeId: grade.id } } }) : null;
    const data = { storageUrl: r.storageUrl, sha256: r.sha256, bytes: r.bytes, fetchedAt: new Date(r.fetchedAt) };
    await prisma.textbook.upsert({
      where: { sourceUrl: r.sourceUrl },
      update: data,
      create: { ...data, title: r.title, gradeId: grade.id, subjectId: subject?.id, lang: r.lang, sourceUrl: r.sourceUrl },
    });
  }
}
