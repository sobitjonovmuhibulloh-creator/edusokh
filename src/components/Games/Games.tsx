"use client";

/**
 * EduSokh Games: sinf ichida o'ynaladigan o'yinlar. Hammasi mavzu savollari / juftliklari / guruhlaridan foydalanadi,
 * javoblarni tekshiradi va natijani ko'rsatadi. Jonli PIN viktorina — LiveQuiz.tsx.
 */
import { useEffect, useMemo, useState } from "react";
import { L, type Lang, type Localized } from "@/lib/i18n";
import { shuffle } from "@/lib/games/gather";
import type { GameGroup, GamePair, GameQuestion } from "@/lib/games/types";

export const btn = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
export const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50";
const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";

const x = (uz: string, tg: string, ru: string): Localized => ({ uz, tg, ru });
export const GT = {
  team: x("Jamoa", "Даста", "Команда"),
  wins: x("g'alaba qildi!", "ғалаба кард!", "победила!"),
  again: x("Qaytadan", "Аз нав", "Заново"),
  correct: x("To'g'ri!", "Дуруст!", "Верно!"),
  wrong: x("Noto'g'ri", "Нодуруст", "Неверно"),
  answer: x("Javob", "Ҷавоб", "Ответ"),
  show: x("Javobni ko'rsatish", "Нишон додани ҷавоб", "Показать ответ"),
  spin: x("Aylantirish", "Гардондан", "Крутить"),
  wheelMode: x("Barabanda", "Дар барабан", "На барабане"),
  questions: x("Savollar", "Саволҳо", "Вопросы"),
  students: x("O'quvchilar", "Хонандагон", "Ученики"),
  namesHint: x("O'quvchilar ismlari (har qatorda bitta)", "Номҳои хонандагон (дар ҳар сатр як)", "Имена учеников (по одному в строке)"),
  score: x("Natija", "Натиҷа", "Результат"),
  mistakes: x("xato", "хато", "ошибок"),
  check: x("Tekshirish", "Санҷиш", "Проверить"),
  pickGroup: x("Tushunchani tanlang, keyin guruhni bosing", "Мафҳумро интихоб кунед, баъд гурӯҳро пахш кунед", "Выберите понятие, затем группу"),
  isTrue: x("To'g'ri", "Дуруст", "Верно"),
  isFalse: x("Noto'g'ri", "Нодуруст", "Неверно"),
  statement: x("Tasdiq", "Тасдиқ", "Утверждение"),
  ticket: x("Bilet", "Билет", "Билет"),
  moves: x("yurish", "гашт", "ходов"),
  done: x("Tugadi!", "Тамом шуд!", "Готово!"),
  next: x("Keyingi", "Навбатӣ", "Далее"),
  notEnough: x("Bu o'yin uchun mavzuda yetarli ma'lumot yo'q. O'qituvchi o'z savollari / juftliklari / guruhlarini qo'shishi mumkin (pastdagi «Mening to'plamim»).", "Барои ин бозӣ дар мавзӯъ маълумоти кофӣ нест. Муаллим метавонад саволҳо / ҷуфтҳо / гурӯҳҳои худро илова кунад («Маҷмӯи ман» дар поён).", "Для этой игры не хватает материала по теме. Учитель может добавить свои вопросы / пары / группы («Мой набор» ниже)."),
  points: x("ball", "хол", "баллов"),
  teamTurn: x("Navbat", "Навбат", "Ход"),
} satisfies Record<string, Localized>;

export function NotEnough({ lang }: { lang: Lang }) {
  return <p className={`${card} text-sm text-slate-500`}>{L(GT.notEnough, lang)}</p>;
}

function Options({ q, onPick, picked, reveal }: { q: GameQuestion; onPick(i: number): void; picked: number | null; reveal: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {q.options.map((o, i) => {
        const state = reveal ? (i === q.answer ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/40" : i === picked ? "border-red-500 bg-red-50 dark:bg-red-900/40" : "") : "";
        return (
          <button key={i} disabled={reveal} onClick={() => onPick(i)} className={`rounded-xl border-2 border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-600 ${state}`}>
            <b className="mr-1">{String.fromCharCode(65 + i)})</b> {o}
          </button>
        );
      })}
    </div>
  );
}

/* ───── 1. Arqon tortish ───── */

export function TugOfWar({ qs, lang }: { qs: GameQuestion[]; lang: Lang }) {
  const LIMIT = 4;
  const [pool, setPool] = useState(() => shuffle(qs));
  const [idx, setIdx] = useState([0, 1]);
  const [rope, setRope] = useState(0); // −LIMIT … +LIMIT (manfiy — 1-jamoa tomon)
  const [last, setLast] = useState<[string, string]>(["", ""]);
  const winner = rope <= -LIMIT ? 1 : rope >= LIMIT ? 2 : 0;
  const answer = (team: 0 | 1, i: number) => {
    if (winner) return;
    const q = pool[idx[team] % pool.length];
    const ok = i === q.answer;
    setRope((r) => r + (ok ? (team === 0 ? -1 : 1) : 0));
    setLast((l) => (team === 0 ? [ok ? "✓" : "✗", l[1]] : [l[0], ok ? "✓" : "✗"]));
    // Har jamoa navbatdagi savolni oladi (savollar bir-biridan farq qilishi uchun 2 qadam)
    setIdx((s) => s.map((v, t) => (t === team ? v + 2 : v)));
  };
  const reset = () => {
    setPool(shuffle(qs));
    setIdx([0, 1]);
    setRope(0);
    setLast(["", ""]);
  };
  if (qs.length < 2) return <NotEnough lang={lang} />;
  return (
    <div className="grid gap-4">
      <div className="relative h-16 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-100 via-white to-rose-100 dark:from-sky-900/40 dark:via-slate-800 dark:to-rose-900/40">
        <div className="absolute left-1/2 top-0 h-full w-1 bg-slate-400" />
        <div className="absolute top-1/2 h-2 w-3/4 -translate-y-1/2 rounded bg-amber-700 transition-all duration-500" style={{ left: `${12.5 + (rope / LIMIT) * 12.5}%` }}>
          <div className="absolute left-1/2 top-1/2 h-6 w-3 -translate-x-1/2 -translate-y-1/2 rounded bg-red-600" />
        </div>
        <span className="absolute left-3 top-2 text-2xl">🧑‍🤝‍🧑</span>
        <span className="absolute right-3 top-2 text-2xl">🧑‍🤝‍🧑</span>
      </div>
      {winner ? (
        <div className={`${card} grid justify-items-center gap-2 text-center`}>
          <b className="text-2xl">
            🏆 {L(GT.team, lang)} {winner} {L(GT.wins, lang)}
          </b>
          <button className={btnPrimary} onClick={reset}>
            {L(GT.again, lang)}
          </button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {([0, 1] as const).map((t) => {
            const q = pool[idx[t] % pool.length];
            return (
              <div key={t} className={`${card} grid gap-2 ${t === 0 ? "border-sky-400" : "border-rose-400"}`}>
                <b className={t === 0 ? "text-sky-700" : "text-rose-700"}>
                  {L(GT.team, lang)} {t + 1} {last[t]}
                </b>
                <p className="font-semibold">{q.q}</p>
                <Options q={q} picked={null} reveal={false} onPick={(i) => answer(t, i)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───── 2. Baraban ───── */

const WHEEL_COLORS = ["#0e7c86", "#1f4fa3", "#e8a317", "#dc2626", "#7c3aed", "#16a34a", "#db2777", "#0891b2"];

export function Wheel({ qs, lang }: { qs: GameQuestion[]; lang: Lang }) {
  const [mode, setMode] = useState<"q" | "names">(qs.length ? "q" : "names");
  const [names, setNames] = useState("");
  useEffect(() => {
    try {
      setNames(localStorage.getItem("edusokh-wheel-names") ?? "");
    } catch {
      /* e'tiborsiz */
    }
  }, []);
  const items = mode === "q" ? qs.map((q, i) => `${i + 1}`) : names.split("\n").map((s) => s.trim()).filter(Boolean);
  const [angle, setAngle] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [reveal, setReveal] = useState(false);
  const n = Math.max(items.length, 1);
  const seg = 360 / n;
  const spin = () => {
    if (!items.length || spinning) return;
    const pick = Math.floor(Math.random() * items.length);
    // Ko'rsatkich tepada: tanlangan sektor o'rtasi 0° ga kelishi kerak
    const target = 360 * 6 + (360 - (pick * seg + seg / 2));
    setSpinning(true);
    setReveal(false);
    setChosen(null);
    setAngle((a) => a - (a % 360) + target);
    window.setTimeout(() => {
      setChosen(pick);
      setSpinning(false);
    }, 3200);
  };
  const q = mode === "q" && chosen != null ? qs[chosen] : null;
  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <div className="grid justify-items-center gap-3">
        <div className="flex gap-2">
          {(["q", "names"] as const).map((m) => (
            <button key={m} className={mode === m ? btnPrimary : btn} onClick={() => (setMode(m), setChosen(null))}>
              {L(m === "q" ? GT.questions : GT.students, lang)}
            </button>
          ))}
        </div>
        <div className="relative h-72 w-72">
          <div className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[22px] border-x-transparent border-t-slate-900 dark:border-t-white" />
          <svg viewBox="-100 -100 200 200" className="h-full w-full" style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 3.1s cubic-bezier(.15,.75,.2,1)" : "none" }}>
            {items.map((it, i) => {
              const a0 = ((i * seg - 90) * Math.PI) / 180;
              const a1 = (((i + 1) * seg - 90) * Math.PI) / 180;
              const mid = (((i + 0.5) * seg - 90) * Math.PI) / 180;
              return (
                <g key={i}>
                  <path d={`M0 0 L${95 * Math.cos(a0)} ${95 * Math.sin(a0)} A95 95 0 ${seg > 180 ? 1 : 0} 1 ${95 * Math.cos(a1)} ${95 * Math.sin(a1)} Z`} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="#fff" strokeWidth="1" />
                  <text x={60 * Math.cos(mid)} y={60 * Math.sin(mid)} fill="#fff" fontSize={n > 16 ? 6 : 9} fontWeight="bold" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${(i + 0.5) * seg} ${60 * Math.cos(mid)} ${60 * Math.sin(mid)})`}>
                    {it.slice(0, 14)}
                  </text>
                </g>
              );
            })}
            <circle r="12" fill="#fff" stroke="#0f172a" strokeWidth="2" />
          </svg>
        </div>
        <button className={`${btnPrimary} px-6 py-3 text-base`} disabled={!items.length || spinning} onClick={spin}>
          🎯 {L(GT.spin, lang)}
        </button>
      </div>
      <div className="grid content-start gap-3">
        {mode === "names" && (
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{L(GT.namesHint, lang)}</span>
            <textarea
              className="rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-600"
              rows={6}
              value={names}
              onChange={(e) => {
                setNames(e.target.value);
                try {
                  localStorage.setItem("edusokh-wheel-names", e.target.value);
                } catch {
                  /* e'tiborsiz */
                }
              }}
            />
          </label>
        )}
        {chosen != null && mode === "names" && <div className={`${card} text-center text-3xl font-extrabold`}>🎉 {items[chosen]}</div>}
        {q && (
          <div className={`${card} grid gap-2`}>
            <b>
              #{(chosen ?? 0) + 1}. {q.q}
            </b>
            <ol className="grid gap-1 text-sm">
              {q.options.map((o, i) => (
                <li key={i} className={reveal && i === q.answer ? "font-bold text-emerald-700" : ""}>
                  {String.fromCharCode(65 + i)}) {o}
                </li>
              ))}
            </ol>
            <div>
              <button className={btn} onClick={() => setReveal(true)} disabled={reveal}>
                {L(GT.show, lang)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── 3. Juftini top ───── */

export function Match({ pairs, lang }: { pairs: GamePair[]; lang: Lang }) {
  const [seed, setSeed] = useState(0);
  const set = useMemo(() => shuffle(pairs).slice(0, 6), [pairs, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const right = useMemo(() => shuffle(set.map((p, i) => ({ t: p.b, i }))), [set]);
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const [miss, setMiss] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  useEffect(() => {
    setDone([]);
    setMiss(0);
    setSel(null);
  }, [set]);
  if (pairs.length < 3) return <NotEnough lang={lang} />;
  const pickRight = (i: number) => {
    if (sel == null) return;
    if (sel === i) setDone((d) => [...d, i]);
    else {
      setMiss((m) => m + 1);
      setFlash(i);
      window.setTimeout(() => setFlash(null), 500);
    }
    setSel(null);
  };
  const finished = done.length === set.length;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="grid content-start gap-2">
          {set.map((p, i) => (
            <button key={i} disabled={done.includes(i)} onClick={() => setSel(i)} className={`rounded-xl border-2 px-3 py-2 text-left text-sm ${done.includes(i) ? "border-emerald-500 bg-emerald-50 opacity-60 dark:bg-emerald-900/30" : sel === i ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "border-slate-200 dark:border-slate-600"}`}>
              {p.a}
            </button>
          ))}
        </div>
        <div className="grid content-start gap-2">
          {right.map((r) => (
            <button key={r.i} disabled={done.includes(r.i)} onClick={() => pickRight(r.i)} className={`rounded-xl border-2 px-3 py-2 text-left text-sm ${done.includes(r.i) ? "border-emerald-500 bg-emerald-50 opacity-60 dark:bg-emerald-900/30" : flash === r.i ? "border-red-500 bg-red-50" : "border-slate-200 dark:border-slate-600"}`}>
              {r.t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm" role="status">
        <b>
          {L(GT.score, lang)}: {done.length}/{set.length} · {miss} {L(GT.mistakes, lang)}
        </b>
        {finished && <b className="text-emerald-600">✓ {L(GT.done, lang)}</b>}
        <button className={btn} onClick={() => setSeed((s) => s + 1)}>
          {L(GT.again, lang)}
        </button>
      </div>
    </div>
  );
}

/* ───── 4. Guruhlash ───── */

export function Grouping({ groups, lang }: { groups: GameGroup[]; lang: Lang }) {
  const all = useMemo(() => groups.flatMap((g, gi) => g.items.map((t) => ({ t, gi }))), [groups]);
  const [seed, setSeed] = useState(0);
  const items = useMemo(() => shuffle(all), [all, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setPlaced({});
    setChecked(false);
  }, [items]);
  if (groups.length < 2) return <NotEnough lang={lang} />;
  const correct = Object.entries(placed).filter(([i, g]) => items[Number(i)].gi === g).length;
  return (
    <div className="grid gap-3">
      <p className="text-sm text-slate-500">{L(GT.pickGroup, lang)}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) =>
          placed[i] == null ? (
            <button key={i} onClick={() => setSel(i)} className={`rounded-full border-2 px-3 py-1 text-sm ${sel === i ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "border-slate-300 dark:border-slate-600"}`}>
              {it.t}
            </button>
          ) : null,
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g, gi) => (
          <button key={gi} onClick={() => sel != null && (setPlaced((p) => ({ ...p, [sel]: gi })), setSel(null), setChecked(false))} className={`${card} grid min-h-[110px] content-start gap-2 text-left`}>
            <b>{g.name}</b>
            <span className="flex flex-wrap gap-1">
              {Object.entries(placed)
                .filter(([, pg]) => pg === gi)
                .map(([i]) => {
                  const ok = items[Number(i)].gi === gi;
                  return (
                    <span
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlaced((p) => {
                          const n = { ...p };
                          delete n[Number(i)];
                          return n;
                        });
                      }}
                      className={`rounded-full px-2 py-0.5 text-xs ${checked ? (ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white") : "bg-slate-200 dark:bg-slate-700"}`}
                    >
                      {items[Number(i)].t}
                    </span>
                  );
                })}
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimary} onClick={() => setChecked(true)} disabled={!Object.keys(placed).length}>
          {L(GT.check, lang)}
        </button>
        {checked && (
          <b role="status">
            {L(GT.score, lang)}: {correct}/{items.length}
          </b>
        )}
        <button className={btn} onClick={() => setSeed((s) => s + 1)}>
          {L(GT.again, lang)}
        </button>
      </div>
    </div>
  );
}

/* ───── 5. Jeopardy ───── */

export function Jeopardy({ qs, lang }: { qs: GameQuestion[]; lang: Lang }) {
  const cats = useMemo(() => {
    const by = new Map<string, GameQuestion[]>();
    for (const q of qs) by.set(q.src, [...(by.get(q.src) ?? []), q]);
    return [...by].map(([name, list]) => ({ name, list: list.slice(0, 5) }));
  }, [qs]);
  const [teams, setTeams] = useState([0, 0]);
  const [turn, setTurn] = useState(0);
  const [open, setOpen] = useState<{ c: number; i: number } | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  if (qs.length < 2) return <NotEnough lang={lang} />;
  const q = open ? cats[open.c].list[open.i] : null;
  const pts = open ? (open.i + 1) * 100 : 0;
  const pick = (i: number) => {
    if (!q || picked != null) return;
    setPicked(i);
    if (i === q.answer) setTeams((t) => t.map((v, k) => (k === turn ? v + pts : v)));
  };
  const close = () => {
    if (open) setUsed((u) => [...u, `${open.c}-${open.i}`]);
    setOpen(null);
    setPicked(null);
    setTurn((t) => (t + 1) % teams.length);
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {teams.map((s, i) => (
          <span key={i} className={`rounded-lg px-3 py-1 font-bold ${i === turn ? "bg-brand-500 text-white" : "bg-slate-100 dark:bg-slate-700"}`}>
            {L(GT.team, lang)} {i + 1}: {s}
          </span>
        ))}
        <button className={btn} onClick={() => setTeams((t) => (t.length < 4 ? [...t, 0] : t))}>
          + {L(GT.team, lang)}
        </button>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cats.length}, minmax(0, 1fr))` }}>
        {cats.map((c) => (
          <div key={c.name} className="rounded-lg bg-cobalt-500 p-2 text-center text-sm font-bold text-white">
            {c.name}
          </div>
        ))}
        {Array.from({ length: Math.max(...cats.map((c) => c.list.length)) }, (_, i) =>
          cats.map((c, ci) =>
            c.list[i] ? (
              <button key={`${ci}-${i}`} disabled={used.includes(`${ci}-${i}`)} onClick={() => setOpen({ c: ci, i })} className="rounded-lg bg-cobalt-700 py-4 text-lg font-extrabold text-saffron-500 disabled:opacity-25">
                {(i + 1) * 100}
              </button>
            ) : (
              <span key={`${ci}-${i}`} />
            ),
          ),
        )}
      </div>
      {q && (
        <div className={`${card} grid gap-3`}>
          <b>
            {L(GT.team, lang)} {turn + 1} · {pts} {L(GT.points, lang)}
          </b>
          <p className="text-lg font-semibold">{q.q}</p>
          <Options q={q} picked={picked} reveal={picked != null} onPick={pick} />
          {picked != null && (
            <div className="flex items-center gap-3">
              <b className={picked === q.answer ? "text-emerald-600" : "text-red-600"}>{L(picked === q.answer ? GT.correct : GT.wrong, lang)}</b>
              <button className={btnPrimary} onClick={close}>
                {L(GT.next, lang)}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───── 6. To'g'ri / Noto'g'ri ───── */

export function TrueFalse({ qs, lang }: { qs: GameQuestion[]; lang: Lang }) {
  const make = () =>
    shuffle(
      qs.map((q) => {
        const truth = Math.random() < 0.5;
        const wrongs = q.options.map((_, i) => i).filter((i) => i !== q.answer);
        const shown = truth ? q.answer : wrongs[Math.floor(Math.random() * wrongs.length)];
        return { q: q.q, a: q.options[shown], truth, right: q.options[q.answer] };
      }),
    );
  const [list, setList] = useState(make);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [res, setRes] = useState<boolean | null>(null);
  if (qs.length < 1) return <NotEnough lang={lang} />;
  const cur = list[i];
  const answer = (v: boolean) => {
    if (res != null) return;
    const ok = v === cur.truth;
    setRes(ok);
    if (ok) setScore((s) => s + 1);
  };
  if (i >= list.length)
    return (
      <div className={`${card} grid justify-items-center gap-2 text-center`}>
        <b className="text-2xl">
          {L(GT.score, lang)}: {score}/{list.length}
        </b>
        <button className={btnPrimary} onClick={() => (setList(make()), setI(0), setScore(0), setRes(null))}>
          {L(GT.again, lang)}
        </button>
      </div>
    );
  return (
    <div className={`${card} grid gap-3`}>
      <span className="text-xs text-slate-500">
        {L(GT.statement, lang)} {i + 1}/{list.length} · {L(GT.score, lang)}: {score}
      </span>
      <p className="text-lg">
        {cur.q} — <b>{cur.a}</b>
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button className="rounded-xl bg-emerald-600 py-4 text-lg font-bold text-white disabled:opacity-50" disabled={res != null} onClick={() => answer(true)}>
          ✓ {L(GT.isTrue, lang)}
        </button>
        <button className="rounded-xl bg-red-600 py-4 text-lg font-bold text-white disabled:opacity-50" disabled={res != null} onClick={() => answer(false)}>
          ✗ {L(GT.isFalse, lang)}
        </button>
      </div>
      {res != null && (
        <div className="flex flex-wrap items-center gap-3" role="status">
          <b className={res ? "text-emerald-600" : "text-red-600"}>{L(res ? GT.correct : GT.wrong, lang)}</b>
          {!cur.truth && (
            <span className="text-sm">
              {L(GT.answer, lang)}: <b>{cur.right}</b>
            </span>
          )}
          <button className={btnPrimary} onClick={() => (setI((v) => v + 1), setRes(null))}>
            {L(GT.next, lang)}
          </button>
        </div>
      )}
    </div>
  );
}

/* ───── 7. Biletlar ───── */

export function Tickets({ qs, lang }: { qs: GameQuestion[]; lang: Lang }) {
  const per = Math.min(3, qs.length);
  const make = () => {
    const s = shuffle(qs);
    const count = Math.max(1, Math.min(12, Math.floor(s.length / per)));
    return Array.from({ length: count }, (_, i) => s.slice(i * per, i * per + per));
  };
  const [tickets, setTickets] = useState(make);
  const [open, setOpen] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  if (qs.length < 1) return <NotEnough lang={lang} />;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {tickets.map((_, i) => (
          <button key={i} onClick={() => (setOpen(i), setReveal(false))} className={`h-20 w-16 rounded-lg border-2 text-lg font-extrabold ${open === i ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-amber-50 dark:border-slate-600 dark:bg-slate-700"}`}>
            №{i + 1}
          </button>
        ))}
        <button className={btn} onClick={() => (setTickets(make()), setOpen(null))}>
          {L(GT.again, lang)}
        </button>
      </div>
      {open != null && (
        <div className={`${card} grid gap-3`}>
          <b>
            {L(GT.ticket, lang)} №{open + 1}
          </b>
          <ol className="grid list-decimal gap-2 pl-5">
            {tickets[open].map((q, i) => (
              <li key={i}>
                {q.q}
                {reveal && <b className="ml-2 text-emerald-700">→ {q.options[q.answer]}</b>}
              </li>
            ))}
          </ol>
          <div>
            <button className={btn} onClick={() => setReveal(true)} disabled={reveal}>
              {L(GT.show, lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── 8. Xotira o'yini ───── */

export function Memory({ pairs, lang }: { pairs: GamePair[]; lang: Lang }) {
  const make = () => shuffle(shuffle(pairs).slice(0, 6).flatMap((p, i) => [{ t: p.a, k: i }, { t: p.b, k: i }]));
  const [cards, setCards] = useState(make);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  if (pairs.length < 3) return <NotEnough lang={lang} />;
  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || found.includes(cards[i].k)) return;
    const o = [...open, i];
    setOpen(o);
    if (o.length === 2) {
      setMoves((m) => m + 1);
      if (cards[o[0]].k === cards[o[1]].k) {
        setFound((f) => [...f, cards[i].k]);
        setOpen([]);
      } else window.setTimeout(() => setOpen([]), 900);
    }
  };
  const done = found.length * 2 === cards.length;
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {cards.map((c, i) => {
          const shown = open.includes(i) || found.includes(c.k);
          return (
            <button key={i} onClick={() => flip(i)} className={`flex min-h-[84px] items-center justify-center rounded-xl p-2 text-center text-sm font-semibold transition ${found.includes(c.k) ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" : shown ? "bg-white ring-2 ring-brand-500 dark:bg-slate-800" : "bg-gradient-to-br from-brand-500 to-cobalt-500 text-2xl text-white"}`}>
              {shown ? c.t : "?"}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-sm" role="status">
        <b>
          {moves} {L(GT.moves, lang)} · {found.length}/{cards.length / 2}
        </b>
        {done && <b className="text-emerald-600">✓ {L(GT.done, lang)}</b>}
        <button className={btn} onClick={() => (setCards(make()), setOpen([]), setFound([]), setMoves(0))}>
          {L(GT.again, lang)}
        </button>
      </div>
    </div>
  );
}
