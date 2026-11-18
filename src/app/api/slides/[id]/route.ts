/**
 * Bitta slayd fayli.
 *   GET /api/slides/<id>              — faylni berish (PDF brauzerda ochiladi, PPTX yuklab olinadi)
 *   GET /api/slides/<id>?download=1   — har doim yuklab olish
 *   GET /api/slides/<id>?preview=1    — PPTX slaydlari matni (JSON), brauzerda ko'rsatish uchun
 */
import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { deckPath, listDecks, pptxText } from "@/lib/slide-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deck = (await listDecks()).find((d) => d.id === id);
  const file = deck && deckPath(deck);
  if (!deck || !file || !existsSync(file)) return new Response("Topilmadi", { status: 404 });

  const q = new URL(req.url).searchParams;
  if (q.has("preview")) {
    if (deck.format !== "pptx") return new Response("Faqat PPTX uchun", { status: 400 });
    try {
      return Response.json(pptxText(await readFile(file)));
    } catch {
      return new Response("Slaydlarni o'qib bo'lmadi", { status: 422 });
    }
  }

  const name = `${deck.title}.${deck.format}`;
  const inline = deck.format === "pdf" && !q.has("download");
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": MIME[deck.format],
      "Content-Length": String(deck.bytes),
      // Sarlavhadagi kirill/o'zbekcha belgilar uchun RFC 5987 (filename*)
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${deck.id}.${deck.format}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
