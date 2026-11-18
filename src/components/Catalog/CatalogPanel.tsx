"use client";

/**
 * Darsliklar katalogi: Sinf → Fan → Darslik → Bob → Mavzu → O'quv materiallari (bir joyda).
 * Ma'lumot: public/catalog (npm run catalog:build). Mavjud bo'lmagan material "hali tayyor emas" deb ko'rsatiladi.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, ExternalLink, FlaskConical, Search, X } from "lucide-react";
import SlidePlayer from "@/components/Slides/SlidePlayer";
import { GRADES, SUBJECTS, type SubjectCode } from "@/lib/curriculum";
import { L, same, type Lang, type Localized } from "@/lib/i18n";
import type { CatalogTopic, TextbookDetail, TextbookSummary, TopicFlags } from "@/lib/catalog/types";
import type { SubjectLessons, TopicLang } from "@/lib/lesson-content";
import type { Slide } from "@/lib/lesson-template";
import { formatBytes, type SlideDeckFile } from "@/lib/slide-library";

const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const btn = "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600";
const input = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600";
const chip = (on: boolean) => `rounded-lg border px-3 py-1.5 text-sm font-semibold ${on ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"}`;

const x = (uz: string, tg: string, ru: string): Localized => ({ uz, tg, ru });
const TX = {
  grade: x("Sinf", "Синф", "Класс"),
  subject: x("Fan", "Фан", "Предмет"),
  allSubjects: x("Barcha fanlar", "Ҳамаи фанҳо", "Все предметы"),
  lang: x("Darslik tili", "Забони китоб", "Язык учебника"),
  all: x("Barchasi", "Ҳама", "Все"),
  onlyReady: x("Faqat mavzulari kiritilgan", "Танҳо бо мавзӯъҳо", "Только с темами"),
  search: x("Mavzu bo'yicha qidirish (mavzulari kiritilgan darsliklarda)…", "Ҷустуҷӯи мавзӯъ (дар китобҳои бо мавзӯъ)…", "Поиск темы (в учебниках с темами)…"),
  books: x("darslik", "китоб", "учебников"),
  verified: x("Mundarija tekshirilgan", "Мундариҷа санҷида шуд", "Оглавление проверено"),
  needed: x("Ma'lumot kerak", "Маълумот лозим", "Нужны данные"),
  missing: x("Manbada yo'q", "Дар манбаъ нест", "Нет в источнике"),
  chapters: x("bob", "боб", "глав"),
  topics: x("mavzu", "мавзӯъ", "тем"),
  year: x("Nashr", "Нашр", "Издание"),
  uploaded: x("portalga yuklangan", "ба портал бор шуд", "загружен на портал"),
  noYear: x("nashr yili o'qilmagan", "соли нашр хонда нашуд", "год издания не прочитан"),
  source: x("Manba", "Манбаъ", "Источник"),
  openBook: x("Darslikni ochish", "Кушодани китоб", "Открыть учебник"),
  back: x("Darsliklar ro'yxati", "Рӯйхати китобҳо", "Список учебников"),
  noToc: x("Bu darslikning boblari va mavzulari hali kiritilmagan. Ular darslik PDF'idan o'qib kiritiladi — taxmin qilinmaydi.", "Бобу мавзӯъҳои ин китоб ҳоло ворид нашудаанд. Онҳо аз PDF-и китоб хонда ворид мешаванд — тахмин карда намешаванд.", "Главы и темы этого учебника ещё не внесены. Они вносятся по PDF учебника — не придумываются."),
  page: x("bet", "саҳ.", "стр."),
  pickTopic: x("Mavzuni tanlang — shu mavzuning barcha materiallari shu yerda chiqadi.", "Мавзӯъро интихоб кунед — ҳамаи маводи он дар ин ҷо намоён мешавад.", "Выберите тему — все её материалы появятся здесь."),
  notReady: x("Hali tayyor emas", "Ҳоло тайёр нест", "Ещё не готово"),
  m1: x("1. Nazariy tushuntirish", "1. Шарҳи назариявӣ", "1. Теория"),
  m2: x("2. Slaydlar va taqdimotlar", "2. Слайдҳо ва презентатсияҳо", "2. Слайды и презентации"),
  m3: x("3. Videodars", "3. Видеодарс", "3. Видеоурок"),
  m4: x("4. Misollar va yechimlar", "4. Мисолҳо ва ҳалли онҳо", "4. Примеры и решения"),
  m5: x("5. 3D laboratoriya / interaktiv mashg'ulot", "5. Лабораторияи 3D / машғулоти интерактивӣ", "5. 3D-лаборатория / интерактив"),
  m6: x("6. Mustaqil topshiriq", "6. Супориши мустақил", "6. Самостоятельное задание"),
  m7: x("7. Test va javoblar", "7. Тест ва ҷавобҳо", "7. Тест и ответы"),
  m8: x("8. Mavzu xulosasi", "8. Хулосаи мавзӯъ", "8. Итог темы"),
  m9: x("9. Foydalanilgan manbalar", "9. Манбаъҳо", "9. Источники"),
  showAnswers: x("Javoblarni ko'rsatish", "Нишон додани ҷавобҳо", "Показать ответы"),
  openLab: x("Laboratoriyani ochish", "Кушодани лаборатория", "Открыть лабораторию"),
  slidesFromLesson: x("Dars slaydlari", "Слайдҳои дарс", "Слайды урока"),
  aiNote: x("Qoralama: o'qituvchi tekshirishi kerak", "Пешнавис: муаллим бояд санҷад", "Черновик: проверить учителю"),
  flags: x("Holat", "Ҳолат", "Статус"),
  originalLang: x("Material tili", "Забони мавод", "Язык материала"),
} satisfies Record<string, Localized>;

const FLAG_LABEL: Record<keyof TopicFlags, Localized> = {
  listed: x("Katalogda", "Дар феҳрист", "В каталоге"),
  sourceVerified: x("Manba tekshirilgan", "Манбаъ санҷида шуд", "Источник проверен"),
  theory: x("Nazariya", "Назария", "Теория"),
  slides: x("Slayd", "Слайд", "Слайды"),
  video: x("Video", "Видео", "Видео"),
  lab: x("Laboratoriya", "Лаборатория", "Лаборатория"),
  test: x("Test", "Тест", "Тест"),
};
const FLAGS: (keyof TopicFlags)[] = ["listed", "sourceVerified", "theory", "slides", "video", "lab", "test"];
const LANG_NAME: Record<string, string> = { uz: "O'zbekcha", tg: "Тоҷикӣ", ru: "Русский" };

/** PDF beti: floor(bet / per) + offset; noma'lum bo'lsa — kitob boshidan */
function bookLink(b: TextbookDetail, printed: number | null) {
  const base = /^https:\/\/old\.eduportal\.uz\/Umumiyfiles\/darsliklar\//.test(b.sourceUrl) ? `/api/books/file?u=${encodeURIComponent(b.sourceUrl)}` : b.sourceUrl;
  if (printed == null || b.pageOffset == null) return base;
  return `${base}#page=${Math.floor(printed / (b.pagesPerPdfPage || 1)) + b.pageOffset}`;
}

export default function CatalogPanel({ lang, openLab, openLabTopic }: { lang: Lang; openLab: (key: string, grade?: number) => void; openLabTopic: (id: string) => void }) {
  const T = (k: keyof typeof TX) => L(TX[k], lang);
  const [books, setBooks] = useState<TextbookSummary[] | null>(null);
  const [grade, setGrade] = useState(7);
  const [subject, setSubject] = useState<SubjectCode | "">("");
  const [bookLang, setBookLang] = useState<"" | "uz" | "tg" | "ru">(lang === "tg" ? "tg" : lang === "ru" ? "" : "uz");
  const [onlyReady, setOnlyReady] = useState(false);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, TextbookDetail>>({});
  const [topicId, setTopicId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/catalog/index.json", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ books: TextbookSummary[] }>)
      .then((d) => setBooks(d.books))
      .catch(() => setBooks([]));
  }, []);

  const loadDetail = async (id: string) => {
    if (details[id]) return details[id];
    const d = (await (await fetch(`/catalog/books/${id}.json`, { cache: "no-store" })).json()) as TextbookDetail;
    setDetails((s) => ({ ...s, [id]: d }));
    return d;
  };
  useEffect(() => {
    if (openId) void loadDetail(openId);
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Qidiruv uchun mavzulari kiritilgan darsliklar tafsilotini yuklaymiz (ular kam va kichik)
  const q = query.trim().toLocaleLowerCase();
  useEffect(() => {
    if (!q || !books) return;
    for (const b of books.filter((b) => b.toc === "verified")) void loadDetail(b.id);
  }, [q, books]); // eslint-disable-line react-hooks/exhaustive-deps

  const inGrade = useMemo(() => (books ?? []).filter((b) => b.grades.includes(grade) && (!bookLang || b.lang === bookLang)), [books, grade, bookLang]);
  const subjects = Array.from(new Set(inGrade.map((b) => b.subject))).sort((a, b) => L(SUBJECTS[a], lang).localeCompare(L(SUBJECTS[b], lang)));
  const list = inGrade.filter((b) => (!subject || b.subject === subject) && (!onlyReady || b.toc === "verified"));
  const stats = useMemo(() => {
    const all = (books ?? []).filter((b) => !bookLang || b.lang === bookLang);
    return { total: all.length, ready: all.filter((b) => b.toc === "verified").length, topics: all.reduce((s, b) => s + b.topicCount, 0) };
  }, [books, bookLang]);

  const hits = useMemo(() => {
    if (!q) return [];
    const out: { book: TextbookDetail; topic: CatalogTopic; chapter: string }[] = [];
    for (const d of Object.values(details)) {
      if (bookLang && d.lang !== bookLang) continue;
      for (const c of d.chapters) for (const t of c.topics) if (t.title.toLocaleLowerCase().includes(q)) out.push({ book: d, topic: t, chapter: c.title });
    }
    return out.slice(0, 60);
  }, [q, details, bookLang]);

  const open = openId ? details[openId] : undefined;

  if (books === null) return <p className="text-sm text-slate-500">…</p>;

  /* ───── Darslik ichi: boblar, mavzular, materiallar ───── */
  if (openId) {
    const summary = books.find((b) => b.id === openId);
    const topic = open?.chapters.flatMap((c) => c.topics).find((t) => t.id === topicId);
    return (
      <div className="grid gap-4">
        <div>
          <button
            className={btn}
            onClick={() => {
              setOpenId(null);
              setTopicId(null);
            }}
          >
            <ArrowLeft size={14} /> {T("back")}
          </button>
        </div>
        {summary && <BookHeader b={open ?? summary} lang={lang} />}
        {!open ? (
          <p className="text-sm text-slate-500">…</p>
        ) : open.chapters.length === 0 ? (
          <p className={`${card} text-sm text-slate-500`}>{T("noToc")}</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <aside className="grid max-h-[75vh] content-start gap-3 overflow-y-auto pr-1">
              {open.chapters.map((c, ci) => (
                <div key={ci} className="grid gap-1">
                  {c.title && <div className="sticky top-0 z-10 bg-slate-50 py-1 text-xs font-bold uppercase text-brand-600 dark:bg-slate-900">{c.title}</div>}
                  {c.topics.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTopicId(t.id)}
                      className={`grid gap-1 rounded-lg border px-3 py-2 text-left text-sm ${t.id === topicId ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span>{t.title}</span>
                        {t.page != null && (
                          <span className="shrink-0 font-mono text-xs text-slate-400">
                            {t.page} {T("page")}
                          </span>
                        )}
                      </span>
                      <FlagDots flags={t.flags} lang={lang} />
                    </button>
                  ))}
                </div>
              ))}
            </aside>
            <section className="min-w-0">{topic ? <TopicMaterials key={topic.id} book={open} topic={topic} lang={lang} openLab={openLab} openLabTopic={openLabTopic} /> : <p className={`${card} text-sm text-slate-500`}>{T("pickTopic")}</p>}</section>
          </div>
        )}
      </div>
    );
  }

  /* ───── Ro'yxat: sinf, fan, til, holat, qidiruv ───── */
  return (
    <div className="grid gap-4">
      <div className={`${card} grid gap-3`}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <b>
            {stats.total} {T("books")}
          </b>
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            {T("verified")}: {stats.ready}
          </span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            {T("needed")}: {stats.total - stats.ready}
          </span>
          <span className="text-xs text-slate-500">
            {stats.topics} {T("topics")}
          </span>
        </div>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${input} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T("search")} aria-label={T("search")} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{T("lang")}:</span>
          {(["", "uz", "tg", "ru"] as const).map((l) => (
            <button key={l || "all"} className={chip(bookLang === l)} onClick={() => setBookLang(l)}>
              {l ? LANG_NAME[l] : T("all")}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyReady} onChange={(e) => setOnlyReady(e.target.checked)} />
            {T("onlyReady")}
          </label>
        </div>
      </div>

      {q ? (
        <div className="grid gap-2">
          {hits.length === 0 ? (
            <p className={`${card} text-sm text-slate-500`}>—</p>
          ) : (
            hits.map(({ book, topic, chapter }) => (
              <button
                key={topic.id}
                className={`${card} grid gap-1 text-left`}
                onClick={() => {
                  setOpenId(book.id);
                  setTopicId(topic.id);
                }}
              >
                <span className="text-xs text-slate-500">
                  {book.grades.join("–")}-{L(TX.grade, lang).toLowerCase()} · {L(SUBJECTS[book.subject], lang)} · {LANG_NAME[book.lang]} · {chapter}
                </span>
                <span className="font-semibold">{topic.title}</span>
                <FlagDots flags={topic.flags} lang={lang} />
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {GRADES.map((g) => (
              <button
                key={g.number}
                className={chip(grade === g.number)}
                onClick={() => {
                  setGrade(g.number);
                  setSubject("");
                }}
              >
                {g.number}-{L(TX.grade, lang).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button className={chip(subject === "")} onClick={() => setSubject("")}>
              {T("allSubjects")}
            </button>
            {subjects.map((s) => {
              const ready = inGrade.some((b) => b.subject === s && b.toc === "verified");
              return (
                <button key={s} className={chip(subject === s)} onClick={() => setSubject(s)}>
                  {L(SUBJECTS[s], lang)}
                  {ready && <Check size={12} className="ml-1 inline text-emerald-500" />}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((b) => (
              <button key={b.id} className={`${card} grid content-start gap-2 text-left hover:border-brand-500`} onClick={() => setOpenId(b.id)}>
                <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <span className="rounded-md bg-brand-100 px-2 py-0.5 text-brand-700">{LANG_NAME[b.lang]}</span>
                  <StatusBadge b={b} lang={lang} />
                </span>
                <span className="flex items-start gap-2 font-bold">
                  <BookOpen size={16} className="mt-0.5 shrink-0 text-brand-600" />
                  {b.title}
                </span>
                <span className="text-xs text-slate-500">
                  {L(SUBJECTS[b.subject], lang)} · {b.grades.join("–")}-{L(TX.grade, lang).toLowerCase()}
                  {b.year ? ` · ${b.year}` : ""}
                  {b.publisher ? ` · «${b.publisher}»` : ""}
                </span>
                {b.toc === "verified" && (
                  <span className="text-sm">
                    {b.chapterCount} {T("chapters")} · {b.topicCount} {T("topics")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ b, lang }: { b: TextbookSummary; lang: Lang }) {
  const cls = b.toc === "verified" ? "bg-emerald-600 text-white" : b.toc === "missing" ? "bg-red-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  return <span className={`rounded-md px-2 py-0.5 ${cls}`}>{L(TX[b.toc], lang)}</span>;
}

function FlagDots({ flags, lang }: { flags: TopicFlags; lang: Lang }) {
  return (
    <span className="flex flex-wrap gap-1">
      {FLAGS.map((f) => (
        <span key={f} title={L(FLAG_LABEL[f], lang)} className={`rounded px-1.5 text-[10px] font-semibold ${flags[f] ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-slate-100 text-slate-400 line-through dark:bg-slate-700"}`}>
          {L(FLAG_LABEL[f], lang)}
        </span>
      ))}
    </span>
  );
}

function BookHeader({ b, lang }: { b: TextbookSummary | TextbookDetail; lang: Lang }) {
  const T = (k: keyof typeof TX) => L(TX[k], lang);
  return (
    <div className={`${card} grid gap-1`}>
      <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
        <span className="rounded-md bg-brand-100 px-2 py-0.5 text-brand-700">{LANG_NAME[b.lang]}</span>
        <StatusBadge b={b} lang={lang} />
        <span className="text-slate-500">
          {L(SUBJECTS[b.subject], lang)} · {b.grades.join("–")}-{L(TX.grade, lang).toLowerCase()}
        </span>
      </span>
      <h2 className="text-xl font-extrabold">{b.title}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {T("year")}: {b.year ?? T("noYear")}
        {b.publisher ? ` · «${b.publisher}»` : ""}
        {b.imprint ? ` · ${b.imprint}` : ""}
        {b.uploadedAt ? ` · ${T("uploaded")}: ${b.uploadedAt}` : ""}
        {b.toc === "verified" ? ` · ${b.chapterCount} ${T("chapters")}, ${b.topicCount} ${T("topics")}` : ""}
      </p>
      <p className="text-xs text-slate-500">
        {T("source")}: {b.sourceName}
        {"tocSource" in b && b.tocSource ? ` — ${b.tocSource}` : ""}
      </p>
      <div>
        <a className={btn} href={"pageOffset" in b ? bookLink(b, null) : b.sourceUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={14} /> {T("openBook")}
        </a>
      </div>
    </div>
  );
}

/* ───── Mavzu materiallari (9 bo'lim) ───── */

function Box({ title, ok, children }: { title: string; ok: boolean; children: React.ReactNode }) {
  return (
    <div className={`${card} grid gap-2`}>
      <h4 className="flex items-center gap-2 font-bold">
        {ok ? <Check size={16} className="text-emerald-600" /> : <X size={16} className="text-slate-400" />}
        {title}
      </h4>
      {children}
    </div>
  );
}

const TM = {
  lessonMode: x("Dars rejimi", "Реҷаи дарс", "Режим урока"),
  allSections: x("Barcha bo'limlar", "Ҳамаи бахшҳо", "Все разделы"),
  prev: x("Oldingi", "Қаблӣ", "Назад"),
  next: x("Keyingi", "Навбатӣ", "Далее"),
  sTopic: x("Mavzu", "Мавзӯъ", "Тема"),
  sTheory: x("Nazariya", "Назария", "Теория"),
  sMedia: x("Video / slayd", "Видео / слайд", "Видео / слайды"),
  sLab: x("Laboratoriya", "Лаборатория", "Лаборатория"),
  sGame: x("O'yin", "Бозӣ", "Игра"),
  sTest: x("Test", "Тест", "Тест"),
  games: x("O'yinlar (EduSokh Games)", "Бозиҳо (EduSokh Games)", "Игры (EduSokh Games)"),
  openGames: x("Shu mavzu bo'yicha o'yinlar", "Бозиҳо аз рӯи ҳамин мавзӯъ", "Игры по этой теме"),
  gamesNote: x("Arqon tortish, baraban, juftini top, Jeopardy, PIN viktorina va boshqalar — shu mavzu savollaridan.", "Ресмонкашӣ, барабан, ҷуфташро ёб, Jeopardy, викторина бо PIN ва ғайра — аз саволҳои ҳамин мавзӯъ.", "Канат, барабан, пары, «Своя игра», викторина по PIN и др. — по вопросам этой темы."),
  noLabAlt: x("Bu mavzu uchun mos laboratoriya hali yaratilmagan. O'rniga:", "Барои ин мавзӯъ лабораторияи мувофиқ ҳоло сохта нашудааст. Ба ҷои он:", "Подходящей лаборатории для этой темы пока нет. Вместо неё:"),
  addVideo: x("Video havolasi (YouTube)", "Пайванди видео (YouTube)", "Ссылка на видео (YouTube)"),
  save: x("Saqlash", "Захира", "Сохранить"),
  findVideo: x("YouTube'dan qidirish", "Ҷустуҷӯ дар YouTube", "Найти на YouTube"),
  searchArxiv: x("Arxiv.uz'da qidirish", "Ҷустуҷӯ дар Arxiv.uz", "Искать на Arxiv.uz"),
  attach: x("Topilgan materialni biriktirish (faqat havola)", "Пайваст кардани маводи ёфташуда (танҳо пайванд)", "Прикрепить найденный материал (только ссылка)"),
  attachNote: x("Fayl EduSokh'ga ko'chirilmaydi — o'quvchi manba sahifasiga o'tadi. Qayta tarqatishga ruxsat borligini manbada tekshiring.", "Файл ба EduSokh нусхабардорӣ намешавад — хонанда ба саҳифаи манбаъ мегузарад. Иҷозати паҳнкуниро дар манбаъ санҷед.", "Файл не копируется в EduSokh — ученик переходит на страницу источника. Проверьте право на распространение."),
  title: x("Nomi", "Ном", "Название"),
  kind: x("Turi", "Навъ", "Тип"),
  slide: x("Slayd", "Слайд", "Слайды"),
  video: x("Video", "Видео", "Видео"),
  other: x("Boshqa", "Дигар", "Другое"),
  external: x("tashqi manba", "манбаи берунӣ", "внешний источник"),
  teacherVideo: x("O'qituvchi qo'shgan", "Муаллим илова кардааст", "Добавлено учителем"),
} satisfies Record<string, Localized>;

type StepKey = "topic" | "theory" | "media" | "lab" | "game" | "test";
const STEPS: { k: StepKey; label: keyof typeof TM }[] = [
  { k: "topic", label: "sTopic" },
  { k: "theory", label: "sTheory" },
  { k: "media", label: "sMedia" },
  { k: "lab", label: "sLab" },
  { k: "game", label: "sGame" },
  { k: "test", label: "sTest" },
];

interface Video {
  id: string;
  title: string;
  channel: string;
  official: boolean;
}
interface ExtLink {
  id: string;
  kind: "slide" | "video" | "other";
  url: string;
  title: string;
  lang: string;
  source: string;
}

function TopicMaterials({ book, topic, lang, openLab, openLabTopic }: { book: TextbookDetail; topic: CatalogTopic; lang: Lang; openLab: (key: string, grade?: number) => void; openLabTopic: (id: string) => void }) {
  const T = (k: keyof typeof TX) => L(TX[k], lang);
  const U = (k: keyof typeof TM) => L(TM[k], lang);
  const [lesson, setLesson] = useState<TopicLang | null>(null);
  const [decks, setDecks] = useState<SlideDeckFile[]>([]);
  const [answers, setAnswers] = useState(false);
  const [teacherVideo, setTeacherVideo] = useState<Video | null>(null);
  const [links, setLinks] = useState<ExtLink[]>([]);
  const [mode, setMode] = useState(false);
  const [step, setStep] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [linkForm, setLinkForm] = useState({ kind: "slide", url: "", title: "", lang: book.lang });
  const [msg, setMsg] = useState("");
  const m = topic.materials;

  useEffect(() => {
    if (m.lesson && (book.lang === "uz" || book.lang === "tg")) {
      const l = book.lang;
      fetch(`/lessons/${m.lesson.file}`)
        .then((r) => r.json() as Promise<SubjectLessons>)
        .then((d) => setLesson(d.topics.find((t) => t.n === m.lesson?.n)?.[l] ?? null))
        .catch(() => setLesson(null));
    }
    if (m.slideDecks?.length)
      fetch("/api/slides")
        .then((r) => r.json() as Promise<SlideDeckFile[]>)
        .then((all) => setDecks(all.filter((d) => m.slideDecks?.includes(d.id))))
        .catch(() => setDecks([]));
    // O'qituvchi qo'shgan video va tashqi havolalar — katalog yig'ilgandan keyin ham ko'rinishi uchun jonli o'qiladi
    fetch("/api/lessons/video", { cache: "no-store" })
      .then((r) => r.json() as Promise<Record<string, Video>>)
      .then((all) => setTeacherVideo(all[topic.id] ?? null))
      .catch(() => undefined);
    fetch(`/api/materials/links?topicId=${encodeURIComponent(topic.id)}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<ExtLink[]>)
      .then(setLinks)
      .catch(() => undefined);
  }, [m, book.lang, topic.id]);

  const slides = useMemo<Slide[]>(() => (lesson?.slides ?? []).map((s, i) => ({ kind: i === 0 ? "title" : "bullets", title: same(s.title), bullets: { uz: s.bullets, tg: s.bullets, ru: s.bullets } })), [lesson]);
  const missing = <p className="text-sm text-slate-400">{T("notReady")}</p>;
  const labs = m.labs ?? [];
  const video = teacherVideo ?? m.video ?? null;
  const slideLinks = links.filter((l) => l.kind === "slide");
  const videoLinks = links.filter((l) => l.kind === "video");
  const otherLinks = links.filter((l) => l.kind === "other");
  const show = (k: StepKey | "extra") => !mode || (k !== "extra" && STEPS[step].k === k);
  const query = `${book.grades[0]}-sinf ${L(SUBJECTS[book.subject], "uz")} ${topic.title.replace(/^§?\s*\d+[-.]?\s*§?\.?\s*/, "")}`;
  const gamesHref = `/simulator?tab=games&topic=${encodeURIComponent(topic.id)}`;

  const saveVideo = async () => {
    setMsg("");
    const r = await fetch("/api/lessons/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topicId: topic.id, url: videoUrl }) });
    if (r.ok) {
      setTeacherVideo((await r.json()) as Video);
      setVideoUrl("");
    } else setMsg(await r.text());
  };
  const saveLink = async () => {
    setMsg("");
    const r = await fetch("/api/materials/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...linkForm, topicId: topic.id }) });
    if (r.ok) {
      const l = (await r.json()) as ExtLink;
      setLinks((s) => [...s, l]);
      setLinkForm((f) => ({ ...f, url: "", title: "" }));
    } else setMsg(await r.text());
  };
  const linkList = (list: ExtLink[]) =>
    list.map((l) => (
      <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="flex flex-wrap items-center gap-2 text-sm text-cobalt-700 underline dark:text-cobalt-100">
        <ExternalLink size={14} /> {l.title}
        <span className="text-xs text-slate-500 no-underline">
          ({l.source} · {LANG_NAME[l.lang] ?? l.lang} · {U("external")})
        </span>
      </a>
    ));

  return (
    <div className="grid gap-3">
      <div className={`${card} grid gap-2`}>
        <h3 className="text-lg font-extrabold">{topic.title}</h3>
        <p className="text-xs text-slate-500">
          {T("originalLang")}: {LANG_NAME[book.lang]}
          {topic.page != null ? ` · ${topic.page} ${T("page")}` : ""}
        </p>
        <FlagDots flags={topic.flags} lang={lang} />
        <div className="flex flex-wrap gap-2">
          <button className={mode ? btn : `${btn} border-brand-500`} onClick={() => setMode(false)} aria-pressed={!mode}>
            {U("allSections")}
          </button>
          <button className={mode ? `${btn} border-brand-500 bg-brand-500 text-white` : btn} onClick={() => (setMode(true), setStep(0))} aria-pressed={mode}>
            ▶ {U("lessonMode")}
          </button>
        </div>
        {mode && (
          <div className="grid gap-2">
            <ol className="flex flex-wrap gap-1 text-xs">
              {STEPS.map((s, i) => (
                <li key={s.k}>
                  <button onClick={() => setStep(i)} className={`rounded-full px-2.5 py-1 font-semibold ${i === step ? "bg-brand-500 text-white" : i < step ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 dark:bg-slate-700"}`}>
                    {i + 1}. {U(s.label)}
                  </button>
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <button className={btn} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                ← {U("prev")}
              </button>
              <button className={btn} disabled={step === STEPS.length - 1} onClick={() => setStep((s) => s + 1)}>
                {U("next")} →
              </button>
            </div>
          </div>
        )}
      </div>

      {show("theory") && (
        <Box title={T("m1")} ok={Boolean(lesson)}>
          {lesson ? (
            <div className="grid gap-1 text-sm">
              {lesson.goal && <p className="font-semibold">{lesson.goal}</p>}
              <ul className="list-disc pl-5">
                {lesson.slides.slice(1).map((s, i) => (
                  <li key={i}>
                    <b>{s.title}:</b> {s.bullets.join("; ")}
                  </li>
                ))}
              </ul>
              <p className="w-fit rounded bg-saffron-100 px-2 py-0.5 text-xs text-slate-800">⚠ {T("aiNote")}</p>
            </div>
          ) : (
            missing
          )}
        </Box>
      )}

      {show("media") && (
        <Box title={T("m2")} ok={topic.flags.slides || slideLinks.length > 0}>
          {slides.length > 1 && (
            <div className="grid gap-1">
              <span className="text-xs font-semibold text-slate-500">{T("slidesFromLesson")}</span>
              <SlidePlayer slides={slides} lang={lang} />
            </div>
          )}
          {decks.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`rounded px-1.5 text-xs font-bold text-white ${d.format === "pdf" ? "bg-red-600" : "bg-orange-600"}`}>{d.format.toUpperCase()}</span>
              <span className="flex-1">{d.title}</span>
              <span className="text-xs text-slate-500">{formatBytes(d.bytes)}</span>
              <a className={btn} href={`/api/slides/${encodeURIComponent(d.id)}`} target="_blank" rel="noreferrer">
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
          {linkList(slideLinks)}
          {!topic.flags.slides && !slideLinks.length && missing}
          <div className="flex flex-wrap gap-2">
            <a className={btn} href={`https://arxiv.uz/uz/search?q=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer">
              <Search size={14} /> {U("searchArxiv")}
            </a>
          </div>
        </Box>
      )}

      {show("media") && (
        <Box title={T("m3")} ok={Boolean(video) || videoLinks.length > 0}>
          {video ? (
            <>
              <div className="overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16 / 9" }}>
                <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}`} title={video.title} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
              </div>
              <p className="text-xs text-slate-500">
                {video.channel}
                {teacherVideo ? ` · ${U("teacherVideo")}` : ""}
              </p>
            </>
          ) : (
            !videoLinks.length && missing
          )}
          {linkList(videoLinks)}
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void saveVideo();
            }}
          >
            <input className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 text-sm dark:border-slate-600" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={U("addVideo")} aria-label={U("addVideo")} />
            <button className={btn} disabled={!videoUrl.trim()}>
              {U("save")}
            </button>
            <a className={btn} href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer">
              ▶ {U("findVideo")}
            </a>
          </form>
        </Box>
      )}

      {show("extra") && (
        <Box title={T("m4")} ok={false}>
          {missing}
        </Box>
      )}

      {show("lab") && (
        <Box title={T("m5")} ok={labs.length > 0}>
          {labs.length ? (
            <div className="flex flex-wrap gap-2">
              {labs.map((l) =>
                l.startsWith("model:") ? (
                  <button key={l} className={btn} onClick={() => openLab(l.slice(6), book.grades[0])}>
                    <FlaskConical size={14} /> 3D: {l.slice(6)}
                  </button>
                ) : (
                  <button key={l} className={btn} onClick={() => openLabTopic(l)}>
                    <FlaskConical size={14} /> {T("openLab")}
                  </button>
                ),
              )}
            </div>
          ) : (
            // Laboratoriya yo'q — tayyor deb ko'rsatmaymiz, o'rniga mavjud materiallarni taklif qilamiz
            <div className="grid gap-2 text-sm">
              <p className="text-slate-500">{U("noLabAlt")}</p>
              <div className="flex flex-wrap gap-2">
                <a className={btn} href={gamesHref}>
                  🎮 {U("openGames")}
                </a>
                {(video || slides.length > 1 || decks.length > 0) && (
                  <button className={btn} onClick={() => (setMode(true), setStep(2))}>
                    🎬 {U("sMedia")}
                  </button>
                )}
              </div>
            </div>
          )}
        </Box>
      )}

      {show("game") && (
        <Box title={U("games")} ok>
          <p className="text-sm text-slate-500">{U("gamesNote")}</p>
          <div>
            <a className={`${btn} border-brand-500`} href={gamesHref}>
              🎮 {U("openGames")}
            </a>
          </div>
        </Box>
      )}

      {show("extra") && (
        <Box title={T("m6")} ok={Boolean(lesson?.homework)}>
          {lesson?.homework ? <p className="text-sm">{lesson.homework}</p> : missing}
        </Box>
      )}

      {show("test") && (
        <Box title={T("m7")} ok={Boolean(lesson?.questions.length)}>
          {lesson?.questions.length ? (
            <div className="grid gap-2 text-sm">
              <ol className="grid list-decimal gap-1 pl-5">
                {lesson.questions.map((qq, i) => (
                  <li key={i}>
                    {qq.q}
                    <ul className="pl-2 text-slate-600 dark:text-slate-300">
                      {qq.options.map((o, j) => (
                        <li key={j} className={answers && j === qq.answer ? "font-bold text-emerald-700" : ""}>
                          {String.fromCharCode(65 + j)}) {o}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} /> {T("showAnswers")}
              </label>
            </div>
          ) : (
            missing
          )}
        </Box>
      )}

      {show("extra") && (
        <Box title={T("m8")} ok={false}>
          {missing}
        </Box>
      )}

      {(show("extra") || show("topic")) && (
        <Box title={T("m9")} ok>
          <p className="text-sm">
            {book.title} ({LANG_NAME[book.lang]}
            {book.year ? `, ${book.year}` : ""}
            {book.publisher ? `, «${book.publisher}»` : ""}){topic.page != null ? `, ${topic.page}-${T("page")}` : ""}.
          </p>
          <div>
            <a className={btn} href={bookLink(book, topic.page)} target="_blank" rel="noreferrer">
              <BookOpen size={14} /> {T("openBook")}
              {topic.page != null && book.pageOffset != null ? ` (${topic.page})` : ""}
            </a>
          </div>
          {linkList(otherLinks)}
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">{U("attach")}</summary>
            <p className="my-1 text-xs text-slate-500">{U("attachNote")}</p>
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void saveLink();
              }}
            >
              <input className="rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 dark:border-slate-600 sm:col-span-2" placeholder="https://…" value={linkForm.url} onChange={(e) => setLinkForm((f) => ({ ...f, url: e.target.value }))} aria-label="URL" />
              <input className="rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 dark:border-slate-600" placeholder={U("title")} value={linkForm.title} onChange={(e) => setLinkForm((f) => ({ ...f, title: e.target.value }))} aria-label={U("title")} />
              <div className="flex gap-2">
                <select className="flex-1 rounded-lg border border-slate-300 bg-transparent px-2 dark:border-slate-600" value={linkForm.kind} onChange={(e) => setLinkForm((f) => ({ ...f, kind: e.target.value }))} aria-label={U("kind")}>
                  <option value="slide">{U("slide")}</option>
                  <option value="video">{U("video")}</option>
                  <option value="other">{U("other")}</option>
                </select>
                <select className="flex-1 rounded-lg border border-slate-300 bg-transparent px-2 dark:border-slate-600" value={linkForm.lang} onChange={(e) => setLinkForm((f) => ({ ...f, lang: e.target.value as typeof f.lang }))} aria-label={T("originalLang")}>
                  {["uz", "tg", "ru"].map((l) => (
                    <option key={l} value={l}>
                      {LANG_NAME[l]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <button className={btn} disabled={!linkForm.url.trim()}>
                  {U("save")}
                </button>
              </div>
            </form>
          </details>
        </Box>
      )}
      {msg && (
        <p className="text-sm text-red-600" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
