/**
 * Mavzuga biriktirilgan tashqi materiallar havolalari (slayd, video, boshqa).
 * Fayl ko'chirilmaydi va manba saytidan hech narsa yuklanmaydi — faqat o'qituvchi kiritgan havola saqlanadi.
 *   GET ?topicId=…        — shu mavzu havolalari
 *   POST { topicId, kind, url, title, lang, note }
 *   DELETE ?id=…
 * data/material-links.json
 */
import { randomUUID } from "node:crypto";
import { TOPIC_ID_RE, type MaterialLink } from "@/lib/games/types";
import { clean, readStore, writable, writeStore } from "@/lib/json-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FILE = "material-links.json";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("topicId") ?? "";
  const all = await readStore<MaterialLink[]>(FILE, []);
  return Response.json(all.filter((l) => l.topicId === id), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!writable()) return new Response("Avtorizatsiya talab qilinadi", { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const topicId = clean(b.topicId, 80);
  let url: URL;
  try {
    url = new URL(clean(b.url, 600));
  } catch {
    return new Response("Havola noto'g'ri", { status: 400 });
  }
  if (!TOPIC_ID_RE.test(topicId)) return new Response("Mavzu noto'g'ri", { status: 400 });
  if (url.protocol !== "https:") return new Response("Faqat https:// havolalar", { status: 400 });
  const kind = b.kind === "video" || b.kind === "slide" ? b.kind : "other";
  const lang = ["uz", "tg", "ru"].includes(String(b.lang)) ? (b.lang as MaterialLink["lang"]) : "other";
  const title = clean(b.title, 200) || url.hostname;
  const link: MaterialLink = { id: randomUUID(), topicId, kind, url: url.href, title, lang, source: url.hostname.replace(/^www\./, ""), note: clean(b.note, 300), addedAt: new Date().toISOString() };
  const all = await readStore<MaterialLink[]>(FILE, []);
  all.push(link);
  await writeStore(FILE, all.slice(-5000));
  return Response.json(link, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!writable()) return new Response("Avtorizatsiya talab qilinadi", { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const all = await readStore<MaterialLink[]>(FILE, []);
  if (!all.some((l) => l.id === id)) return new Response("Topilmadi", { status: 404 });
  await writeStore(FILE, all.filter((l) => l.id !== id));
  return new Response(null, { status: 204 });
}
