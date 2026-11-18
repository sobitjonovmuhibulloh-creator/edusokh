/**
 * GET /api/books/file?u=<rasmiy portal PDF manzili>
 * Darslikni o'z saytimiz orqali beradi: birinchi so'rovda rasmiy portaldan olib, .cache/books ga
 * saqlaydi (foydalanuvchiga parallel uzatib turadi), keyingilarida diskdan beradi.
 * Faqat rasmiy portalning darsliklar papkasidagi PDF'larga ruxsat beriladi.
 */
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = /^https:\/\/old\.eduportal\.uz\/Umumiyfiles\/darsliklar\/\d{1,2}\/[A-Za-z0-9_.-]+\.pdf$/;
const CACHE_DIR = path.resolve(".cache", "books");

const headers = (name: string, size?: number): HeadersInit => ({
  "Content-Type": "application/pdf",
  "Content-Disposition": `inline; filename="${name}"`,
  "Cache-Control": "public, max-age=86400",
  ...(size ? { "Content-Length": String(size) } : {}),
});

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u") ?? "";
  if (!ALLOWED.test(u)) return new Response("Ruxsat etilmagan manzil", { status: 400 });
  const name = path.basename(new URL(u).pathname);
  const file = path.join(CACHE_DIR, name);

  if (existsSync(file)) {
    const { size } = await stat(file);
    return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { headers: headers(name, size) });
  }

  const upstream = await fetch(u, { headers: { "User-Agent": "EduSokh/0.1" } });
  if (!upstream.ok || !upstream.body) return new Response("Rasmiy portal javob bermadi", { status: 502 });

  // Bir oqimni ikkiga bo'lamiz: biri foydalanuvchiga, biri diskka (keyingi safar tez ochilishi uchun)
  const [toClient, toDisk] = upstream.body.tee();
  await mkdir(CACHE_DIR, { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.part`;
  const out = createWriteStream(tmp);
  Readable.fromWeb(toDisk as import("node:stream/web").ReadableStream)
    .on("error", () => rm(tmp, { force: true }).catch(() => undefined))
    .pipe(out)
    .on("finish", () => rename(tmp, file).catch(() => rm(tmp, { force: true }).catch(() => undefined)))
    .on("error", () => rm(tmp, { force: true }).catch(() => undefined));

  const size = Number(upstream.headers.get("content-length")) || undefined;
  return new Response(toClient, { headers: headers(name, size) });
}
