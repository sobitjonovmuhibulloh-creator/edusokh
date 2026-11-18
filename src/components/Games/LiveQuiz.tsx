"use client";

/**
 * PIN orqali jonli viktorina: o'qituvchi ekranida PIN va savol, o'quvchilar telefondan qo'shiladi.
 * Server: /api/games/live (holat har 1 soniyada so'raladi).
 */
import { useEffect, useState } from "react";
import { L, type Lang, type Localized } from "@/lib/i18n";
import type { GameQuestion } from "@/lib/games/types";
import { btnPrimary, NotEnough } from "./Games";

const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const x = (uz: string, tg: string, ru: string): Localized => ({ uz, tg, ru });
const T = {
  create: x("Viktorinani boshlash (PIN olish)", "Оғози викторина (гирифтани PIN)", "Начать викторину (получить PIN)"),
  joinAt: x("O'quvchilar telefonda shu manzilni ochib, PIN kiritadi:", "Хонандагон дар телефон ин суроғаро кушода, PIN ворид мекунанд:", "Ученики открывают адрес на телефоне и вводят PIN:"),
  players: x("Qo'shilganlar", "Ҳамроҳшудагон", "Участники"),
  start: x("Birinchi savol", "Саволи аввал", "Первый вопрос"),
  next: x("Keyingi savol", "Саволи навбатӣ", "Следующий вопрос"),
  reveal: x("Javobni ochish", "Кушодани ҷавоб", "Показать ответ"),
  answered: x("javob berdi", "ҷавоб дод", "ответили"),
  board: x("Reyting", "Рейтинг", "Рейтинг"),
  over: x("Viktorina tugadi", "Викторина тамом шуд", "Викторина окончена"),
  pin: x("PIN", "PIN", "PIN"),
  name: x("Ismingiz", "Номи шумо", "Ваше имя"),
  join: x("Qo'shilish", "Ҳамроҳ шудан", "Войти"),
  wait: x("O'qituvchi savolni ochishini kuting…", "Интизор шавед, муаллим саволро кушояд…", "Ждите, учитель откроет вопрос…"),
  sent: x("Javob yuborildi", "Ҷавоб фиристода шуд", "Ответ отправлен"),
  yourScore: x("Ballingiz", "Холи шумо", "Ваши баллы"),
  correct: x("To'g'ri!", "Дуруст!", "Верно!"),
  wrong: x("Noto'g'ri", "Нодуруст", "Неверно"),
} satisfies Record<string, Localized>;

interface State {
  pin: string;
  total: number;
  current: number;
  ended: boolean;
  revealed: boolean;
  question: { q: string; options: string[]; answer?: number } | null;
  players: number;
  answered: number;
  board: { name: string; score: number }[];
  me?: { name: string; score: number; answered: number | null };
  counts?: number[];
}

const post = async (body: unknown) => {
  const r = await fetch("/api/games/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};

function usePoll(query: string | null) {
  const [s, setS] = useState<State | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!query) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/games/live?${query}`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        if (alive) setS((await r.json()) as State);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e));
      }
    };
    void tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [query]);
  return { s, err };
}

function Board({ s, lang }: { s: State; lang: Lang }) {
  return (
    <div className="grid gap-1">
      <b>{L(T.board, lang)}</b>
      <ol className="grid gap-1">
        {s.board.map((p, i) => (
          <li key={i} className="flex justify-between rounded-lg bg-slate-50 px-3 py-1 dark:bg-slate-900">
            <span>
              {i + 1}. {p.name}
            </span>
            <b>{p.score}</b>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function LiveHost({ qs, lang }: { qs: GameQuestion[]; lang: Lang }) {
  const [host, setHost] = useState<{ pin: string; hostKey: string } | null>(null);
  const [err, setErr] = useState("");
  const { s } = usePoll(host ? `pin=${host.pin}&hostKey=${host.hostKey}` : null);
  if (qs.length < 1) return <NotEnough lang={lang} />;
  const act = (action: string) => host && post({ action, pin: host.pin, hostKey: host.hostKey }).catch((e) => setErr(String(e)));
  if (!host)
    return (
      <div className={`${card} grid justify-items-start gap-2`}>
        <button
          className={`${btnPrimary} px-5 py-3 text-base`}
          onClick={() =>
            post({ action: "create", questions: qs })
              .then((r) => setHost(r as { pin: string; hostKey: string }))
              .catch((e) => setErr(String(e)))
          }
        >
          📡 {L(T.create, lang)} ({qs.length})
        </button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div>
    );
  const joinUrl = `${location.origin}/simulator?tab=games&pin=${host.pin}`;
  return (
    <div className="grid gap-3">
      <div className={`${card} grid gap-1`}>
        <span className="text-sm text-slate-500">{L(T.joinAt, lang)}</span>
        <code className="break-all text-sm">{joinUrl}</code>
        <div className="text-5xl font-extrabold tracking-widest text-brand-600" data-testid="pin">
          {host.pin}
        </div>
        <span className="text-sm">
          {L(T.players, lang)}: <b>{s?.players ?? 0}</b>
        </span>
      </div>
      {s && !s.ended && s.question && (
        <div className={`${card} grid gap-2`}>
          <span className="text-xs text-slate-500">
            {s.current + 1}/{s.total} · {s.answered}/{s.players} {L(T.answered, lang)}
          </span>
          <p className="text-xl font-bold">{s.question.q}</p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {s.question.options.map((o, i) => (
              <li key={i} className={`rounded-lg border px-3 py-2 ${s.revealed && i === s.question?.answer ? "border-emerald-600 bg-emerald-50 font-bold dark:bg-emerald-900/40" : "border-slate-200 dark:border-slate-700"}`}>
                {String.fromCharCode(65 + i)}) {o} {s.revealed && <span className="float-right text-slate-500">{s.counts?.[i] ?? 0}</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      {s?.ended && <b className="text-2xl">🏁 {L(T.over, lang)}</b>}
      <div className="flex flex-wrap gap-2">
        {s && !s.ended && s.current < 0 && (
          <button className={btnPrimary} onClick={() => act("next")}>
            ▶ {L(T.start, lang)}
          </button>
        )}
        {s && !s.ended && s.current >= 0 && !s.revealed && (
          <button className={btnPrimary} onClick={() => act("reveal")}>
            {L(T.reveal, lang)}
          </button>
        )}
        {s && !s.ended && s.revealed && (
          <button className={btnPrimary} onClick={() => act("next")}>
            ▶ {L(T.next, lang)}
          </button>
        )}
      </div>
      {s && (s.revealed || s.ended) && <Board s={s} lang={lang} />}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function LivePlayer({ initialPin, lang }: { initialPin: string; lang: Lang }) {
  const [pin, setPin] = useState(initialPin);
  const [name, setName] = useState("");
  const [me, setMe] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const { s } = usePoll(me ? `pin=${pin}&playerId=${me}` : null);
  if (!me)
    return (
      <form
        className={`${card} mx-auto grid w-full max-w-sm gap-3`}
        onSubmit={(e) => {
          e.preventDefault();
          post({ action: "join", pin: pin.trim(), name })
            .then((r) => setMe((r as { playerId: string }).playerId))
            .catch((e2) => setErr(e2 instanceof Error ? e2.message : String(e2)));
        }}
      >
        <label className="grid gap-1">
          <span className="font-semibold">{L(T.pin, lang)}</span>
          <input className="rounded-lg border border-slate-300 bg-transparent px-3 py-3 text-center text-2xl tracking-widest dark:border-slate-600" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} maxLength={6} />
        </label>
        <label className="grid gap-1">
          <span className="font-semibold">{L(T.name, lang)}</span>
          <input className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>
        <button className={`${btnPrimary} py-3 text-base`} disabled={!pin || !name.trim()}>
          {L(T.join, lang)}
        </button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </form>
    );
  if (!s) return <p className="text-sm text-slate-500">…</p>;
  const q = s.question;
  const mine = s.me?.answered ?? null;
  return (
    <div className="mx-auto grid w-full max-w-md gap-3">
      <div className="flex justify-between text-sm">
        <b>{s.me?.name}</b>
        <span>
          {L(T.yourScore, lang)}: <b>{s.me?.score ?? 0}</b>
        </span>
      </div>
      {s.ended ? (
        <>
          <b className="text-2xl">🏁 {L(T.over, lang)}</b>
          <Board s={s} lang={lang} />
        </>
      ) : !q ? (
        <p className={`${card} text-center`}>{L(T.wait, lang)}</p>
      ) : (
        <div className={`${card} grid gap-2`}>
          <span className="text-xs text-slate-500">
            {s.current + 1}/{s.total}
          </span>
          <p className="text-lg font-bold">{q.q}</p>
          {q.options.map((o, i) => {
            const right = s.revealed && i === q.answer;
            const wrongPick = s.revealed && i === mine && i !== q.answer;
            return (
              <button
                key={i}
                disabled={mine != null || s.revealed}
                onClick={() => post({ action: "answer", pin, playerId: me, option: i }).catch((e) => setErr(String(e)))}
                className={`rounded-xl border-2 px-3 py-3 text-left ${right ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/40" : wrongPick ? "border-red-500 bg-red-50" : mine === i ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "border-slate-200 dark:border-slate-600"}`}
              >
                <b>{String.fromCharCode(65 + i)})</b> {o}
              </button>
            );
          })}
          {mine != null && !s.revealed && <p className="text-sm text-slate-500">{L(T.sent, lang)}</p>}
          {s.revealed && mine != null && <b className={mine === q.answer ? "text-emerald-600" : "text-red-600"}>{L(mine === q.answer ? T.correct : T.wrong, lang)}</b>}
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </div>
  );
}
