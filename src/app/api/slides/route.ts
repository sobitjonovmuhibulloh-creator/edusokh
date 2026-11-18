/**
 * Slayd kutubxonasi.
 *   GET                         — barcha slaydlar ro'yxati (filtrlash brauzerda)
 *   POST multipart/form-data    — file, title, grade, subject, topic, lang, author: PDF/PPTX yuklash
 *   DELETE ?id=...              — slaydni o'chirish
 * Yozish faqat DEMO_AUTH=true yoki dev rejimida ochiq — haqiqiy avtorizatsiya ulanganda
 * requireRole(req, ["TEACHER", "ADMIN"]) bilan almashtiring.
 */
import { randomUUID } from "node:crypto";
import { SUBJECTS, type SubjectCode } from "@/lib/curriculum";
import { DECK_LANGS, MAX_DECK_BYTES, type DeckFormat, type DeckLang, type SlideDeckFile } from "@/lib/slide-library";
import { addDeck, inspectDeck, listDecks, removeDeck } from "@/lib/slide-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const writable = () => process.env.DEMO_AUTH === "true" || process.env.NODE_ENV === "development";
const bad = (msg: string, status = 400) => new Response(msg, { status });
/** Boshqaruv belgilarini olib tashlab, uzunligini cheklaymiz */
const clean = (v: FormDataEntryValue | null, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");

export async function GET() {
  return Response.json(await listDecks(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!writable()) return bad("Avtorizatsiya talab qilinadi", 401);
  const len = Number(req.headers.get("content-length"));
  if (len > MAX_DECK_BYTES + 64 * 1024) return bad("Fayl 50 MB dan katta", 413);

  const form = await req.formData().catch(() => null);
  if (!form) return bad("Forma o'qilmadi");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return bad("Fayl tanlanmagan");
  if (file.size > MAX_DECK_BYTES) return bad("Fayl 50 MB dan katta", 413);

  const ext = file.name.toLowerCase().match(/\.(pdf|pptx)$/)?.[1] as DeckFormat | undefined;
  if (!ext) return bad("Faqat .pdf va .pptx fayllar qabul qilinadi");

  const grade = Number(form.get("grade"));
  const subject = clean(form.get("subject"), 40);
  const lang = clean(form.get("lang"), 2);
  const title = clean(form.get("title"), 160) || file.name.replace(/\.(pdf|pptx)$/i, "").slice(0, 160);
  const topic = clean(form.get("topic"), 200);
  if (!Number.isInteger(grade) || grade < 1 || grade > 11) return bad("Sinf noto'g'ri");
  if (!(subject in SUBJECTS)) return bad("Fan noto'g'ri");
  if (!(DECK_LANGS as readonly string[]).includes(lang)) return bad("Til noto'g'ri");
  if (!topic) return bad("Mavzuni yozing");

  const buf = Buffer.from(await file.arrayBuffer());
  let pages: number;
  try {
    pages = await inspectDeck(buf, ext);
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Fayl tekshiruvdan o'tmadi", 415);
  }

  const deck: SlideDeckFile = {
    id: randomUUID(),
    title,
    grade,
    subject: subject as SubjectCode,
    topic,
    lang: lang as DeckLang,
    format: ext,
    bytes: buf.length,
    pages,
    author: clean(form.get("author"), 120),
    source: "upload",
    createdAt: new Date().toISOString(),
  };
  await addDeck(deck, buf);
  return Response.json(deck, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!writable()) return bad("Avtorizatsiya talab qilinadi", 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  return (await removeDeck(id)) ? new Response(null, { status: 204 }) : bad("Topilmadi", 404);
}
