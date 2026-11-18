/** data/*.json fayllariga xavfsiz (atomar) yozish — kichik ma'lumotlar uchun (faqat server) */
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readStore<T>(name: string, fallback: T): Promise<T> {
  const file = path.resolve("data", name);
  return existsSync(file) ? (JSON.parse(await readFile(file, "utf8")) as T) : fallback;
}

export async function writeStore(name: string, data: unknown) {
  const file = path.resolve("data", name);
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, file);
}

/** Yozish faqat DEMO_AUTH=true yoki dev rejimida — haqiqiy avtorizatsiya ulanganda requireRole bilan almashtiring */
export const writable = () => process.env.DEMO_AUTH === "true" || process.env.NODE_ENV === "development";

/** Boshqaruv belgilarini olib tashlab, uzunligini cheklaydi */
export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
