/**
 * Matn qatlami bor PDF'dan mundarija qoralamasini tuzadi.
 *   npm run catalog:toc-parse -- kimyo_7_uzb fizika_7_uzb ...       (mundarija betlari avtomatik topiladi)
 *   npm run catalog:toc-parse -- kimyo_7_uzb --pages 79-80           (betlar qo'lda ko'rsatiladi)
 * Natija: scripts/toc/<id>.draft.json. QO'LDA TEKSHIRILGACH <id>.json ga o'zgartiriladi —
 * build-catalog faqat .json ni oladi. Ekranga to'liq ro'yxat emas, bob tuzilishi va shubhali joylar chiqadi.
 *
 * Qoidalar: "…… 12" ko'rinishidagi har bir qism — mavzu (bet raqami bilan);
 * "I bob. …" / "Боби I. …" / "1-bo'lim" kabi sarlavhalar — bob.
 * PDF beti = floor(bosilgan bet / per) + offset: bir nechta mavzu nomini kitob ichidan qidirib o'lchanadi.
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TocFile } from "../src/lib/catalog/types";

const args = process.argv.slice(2);
const opt = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ids = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
// "M U N D A r I J A", "МУНДАРИҶА", "Mundarija" — bo'sh joy va katta-kichik harfdan qat'i nazar
// Lotin va kirill harflari aralash kelishi mumkin ("MУНДАРИЇА"), Ҷ o'rnida har xil belgi bo'ladi
const HEADING = /[MМ]\s?[UУ]\s?[NН]\s?[DД]\s?[AА]\s?[RrР]\s?[IИ]\s?\S\s?[AА]|SOMMAIRE|CONTENTS|INHALT|INHALTSVERZEICHNIS|СОДЕРЖАНИЕ|ОГЛАВЛЕНИЕ/iu;
/** Eski tojik shriftlari (Times New Roman Tj va h.k.) harflarni boshqa kirill harflar bilan kodlagan */
const TJ_LEGACY: Record<string, string> = { њ: "ҳ", Њ: "Ҳ", љ: "ҷ", Љ: "Ҷ", ќ: "қ", Ќ: "Қ", ѓ: "ғ", Ѓ: "Ғ", ї: "ӣ", Ї: "Ӣ", ў: "ӯ", Ў: "Ӯ", є: "ӣ", Є: "Ӣ" };
/**
 * Boshqa eski shriftlar: kirill harflari Windows-1251 baytlari bilan, lekin lotin (Latin-1) belgilari sifatida
 * chiqadi ("ÌÓÍÄÀÐÈ¯À" = "МУНДАРИҶА"). Tojikcha harflar shu shriftlarning o'z o'rnida;
 * moslik so'zlar bo'yicha aniqlangan (Мавзӯъҳои, Муқаддима, ИФОДАҲОИ, ХАЛҚҲОИ, АЛГЕБРАВӢ, Дарёҳо).
 */
// ¤ → Ӯ (Ӯзбекистон), ¡ → Ё (МИЁНАИ), ¢/² → Ғ (Ғояи миллӣ)
const TJ_LATIN1: Record<string, string> = { "¥": "Ҳ", µ: "ҳ", μ: "ҳ", "£": "Қ", "³": "қ", "¯": "Ҷ", "¿": "ҷ", ª: "Ӣ", º: "ӣ", "´": "ӯ", "¤": "Ӯ", "¢": "Ғ", "²": "Ғ", "¨": "Ё", "¡": "Ё", "±": "ё", "¸": "ё" };
function fromLatin1Cp1251(s: string): string {
  return s.replace(/[ -ÿμ]/g, (c) => {
    if (TJ_LATIN1[c]) return TJ_LATIN1[c];
    const code = c.charCodeAt(0);
    return code >= 0xc0 && code <= 0xff ? String.fromCharCode(0x0410 + code - 0xc0) : c;
  });
}
const CYR_LAT: Record<string, string> = Object.fromEntries(
  "а:a б:b в:v г:g д:d е:e ё:yo ж:j з:z и:i й:y к:k л:l м:m н:n о:o п:p р:r с:s т:t у:u ф:f х:x ц:ts ч:ch ш:sh ъ:ʼ ь: э:e ю:yu я:ya ў:o‘ қ:q ғ:g‘ ҳ:h"
    .split(" ")
    .flatMap((p) => {
      const [c, l] = p.split(":");
      return [[c, l], [c.toUpperCase(), l ? l[0].toUpperCase() + l.slice(1) : l]];
    }),
);
let currentLang = "uz";
let currentId = "";
function fixText(t: string): string {
  // Tojik va rus kitoblarida lotin urg'uli harflar bo'lmaydi — ular doim eski shrift kodlashi (bir betda aralash ham kelishi mumkin)
  if (currentLang === "tg" || currentLang === "ru") return fromLatin1Cp1251(t).replace(/[њЊљЉќЌѓЃїЇўЎєЄ]/g, (c) => (currentLang === "tg" ? TJ_LEGACY[c] : c));
  // O'zbek kitoblarida: Lotin-1 ko'rinishidagi kirill (À–ÿ ko'p) yoki "a" o'rnida "à" (fransuz/nemis tili kitoblaridan tashqari)
  if ((t.match(/[À-ÿ]/g)?.length ?? 0) > Math.max(20, t.length * 0.2) && !/fransuz|nemis/.test(currentId)) return fromLatin1Cp1251(t);
  if (/fransuz|nemis/.test(currentId)) return t;
  const s = t.replace(/[àÀ]/g, (c) => (c === "à" ? "a" : "A"));
  // Lotin yozuvidagi kitob matn qatlamida ba'zi so'zlar kirill harflarida ("ҳаракатi") — rus tili kitoblaridan boshqasida lotinga o'giramiz
  return /rus_tili/.test(currentId) ? s : s.replace(/[Ѐ-ӿ]/g, (c) => CYR_LAT[c] ?? c);
}
const LEADERS = /(?:\.\s?){4,}\s*\d{1,3}/g;
// Bob sarlavhasi: "I bob.", "II BOB", "Боби I.", "1-bo'lim", "I qism", "Фасли 1".
// Nomi birinchi mavzu belgisigacha ("12-§", "§ 3", "5.1.") davom etadi.
const CHAPTER =
  /((?:[IVXL]+\s*(?:bob\.|qism\.|bo[‘'ʻ]lim\.|BOB\b\.?|QISM\b\.?|BO[‘'ʻ]LIM\b\.?)|(?:Боби|БОБИ|Фасли|ФАСЛИ|Қисми|ҚИСМИ)\s+[IVXL\d]+\.?|\d+\s*-\s*(?:bob|bo[‘'ʻ]lim|qism)\b\.?).*?)(?=\s(?:\d+\s*-\s*§|§\s*\d|\d+\.\d+\.\s|\d+\s*-\s*(?:dars|mavzu)\b|(?:Дарси|Мавзӯи)\s+\d)|$)/u;

const norm = (s: string) => s.toLowerCase().replace(/[‘'ʻʼ`’]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");

async function pageText(pdf: PDFDocumentProxy, n: number) {
  const tc = await (await pdf.getPage(n)).getTextContent();
  return fixText(tc.items.map((i) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " "));
}

function parse(text: string): TocFile["chapters"] {
  const clean = text.replace(HEADING, " ").replace(/(\p{L})- (\p{L})/gu, "$1$2"); // bo'g'in ko'chirish
  const chapters: TocFile["chapters"] = [];
  const cur = () => chapters[chapters.length - 1] ?? (chapters.push({ title: "—", topics: [] }), chapters[0]);
  for (const m of clean.matchAll(/(.+?)\s*(?:\.\s?){3,}\s*(\d{1,3})(?=\s|$)/gu)) {
    let title = m[1].trim();
    const ch = title.match(CHAPTER);
    if (ch && ch.index !== undefined) {
      // Bob oldidagi betsiz qator — bo'lim sarlavhasi ("KINEMATIKA ASOSLARI"): bob nomiga qo'shamiz
      const before = title.slice(0, ch.index).replace(/^(?:\d{1,3}\s+)+/, "").trim();
      chapters.push({ title: before && !/^[\d\s]+$/.test(before) ? `${before} · ${ch[1].trim()}` : ch[1].trim(), topics: [] });
      title = title.slice(ch.index + ch[1].length).trim();
    }
    // Qo'shni betdan tushgan bet raqamlari ("156 157") — mavzu emas
    // Oldingi betdan qolgan raqamlar ("3 173 Kirish" → "Kirish"); "1-amaliy", "5.1." kabi raqamlarga tegmaymiz
    title = title.replace(/^(?:\d{1,3}\s+)+(?=[^\d\s.\-–])/u, "");
    // Mundarija betining o'z raqami ("189 5—6-sinflarda… 3"): mavzu betidan ancha katta bo'lsa
    const lead = title.match(/^(\d{2,3})\s+/);
    if (lead && Number(lead[1]) > Number(m[2]) + 50) title = title.slice(lead[0].length);
    if (title && !/^[\d\s]+$/.test(title)) cur().topics.push({ title: title.replace(/\s+([,.;:])/g, "$1"), page: Number(m[2]) });
  }
  return chapters;
}

async function one(id: string, url: string) {
  const local = path.join(".cache", "books", path.basename(new URL(url).pathname));
  const pdf = await (existsSync(local) ? getDocument({ data: new Uint8Array(await readFile(local)), verbosity: 0 }) : getDocument({ url, disableAutoFetch: true, disableStream: true, rangeChunkSize: 256 * 1024, verbosity: 0 })).promise;
  const N = pdf.numPages;
  const cache = new Map<number, string>();
  const txt = async (n: number) => cache.get(n) ?? (cache.set(n, await pageText(pdf, n)), cache.get(n) as string);

  // 1) Mundarija betlari
  let pages: number[] = [];
  const [from, to] = (opt("pages") ?? "").split("-").map(Number);
  if (from) pages = Array.from({ length: (to || from) - from + 1 }, (_, i) => from + i);
  else {
    const cand = [...Array.from({ length: 8 }, (_, i) => i + 1), ...Array.from({ length: 16 }, (_, i) => N - 15 + i)].filter((p, i, a) => p >= 1 && p <= N && a.indexOf(p) === i);
    for (const p of cand) {
      const t = await txt(p);
      if (pages.length === 0 && HEADING.test(t) && (t.match(LEADERS)?.length ?? 0) >= 2) pages.push(p);
      else if (pages.length && p === pages[pages.length - 1] + 1 && (t.match(LEADERS)?.length ?? 0) >= 3) pages.push(p);
    }
  }
  if (!pages.length) {
    console.log(`\n✗ ${id}: mundarija sarlavhasi matn qatlamida topilmadi — varaqni ko'rib, --pages bilan bering yoki rasmdan o'qing`);
    return;
  }
  let text = "";
  for (const p of pages) text += " " + (await txt(p));
  const chapters = parse(text);
  const topics = chapters.flatMap((c) => c.topics);

  // 2) Bet hisobi: mavzu nomini kitob ichidan qidiramiz
  const maxPage = Math.max(0, ...topics.map((t) => t.page ?? 0));
  const per: 1 | 2 = maxPage > N * 1.4 ? 2 : 1;
  const votes = new Map<number, number>();
  const probes = topics.filter((t) => t.page && norm(t.title).length > 12).filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 6)) === 0).slice(0, 6);
  for (const t of probes) {
    const key = norm(t.title.replace(/^[\d§.\s-]+/, "")).slice(0, 22);
    const guess = Math.floor((t.page as number) / per);
    // Yaqindan uzoqqa: 0, −1, +1, −2, +2 … ±15
    for (const d of Array.from({ length: 31 }, (_, i) => (i % 2 ? -(i + 1) / 2 : i / 2))) {
      const p = guess + d;
      if (p < 1 || p > N || pages.includes(p)) continue;
      if (norm(await txt(p)).includes(key)) {
        votes.set(d, (votes.get(d) ?? 0) + 1);
        break;
      }
    }
  }
  const best = [...votes].sort((a, b) => b[1] - a[1])[0];
  // Kamida 3 ta mavzu va ko'pchilik bir xil siljishni ko'rsatsagina; aks holda (masalan, skanda betlar tushib qolgan) — noma'lum
  const total = [...votes.values()].reduce((s, v) => s + v, 0);
  const offset = best && best[1] >= 3 && best[1] > total / 2 ? best[0] : null;

  // 3) Titul betlari: yil, nashriyot, ISBN — nomzodlar (qo'lda tasdiqlanadi)
  const front = (await txt(1)) + " " + (await txt(Math.min(2, N)));
  const years = [...front.matchAll(/(?:TOSHKENT|Toshkent|ТОШКЕНТ|Тошкент|ТОШКАНД|Тошканд|T\.:|Т\.:)[^0-9]{0,60}?((?:19|20)\d\d)/gu)].map((m) => Number(m[1]));
  const pubs = [...front.matchAll(/«([^»]{2,70})»/gu)].map((m) => m[1]).filter((s) => /nashriyot|NASHRIYOT|нашриёт|НАШРИЁТ|matbaa|MATBAA|ijod|IJOD|Sharq|SHARQ|O‘qituvchi|O'qituvchi|ЎҚИТУВЧИ|Ўқитувчи|Тасвир|Tasvir|Yangiyo|Gʻafur|G‘afur|Ғафур|SHARQ|Turon|Extremum|Novda|Kolorit|Sano|Davr|Cho‘lpon/u.test(s));
  const isbn = front.match(/ISBN[\s:]*[\d‐-]{10,}[\dX]/)?.[0] ?? null;
  const year = years.length ? Math.max(...years) : null;

  const draft: TocFile = {
    id,
    year,
    publisher: pubs[0] ?? null,
    pageOffset: offset,
    pagesPerPdfPage: per,
    ...(isbn ? { imprint: isbn } : {}),
    source: `PDF ${pages[0]}${pages.length > 1 ? `–${pages[pages.length - 1]}` : ""}-betlar (mundarija) matn qatlamidan, 1–2-betlar (titul); toc-parse qoralamasi`,
    chapters,
  };
  await writeFile(`scripts/toc/${id}.draft.json`, JSON.stringify(draft, null, 2) + "\n");

  // 4) Tekshirish uchun qisqa hisobot
  console.log(`\n■ ${id}: ${N} PDF bet, mundarija PDF ${pages.join(",")}; ${chapters.length} bob, ${topics.length} mavzu; per=${per}, offset=${offset ?? "?"} (ovozlar ${JSON.stringify([...votes])}); yil=${year ?? "?"} ${years.length > 1 ? `[${years}]` : ""}; nashriyot=${pubs[0] ?? "?"}; ${isbn ?? ""}`);
  for (const c of chapters) {
    const ps = c.topics.map((t) => t.page).filter((p): p is number => p != null);
    console.log(`   ## ${c.title.slice(0, 90)}  (${c.topics.length} ta, ${ps[0] ?? "?"}–${ps[ps.length - 1] ?? "?"})`);
  }
  let prev = 0;
  for (const t of topics) {
    const issues = [];
    if (t.page == null) issues.push("bet yo'q");
    else if (t.page < prev) issues.push(`bet kamaydi ${prev}→${t.page}`);
    if (t.title.length > 150) issues.push("juda uzun");
    if (/\b(bob|BOB)\b|Боби|БОБИ/u.test(t.title) && !/yuzasidan|bobga|doir|takror|оид|аз рӯи/u.test(t.title)) issues.push("bob so'zi bor");
    if (issues.length) console.log(`   ⚠ ${issues.join(", ")}: ${t.page ?? "?"} ${t.title.slice(0, 120)}`);
    if (t.page != null) prev = t.page;
  }
}

async function main() {
  if (!ids.length) {
    console.error("Foydalanish: npm run catalog:toc-parse -- <kitobId>... [--pages 79-80]");
    process.exit(1);
  }
  const books = JSON.parse(await readFile("public/books/index.json", "utf8")) as { sourceUrl: string; lang: string }[];
  for (const id of ids) {
    const book = books.find((b) => path.basename(new URL(b.sourceUrl).pathname).replace(/\.pdf$/i, "") === id);
    const url = book?.sourceUrl;
    currentLang = book?.lang ?? "uz";
    currentId = id;
    if (!url) {
      console.log(`✗ ${id}: ro'yxatda yo'q`);
      continue;
    }
    try {
      await one(id, url);
    } catch (e) {
      console.log(`✗ ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main();
