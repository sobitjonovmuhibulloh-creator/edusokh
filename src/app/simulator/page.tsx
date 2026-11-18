"use client";

/**
 * Jonli simulyator: avtorizatsiyasiz barcha modullarni ko'rish.
 * O'qituvchi test yaratadi va tarqatadi → o'quvchi PIN bilan kiradi va yechadi →
 * natija o'qituvchi jadvalida chiqadi. Hammasi brauzerda (localStorage), server faqat
 * /api/bsb-generator uchun ishlatiladi.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, ClipboardCheck, Crown, FileText, FlaskConical, Gamepad2, Library, GraduationCap, Lock, Presentation, ShieldCheck, Trash2 } from "lucide-react";
import LabCenter from "@/components/Labs/LabCenter";
import CatalogPanel from "@/components/Catalog/CatalogPanel";
import GamesPanel from "@/components/Games/GamesPanel";
import SlideLibrary from "@/components/Slides/SlideLibrary";
import SlidePlayer from "@/components/Slides/SlidePlayer";
import {
  answerKeyLetters,
  distributeVariants,
  gradeAnswers,
  makeClassPin,
  markFromPercent,
  newSeed,
  studentView,
  type AttemptLayout,
  type TestQuestion,
} from "@/lib/anti-cheat";
import { DEMO_LESSONS, GRADES, SUBJECTS, type SubjectCode } from "@/lib/curriculum";
import { L, LANG_LABELS, LANGS, isLang, same, t, type Lang } from "@/lib/i18n";
import {
  CONTENT_LANGS,
  type ContentLang,
  type LessonsIndexItem,
  type SubjectLessons,
  type TopicEntry,
  type TopicLang,
  type TopicQuestion,
  type TopicVideo,
} from "@/lib/lesson-content";
import { METHODS, buildLessonPlan, buildSlides, type Slide } from "@/lib/lesson-template";
import { SLIDES_TEXT } from "@/lib/slide-library";
import { FEATURE_LABELS, PLANS, PLAN_INFO, PLAN_TEXT, formatSum, hasFeature, minPlanFor, type Feature, type Plan } from "@/lib/plans";

type Tab = "catalog" | "games" | "teacher" | "student" | "labs" | "slides" | "decks" | "books" | "pricing";

const CLASS_NAME = "9-B";
const STUDENTS = ["Aliyev Vali", "Karimova Dilnoza", "Rahimov Jasur", "Sodiqova Madina", "Nazarov Bobur", "Ergasheva Zarina"].map((name, i) => ({ id: `s${i + 1}`, name }));
const LETTERS = "ABCDEFGH";
const STORE_KEY = "edusokh-simulator-v1";

interface SimResult {
  score: number;
  max: number;
  status: "SUBMITTED" | "EXPIRED";
  tabSwitches: number;
}
interface SimExam {
  pin: string;
  title: string;
  questions: TestQuestion[];
  durationMin: number;
  layouts: Record<string, AttemptLayout>;
  results: Record<string, SimResult>;
}
interface Persisted {
  lang: Lang;
  plan: Plan;
  exam: SimExam | null;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<Persisted>;
      const plan = PLANS.find((p) => p === d.plan) ?? "promax";
      return { lang: isLang(d.lang) ? d.lang : "uz", plan, exam: d.exam ?? null };
    }
  } catch {
    /* saqlash mavjud emas */
  }
  return { lang: "uz", plan: "promax", exam: null };
}

const fmtClock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
const gradeLabel = (n: number, lang: Lang) => `${n}${t(lang, "gradeSuffix")}`;

const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const btn = "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600";
const btnPrimary = "inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600";

export default function SimulatorPage() {
  const [lang, setLang] = useState<Lang>("uz");
  const [tab, setTab] = useState<Tab>("slides");
  const [plan, setPlan] = useState<Plan>("promax");
  const [exam, setExam] = useState<SimExam | null>(null);
  const [labKey, setLabKey] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const d = load();
    setLang(d.lang);
    setPlan(d.plan);
    setExam(d.exam);
    // ?tab=decks kabi havola kerakli bo'limni to'g'ridan-to'g'ri ochadi
    const q = new URLSearchParams(location.search).get("tab");
    if (q && (["catalog", "games", "teacher", "student", "labs", "slides", "decks", "books", "pricing"] as string[]).includes(q)) setTab(q as Tab);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ lang, plan, exam } satisfies Persisted));
    } catch {
      /* e'tiborsiz */
    }
  }, [lang, plan, exam, ready]);

  const tabs: { id: Tab; icon: JSX.Element; label: string; feature?: Feature }[] = [
    { id: "catalog", icon: <Library size={16} />, label: L({ uz: "Katalog", tg: "Феҳрист", ru: "Каталог" }, lang) },
    { id: "slides", icon: <Presentation size={16} />, label: t(lang, "nav_slides") },
    { id: "decks", icon: <FileText size={16} />, label: L(SLIDES_TEXT.nav, lang) },
    { id: "books", icon: <BookOpen size={16} />, label: t(lang, "nav_books") },
    { id: "labs", icon: <FlaskConical size={16} />, label: t(lang, "nav_labs"), feature: "labs" },
    { id: "games", icon: <Gamepad2 size={16} />, label: L({ uz: "O'yinlar", tg: "Бозиҳо", ru: "Игры" }, lang) },
    { id: "teacher", icon: <ClipboardCheck size={16} />, label: t(lang, "nav_teacher"), feature: "exams" },
    { id: "student", icon: <ShieldCheck size={16} />, label: t(lang, "nav_student"), feature: "exams" },
    { id: "pricing", icon: <Crown size={16} />, label: L(PLAN_TEXT.title, lang) },
  ];
  const current = tabs.find((x) => x.id === tab);
  const locked = current?.feature && !hasFeature(plan, current.feature) ? current.feature : null;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <header className="flex flex-wrap items-center gap-3 py-4">
        <div className="flex items-center gap-2 text-xl font-extrabold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-cobalt-500 text-white">
            <GraduationCap size={20} />
          </span>
          EduSokh
          <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-xs font-bold text-slate-800">SIMULATOR</span>
        </div>
        <div className="flex-1" />
        <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600" role="group" aria-label={L(PLAN_TEXT.planLabel, lang)}>
          {PLANS.map((p) => (
            <button key={p} onClick={() => setPlan(p)} aria-pressed={plan === p} className={`px-3 py-1.5 text-sm font-semibold ${plan === p ? "bg-saffron-500 text-white" : ""}`}>
              {PLAN_INFO[p].name}
            </button>
          ))}
        </div>
        <div className="inline-flex overflow-hidden rounded-xl border border-slate-300 dark:border-slate-600" role="group" aria-label="Til / Забон / Язык">
          {LANGS.map((l) => (
            <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={`px-3 py-1.5 text-sm font-semibold ${lang === l ? "bg-brand-500 text-white" : ""}`}>
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-4 rounded-2xl bg-gradient-to-br from-brand-100 to-cobalt-100 p-5 dark:from-brand-700/30 dark:to-cobalt-700/30">
        <h1 className="text-2xl font-extrabold">{t(lang, "tagline")}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t(lang, "demoBanner")}</p>
        {lang !== "uz" && <p className="mt-1 text-xs text-slate-500">{t(lang, "reviewNote")}</p>}
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700" role="tablist">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={tab === x.id}
            onClick={() => setTab(x.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === x.id ? "border-brand-500 text-brand-600" : "border-transparent text-slate-500"}`}
          >
            {x.icon}
            {x.label}
            {x.feature && !hasFeature(plan, x.feature) && <Lock size={12} className="text-slate-400" />}
          </button>
        ))}
      </nav>

      {locked ? (
        <LockedCard feature={locked} lang={lang} onUpgrade={() => setTab("pricing")} />
      ) : (
        <>
          {tab === "teacher" && <TeacherPanel lang={lang} exam={exam} setExam={setExam} />}
          {tab === "student" && <StudentPanel lang={lang} exam={exam} setExam={setExam} />}
          {tab === "labs" && <LabCenter lang={lang} labKey={labKey} />}
          {tab === "slides" && (
            <LessonsPanel
              lang={lang}
              plan={plan}
              onUpgrade={() => setTab("pricing")}
              openLab={(k, g) => {
                // "kalit#sinf#vaqt" — sinfga mos mavzu tanlanadi; vaqt bir xil tugma qayta bosilganda ham ochilishi uchun
                setLabKey(`${k}#${g ?? ""}#${Date.now()}`);
                setTab("labs");
              }}
            />
          )}
          {tab === "decks" && <SlideLibrary lang={lang} />}
          {tab === "games" && <GamesPanel lang={lang} />}
          {tab === "catalog" && (
            <CatalogPanel
              lang={lang}
              openLab={(k, g) => {
                setLabKey(`${k}#${g ?? ""}#${Date.now()}`);
                setTab("labs");
              }}
              openLabTopic={(id) => {
                location.href = `/simulator?tab=labs&topic=${encodeURIComponent(id)}`;
              }}
            />
          )}
          {tab === "books" && <BooksPanel lang={lang} />}
          {tab === "pricing" && <PricingPanel lang={lang} plan={plan} setPlan={setPlan} />}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Tariflar ───────────────────────── */

function LockedCard({ feature, lang, onUpgrade }: { feature: Feature; lang: Lang; onUpgrade: () => void }) {
  const need = PLAN_INFO[minPlanFor(feature)].name;
  return (
    <div className={`${card} grid justify-items-start gap-2`}>
      <div className="flex items-center gap-2 font-bold">
        <Lock size={16} /> {L(FEATURE_LABELS[feature], lang)}
      </div>
      <p className="text-sm text-slate-500">{L(PLAN_TEXT.locked, lang).replace("{plan}", need)}</p>
      <button className={btnPrimary} onClick={onUpgrade}>
        <Crown size={14} /> {L(PLAN_TEXT.upgrade, lang)}
      </button>
    </div>
  );
}

function PricingPanel({ lang, plan, setPlan }: { lang: Lang; plan: Plan; setPlan: (p: Plan) => void }) {
  const all = Object.keys(FEATURE_LABELS) as Feature[];
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const info = PLAN_INFO[p];
          const isCurrent = p === plan;
          return (
            <div key={p} className={`${card} relative grid content-start gap-3 ${p === "pro" ? "border-2 border-brand-500" : ""}`}>
              {p === "pro" && <span className="absolute -top-3 left-4 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-bold text-white">{L(PLAN_TEXT.popular, lang)}</span>}
              <div>
                <h3 className="text-xl font-extrabold">{info.name}</h3>
                <p className="text-sm text-slate-500">{L(info.tagline, lang)}</p>
              </div>
              <div>
                <span className="text-3xl font-extrabold">{formatSum(info.monthly)}</span>{" "}
                <span className="text-sm text-slate-500">{L(PLAN_TEXT.perMonth, lang)}</span>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900/40">
                {L(PLAN_TEXT.school, lang)}: <b>{formatSum(info.schoolYearly)}</b> {L(PLAN_TEXT.sum, lang)}
              </div>
              <ul className="grid gap-1.5 text-sm">
                {all.map((f) => {
                  const ok = info.features.includes(f);
                  return (
                    <li key={f} className={`flex items-start gap-2 ${ok ? "" : "text-slate-400 line-through"}`}>
                      <span className={ok ? "text-emerald-600" : ""}>{ok ? "✓" : "—"}</span>
                      {L(FEATURE_LABELS[f], lang)}
                    </li>
                  );
                })}
              </ul>
              <button className={isCurrent ? btn : btnPrimary} disabled={isCurrent} onClick={() => setPlan(p)}>
                {isCurrent ? L(PLAN_TEXT.current, lang) : L(PLAN_TEXT.choose, lang)}
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-slate-500">{L(PLAN_TEXT.students, lang)}</p>
      <p className="text-xs text-slate-400">{L(PLAN_TEXT.note, lang)}</p>
    </div>
  );
}

/* ───────────────────────── O'qituvchi: BSB/CHSB ───────────────────────── */

function TeacherPanel({ lang, exam, setExam }: { lang: Lang; exam: SimExam | null; setExam: (e: SimExam | null) => void }) {
  const [grade, setGrade] = useState(8);
  const subjects = GRADES[grade - 1].subjects;
  const [subject, setSubject] = useState<SubjectCode>("fizika");
  const [topic, setTopic] = useState(L(DEMO_LESSONS[0].title, "uz"));
  const [type, setType] = useState<"BSB" | "CHSB">("BSB");
  const [count, setCount] = useState(5);
  const [duration, setDuration] = useState(45);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [status, setStatus] = useState<{ busy: boolean; note?: string; source?: "AI" | "BANK" }>({ busy: false });

  useEffect(() => {
    if (!subjects.includes(subject)) setSubject(subjects[0]);
  }, [subjects, subject]);

  const lessonsForSubject = DEMO_LESSONS.filter((l) => l.subject === subject);
  const topicKey = DEMO_LESSONS.find((l) => Object.values(l.title).includes(topic))?.id;

  const generate = async () => {
    setStatus({ busy: true });
    try {
      const res = await fetch("/api/bsb-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, subject, topic, topicKey, count, lang, type }),
      });
      const data = (await res.json()) as { questions?: TestQuestion[]; source?: "AI" | "BANK"; warning?: string; error?: string };
      if (!res.ok || !data.questions) throw new Error(data.error ?? res.statusText);
      setQuestions(data.questions);
      setStatus({ busy: false, source: data.source, note: data.warning });
    } catch (e) {
      setStatus({ busy: false, note: e instanceof Error ? e.message : String(e) });
    }
  };

  const distribute = () => {
    const layoutsMap = distributeVariants(STUDENTS, questions);
    setExam({
      pin: makeClassPin(CLASS_NAME),
      title: `${topic} — ${type}`,
      questions,
      durationMin: duration,
      layouts: Object.fromEntries(layoutsMap),
      results: {},
    });
  };

  return (
    <div className="grid gap-4">
      <section className={`${card} grid gap-3`}>
        <h2 className="text-lg font-bold">{t(lang, "nav_teacher")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{t(lang, "grade")}</span>
            <select className={input} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {GRADES.map((g) => (
                <option key={g.number} value={g.number}>
                  {gradeLabel(g.number, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{t(lang, "subject")}</span>
            <select className={input} value={subject} onChange={(e) => setSubject(e.target.value as SubjectCode)}>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {L(SUBJECTS[s], lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm lg:col-span-2">
            <span className="font-semibold">{t(lang, "topic")}</span>
            <input className={input} list="topics" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <datalist id="topics">
              {lessonsForSubject.map((l) => (
                <option key={l.id} value={L(l.title, lang)} />
              ))}
            </datalist>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{t(lang, "testType")}</span>
            <select className={input} value={type} onChange={(e) => setType(e.target.value as "BSB" | "CHSB")}>
              <option value="BSB">BSB</option>
              <option value="CHSB">CHSB</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{t(lang, "questionCount")}</span>
            <input className={`${input} w-24`} type="number" min={1} max={30} value={count} onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
          </label>
          <button className={btnPrimary} onClick={generate} disabled={status.busy || topic.trim().length < 2}>
            {status.busy ? t(lang, "generating") : t(lang, "generateAI")}
          </button>
          {status.source && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.source === "AI" ? "bg-saffron-100 text-slate-800" : "bg-slate-100 dark:bg-slate-700"}`}>
              {status.source === "AI" ? t(lang, "sourceAI") : t(lang, "sourceBank")}
            </span>
          )}
          {status.note && <span className="text-xs text-slate-500">{status.note}</span>}
        </div>
      </section>

      <ManualBuilder lang={lang} onAdd={(q) => setQuestions((qs) => [...qs, q])} />

      <section className={`${card} grid gap-3`}>
        <h3 className="font-bold">
          {t(lang, "questions")} ({questions.length})
        </h3>
        {questions.length === 0 && <p className="text-sm text-slate-500">{t(lang, "noQuestions")}</p>}
        <ol className="grid gap-2">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-2">
                <b>
                  {i + 1}. {q.text}
                </b>
                <button className="text-slate-400 hover:text-red-600" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))} aria-label={t(lang, "remove")}>
                  <Trash2 size={16} />
                </button>
              </div>
              <ul className="mt-1 grid gap-0.5 text-sm sm:grid-cols-2">
                {q.options.map((o, k) => (
                  <li key={o.id} className={o.id === q.correctOptionId ? "font-semibold text-emerald-600" : ""}>
                    {LETTERS[k]}) {o.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <select className={`${input} w-auto`} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[1, 10, 20, 45, 80].map((m) => (
              <option key={m} value={m}>
                {m} {t(lang, "minutes")}
              </option>
            ))}
          </select>
          <button className={btnPrimary} onClick={distribute} disabled={questions.length === 0}>
            {t(lang, "distribute")} → {CLASS_NAME}
          </button>
        </div>
      </section>

      {exam && <DistributionTable lang={lang} exam={exam} onClear={() => setExam(null)} />}
    </div>
  );
}

function ManualBuilder({ lang, onAdd }: { lang: Lang; onAdd: (q: TestQuestion) => void }) {
  const [text, setText] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);
  const valid = text.trim().length > 0 && opts.every((o) => o.trim().length > 0) && new Set(opts.map((o) => o.trim())).size === 4;

  const add = () => {
    const options = opts.map((o) => ({ id: newSeed().slice(0, 10), text: o.trim() }));
    onAdd({ id: newSeed().slice(0, 10), text: text.trim(), options, correctOptionId: options[correct].id });
    setText("");
    setOpts(["", "", "", ""]);
    setCorrect(0);
  };

  return (
    <details className={card}>
      <summary className="cursor-pointer font-bold">{t(lang, "manualBuilder")}</summary>
      <div className="mt-3 grid gap-2">
        <input className={input} placeholder={t(lang, "questionText")} value={text} onChange={(e) => setText(e.target.value)} />
        {opts.map((o, k) => (
          <div key={k} className="flex items-center gap-2">
            <input type="radio" name="correct" checked={correct === k} onChange={() => setCorrect(k)} aria-label={`${t(lang, "correct")} ${LETTERS[k]}`} />
            <input className={input} placeholder={`${t(lang, "option")} ${LETTERS[k]}`} value={o} onChange={(e) => setOpts((arr) => arr.map((x, j) => (j === k ? e.target.value : x)))} />
          </div>
        ))}
        <p className="text-xs text-slate-500">◉ = {t(lang, "correct")}</p>
        <div>
          <button className={btn} onClick={add} disabled={!valid}>
            + {t(lang, "addQuestion")}
          </button>
        </div>
      </div>
    </details>
  );
}

function DistributionTable({ lang, exam, onClear }: { lang: Lang; exam: SimExam; onClear: () => void }) {
  const indexOf = new Map(exam.questions.map((q, i) => [q.id, i + 1]));
  const unique = new Set(Object.values(exam.layouts).map((l) => l.questionOrder.join(",") + answerKeyLetters(exam.questions, l))).size;
  return (
    <section className={`${card} grid gap-3`}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-bold">{t(lang, "scoreReport")}</h3>
        <span className="rounded-lg bg-cobalt-100 px-3 py-1 font-mono text-sm font-bold text-cobalt-700">
          {t(lang, "classPin")}: {exam.pin}
        </span>
        <span className="text-sm text-slate-500">
          {unique}/{STUDENTS.length} {t(lang, "uniqueVariants")}
        </span>
        <div className="flex-1" />
        <button className={btn} onClick={onClear}>
          <Trash2 size={14} /> {t(lang, "remove")}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 pr-3">{t(lang, "student")}</th>
              <th className="py-1 pr-3">{t(lang, "order")}</th>
              <th className="py-1 pr-3">{t(lang, "answerKey")}</th>
              <th className="py-1 pr-3">{t(lang, "score")}</th>
            </tr>
          </thead>
          <tbody>
            {STUDENTS.map((s) => {
              const l = exam.layouts[s.id];
              const r = exam.results[s.id];
              return (
                <tr key={s.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="py-1.5 pr-3">{s.name}</td>
                  <td className="py-1.5 pr-3 font-mono">{l.questionOrder.map((id) => indexOf.get(id)).join("-")}</td>
                  <td className="py-1.5 pr-3 font-mono">{answerKeyLetters(exam.questions, l)}</td>
                  <td className="py-1.5 pr-3">
                    {r ? (
                      <>
                        <b>
                          {r.score}/{r.max}
                        </b>{" "}
                        · {t(lang, "mark")} {markFromPercent(Math.round((r.score / r.max) * 100))}
                        {r.tabSwitches > 0 && <span className="ml-2 text-xs text-red-600">⚠ {r.tabSwitches}</span>}
                      </>
                    ) : (
                      <span className="text-slate-400">{t(lang, "notStarted")}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ───────────────────────── O'quvchi: imtihon ───────────────────────── */

interface Attempt {
  studentId: string;
  deadline: number;
  answers: Record<string, string>;
  idx: number;
  tabSwitches: number;
  confirming: boolean;
}

function StudentPanel({ lang, exam, setExam }: { lang: Lang; exam: SimExam | null; setExam: (e: SimExam | null) => void }) {
  const [pin, setPin] = useState("");
  const [studentId, setStudentId] = useState(STUDENTS[0].id);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [done, setDone] = useState<(SimResult & { auto: boolean }) | null>(null);
  const [now, setNow] = useState(Date.now());

  const view = useMemo(() => (exam && attempt ? studentView(exam.questions, exam.layouts[attempt.studentId]) : []), [exam, attempt]);

  const finish = useCallback(
    (auto: boolean) => {
      if (!exam || !attempt) return;
      const { score, max } = gradeAnswers(exam.questions, attempt.answers);
      const result: SimResult = { score, max, status: auto ? "EXPIRED" : "SUBMITTED", tabSwitches: attempt.tabSwitches };
      setExam({ ...exam, results: { ...exam.results, [attempt.studentId]: result } });
      setDone({ ...result, auto });
      setAttempt(null);
    },
    [exam, attempt, setExam],
  );

  useEffect(() => {
    if (!attempt) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    const onVis = () => {
      if (document.hidden) setAttempt((a) => (a ? { ...a, tabSwitches: a.tabSwitches + 1 } : a));
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [attempt]);

  useEffect(() => {
    if (attempt && now >= attempt.deadline) finish(true);
  }, [now, attempt, finish]);

  const join = () => {
    if (!exam || pin.trim().toUpperCase() !== exam.pin) {
      setError(true);
      return;
    }
    setError(false);
    setDone(null);
    setAttempt({ studentId, deadline: Date.now() + exam.durationMin * 60_000, answers: {}, idx: 0, tabSwitches: 0, confirming: false });
  };

  if (done) {
    const pct = done.max ? Math.round((done.score / done.max) * 100) : 0;
    return (
      <div className={`${card} mx-auto grid max-w-md gap-2 text-center`}>
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold">{t(lang, "finished")}</h2>
        {done.auto && <p className="text-sm text-slate-500">{t(lang, "autoSubmitted")}</p>}
        <p className="text-lg">
          {t(lang, "score")}: <b>{done.score}/{done.max}</b> ({pct}%) · {t(lang, "mark")}: <b>{markFromPercent(pct)}</b>
        </p>
        <div>
          <button className={btn} onClick={() => setDone(null)}>
            {t(lang, "back")}
          </button>
        </div>
      </div>
    );
  }

  if (!attempt || !exam) {
    return (
      <div className={`${card} mx-auto grid max-w-md gap-3`}>
        <h2 className="text-lg font-bold">{t(lang, "enterPin")}</h2>
        <input className={`${input} font-mono uppercase`} placeholder="SOX-9B-2026-XXX" value={pin} onChange={(e) => setPin(e.target.value)} />
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{t(lang, "chooseStudent")}</span>
          <select className={input} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {STUDENTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{t(lang, "wrongPin")}</p>}
        {exam && <p className="text-xs text-slate-500">PIN: {exam.pin}</p>}
        <div>
          <button className={btnPrimary} onClick={join} disabled={!pin.trim()}>
            {t(lang, "join")}
          </button>
        </div>
      </div>
    );
  }

  const q = view[attempt.idx];
  const left = Math.max(0, Math.round((attempt.deadline - now) / 1000));
  const unanswered = view.filter((x) => !attempt.answers[x.id]).length;
  const set = (patch: Partial<Attempt>) => setAttempt((a) => (a ? { ...a, ...patch } : a));

  return (
    <div className="mx-auto grid max-w-3xl gap-3">
      <div className={`${card} flex flex-wrap items-center gap-3`}>
        <b className="flex-1">{exam.title}</b>
        <span className="text-sm text-slate-500">{t(lang, "timeLeft")}</span>
        <span className={`font-mono text-lg font-bold ${left < 60 ? "text-red-600" : ""}`}>{fmtClock(left)}</span>
      </div>
      <p className="text-xs text-slate-500">{t(lang, "tabWarning")}</p>
      <div className="flex flex-wrap gap-1.5">
        {view.map((x, k) => (
          <button
            key={x.id}
            onClick={() => set({ idx: k })}
            className={`h-9 w-9 rounded-lg border text-sm font-semibold ${attempt.answers[x.id] ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 dark:border-slate-600"} ${k === attempt.idx ? "ring-2 ring-brand-500" : ""}`}
          >
            {k + 1}
          </button>
        ))}
      </div>
      {q && (
        <div className={`${card} grid gap-2`}>
          <div className="text-sm text-slate-500">
            {t(lang, "question")} {attempt.idx + 1} {t(lang, "of")} {view.length}
          </div>
          <h3 className="text-lg font-semibold">{q.text}</h3>
          {q.options.map((o, k) => {
            const chosen = attempt.answers[q.id] === o.id;
            return (
              <button
                key={o.id}
                role="radio"
                aria-checked={chosen}
                onClick={() => set({ answers: { ...attempt.answers, [q.id]: o.id } })}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left ${chosen ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "border-slate-200 dark:border-slate-700"}`}
              >
                <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-slate-100 font-mono text-sm font-bold dark:bg-slate-700">{LETTERS[k]}</span>
                <span>{o.text}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} disabled={attempt.idx === 0} onClick={() => set({ idx: attempt.idx - 1 })}>
          ← {t(lang, "prev")}
        </button>
        <button className={btn} disabled={attempt.idx >= view.length - 1} onClick={() => set({ idx: attempt.idx + 1 })}>
          {t(lang, "next")} →
        </button>
        <div className="flex-1" />
        {attempt.confirming ? (
          <span className="flex flex-wrap items-center gap-2 text-sm">
            {t(lang, "confirmSubmit")} <b>{unanswered}</b>
            <button className={btnPrimary} onClick={() => finish(false)}>
              {t(lang, "yes")}
            </button>
            <button className={btn} onClick={() => set({ confirming: false })}>
              {t(lang, "no")}
            </button>
          </span>
        ) : (
          <button className={btnPrimary} onClick={() => set({ confirming: true })}>
            {t(lang, "submit")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Darslar va slaydlar ───────────────────────── */

interface OpenBook {
  url: string;
  page?: number;
  title: string;
}

function LessonsPanel({ lang, plan, onUpgrade, openLab }: { lang: Lang; plan: Plan; onUpgrade: () => void; openLab: (key: string, grade?: number) => void }) {
  const [books, setBooks] = useState<BookIndexItem[]>([]);
  const [lindex, setLindex] = useState<LessonsIndexItem[]>([]);
  const [grade, setGrade] = useState(8);
  const [cLang, setCLang] = useState<ContentLang>(lang === "tg" ? "tg" : "uz");
  const [subject, setSubject] = useState<SubjectCode | null>(null);
  const [demo, setDemo] = useState(false);
  const [data, setData] = useState<SubjectLessons | null>(null);
  const [n, setN] = useState(1);
  const [viewer, setViewer] = useState<OpenBook | null>(null);

  useEffect(() => setCLang(lang === "tg" ? "tg" : "uz"), [lang]);
  useEffect(() => {
    fetch("/books/index.json", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<BookIndexItem[]>) : []))
      .then(setBooks)
      .catch(() => setBooks([]));
    fetch("/lessons/index.json", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<LessonsIndexItem[]>) : []))
      .then(setLindex)
      .catch(() => setLindex([]));
  }, []);

  const lessonsItem = subject ? lindex.find((x) => x.grade === grade && x.subject === subject) : undefined;
  useEffect(() => {
    setData(null);
    if (!lessonsItem) return;
    fetch(`/lessons/${lessonsItem.file}`, { cache: "no-store" })
      .then((r) => r.json() as Promise<SubjectLessons>)
      .then((d) => {
        setData(d);
        setN(d.topics[0]?.n ?? 1);
      })
      .catch(() => setData(null));
  }, [lessonsItem]);

  // Shu sinfda o'zbek yoki tojik tilida darsligi bor fanlar
  const gradeBooks = books.filter((b) => b.grade === grade && (b.lang === "uz" || b.lang === "tg") && b.subject);
  const subjects = Array.from(new Set(gradeBooks.map((b) => b.subject as SubjectCode))).sort((a, b) => L(SUBJECTS[a], lang).localeCompare(L(SUBJECTS[b], lang)));
  const textbooks = subject ? gradeBooks.filter((b) => b.subject === subject).sort((a, b) => (a.lang === cLang ? -1 : 0) - (b.lang === cLang ? -1 : 0)) : [];

  const entry = data?.topics.find((x) => x.n === n) ?? data?.topics[0];
  const chapters = data ? Array.from(new Set(data.topics.map((x) => x.chapter))) : [];
  const topicTitle = (x: TopicEntry) => (x[cLang] ?? x.uz ?? x.tg)?.title ?? `#${x.n}`;

  return (
    <div className="grid gap-4">
      <div className={`${card} flex flex-wrap items-end gap-3`}>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{t(lang, "grade")}</span>
          <select
            className={`${input} w-auto`}
            value={grade}
            onChange={(e) => {
              setGrade(Number(e.target.value));
              setSubject(null);
              setDemo(false);
            }}
          >
            {GRADES.map((g) => (
              <option key={g.number} value={g.number}>
                {gradeLabel(g.number, lang)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-1 text-sm">
          <span className="font-semibold">{t(lang, "contentLang")}</span>
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
            {CONTENT_LANGS.map((l) => (
              <button key={l} onClick={() => setCLang(l)} aria-pressed={cLang === l} className={`px-3 py-2 text-sm font-semibold ${cLang === l ? "bg-brand-500 text-white" : ""}`}>
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1" />
        <button className={demo ? btnPrimary : btn} onClick={() => setDemo((d) => !d)}>
          {t(lang, "sampleLessons")}
        </button>
      </div>

      {demo ? (
        <DemoLessons lang={lang} openLab={openLab} />
      ) : !subject ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map((s) => {
            const item = lindex.find((x) => x.grade === grade && x.subject === s);
            const langsHere = Array.from(new Set(gradeBooks.filter((b) => b.subject === s).map((b) => b.lang)));
            return (
              <button key={s} onClick={() => setSubject(s)} className={`${card} grid gap-1.5 text-left transition hover:border-brand-500`}>
                <b className="text-base">{L(SUBJECTS[s], lang)}</b>
                <span className="flex flex-wrap gap-1 text-xs">
                  {item ? (
                    <span className="rounded-full bg-emerald-100 px-2 font-semibold text-emerald-800">
                      {t(lang, "contentsReady")}: {item.topics}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 text-slate-600 dark:bg-slate-700 dark:text-slate-300">{t(lang, "contentsPending")}</span>
                  )}
                  {langsHere.map((l) => (
                    <span key={l} className="rounded-full bg-cobalt-100 px-2 font-semibold uppercase text-cobalt-700">
                      {l === "tg" ? "тҷ" : l}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
          {subjects.length === 0 && <p className={`${card} text-sm text-slate-500`}>{t(lang, "booksEmpty")}</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button className={btn} onClick={() => setSubject(null)}>
              ← {t(lang, "allSubjects")}
            </button>
            <h2 className="text-xl font-extrabold">
              {L(SUBJECTS[subject], lang)} · {gradeLabel(grade, lang)}
            </h2>
            <div className="flex-1" />
            {textbooks.map((b) => (
              <button key={b.sourceUrl} className={btn} onClick={() => setViewer({ url: b.storageUrl, title: `${L(SUBJECTS[subject], lang)} · ${LANG_LABELS[b.lang]}` })}>
                <BookOpen size={14} /> {LANG_LABELS[b.lang]}
              </button>
            ))}
          </div>
          {data && entry ? (
            <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
              <aside className="grid max-h-[80vh] content-start gap-3 overflow-y-auto pr-1">
                <div className="text-sm font-bold">{t(lang, "contents")}</div>
                {chapters.map((ch) => (
                  <div key={ch} className="grid gap-1.5">
                    {ch && (
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        {data.topics.find((x) => x.chapter === ch)?.chapterI18n?.[cLang] ?? ch}
                      </div>
                    )}
                    {data.topics
                      .filter((x) => x.chapter === ch)
                      .map((x) => (
                        <button
                          key={x.n}
                          onClick={() => setN(x.n)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm ${x.n === entry.n ? "border-brand-500 bg-brand-100 font-semibold dark:bg-brand-700/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}
                        >
                          <span className="mr-1 font-mono text-xs text-slate-400">{x.n}.</span>
                          {topicTitle(x)}
                        </button>
                      ))}
                  </div>
                ))}
              </aside>
              <TopicView
                key={`${entry.n}-${cLang}`}
                entry={entry}
                cLang={cLang}
                lang={lang}
                grade={grade}
                subject={data.subject}
                plan={plan}
                onUpgrade={onUpgrade}
                openLab={openLab}
                onOpenBook={setViewer}
              />
            </div>
          ) : (
            <div className={`${card} grid gap-2 text-sm`}>
              <b>{t(lang, "contentsPending")}</b>
              <p className="text-slate-500">{t(lang, "contentsPendingHint")}</p>
            </div>
          )}
        </div>
      )}

      {viewer && <BookViewer book={viewer} lang={lang} onClose={() => setViewer(null)} />}
    </div>
  );
}

function TopicView({
  entry,
  cLang,
  lang,
  grade,
  subject,
  plan,
  onUpgrade,
  openLab,
  onOpenBook,
}: {
  entry: TopicEntry;
  cLang: ContentLang;
  lang: Lang;
  grade: number;
  subject: SubjectCode;
  plan: Plan;
  onUpgrade: () => void;
  openLab: (key: string, grade?: number) => void;
  onOpenBook: (b: OpenBook) => void;
}) {
  const other: ContentLang = cLang === "uz" ? "tg" : "uz";
  const tl = (entry[cLang] ?? entry[other]) as TopicLang;
  const fallback = !entry[cLang];
  // O'qituvchi qo'shgan video (data/topic-videos.json) darslikdan yaratilgan videodan ustun turadi
  const videoKey = `${grade}-${subject}-${entry.n}-${cLang}`;
  const [teacherVideo, setTeacherVideo] = useState<TopicVideo | null>(null);
  const [editing, setEditing] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoErr, setVideoErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/lessons/video", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Record<string, TopicVideo>>) : {}))
      .then((all) => setTeacherVideo((all as Record<string, TopicVideo>)[videoKey] ?? null))
      .catch(() => undefined);
  }, [videoKey]);
  const videoRequest = async (method: "POST" | "DELETE") => {
    setBusy(true);
    setVideoErr("");
    try {
      const r = await fetch("/api/lessons/video", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, subject, n: entry.n, lang: cLang, url: videoUrl }),
      });
      if (!r.ok) throw new Error(await r.text());
      setTeacherVideo(method === "POST" ? ((await r.json()) as TopicVideo) : null);
      setEditing(false);
      setVideoUrl("");
    } catch (e) {
      setVideoErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const video = teacherVideo ?? tl.video ?? entry[other]?.video ?? null;
  const videoOtherLang = !teacherVideo && !tl.video && Boolean(video);
  const slides = useMemo<Slide[]>(
    () =>
      tl.slides.map((s, i) => ({
        kind: i === 0 ? "title" : "bullets",
        title: same(s.title),
        bullets: { uz: s.bullets, tg: s.bullets, ru: s.bullets },
      })),
    [tl],
  );
  const lessonPlan = useMemo(
    () => buildLessonPlan({ title: same(tl.title), goal: same(tl.goal), labKey: entry.labKey ?? undefined, methods: ["THINK_PAIR_SHARE", "EXIT_TICKET"] }),
    [tl, entry.labKey],
  );

  return (
    <div className="grid min-w-0 gap-5">
      <header className="grid gap-1">
        <div className="text-xs font-semibold uppercase text-brand-600">
          {entry.chapterI18n?.[cLang] ?? entry.chapter} · {gradeLabel(grade, lang)}
        </div>
        <h2 className="text-2xl font-extrabold">{tl.title}</h2>
        {tl.goal && (
          <p>
            <b>{t(lang, "goal")}:</b> {tl.goal}
          </p>
        )}
        {slides.length > 0 && <p className="w-fit rounded-lg bg-saffron-100 px-3 py-1 text-xs text-slate-800">⚠ {t(lang, "aiDraft")}</p>}
        {fallback && <p className="text-xs text-slate-500">{t(lang, "langFallback")}</p>}
      </header>

      <section>
        <h3 className="mb-2 font-bold">{t(lang, "slides")}</h3>
        {slides.length > 0 ? <SlidePlayer slides={slides} lang={lang} /> : <p className={`${card} text-sm text-slate-500`}>{t(lang, "slidesPending")}</p>}
      </section>

      <section className="grid gap-2">
        <h3 className="font-bold">{t(lang, "video")}</h3>
        {!hasFeature(plan, "video") ? (
          <LockedCard feature="video" lang={lang} onUpgrade={onUpgrade} />
        ) : video ? (
          <>
            <div className="overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "16 / 9" }}>
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}`}
                title={video.title}
                allow="encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">{video.channel}</span>
              {video.official ? (
                <span className="rounded-full bg-emerald-100 px-2 text-xs font-semibold text-emerald-800">{t(lang, "officialVideo")}</span>
              ) : (
                <span className="rounded-full bg-saffron-100 px-2 text-xs text-slate-800">{t(lang, "videoUnverified")}</span>
              )}
              {videoOtherLang && <span className="text-xs text-slate-500">{t(lang, "videoOtherLang")}</span>}
              {teacherVideo && <span className="rounded-full bg-brand-100 px-2 text-xs text-brand-700">{t(lang, "teacherVideo")}</span>}
            </div>
          </>
        ) : null}
        {hasFeature(plan, "video") &&
          (editing || !video ? (
            <form
              className={`${card} grid gap-2 border-2 border-dashed border-brand-500 text-sm`}
              onSubmit={(e) => {
                e.preventDefault();
                void videoRequest("POST");
              }}
            >
              {!video && <span className="text-slate-500">{t(lang, "noVideo")}</span>}
              <b>{t(lang, "addVideo")}</b>
              <input className={input} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={t(lang, "videoUrlPlaceholder")} autoFocus={editing} />
              {videoErr && <p className="text-red-600">{videoErr}</p>}
              <div className="flex flex-wrap gap-2">
                <button className={btnPrimary} disabled={busy || !videoUrl.trim()}>
                  {t(lang, "save")}
                </button>
                {video && (
                  <button type="button" className={btn} onClick={() => setEditing(false)}>
                    {t(lang, "cancel")}
                  </button>
                )}
                <a className={btn} target="_blank" rel="noreferrer" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${grade}-sinf ${tl.title}`)}`}>
                  ▶ {t(lang, "findVideo")}
                </a>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={() => setEditing(true)}>
                + {t(lang, video ? "changeVideo" : "addVideo")}
              </button>
              {teacherVideo && (
                <button className={btn} disabled={busy} onClick={() => void videoRequest("DELETE")}>
                  <Trash2 size={14} /> {t(lang, "removeVideo")}
                </button>
              )}
            </div>
          ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className={card} hidden={tl.keyConcepts.length === 0}>
          <h3 className="mb-2 font-bold">{t(lang, "keyConcepts")}</h3>
          <div className="flex flex-wrap gap-1.5">
            {tl.keyConcepts.map((k) => (
              <span key={k} className="rounded-full bg-brand-100 px-2.5 py-0.5 text-sm text-brand-700">
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className={`${card} grid content-start gap-2`}>
          <h3 className="font-bold">{t(lang, "textbookPage")}</h3>
          <p className="text-sm text-slate-500">
            {tl.printedPage}
            {t(lang, "pageWord")} (PDF: {tl.pdfPages[0]}–{tl.pdfPages[1]})
          </p>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={() => onOpenBook({ url: tl.textbookUrl, page: tl.pdfPages[0], title: tl.title })}>
              <BookOpen size={14} /> {t(lang, "openBook")}
            </button>
            {entry.labKey &&
              (hasFeature(plan, "labs") ? (
                <button className={btnPrimary} onClick={() => openLab(entry.labKey as string, grade)}>
                  <FlaskConical size={14} /> {t(lang, "nav_labs")}
                </button>
              ) : (
                <button className={btn} onClick={onUpgrade}>
                  <Lock size={14} /> {t(lang, "nav_labs")} · {PLAN_INFO[minPlanFor("labs")].name}
                </button>
              ))}
          </div>
        </div>
      </section>

      <QuickCheck questions={tl.questions} lang={lang} />

      {tl.homework && (
        <section className={card}>
          <h3 className="mb-1 font-bold">{t(lang, "homework")}</h3>
          <p className="text-sm">{tl.homework}</p>
        </section>
      )}

      <section>
        <h3 className="mb-2 font-bold">
          {t(lang, "plan45")} · {lessonPlan.reduce((a, s) => a + s.minutes, 0)} {t(lang, "minutes")}
        </h3>
        <div className="grid gap-2">
          {lessonPlan.map((s, k) => (
            <div key={k} className={`${card} flex gap-3`}>
              <div className="grid h-12 w-14 flex-none place-items-center rounded-xl bg-brand-100 font-mono font-bold text-brand-700">
                {s.minutes}
                <small className="-mt-2 text-[10px] font-normal">{t(lang, "minutes")}</small>
              </div>
              <div className="min-w-0">
                <b>{L(s.title, lang)}</b>
                <p className="text-sm text-slate-500">{L(s.body, lang)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function QuickCheck({ questions, lang }: { questions: TopicQuestion[]; lang: Lang }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  if (questions.length === 0) return null;
  const score = questions.filter((q, i) => picked[i] === q.answer).length;
  return (
    <section className={`${card} grid gap-3`}>
      <h3 className="font-bold">{t(lang, "quickCheck")}</h3>
      {questions.map((q, i) => (
        <div key={i} className="grid gap-1.5">
          <b className="text-sm">
            {i + 1}. {q.q}
          </b>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {q.options.map((o, k) => {
              const chosen = picked[i] === k;
              const state = checked ? (k === q.answer ? "border-emerald-500 bg-emerald-50 text-emerald-900" : chosen ? "border-red-400 bg-red-50 text-red-900" : "border-slate-200 dark:border-slate-700") : chosen ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "border-slate-200 dark:border-slate-700";
              return (
                <button key={k} disabled={checked} onClick={() => setPicked((p) => ({ ...p, [i]: k }))} className={`rounded-lg border px-3 py-1.5 text-left text-sm ${state}`}>
                  {LETTERS[k]}) {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        {checked ? (
          <>
            <b>
              {score}/{questions.length}
            </b>
            <button
              className={btn}
              onClick={() => {
                setPicked({});
                setChecked(false);
              }}
            >
              ↺
            </button>
          </>
        ) : (
          <button className={btnPrimary} onClick={() => setChecked(true)} disabled={Object.keys(picked).length === 0}>
            {t(lang, "check")}
          </button>
        )}
      </div>
    </section>
  );
}

function DemoLessons({ lang, openLab }: { lang: Lang; openLab: (key: string, grade?: number) => void }) {
  const [id, setId] = useState(DEMO_LESSONS[0].id);
  const lesson = DEMO_LESSONS.find((l) => l.id === id) ?? DEMO_LESSONS[0];
  const plan = useMemo(() => buildLessonPlan(lesson), [lesson]);
  const slides = useMemo(() => buildSlides(lesson), [lesson]);
  const total = plan.reduce((a, s) => a + s.minutes, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="grid content-start gap-2">
        {DEMO_LESSONS.map((l) => (
          <button
            key={l.id}
            onClick={() => setId(l.id)}
            className={`rounded-xl border p-3 text-left ${l.id === id ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}
          >
            <div className="text-xs font-semibold uppercase text-brand-600">
              {L(SUBJECTS[l.subject], lang)} · {gradeLabel(l.grade, lang)}
            </div>
            <div className="font-semibold">{L(l.title, lang)}</div>
          </button>
        ))}
      </aside>
      <div className="grid min-w-0 gap-5">
        <header>
          <h2 className="text-2xl font-extrabold">{L(lesson.title, lang)}</h2>
          <p className="mt-1">
            <b>{t(lang, "goal")}:</b> {L(lesson.goal, lang)}
          </p>
        </header>
        <section>
          <h3 className="mb-2 font-bold">{t(lang, "slides")}</h3>
          <SlidePlayer slides={slides} lang={lang} />
        </section>
        <section>
          <h3 className="mb-2 font-bold">
            {t(lang, "plan45")} · {total} {t(lang, "minutes")}
          </h3>
          <div className="grid gap-2">
            {plan.map((s, k) => (
              <div key={k} className={`${card} flex gap-3`}>
                <div className="grid h-12 w-14 flex-none place-items-center rounded-xl bg-brand-100 font-mono font-bold text-brand-700">
                  {s.minutes}
                  <small className="-mt-2 text-[10px] font-normal">{t(lang, "minutes")}</small>
                </div>
                <div className="min-w-0">
                  <b>{L(s.title, lang)}</b>
                  <p className="text-sm text-slate-500">{L(s.body, lang)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          {lesson.methods.map((m) => (
            <div key={m} className={card}>
              <b>{L(METHODS[m].name, lang)}</b>
              <span className="ml-2 rounded-full bg-slate-100 px-2 text-xs dark:bg-slate-700">
                {METHODS[m].minutes} {t(lang, "minutes")}
              </span>
              <ol className="mt-2 list-decimal pl-5 text-sm">
                {METHODS[m].steps[lang].map((st, k) => (
                  <li key={k}>{st}</li>
                ))}
              </ol>
            </div>
          ))}
        </section>
        <div className="flex flex-wrap gap-2">
          {lesson.labKey && (
            <button className={btnPrimary} onClick={() => openLab(lesson.labKey as string, lesson.grade)}>
              <FlaskConical size={16} /> {t(lang, "nav_labs")}
            </button>
          )}
          <a className={btn} target="_blank" rel="noreferrer" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(lesson.videoQuery)}`}>
            ▶ {t(lang, "findVideo")}
          </a>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Darsliklar ───────────────────────── */

interface BookIndexItem {
  title: string;
  grade: number;
  subject: SubjectCode | null;
  lang: Lang;
  storageUrl: string;
  sourceUrl: string;
}

/**
 * Kitob manzilini o'z saytimiz manziliga aylantiradi: rasmiy portal fayllari /api/books/file
 * orqali (server keshlab beradi), mahalliy /books/... fayllar to'g'ridan-to'g'ri.
 */
function bookHref(url: string, page?: number): string | null {
  const hash = page ? `#page=${page}` : "";
  if (url.startsWith("/books/")) return url + hash;
  if (/^https:\/\/old\.eduportal\.uz\/Umumiyfiles\/darsliklar\//.test(url)) return `/api/books/file?u=${encodeURIComponent(url)}${hash}`;
  return null;
}

function BookViewer({ book, lang, onClose }: { book: OpenBook; lang: Lang; onClose: () => void }) {
  const href = bookHref(book.url, book.page);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr] bg-slate-900/80 p-2 sm:p-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex flex-wrap items-center gap-2 rounded-t-xl bg-white px-4 py-3 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <b className="flex-1">
          {book.title}
          {book.page ? ` · PDF ${book.page}` : ""}
        </b>
        <span className="hidden text-xs text-slate-500 sm:inline">{t(lang, "bookLoadHint")}</span>
        <button className={btnPrimary} onClick={onClose}>
          {t(lang, "close")}
        </button>
      </div>
      <div className="rounded-b-xl bg-white dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        {href ? <iframe className="h-full w-full rounded-b-xl" src={href} title={book.title} /> : <p className="p-4 text-sm">—</p>}
      </div>
    </div>
  );
}

function BooksPanel({ lang }: { lang: Lang }) {
  const [books, setBooks] = useState<BookIndexItem[] | null>(null);
  const [bookLang, setBookLang] = useState<Lang>(lang);
  const [grade, setGrade] = useState(9);
  const [subject, setSubject] = useState<SubjectCode | "">("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<BookIndexItem | null>(null);

  useEffect(() => {
    fetch("/books/index.json", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<BookIndexItem[]>) : []))
      .then(setBooks)
      .catch(() => setBooks([]));
  }, []);
  useEffect(() => setBookLang(lang), [lang]);

  const inLangGrade = (books ?? []).filter((b) => b.lang === bookLang && (grade === 0 || b.grade === grade));
  const subjects = Array.from(new Set(inLangGrade.map((b) => b.subject).filter((s): s is SubjectCode => Boolean(s))));
  const q = query.trim().toLowerCase();
  const list = inLangGrade.filter(
    (b) =>
      (!subject || b.subject === subject) &&
      (!q || b.title.toLowerCase().includes(q) || (b.subject !== null && Object.values(SUBJECTS[b.subject]).some((n) => n.toLowerCase().includes(q)))),
  );
  const subjectName = (b: BookIndexItem) => (b.subject ? L(SUBJECTS[b.subject], lang) : b.title);

  return (
    <div className="grid gap-4">
      <div className={`${card} grid gap-3`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">{t(lang, "booksTitle")}</h2>
          {books && books.length > 0 && (
            <span className="text-xs text-slate-500">
              {t(lang, "booksSource")} · {books.length}
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{t(lang, "bookLang")}</span>
            <select className={input} value={bookLang} onChange={(e) => setBookLang(e.target.value as Lang)}>
              {LANGS.map((l) => (
                <option key={l} value={l}>
                  {LANG_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{t(lang, "grade")}</span>
            <select
              className={input}
              value={grade}
              onChange={(e) => {
                setGrade(Number(e.target.value));
                setSubject("");
              }}
            >
              <option value={0}>{t(lang, "all")}</option>
              {GRADES.map((g) => (
                <option key={g.number} value={g.number}>
                  {gradeLabel(g.number, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{t(lang, "subject")}</span>
            <select className={input} value={subject} onChange={(e) => setSubject(e.target.value as SubjectCode | "")}>
              <option value="">{t(lang, "all")}</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {L(SUBJECTS[s], lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{t(lang, "search")}</span>
            <input className={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Fizika, algebra…" />
          </label>
        </div>
      </div>

      {books !== null && books.length === 0 && <p className={`${card} text-sm text-slate-500`}>{t(lang, "booksEmpty")}</p>}
      {books !== null && books.length > 0 && list.length === 0 && <p className={`${card} text-sm text-slate-500`}>{t(lang, "noBooksFound")}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b) => (
          <button key={b.sourceUrl} onClick={() => setOpen(b)} className={`${card} flex items-start gap-3 text-left transition hover:border-brand-500`}>
            <span className="grid h-14 w-11 flex-none place-items-center rounded-md bg-gradient-to-br from-brand-500 to-cobalt-500 text-white shadow">
              <BookOpen size={18} />
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-xs font-semibold uppercase text-brand-600">
                {gradeLabel(b.grade, lang)} · {LANG_LABELS[b.lang]}
              </span>
              <b className="leading-snug">{subjectName(b)}</b>
              {b.subject && b.title !== L(SUBJECTS[b.subject], "uz") && <span className="truncate text-xs text-slate-500">{b.title}</span>}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <BookViewer
          book={{ url: open.storageUrl, title: `${subjectName(open)} · ${gradeLabel(open.grade, lang)} · ${LANG_LABELS[open.lang]}` }}
          lang={lang}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
