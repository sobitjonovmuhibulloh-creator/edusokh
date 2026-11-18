/**
 * Slayd kutubxonasini saqlash (faqat server): data/slides/index.json + data/slides/files/<id>.<format>.
 * Supabase Storage / Prisma'ga o'tilganda shu fayldagi funksiyalarni almashtirish kifoya.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import type { DeckFormat, SlideDeckFile } from "./slide-library";

const ROOT = path.resolve("data", "slides");
const INDEX = path.join(ROOT, "index.json");
const FILES = path.join(ROOT, "files");

export const deckPath = (d: Pick<SlideDeckFile, "id" | "format">) => path.join(FILES, `${d.id}.${d.format}`);

export async function listDecks(): Promise<SlideDeckFile[]> {
  return existsSync(INDEX) ? (JSON.parse(await readFile(INDEX, "utf8")) as SlideDeckFile[]) : [];
}

async function saveIndex(decks: SlideDeckFile[]) {
  await mkdir(ROOT, { recursive: true });
  const tmp = `${INDEX}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(decks, null, 2));
  await rename(tmp, INDEX);
}

export async function addDeck(deck: SlideDeckFile, data: Uint8Array) {
  await mkdir(FILES, { recursive: true });
  await writeFile(deckPath(deck), data);
  const decks = await listDecks();
  await saveIndex([deck, ...decks.filter((d) => d.id !== deck.id)]);
}

export async function removeDeck(id: string): Promise<boolean> {
  const decks = await listDecks();
  const deck = decks.find((d) => d.id === id);
  if (!deck) return false;
  await rm(deckPath(deck), { force: true });
  await saveIndex(decks.filter((d) => d.id !== id));
  return true;
}

/* ───── ZIP (PPTX) o'qish: tashqi paketsiz, faqat markaziy katalog va deflate ───── */

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  offset: number;
}

function zipEntries(buf: Buffer): ZipEntry[] {
  // End of central directory yozuvi faylning oxirgi ~64 KB ichida
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP emas");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("ZIP katalogi buzilgan");
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    out.push({
      method: buf.readUInt16LE(p + 10),
      compressedSize: buf.readUInt32LE(p + 20),
      size: buf.readUInt32LE(p + 24),
      offset: buf.readUInt32LE(p + 42),
      name: buf.toString("utf8", p + 46, p + 46 + nameLen),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function zipRead(buf: Buffer, e: ZipEntry): Buffer {
  const start = e.offset + 30 + buf.readUInt16LE(e.offset + 26) + buf.readUInt16LE(e.offset + 28);
  const raw = buf.subarray(start, start + e.compressedSize);
  if (e.method === 0) return raw;
  if (e.method === 8) return inflateRawSync(raw, { maxOutputLength: 20 * 1024 * 1024 });
  throw new Error("Qo'llab-quvvatlanmaydigan siqish usuli");
}

const slideNo = (name: string) => Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&");

/** PPTX slaydlarining matni: har slayd — paragraflar ro'yxati */
export function pptxText(buf: Buffer): string[][] {
  const entries = zipEntries(buf)
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.name))
    .sort((a, b) => slideNo(a.name) - slideNo(b.name));
  return entries.map((e) => {
    const xml = zipRead(buf, e).toString("utf8");
    return Array.from(xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g))
      .map((m) => Array.from(m[1].matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((t) => decodeXml(t[1])).join(""))
      .map((s) => s.trim())
      .filter(Boolean);
  });
}

/**
 * Fayl haqiqatan e'lon qilingan formatdami — kengaytmaga emas, ichidagi baytlarga qaraymiz.
 * Qaytaradi: slaydlar/betlar soni. Xavfli yoki noto'g'ri fayl bo'lsa Error.
 */
export async function inspectDeck(buf: Buffer, format: DeckFormat): Promise<number> {
  if (format === "pdf") {
    if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Fayl PDF emas");
    // JavaScript, tashqi dastur ishga tushirish yoki ichiga joylangan fayli bor PDF'larni qabul qilmaymiz
    // (siqilgan obyekt oqimlari ichidagisini ko'rmaydi — production'da antivirus tekshiruvi ham qo'shing)
    if (/\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(buf.toString("latin1"))) throw new Error("PDF ichida skript yoki ilova qilingan fayl bor — qabul qilinmaydi");
    try {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: false, updateMetadata: false });
      return doc.getPageCount();
    } catch {
      throw new Error("PDF ochilmadi (buzilgan yoki parol bilan himoyalangan)");
    }
  }
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error("Fayl PPTX emas");
  const names = zipEntries(buf).map((e) => e.name);
  if (!names.includes("ppt/presentation.xml") || !names.includes("[Content_Types].xml")) throw new Error("Fayl PPTX emas");
  if (names.some((n) => /vbaProject\.bin$|\.(exe|dll|bat|cmd|js|vbs|ps1|scr)$/i.test(n) || n.includes(".."))) throw new Error("Faylda makros yoki bajariladigan fayl bor — qabul qilinmaydi");
  return names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length;
}
