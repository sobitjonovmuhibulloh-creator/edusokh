"use client";

/**
 * EduSokh Games: sinf → darslik → mavzu tanlanadi, o'yinlar shu mavzuning haqiqiy materiallaridan
 * (dars testi, laboratoriya testi, EduSokh va o'qituvchi to'plamlari) foydalanadi.
 * ?topic=<kitobId>:<n> — mavzuni to'g'ridan-to'g'ri ochadi; ?pin=123456 — o'quvchi jonli viktorinaga qo'shiladi.
 */
import { useEffect, useMemo, useState } from "react";
import { GRADES, SUBJECTS } from "@/lib/curriculum";
import { L, type Lang, type Localized } from "@/lib/i18n";
import type { CatalogTopic, TextbookDetail, TextbookSummary } from "@/lib/catalog/types";
import { gatherGameData, pairsOrDerived, type GameData } from "@/lib/games/gather";
import type { GameGroup, GamePair, GameQuestion, GameSet } from "@/lib/games/types";
import { btn, btnPrimary, Grouping, Jeopardy, Match, Memory, Tickets, TrueFalse, TugOfWar, Wheel } from "./Games";
import { LiveHost, LivePlayer } from "./LiveQuiz";

const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const input = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600";
const x = (uz: string, tg: string, ru: string): Localized => ({ uz, tg, ru });

const GAMES = [
  { id: "tug", icon: "🪢", name: x("Arqon tortish", "Ресмонкашӣ", "Перетягивание каната") },
  { id: "wheel", icon: "🎡", name: x("Baraban", "Барабан", "Барабан") },
  { id: "match", icon: "🔗", name: x("Juftini top", "Ҷуфташро ёб", "Найди пару") },
  { id: "group", icon: "🗂️", name: x("Guruhlash", "Гурӯҳбандӣ", "Группировка") },
  { id: "jeopardy", icon: "🏆", name: x("Jeopardy", "Jeopardy", "Своя игра") },
  { id: "tf", icon: "✅", name: x("To'g'ri / Noto'g'ri", "Дуруст / Нодуруст", "Верно / Неверно") },
  { id: "tickets", icon: "🎫", name: x("Biletlar", "Билетҳо", "Билеты") },
  { id: "memory", icon: "🧠", name: x("Xotira o'yini", "Бозии хотира", "Мемори") },
  { id: "live", icon: "📡", name: x("PIN viktorina", "Викторина бо PIN", "Викторина по PIN") },
] as const;
type GameId = (typeof GAMES)[number]["id"];

const TX = {
  pickTopic: x("Mavzuni tanlang: o'yinlar shu mavzu materiallaridan tuziladi", "Мавзӯъро интихоб кунед: бозиҳо аз маводи ҳамин мавзӯъ сохта мешаванд", "Выберите тему: игры строятся из её материалов"),
  onlyVerified: x("Faqat mavzulari kiritilgan darsliklar ko'rsatiladi", "Танҳо китобҳои бо мавзӯъ нишон дода мешаванд", "Показаны только учебники с внесёнными темами"),
  book: x("Darslik", "Китоб", "Учебник"),
  topic: x("Mavzu", "Мавзӯъ", "Тема"),
  sources: x("Savollar manbasi", "Манбаи саволҳо", "Источник вопросов"),
  noData: x("Bu mavzu uchun hali savol yo'q — pastda o'zingiznikini qo'shing", "Барои ин мавзӯъ ҳоло савол нест — дар поён аз худ илова кунед", "Вопросов пока нет — добавьте свои ниже"),
  myset: x("Mening to'plamim (o'qituvchi)", "Маҷмӯи ман (муаллим)", "Мой набор (учитель)"),
  qHelp: x("Savollar: har savol alohida blok (bo'sh qator bilan ajrating). 1-qator — savol, keyingilari — variantlar, to'g'risi oldiga * qo'ying.", "Саволҳо: ҳар савол блоки алоҳида (бо сатри холӣ ҷудо кунед). Сатри 1 — савол, баъдӣ — вариантҳо, пеш аз дурусташ * гузоред.", "Вопросы: блоки через пустую строку. 1-я строка — вопрос, далее варианты, правильный отметьте *."),
  pHelp: x("Juftliklar: har qatorda «tushuncha = ma'nosi»", "Ҷуфтҳо: дар ҳар сатр «мафҳум = маънояш»", "Пары: в каждой строке «понятие = значение»"),
  gHelp: x("Guruhlar: har qatorda «Guruh nomi: a, b, c»", "Гурӯҳҳо: дар ҳар сатр «Номи гурӯҳ: a, b, c»", "Группы: в каждой строке «Название: a, b, c»"),
  save: x("Saqlash", "Захира", "Сохранить"),
  saved: x("Saqlandi", "Захира шуд", "Сохранено"),
  lang: x("Material tili", "Забони мавод", "Язык материала"),
} satisfies Record<string, Localized>;

const LANG_NAME: Record<string, string> = { uz: "O'zbekcha", tg: "Тоҷикӣ", ru: "Русский" };

function parseQuestions(text: string): GameQuestion[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((s) => s.trim()).filter(Boolean))
    .filter((l) => l.length >= 3)
    .map((l) => {
      const opts = l.slice(1);
      const answer = Math.max(0, opts.findIndex((o) => o.startsWith("*")));
      return { q: l[0], options: opts.map((o) => o.replace(/^\*\s*/, "")), answer, src: "O'qituvchi" };
    });
}
const parsePairs = (t: string): GamePair[] =>
  t.split("\n").map((l) => l.split("=")).filter((p) => p.length === 2 && p[0].trim() && p[1].trim()).map(([a, b]) => ({ a: a.trim(), b: b.trim() }));
const parseGroups = (t: string): GameGroup[] =>
  t.split("\n").map((l) => l.split(":")).filter((p) => p.length === 2 && p[0].trim()).map(([n, items]) => ({ name: n.trim(), items: items.split(",").map((s) => s.trim()).filter(Boolean) }));

export default function GamesPanel({ lang }: { lang: Lang }) {
  const T = (k: keyof typeof TX) => L(TX[k], lang);
  const [books, setBooks] = useState<TextbookSummary[]>([]);
  const [grade, setGrade] = useState(8);
  const [bookId, setBookId] = useState("");
  const [book, setBook] = useState<TextbookDetail | null>(null);
  const [topicId, setTopicId] = useState("");
  const [data, setData] = useState<GameData | null>(null);
  const [game, setGame] = useState<GameId>("tug");
  const [pin, setPin] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("pin")) setPin(q.get("pin"));
    const t = q.get("topic");
    fetch("/catalog/index.json")
      .then((r) => r.json() as Promise<{ books: TextbookSummary[] }>)
      .then((d) => {
        setBooks(d.books.filter((b) => b.toc === "verified"));
        if (t && t.includes(":")) {
          const bid = t.split(":")[0];
          const b = d.books.find((x) => x.id === bid);
          if (b) {
            setGrade(b.grades[0]);
            setBookId(bid);
            setTopicId(t);
          }
        }
      })
      .catch(() => setBooks([]));
  }, []);

  useEffect(() => {
    setBook(null);
    if (!bookId) return;
    fetch(`/catalog/books/${bookId}.json`)
      .then((r) => r.json() as Promise<TextbookDetail>)
      .then(setBook)
      .catch(() => setBook(null));
  }, [bookId]);

  const topics = useMemo(() => book?.chapters.flatMap((c) => c.topics) ?? [], [book]);
  const topic: CatalogTopic | undefined = topics.find((t) => t.id === topicId);
  useEffect(() => {
    setData(null);
    if (book && topic) void gatherGameData(book, topic).then(setData);
  }, [book, topic, reload]);

  if (pin != null) return <LivePlayer initialPin={pin} lang={lang} />;

  const gradeBooks = books.filter((b) => b.grades.includes(grade)).sort((a, b) => L(SUBJECTS[a.subject], lang).localeCompare(L(SUBJECTS[b.subject], lang)));
  const pairs = data ? pairsOrDerived(data) : [];

  return (
    <div className="grid gap-4">
      <div className={`${card} grid gap-3`}>
        <b>{T("pickTopic")}</b>
        <div className="flex flex-wrap gap-1.5">
          {GRADES.map((g) => (
            <button
              key={g.number}
              className={grade === g.number ? btnPrimary : btn}
              onClick={() => {
                setGrade(g.number);
                setBookId("");
                setTopicId("");
              }}
            >
              {g.number}
            </button>
          ))}
          <button className={btn} onClick={() => setPin("")}>
            📱 PIN
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{T("book")}</span>
            <select
              className={input}
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value);
                setTopicId("");
              }}
            >
              <option value="">—</option>
              {gradeBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {L(SUBJECTS[b.subject], lang)} · {b.title} · {LANG_NAME[b.lang]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{T("topic")}</span>
            <select className={input} value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!book}>
              <option value="">—</option>
              {book?.chapters.map((c, ci) => (
                <optgroup key={ci} label={c.title || "—"}>
                  {c.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-slate-500">{T("onlyVerified")}</p>
      </div>

      {topic && book && (
        <>
          <div className={`${card} grid gap-1 text-sm`}>
            <b className="text-base">{topic.title}</b>
            <span className="text-slate-500">
              {T("lang")}: {LANG_NAME[book.lang]} · {T("sources")}: {data ? (data.sources.length ? data.sources.map((s) => `${s.name} (${s.count})`).join(", ") : T("noData")) : "…"}
            </span>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-1" role="tablist">
            {GAMES.map((g) => (
              <button key={g.id} role="tab" aria-selected={game === g.id} onClick={() => setGame(g.id)} className={`flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-sm font-semibold ${game === g.id ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}>
                <span>{g.icon}</span> {L(g.name, lang)}
              </button>
            ))}
          </nav>
          {data && (
            <div key={`${game}-${topic.id}-${reload}`}>
              {game === "tug" && <TugOfWar qs={data.questions} lang={lang} />}
              {game === "wheel" && <Wheel qs={data.questions} lang={lang} />}
              {game === "match" && <Match pairs={pairs} lang={lang} />}
              {game === "group" && <Grouping groups={data.groups} lang={lang} />}
              {game === "jeopardy" && <Jeopardy qs={data.questions} lang={lang} />}
              {game === "tf" && <TrueFalse qs={data.questions} lang={lang} />}
              {game === "tickets" && <Tickets qs={data.questions} lang={lang} />}
              {game === "memory" && <Memory pairs={pairs} lang={lang} />}
              {game === "live" && <LiveHost qs={data.questions} lang={lang} />}
            </div>
          )}
          <TeacherSet topicId={topic.id} lang={lang} onSaved={() => setReload((r) => r + 1)} />
        </>
      )}
    </div>
  );
}

function TeacherSet({ topicId, lang, onSaved }: { topicId: string; lang: Lang; onSaved(): void }) {
  const T = (k: keyof typeof TX) => L(TX[k], lang);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [p, setP] = useState("");
  const [g, setG] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!open) return;
    fetch(`/api/games/sets?topicId=${encodeURIComponent(topicId)}`)
      .then((r) => r.json() as Promise<GameSet>)
      .then((s) => {
        setQ((s.questions ?? []).map((x) => [x.q, ...x.options.map((o, i) => (i === x.answer ? `*${o}` : o))].join("\n")).join("\n\n"));
        setP((s.pairs ?? []).map((x) => `${x.a} = ${x.b}`).join("\n"));
        setG((s.groups ?? []).map((x) => `${x.name}: ${x.items.join(", ")}`).join("\n"));
      })
      .catch(() => undefined);
  }, [open, topicId]);
  const save = async () => {
    const r = await fetch("/api/games/sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId, questions: parseQuestions(q), pairs: parsePairs(p), groups: parseGroups(g) }) });
    setMsg(r.ok ? L(TX.saved, lang) : await r.text());
    if (r.ok) onSaved();
  };
  return (
    <div className="grid gap-2">
      <div>
        <button className={btn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          ✏️ {T("myset")}
        </button>
      </div>
      {open && (
        <div className={`${card} grid gap-3 text-sm`}>
          <label className="grid gap-1">
            <span>{T("qHelp")}</span>
            <textarea className={input} rows={7} value={q} onChange={(e) => setQ(e.target.value)} placeholder={"U = 12 V, R = 4 Ω. I = ?\n*3 A\n48 A\n0,33 A"} />
          </label>
          <label className="grid gap-1">
            <span>{T("pHelp")}</span>
            <textarea className={input} rows={4} value={p} onChange={(e) => setP(e.target.value)} placeholder="Tok kuchi = amper" />
          </label>
          <label className="grid gap-1">
            <span>{T("gHelp")}</span>
            <textarea className={input} rows={3} value={g} onChange={(e) => setG(e.target.value)} placeholder="Birliklar: amper, volt, om" />
          </label>
          <div className="flex items-center gap-3">
            <button className={btnPrimary} onClick={() => void save()}>
              {T("save")}
            </button>
            {msg && <span role="status">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
