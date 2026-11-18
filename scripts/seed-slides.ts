/**
 * "Slaydlar va taqdimotlar" bo'limi uchun namuna (demo) fayllar yaratadi:
 *   npm run slides:demo
 * Mazmun loyihaning o'zidan olinadi (public/lessons/8-fizika.json va curriculum.ts dagi DEMO_LESSONS),
 * shuning uchun mualliflik huquqi muammosi yo'q. Har safar ishga tushirilganda demo fayllar yangilanadi,
 * o'qituvchilar yuklagan fayllarga tegilmaydi.
 * Shrift: Windows'dagi Arial (o'zbek lotin va tojik kirill harflari bor); boshqa tizimda FONT_DIR ni bering.
 */
import fontkit from "@pdf-lib/fontkit";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import PptxGenJS from "pptxgenjs";
import { DEMO_LESSONS, SUBJECTS, type SubjectCode } from "../src/lib/curriculum";
import type { SubjectLessons } from "../src/lib/lesson-content";
import { buildSlides } from "../src/lib/lesson-template";
import type { DeckFormat, DeckLang, SlideDeckFile } from "../src/lib/slide-library";
import { addDeck, inspectDeck, listDecks, removeDeck } from "../src/lib/slide-store";

const FONT_DIR = process.env.FONT_DIR ?? "C:/Windows/Fonts";
const BRAND = "0E7C86";
const COBALT = "1F4FA3";
const INK = "1E293B";
const GRADE_WORD: Record<DeckLang, string> = { uz: "sinf", tg: "синф" };

interface DemoSlide {
  title: string;
  bullets: string[];
}
interface DemoDeck {
  id: string;
  title: string;
  grade: number;
  subject: SubjectCode;
  topic: string;
  lang: DeckLang;
  format: DeckFormat;
  slides: DemoSlide[];
  topicId?: string;
}

const footer = (d: DemoDeck) => `EduSokh · ${d.grade}-${GRADE_WORD[d.lang]} · ${SUBJECTS[d.subject][d.lang]} · ${d.topic}`;

/* ───── PDF (16:9, 960×540 pt) ───── */

const hex = (h: string) => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

async function makePdf(d: DemoDeck): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(d.title);
  doc.setAuthor("EduSokh (namuna)");
  doc.setLanguage(d.lang === "tg" ? "tg" : "uz");
  const regular = await doc.embedFont(await readFile(path.join(FONT_DIR, "arial.ttf")), { subset: true });
  const bold = await doc.embedFont(await readFile(path.join(FONT_DIR, "arialbd.ttf")), { subset: true });
  const W = 960;
  const H = 540;
  const foot = (page: PDFPage, i: number) => {
    page.drawText(footer(d), { x: 40, y: 22, size: 11, font: regular, color: hex("64748B") });
    page.drawText(`${i + 1} / ${d.slides.length}`, { x: W - 80, y: 22, size: 11, font: regular, color: hex("64748B") });
  };

  d.slides.forEach((s, i) => {
    const page = doc.addPage([W, H]);
    if (i === 0) {
      page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hex(BRAND) });
      page.drawRectangle({ x: 0, y: 0, width: W, height: 120, color: hex(COBALT) });
      let y = 360;
      for (const line of wrap(s.title, bold, 44, W - 120)) {
        page.drawText(line, { x: 60, y, size: 44, font: bold, color: rgb(1, 1, 1) });
        y -= 54;
      }
      for (const line of wrap(s.bullets.join(" "), regular, 20, W - 120)) {
        page.drawText(line, { x: 60, y: y - 10, size: 20, font: regular, color: rgb(1, 1, 1) });
        y -= 28;
      }
      page.drawText(footer(d), { x: 60, y: 52, size: 16, font: regular, color: rgb(1, 1, 1) });
      return;
    }
    page.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: hex(BRAND) });
    page.drawText(wrap(s.title, bold, 30, W - 80)[0] ?? "", { x: 40, y: H - 58, size: 30, font: bold, color: rgb(1, 1, 1) });
    let y = H - 140;
    for (const b of s.bullets) {
      const lines = wrap(b, regular, 22, W - 130);
      page.drawCircle({ x: 52, y: y + 7, size: 5, color: hex(BRAND) });
      for (const line of lines) {
        page.drawText(line, { x: 70, y, size: 22, font: regular, color: hex(INK) });
        y -= 30;
      }
      y -= 12;
    }
    foot(page, i);
  });
  return doc.save();
}

/* ───── PPTX ───── */

async function makePptx(d: DemoDeck): Promise<Uint8Array> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_16x9"; // 10 × 5.625 dyuym
  pres.title = d.title;
  pres.author = "EduSokh (namuna)";
  pres.defineSlideMaster({
    title: "CONTENT",
    background: { color: "FFFFFF" },
    objects: [{ rect: { x: 0, y: 0, w: 10, h: 0.95, fill: { color: BRAND } } }],
  });
  d.slides.forEach((s, i) => {
    if (i === 0) {
      const slide = pres.addSlide();
      slide.background = { color: BRAND };
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 4.4, w: 10, h: 1.225, fill: { color: COBALT } });
      slide.addText(s.title, { x: 0.6, y: 1.0, w: 8.8, h: 1.8, fontFace: "Arial", fontSize: 36, bold: true, color: "FFFFFF", valign: "bottom" });
      slide.addText(s.bullets.join(" "), { x: 0.6, y: 2.9, w: 8.8, h: 1.2, fontFace: "Arial", fontSize: 18, color: "FFFFFF", valign: "top" });
      slide.addText(footer(d), { x: 0.6, y: 4.65, w: 8.8, h: 0.6, fontFace: "Arial", fontSize: 14, color: "FFFFFF" });
      return;
    }
    const slide = pres.addSlide({ masterName: "CONTENT" });
    slide.addText(s.title, { x: 0.4, y: 0.12, w: 9.2, h: 0.72, fontFace: "Arial", fontSize: 26, bold: true, color: "FFFFFF" });
    slide.addText(
      s.bullets.map((b) => ({ text: b, options: { bullet: { indent: 18 }, paraSpaceAfter: 8 } })),
      { x: 0.5, y: 1.15, w: 9, h: 3.9, fontFace: "Arial", fontSize: 20, color: INK, valign: "top" },
    );
    slide.addText(`${footer(d)}   ${i + 1} / ${d.slides.length}`, { x: 0.4, y: 5.15, w: 9.2, h: 0.35, fontFace: "Arial", fontSize: 10, color: "64748B" });
  });
  return (await pres.write({ outputType: "nodebuffer" })) as Uint8Array;
}

/* ───── Namuna ro'yxati ───── */

async function demoDecks(): Promise<DemoDeck[]> {
  const decks: DemoDeck[] = [];
  const langs: DeckLang[] = ["uz", "tg"];

  // 1) Namunaviy darslar (turli sinf va fanlar) — curriculum.ts
  DEMO_LESSONS.forEach((l, i) => {
    const slides = buildSlides({ title: l.title, goal: l.goal, keyConcepts: l.keyConcepts, labKey: l.labKey, methods: l.methods })
      .filter((s) => s.kind === "title" || s.kind === "bullets");
    for (const lang of langs) {
      decks.push({
        id: `demo-${l.id}-${lang}`,
        title: l.title[lang],
        grade: l.grade,
        subject: l.subject,
        topic: l.title[lang],
        lang,
        format: i % 2 === 0 ? "pdf" : "pptx",
        slides: slides.map((s) => ({ title: s.title[lang], bullets: s.bullets?.[lang] ?? [] })),
      });
    }
  });

  // 2) 8-sinf fizika — qo'lda yozilgan darslardan
  const lessonsFile = "public/lessons/8-fizika.json";
  if (existsSync(lessonsFile)) {
    const data = JSON.parse(await readFile(lessonsFile, "utf8")) as SubjectLessons;
    const pick: [number, DeckFormat][] = [[1, "pdf"], [9, "pptx"], [13, "pdf"], [25, "pdf"], [41, "pptx"], [50, "pdf"]];
    for (const [n, format] of pick) {
      const entry = data.topics.find((t) => t.n === n);
      for (const lang of langs) {
        const tl = entry?.[lang];
        if (!tl) continue;
        decks.push({
          id: `demo-8-fizika-${n}-${lang}`,
          title: `§${n}. ${tl.title}`,
          grade: 8,
          subject: "fizika",
          topic: tl.title,
          lang,
          format,
          slides: tl.slides.map((s) => ({ title: s.title, bullets: s.bullets })),
          // Darsliklar katalogidagi mavzu (scripts/toc/fizika_8_*.json bilan bir xil raqam)
          topicId: `${lang === "uz" ? "fizika_8_uzb" : "fizika_8_tojik"}:${n}`,
        });
      }
    }
  }
  return decks;
}

async function main() {
  for (const f of ["arial.ttf", "arialbd.ttf"]) {
    if (!existsSync(path.join(FONT_DIR, f))) throw new Error(`${path.join(FONT_DIR, f)} topilmadi — FONT_DIR=<Arial papkasi> bilan ishga tushiring`);
  }
  const decks = await demoDecks();
  const keep = new Set(decks.map((d) => d.id));
  for (const old of await listDecks()) if (old.source === "demo" && !keep.has(old.id)) await removeDeck(old.id);

  const now = new Date().toISOString();
  for (const d of decks) {
    const data = Buffer.from(d.format === "pdf" ? await makePdf(d) : await makePptx(d));
    const pages = await inspectDeck(data, d.format); // yuklash API'si qiladigan tekshiruvning o'zi
    const file: SlideDeckFile = {
      id: d.id,
      title: d.title,
      grade: d.grade,
      subject: d.subject,
      topic: d.topic,
      lang: d.lang,
      format: d.format,
      bytes: data.length,
      pages,
      author: "EduSokh",
      source: "demo",
      createdAt: now,
      ...(d.topicId ? { topicId: d.topicId } : {}),
    };
    await addDeck(file, data);
    console.log(`✓ ${d.format.toUpperCase().padEnd(4)} ${d.lang} ${d.grade}-sinf ${d.subject}: ${d.title} (${pages} slayd)`);
  }
  console.log(`\n${decks.length} ta namuna slayd data/slides/ ga yozildi.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
