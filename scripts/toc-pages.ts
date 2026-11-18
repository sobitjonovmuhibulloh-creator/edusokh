/**
 * Darslik mundarijasini qo'lda o'qish uchun betlarni rasmga aylantiradi.
 * PDF to'liq yuklanmaydi: portal "Range" so'rovlarini qo'llaydi, pdf.js faqat kerakli qismlarni oladi.
 *
 *   npm run catalog:toc-pages -- kimyo_7_uzb                       → .cache/toc/kimyo_7_uzb/sheet.jpg
 *        (boshidagi 4 va oxiridagi 8 betning kichik rasmlari bitta varaqda — mundarija qayerdaligini topish uchun)
 *   npm run catalog:toc-pages -- kimyo_7_uzb --pages 2,158,159     → p2.jpg, p158.jpg, p159.jpg (o'qish sifatida)
 *   npm run catalog:toc-pages -- --grade 7 --lang uz               → shu sinf/tildagi, mundarijasi hali yo'q kitoblar uchun varaqlar
 *
 * PDF'da matn qatlami bo'lsa, betlar matni ham yoziladi (text.txt) — rasmni o'qishdan oldin shuni tekshiring.
 */
import { createCanvas } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";

interface BookRow {
  grade: number;
  lang: string;
  sourceUrl: string;
}

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const ids = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const pagesArg = opt("pages");
const OUT = path.resolve(".cache", "toc");

async function open(url: string): Promise<PDFDocumentProxy> {
  // Mahalliy nusxa bo'lsa (kitob avval ochilgan), undan; aks holda Range so'rovlari bilan
  const local = path.join(".cache", "books", path.basename(new URL(url).pathname));
  if (existsSync(local)) return getDocument({ data: new Uint8Array(await readFile(local)), verbosity: 0 }).promise;
  return getDocument({ url, disableAutoFetch: true, disableStream: true, rangeChunkSize: 256 * 1024, httpHeaders: { "User-Agent": "EduSokh/0.1 (katalog)" }, verbosity: 0 }).promise;
}

async function render(pdf: PDFDocumentProxy, n: number, width: number) {
  const page = await pdf.getPage(n);
  const base = page.getViewport({ scale: 1 });
  const vp = page.getViewport({ scale: width / base.width });
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, canvas: canvas as unknown as HTMLCanvasElement, viewport: vp }).promise;
  return canvas;
}

async function pageText(pdf: PDFDocumentProxy, n: number) {
  const tc = await (await pdf.getPage(n)).getTextContent();
  return tc.items.map((i) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " ").trim();
}

async function sheet(id: string, pdf: PDFDocumentProxy, dir: string) {
  const N = pdf.numPages;
  const pages = Array.from(new Set([1, 2, 3, 4, ...Array.from({ length: 8 }, (_, i) => N - 7 + i)])).filter((p) => p >= 1 && p <= N);
  const W = 300;
  const thumbs = [];
  for (const p of pages) thumbs.push({ p, c: await render(pdf, p, W) });
  const cols = 6;
  const rowH = Math.max(...thumbs.map((t) => t.c.height)) + 28;
  const out = createCanvas(cols * (W + 8) + 8, Math.ceil(thumbs.length / cols) * rowH + 8);
  const ctx = out.getContext("2d");
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(0, 0, out.width, out.height);
  thumbs.forEach((t, i) => {
    const x = 8 + (i % cols) * (W + 8);
    const y = 8 + Math.floor(i / cols) * rowH;
    ctx.fillStyle = "#b91c1c";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`PDF ${t.p}/${N}`, x, y + 18);
    ctx.drawImage(t.c, x, y + 24);
  });
  await writeFile(path.join(dir, "sheet.jpg"), out.toBuffer("image/jpeg", 72));
  // Matn qatlami bormi
  let text = "";
  for (const p of pages) text += `\n--- PDF ${p} ---\n${await pageText(pdf, p)}`;
  const chars = text.replace(/--- PDF \d+ ---/g, "").replace(/\s/g, "").length;
  if (chars > 300) await writeFile(path.join(dir, "text.txt"), text);
  console.log(`✓ ${id}: ${N} bet, varaq: .cache/toc/${id}/sheet.jpg${chars > 300 ? `, matn qatlami bor (${chars} belgi) → text.txt` : ""}`);
}

async function main() {
  const books = JSON.parse(await readFile("public/books/index.json", "utf8")) as BookRow[];
  const urlOf = (id: string) => books.find((b) => path.basename(new URL(b.sourceUrl).pathname).replace(/\.pdf$/i, "") === id)?.sourceUrl;
  let list = ids;
  if (!list.length && opt("grade")) {
    const g = Number(opt("grade"));
    const lang = opt("lang");
    list = Array.from(new Set(books.filter((b) => b.grade === g && (!lang || b.lang === lang)).map((b) => path.basename(new URL(b.sourceUrl).pathname).replace(/\.pdf$/i, "")))).filter((id) => !existsSync(`scripts/toc/${id}.json`));
  }
  if (!list.length) {
    console.error("Foydalanish: npm run catalog:toc-pages -- <kitobId> [--pages 2,170] | --grade 7 [--lang uz]");
    process.exit(1);
  }
  for (const id of list) {
    const url = urlOf(id);
    if (!url) {
      console.error(`✗ ${id}: darsliklar ro'yxatida yo'q`);
      continue;
    }
    const dir = path.join(OUT, id);
    await mkdir(dir, { recursive: true });
    try {
      const pdf = await open(url);
      if (pagesArg) {
        for (const p of pagesArg.split(",").map(Number).filter((p) => p >= 1 && p <= pdf.numPages)) {
          await writeFile(path.join(dir, `p${p}.jpg`), (await render(pdf, p, 1000)).toBuffer("image/jpeg", 82));
          const t = await pageText(pdf, p);
          if (t.length > 80) await writeFile(path.join(dir, `p${p}.txt`), t);
          console.log(`✓ ${id}: .cache/toc/${id}/p${p}.jpg${t.length > 80 ? " (+ matn)" : ""}`);
        }
      } else await sheet(id, pdf, dir);
      await pdf.destroy();
    } catch (e) {
      console.error(`✗ ${id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

main();
