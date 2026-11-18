/**
 * O'qituvchi kiritgan o'yin to'plamlari (mavzu bo'yicha): savollar, juftliklar, guruhlar.
 *   GET ?topicId=…   — shu mavzu to'plami (yo'q bo'lsa {})
 *   POST GameSet     — saqlash (almashtiradi)
 * data/game-sets.json
 */
import { TOPIC_ID_RE, type GameSet } from "@/lib/games/types";
import { clean, readStore, writable, writeStore } from "@/lib/json-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const FILE = "game-sets.json";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("topicId") ?? "";
  const all = await readStore<Record<string, GameSet>>(FILE, {});
  return Response.json(all[id] ?? { topicId: id }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!writable()) return new Response("Avtorizatsiya talab qilinadi", { status: 401 });
  const b = (await req.json().catch(() => null)) as GameSet | null;
  if (!b || !TOPIC_ID_RE.test(b.topicId ?? "")) return new Response("Mavzu noto'g'ri", { status: 400 });
  const set: GameSet = {
    topicId: b.topicId,
    questions: (b.questions ?? [])
      .slice(0, 100)
      .map((q) => ({ q: clean(q.q, 300), options: (q.options ?? []).slice(0, 6).map((o) => clean(o, 160)).filter(Boolean), answer: Number(q.answer) || 0, src: "O'qituvchi" }))
      .filter((q) => q.q && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length),
    pairs: (b.pairs ?? []).slice(0, 40).map((p) => ({ a: clean(p.a, 120), b: clean(p.b, 120) })).filter((p) => p.a && p.b),
    groups: (b.groups ?? []).slice(0, 6).map((g) => ({ name: clean(g.name, 60), items: (g.items ?? []).slice(0, 15).map((i) => clean(i, 80)).filter(Boolean) })).filter((g) => g.name && g.items.length),
    author: clean(b.author, 80),
    updatedAt: new Date().toISOString(),
  };
  const all = await readStore<Record<string, GameSet>>(FILE, {});
  all[set.topicId] = set;
  await writeStore(FILE, all);
  return Response.json(set);
}
