/**
 * O'qituvchi qo'shgan mavzu videolari (YouTube havolasi).
 *   GET                                  — barcha qo'shilgan videolar { "<sinf>-<fan>-<n>-<til>": TopicVideo }
 *   POST   { grade, subject, n, lang, url } yoki { topicId, url } — videoni saqlash (sarlavha YouTube oEmbed orqali olinadi, kalit kerak emas)
 *   DELETE { grade, subject, n, lang }      — videoni o'chirish
 * Hozircha data/topic-videos.json fayliga yoziladi. Yozish faqat DEMO_AUTH=true da ochiq —
 * haqiqiy avtorizatsiya ulanganda requireRole(req, ["TEACHER", ...]) bilan almashtiring.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TopicVideo } from "@/lib/lesson-content";
import { TOPIC_ID_RE } from "@/lib/games/types";
import { OFFICIAL_CHANNELS } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.resolve("data", "topic-videos.json");
type Store = Record<string, TopicVideo>;

async function load(): Promise<Store> {
  return existsSync(FILE) ? (JSON.parse(await readFile(FILE, "utf8")) as Store) : {};
}

async function save(store: Store) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2));
  await rename(tmp, FILE);
}

/** youtube.com/watch?v=, youtu.be/, /shorts/, /embed/, /live/ havolalaridan video ID */
function parseVideoId(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^(www|m|music)\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function parseKey(body: Record<string, unknown>): string | null {
  // Darsliklar katalogidagi mavzu: "<kitobId>:<n>"
  if (typeof body.topicId === "string") return TOPIC_ID_RE.test(body.topicId) ? body.topicId : null;
  const { grade, subject, n, lang } = body;
  if (!Number.isInteger(grade) || !Number.isInteger(n)) return null;
  if (typeof subject !== "string" || !/^[a-z_]+$/.test(subject)) return null;
  if (lang !== "uz" && lang !== "tg") return null;
  return `${grade}-${subject}-${n}-${lang}`;
}

const writable = () => process.env.DEMO_AUTH === "true" || process.env.NODE_ENV === "development";

export async function GET() {
  return Response.json(await load(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!writable()) return new Response("Avtorizatsiya talab qilinadi", { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const key = parseKey(body);
  const id = typeof body.url === "string" ? parseVideoId(body.url) : null;
  if (!key || !id) return new Response("Noto'g'ri so'rov yoki YouTube havolasi", { status: 400 });

  // oEmbed: video mavjudligi va joylashtirishga ruxsatini tekshiradi, sarlavha va kanalni beradi
  const oembed = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`).catch(() => null);
  if (!oembed?.ok) return new Response("Video topilmadi yoki uni saytga joylashtirish taqiqlangan", { status: 422 });
  const meta = (await oembed.json()) as { title?: string; author_name?: string; author_url?: string };
  const channel = meta.author_name ?? "";
  const video: TopicVideo = {
    id,
    title: meta.title ?? id,
    channel,
    official: Object.values(OFFICIAL_CHANNELS).includes(channel) || Object.keys(OFFICIAL_CHANNELS).some((c) => meta.author_url?.includes(c)),
  };

  const store = await load();
  store[key] = video;
  await save(store);
  return Response.json(video);
}

export async function DELETE(req: Request) {
  if (!writable()) return new Response("Avtorizatsiya talab qilinadi", { status: 401 });
  const key = parseKey((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if (!key) return new Response("Noto'g'ri so'rov", { status: 400 });
  const store = await load();
  delete store[key];
  await save(store);
  return new Response(null, { status: 204 });
}
