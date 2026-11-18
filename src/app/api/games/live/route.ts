/**
 * PIN orqali jonli viktorina (bitta server xotirasida; server qayta ishga tushsa o'yinlar o'chadi).
 *   POST { action: "create", questions }                → { pin, hostKey }
 *   POST { action: "join", pin, name }                  → { playerId }
 *   POST { action: "next" | "reveal" | "end", pin, hostKey }
 *   POST { action: "answer", pin, playerId, option }
 *   GET  ?pin=…&playerId=… | &hostKey=…                 → holat (o'quvchiga to'g'ri javob faqat ochilgandan keyin)
 * Ball: to'g'ri javob 100 + tezlik uchun 0–50.
 */
import { randomBytes, randomInt } from "node:crypto";
import type { GameQuestion } from "@/lib/games/types";
import { clean } from "@/lib/json-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Player {
  id: string;
  name: string;
  score: number;
  answers: Record<number, { option: number; at: number }>;
}
interface Session {
  pin: string;
  hostKey: string;
  questions: GameQuestion[];
  current: number; // -1 — kutish zali
  shownAt: number;
  revealed: boolean;
  ended: boolean;
  players: Player[];
  createdAt: number;
}

const g = globalThis as unknown as { __edusokhLive?: Map<string, Session> };
const sessions: Map<string, Session> = (g.__edusokhLive ??= new Map<string, Session>());
const QUESTION_MS = 30_000;

function cleanup() {
  const now = Date.now();
  for (const [pin, s] of sessions) if (now - s.createdAt > 6 * 3600_000) sessions.delete(pin);
}

const bad = (m: string, s = 400) => new Response(m, { status: s });

export async function POST(req: Request) {
  cleanup();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = typeof b.pin === "string" ? sessions.get(b.pin) : undefined;
  switch (b.action) {
    case "create": {
      const qs = (Array.isArray(b.questions) ? (b.questions as GameQuestion[]) : [])
        .slice(0, 50)
        .map((q) => ({ q: clean(q.q, 300), options: (q.options ?? []).slice(0, 6).map((o) => clean(o, 160)), answer: Number(q.answer), src: clean(q.src, 40) }))
        .filter((q) => q.q && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length);
      if (!qs.length) return bad("Savollar yo'q");
      if (sessions.size > 500) return bad("Juda ko'p o'yin", 429);
      let pin = "";
      do pin = String(randomInt(100000, 1000000));
      while (sessions.has(pin));
      const session: Session = { pin, hostKey: randomBytes(12).toString("hex"), questions: qs, current: -1, shownAt: 0, revealed: false, ended: false, players: [], createdAt: Date.now() };
      sessions.set(pin, session);
      return Response.json({ pin, hostKey: session.hostKey });
    }
    case "join": {
      if (!s || s.ended) return bad("PIN topilmadi", 404);
      const name = clean(b.name, 40);
      if (!name) return bad("Ismingizni yozing");
      if (s.players.length >= 100) return bad("O'yin to'lgan", 429);
      const p: Player = { id: randomBytes(8).toString("hex"), name, score: 0, answers: {} };
      s.players.push(p);
      return Response.json({ playerId: p.id });
    }
    case "next":
    case "reveal":
    case "end": {
      if (!s || b.hostKey !== s.hostKey) return bad("Ruxsat yo'q", 403);
      if (b.action === "reveal") s.revealed = true;
      else if (b.action === "end") s.ended = true;
      else if (s.current < s.questions.length - 1) {
        s.current += 1;
        s.shownAt = Date.now();
        s.revealed = false;
      } else s.ended = true;
      return Response.json({ ok: true });
    }
    case "answer": {
      if (!s || s.current < 0 || s.revealed || s.ended) return bad("Hozir javob qabul qilinmaydi", 409);
      const p = s.players.find((x) => x.id === b.playerId);
      if (!p) return bad("O'yinchi topilmadi", 404);
      if (p.answers[s.current]) return bad("Javob berilgan", 409);
      const option = Number(b.option);
      const q = s.questions[s.current];
      if (!(option >= 0 && option < q.options.length)) return bad("Variant noto'g'ri");
      const at = Date.now();
      p.answers[s.current] = { option, at };
      if (option === q.answer) p.score += 100 + Math.round(50 * Math.max(0, 1 - (at - s.shownAt) / QUESTION_MS));
      return Response.json({ ok: true });
    }
  }
  return bad("Noma'lum amal");
}

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const s = sessions.get(u.get("pin") ?? "");
  if (!s) return bad("PIN topilmadi", 404);
  const host = u.get("hostKey") === s.hostKey;
  const me = s.players.find((p) => p.id === u.get("playerId"));
  if (!host && !me) return bad("Ruxsat yo'q", 403);
  const q = s.current >= 0 ? s.questions[s.current] : null;
  const board = [...s.players].sort((a, b) => b.score - a.score).map((p) => ({ name: p.name, score: p.score }));
  return Response.json(
    {
      pin: s.pin,
      total: s.questions.length,
      current: s.current,
      ended: s.ended,
      revealed: s.revealed,
      question: q ? { q: q.q, options: q.options, ...(s.revealed || host ? { answer: q.answer } : {}) } : null,
      players: s.players.length,
      answered: s.current >= 0 ? s.players.filter((p) => p.answers[s.current]).length : 0,
      board: host || s.revealed || s.ended ? board.slice(0, 20) : [],
      ...(me ? { me: { name: me.name, score: me.score, answered: s.current >= 0 ? (me.answers[s.current]?.option ?? null) : null } } : {}),
      ...(host && q ? { counts: q.options.map((_, i) => s.players.filter((p) => p.answers[s.current]?.option === i).length) } : {}),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
