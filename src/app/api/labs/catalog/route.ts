/**
 * Administrator qo'shgan laboratoriya mavzulari (o'rnatilgan katalogga qo'shimcha).
 *   GET                — ro'yxat
 *   POST  JSON         — { grade, subject, titleUz, titleTg, textLang: "uz" | "tg", goal?, theory?: string[], steps?: string[], lab?: "circuit" | "balance" | "logic" | "model:<key>" }
 *                        maqsad, nazariya va qadamlar textLang tilida saqlanadi (tarjima qilinmaydi)
 *   DELETE ?id=...     — o'chirish
 * Saqlash: data/lab-catalog.json. Yozish faqat DEMO_AUTH=true yoki dev rejimida ochiq —
 * haqiqiy avtorizatsiya ulanganda requireRole(req, ["ADMIN"]) bilan almashtiring.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { SUBJECTS, type SubjectCode } from "@/lib/curriculum";
import type { CatalogTopic, LabRef } from "@/lib/labs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.resolve("data", "lab-catalog.json");
const MODEL_KEYS = ["circuit", "induction", "lens", "projectile", "atom", "molecule", "reaction", "cell", "skeleton", "heart", "solids", "section", "solar", "seasons", "earth-layers", "robot", "monument", "vocab"];
const writable = () => process.env.DEMO_AUTH === "true" || process.env.NODE_ENV === "development";
const bad = (msg: string, status = 400) => new Response(msg, { status });
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");
const lines = (v: unknown) => (Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : []).map((s) => clean(s, 400)).filter(Boolean).slice(0, 20);

async function load(): Promise<CatalogTopic[]> {
  return existsSync(FILE) ? (JSON.parse(await readFile(FILE, "utf8")) as CatalogTopic[]) : [];
}

async function save(list: CatalogTopic[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(list, null, 2));
  await rename(tmp, FILE);
}

export async function GET() {
  return Response.json(await load(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!writable()) return bad("Avtorizatsiya talab qilinadi", 401);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return bad("JSON o'qilmadi");
  const grade = Number(b.grade);
  const subject = clean(b.subject, 40);
  const titleUz = clean(b.titleUz, 200);
  const titleTg = clean(b.titleTg, 200);
  if (!Number.isInteger(grade) || grade < 1 || grade > 11) return bad("Sinf noto'g'ri");
  if (!(subject in SUBJECTS)) return bad("Fan noto'g'ri");
  if (!titleUz && !titleTg) return bad("Mavzu nomini yozing");

  const lab = clean(b.lab, 40);
  let labs: LabRef[] = [];
  if (lab === "circuit" || lab === "balance" || lab === "logic") labs = [{ kind: lab }];
  else if (lab.startsWith("model:") && MODEL_KEYS.includes(lab.slice(6))) labs = [{ kind: "model", key: lab.slice(6) }];
  else if (lab) return bad("Laboratoriya noto'g'ri");

  const theory = lines(b.theory);
  const steps = lines(b.steps);
  const textLang = b.textLang === "tg" ? "tg" : "uz";
  const inLang = (s: string) => (textLang === "tg" ? { uz: "", tg: s } : { uz: s, tg: "" });
  const goal = clean(b.goal, 400);
  const topic: CatalogTopic = {
    id: `a-${randomUUID()}`,
    grade,
    subject: subject as SubjectCode,
    // Tarjima bo'lmasa bo'sh qoladi — interfeys asl tilini ko'rsatadi, avtomatik tarjima qilmaydi
    title: { uz: titleUz, tg: titleTg },
    status: labs.length ? "model" : theory.length ? "theory" : "planned",
    labs,
    source: "admin",
    ...(goal ? { goal: inLang(goal) } : {}),
    ...(theory.length ? { theory: theory.map(inLang) } : {}),
    ...(steps.length ? { steps: steps.map(inLang) } : {}),
  };
  const list = await load();
  list.push(topic);
  await save(list);
  return Response.json(topic, { status: 201 });
}

export async function DELETE(req: Request) {
  if (!writable()) return bad("Avtorizatsiya talab qilinadi", 401);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const list = await load();
  if (!list.some((t) => t.id === id)) return bad("Topilmadi", 404);
  await save(list.filter((t) => t.id !== id));
  return new Response(null, { status: 204 });
}
