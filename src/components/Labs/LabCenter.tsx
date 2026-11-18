"use client";

/**
 * "3D laboratoriya" bo'limi: sinf → fan → mavzu → laboratoriya → "Laboratoriyani boshlash".
 * Katalog = o'rnatilgan CATALOG + administrator qo'shgan mavzular (/api/labs/catalog)
 *         + darslar mavzulari (public/lessons, "nazariya" yoki "model" holatida).
 * ?topic=<id> havolasi (o'qituvchi "topshiriq berish" orqali yuboradi) mavzuni to'g'ridan-to'g'ri ochadi.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, Play, Plus, Search, Trash2 } from "lucide-react";
import { LABS } from "@/components/3D/LabsCanvas";
import { GRADES, SUBJECTS, type SubjectCode } from "@/lib/curriculum";
import { L, t, type Lang } from "@/lib/i18n";
import type { LessonsIndexItem, SubjectLessons } from "@/lib/lesson-content";
import { CATALOG, LAB_STATUS_COLOR, LAB_STATUS_TEXT } from "@/lib/labs/catalog";
import { LAB_CONTENT } from "@/lib/labs/content";
import { LAB_STATUSES, type CatalogTopic, type LabStatus, type Tx } from "@/lib/labs/types";
import { LAB_TEXT } from "@/lib/labs/ui-text";
import LabRunner, { labRefTitle, originalLang, tx } from "./LabRunner";

const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const btn = "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600";
const btnPrimary = "inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600";
const chip = (on: boolean) => `rounded-lg border px-3 py-1.5 text-sm font-semibold ${on ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"}`;

/** Darslar faylidagi mavzularni katalog yozuviga aylantiramiz */
function lessonTopics(d: SubjectLessons): CatalogTopic[] {
  return d.topics.map((e) => {
    const uz = e.uz;
    const tg = e.tg;
    const zipTx = (a: string[] = [], b: string[] = []) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ({ uz: a[i] ?? "", tg: b[i] ?? "" }));
    const slides = (lang: "uz" | "tg") => (e[lang]?.slides ?? []).slice(1).map((s) => `${s.title}: ${s.bullets.join("; ")}`);
    const qs = Array.from({ length: Math.max(uz?.questions.length ?? 0, tg?.questions.length ?? 0) }, (_, i) => {
      const a = uz?.questions[i];
      const b = tg?.questions[i];
      const base = a ?? b;
      if (!base) return null;
      return { q: { uz: a?.q ?? "", tg: b?.q ?? "" }, options: base.options.map((_, j) => ({ uz: a?.options[j] ?? "", tg: b?.options[j] ?? "" })), answer: base.answer };
    }).filter((q): q is NonNullable<typeof q> => q !== null);
    return {
      id: `l${d.grade}-${d.subject}-${e.n}`,
      grade: d.grade,
      subject: d.subject,
      title: { uz: uz ? `§${e.n}. ${uz.title}` : "", tg: tg ? `§${e.n}. ${tg.title}` : "" },
      status: e.labKey ? "model" : "theory",
      labs: e.labKey ? [{ kind: "model" as const, key: e.labKey }] : [],
      source: "lessons" as const,
      goal: { uz: uz?.goal ?? "", tg: tg?.goal ?? "" },
      theory: zipTx(slides("uz"), slides("tg")),
      quiz: qs,
    };
  });
}

export default function LabCenter({ lang, labKey }: { lang: Lang; labKey?: string }) {
  const T = (k: keyof typeof LAB_TEXT) => L(LAB_TEXT[k], lang);
  const X = (v?: Tx) => tx(v, lang);
  const [extra, setExtra] = useState<CatalogTopic[]>([]);
  const [admin, setAdmin] = useState<CatalogTopic[]>([]);
  const [grade, setGrade] = useState(7);
  const [subject, setSubject] = useState<SubjectCode | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [labIdx, setLabIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LabStatus | "">("");
  const [showAdmin, setShowAdmin] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const lessons = fetch("/lessons/index.json", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<LessonsIndexItem[]>) : []))
      .then((idx) => Promise.all(idx.map((i) => fetch(`/lessons/${i.file}`, { cache: "no-store" }).then((r) => r.json() as Promise<SubjectLessons>))))
      .then((files) => setExtra(files.flatMap(lessonTopics)))
      .catch(() => undefined);
    const adm = fetch("/api/labs/catalog", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<CatalogTopic[]>) : []))
      .then(setAdmin)
      .catch(() => undefined);
    void Promise.allSettled([lessons, adm]).then(() => setLoaded(true));
  }, []);

  const all = useMemo(() => [...CATALOG, ...admin, ...extra], [admin, extra]);
  const open = (tp: CatalogTopic, start = true, lab = 0) => {
    setGrade(tp.grade);
    setSubject(tp.subject);
    setTopicId(tp.id);
    setLabIdx(lab);
    setStarted(start);
  };

  // ?topic=<id> — o'qituvchi yuborgan havola
  const urlDone = useRef(false);
  useEffect(() => {
    if (urlDone.current) return;
    const id = new URLSearchParams(location.search).get("topic");
    const tp = id ? all.find((x) => x.id === id) : undefined;
    // O'rnatilgan katalogdagi mavzu darhol ochiladi; admin/darslar mavzusi — ular yuklangach
    if (tp) open(tp);
    if (tp || !id || loaded) urlDone.current = true;
  }, [loaded, all]);

  // Darslar bo'limidagi "3D laboratoriya" tugmasi: shu modelli eng to'liq mavzuni ochamiz
  useEffect(() => {
    if (!labKey) return;
    const [key, g] = labKey.split("#");
    const grade = Number(g) || 0;
    const order: LabStatus[] = ["full", "model", "theory", "planned"];
    // Avval o'sha sinfdagi, keyin eng yaqin sinfdagi; bir xil bo'lsa — to'liqroq holatdagi mavzu
    const tp = CATALOG.filter((x) => x.labs.some((l) => l.kind === "model" && l.key === key)).sort(
      (a, b) => (grade ? Math.abs(a.grade - grade) - Math.abs(b.grade - grade) : 0) || order.indexOf(a.status) - order.indexOf(b.status),
    )[0];
    if (tp) open(tp, true, Math.max(0, tp.labs.findIndex((l) => l.key === key)));
  }, [labKey]);

  const counts = (list: CatalogTopic[]) => Object.fromEntries(LAB_STATUSES.map((s) => [s, list.filter((x) => x.status === s).length])) as Record<LabStatus, number>;
  const total = counts(all);
  const gradeInfo = GRADES.find((g) => g.number === grade);
  const subjects = useMemo(() => {
    const set = new Set<SubjectCode>(gradeInfo?.subjects ?? []);
    for (const x of all) if (x.grade === grade) set.add(x.subject);
    return Array.from(set).sort((a, b) => {
      const n = (s: SubjectCode) => all.filter((x) => x.grade === grade && x.subject === s && x.status !== "planned").length;
      return n(b) - n(a) || L(SUBJECTS[a], lang).localeCompare(L(SUBJECTS[b], lang));
    });
  }, [all, grade, gradeInfo, lang]);

  const q = query.trim().toLocaleLowerCase();
  const list = all
    .filter((x) => (q ? `${x.title.uz} ${x.title.tg} ${x.title.ru ?? ""}`.toLocaleLowerCase().includes(q) : x.grade === grade && x.subject === subject))
    .filter((x) => !status || x.status === status)
    .sort((a, b) => a.grade - b.grade || LAB_STATUSES.indexOf(a.status) - LAB_STATUSES.indexOf(b.status) || X(a.title).localeCompare(X(b.title), undefined, { numeric: true }));
  const topic = all.find((x) => x.id === topicId) ?? null;

  if (started && topic) {
    const siblings = all.filter((x) => x.grade === topic.grade && x.subject === topic.subject && (x.labs.length > 0 || x.content));
    const next = siblings[(siblings.findIndex((x) => x.id === topic.id) + 1) % siblings.length];
    return (
      <LabRunner
        key={topic.id}
        topic={topic}
        content={topic.content ? LAB_CONTENT[topic.content] : undefined}
        lang={lang}
        initialLab={labIdx}
        onBack={() => setStarted(false)}
        onNext={next && next.id !== topic.id ? () => open(next) : undefined}
        nextTitle={next && next.id !== topic.id ? X(next.title) : undefined}
      />
    );
  }

  const canStart = topic && (topic.labs.length > 0 || topic.content || topic.theory?.length || topic.quiz?.length);

  return (
    <div className="grid gap-4">
      {/* Qamrov va tez qidiruv */}
      <div className={`${card} grid gap-3`}>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <b>{T("coverage")}:</b>
          {LAB_STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(status === s ? "" : s)} aria-pressed={status === s} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${LAB_STATUS_COLOR[s]} ${status && status !== s ? "opacity-40" : ""}`}>
              {L(LAB_STATUS_TEXT[s], lang)}: {total[s]}
            </button>
          ))}
          {status && (
            <button className="text-xs underline" onClick={() => setStatus("")}>
              {T("allStatuses")}
            </button>
          )}
        </div>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${input} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T("search")} aria-label={T("search")} />
        </div>
        <p className="text-xs text-slate-500">⚠ {T("unverified")}</p>
      </div>

      {!q && (
        <>
          {/* 1. Sinf */}
          <div className="grid gap-2">
            <b className="text-sm">{T("chooseGrade")}</b>
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map((g) => {
                const ready = all.filter((x) => x.grade === g.number && x.status !== "planned").length;
                return (
                  <button
                    key={g.number}
                    className={chip(grade === g.number)}
                    onClick={() => {
                      setGrade(g.number);
                      setSubject(null);
                      setTopicId(null);
                    }}
                  >
                    {g.number}
                    {t(lang, "gradeSuffix")}
                    <span className="ml-1 text-xs opacity-70">{ready}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Fan */}
          <div className="grid gap-2">
            <b className="text-sm">{T("chooseSubject")}</b>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => {
                const c = counts(all.filter((x) => x.grade === grade && x.subject === s));
                const n = c.full + c.model + c.theory + c.planned;
                return (
                  <button
                    key={s}
                    className={chip(subject === s)}
                    onClick={() => {
                      setSubject(s);
                      setTopicId(null);
                    }}
                  >
                    {L(SUBJECTS[s], lang)}
                    {n > 0 ? (
                      <span className="ml-1.5 inline-flex gap-0.5 align-middle">
                        {LAB_STATUSES.map((k) => (c[k] ? <span key={k} className={`rounded px-1 text-[10px] ${LAB_STATUS_COLOR[k]}`} title={L(LAB_STATUS_TEXT[k], lang)}>{c[k]}</span> : null))}
                      </span>
                    ) : (
                      <span className="ml-1 text-xs opacity-50">—</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 3. Mavzu */}
      {(q || subject) && (
        <div className="grid gap-2">
          <b className="text-sm">{T("chooseTopic")}</b>
          {list.length === 0 ? (
            <p className={`${card} text-sm text-slate-500`}>{T("noTopics")}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((x) => (
                <button
                  key={x.id}
                  onClick={() => {
                    setTopicId(x.id);
                    setLabIdx(0);
                  }}
                  className={`grid content-start gap-1 rounded-xl border p-3 text-left ${x.id === topicId ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}
                >
                  <span className="flex flex-wrap items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LAB_STATUS_COLOR[x.status]}`}>{L(LAB_STATUS_TEXT[x.status], lang)}</span>
                    {x.source === "admin" && <span className="rounded-full bg-saffron-100 px-2 py-0.5 text-[11px] text-slate-800">{T("adminAdded")}</span>}
                    {x.source === "lessons" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">{T("fromLessons")}</span>}
                    {q && (
                      <span className="text-[11px] text-slate-500">
                        {x.grade}
                        {t(lang, "gradeSuffix")} · {L(SUBJECTS[x.subject], lang)}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold leading-snug">{X(x.title)}</span>
                  {originalLang(x.title, lang) && <span className="text-[11px] text-slate-500">({originalLang(x.title, lang)})</span>}
                  {x.labs.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <FlaskConical size={12} /> {x.labs.map((l) => labRefTitle(l, lang)).join(" · ")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Laboratoriya va boshlash */}
      {topic && (
        <div className={`${card} grid gap-3 border-2 border-brand-500`}>
          <b className="text-sm">{T("chooseLab")}</b>
          <h3 className="text-lg font-bold">{X(topic.title)}</h3>
          {topic.labs.length > 0 ? (
            <div className="grid gap-1.5">
              {topic.labs.map((l, i) => (
                <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="radio" name="lab" checked={labIdx === i} onChange={() => setLabIdx(i)} />
                  {labRefTitle(l, lang)}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{T("noLab")}</p>
          )}
          <div>
            <button className={`${btnPrimary} px-5 py-3 text-base`} disabled={!canStart} onClick={() => setStarted(true)}>
              <Play size={18} /> {T("start")}
            </button>
          </div>
        </div>
      )}

      {/* Administrator */}
      <div className="grid gap-2">
        <div>
          <button className={btn} onClick={() => setShowAdmin((v) => !v)} aria-expanded={showAdmin}>
            <Plus size={14} /> {T("admin")}
          </button>
        </div>
        {showAdmin && (
          <AdminForm
            lang={lang}
            grade={grade}
            subject={subject ?? "fizika"}
            items={admin}
            onAdd={(x) => {
              setAdmin((a) => [...a, x]);
              open(x, false);
            }}
            onRemove={(id) => setAdmin((a) => a.filter((x) => x.id !== id))}
          />
        )}
      </div>
    </div>
  );
}

/* ───── Administrator: yangi mavzu va laboratoriya bog'lash ───── */

function AdminForm({ lang, grade, subject, items, onAdd, onRemove }: { lang: Lang; grade: number; subject: SubjectCode; items: CatalogTopic[]; onAdd(x: CatalogTopic): void; onRemove(id: string): void }) {
  const T = (k: keyof typeof LAB_TEXT) => L(LAB_TEXT[k], lang);
  const [f, setF] = useState({ grade, subject: subject as string, titleUz: "", titleTg: "", textLang: lang === "tg" ? "tg" : "uz", goal: "", theory: "", steps: "", lab: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | number) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/labs/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      if (!r.ok) throw new Error(await r.text());
      onAdd((await r.json()) as CatalogTopic);
      setF((s) => ({ ...s, titleUz: "", titleTg: "", goal: "", theory: "", steps: "" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${card} grid gap-3 border-2 border-dashed border-saffron-500`}>
      <p className="text-sm text-slate-500">{T("adminHint")}</p>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{L(LAB_TEXT.chooseGrade, lang).replace(/^1\. /, "")}</span>
          <select className={input} value={f.grade} onChange={(e) => set("grade", Number(e.target.value))}>
            {GRADES.map((g) => (
              <option key={g.number} value={g.number}>
                {g.number}
                {t(lang, "gradeSuffix")}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{L(LAB_TEXT.chooseSubject, lang).replace(/^2\. /, "")}</span>
          <select className={input} value={f.subject} onChange={(e) => set("subject", e.target.value)}>
            {(Object.keys(SUBJECTS) as SubjectCode[]).map((s) => (
              <option key={s} value={s}>
                {L(SUBJECTS[s], lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("titleUz")}</span>
          <input className={input} value={f.titleUz} onChange={(e) => set("titleUz", e.target.value)} maxLength={200} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("titleTg")}</span>
          <input className={input} value={f.titleTg} onChange={(e) => set("titleTg", e.target.value)} maxLength={200} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("labField")}</span>
          <select className={input} value={f.lab} onChange={(e) => set("lab", e.target.value)}>
            <option value="">{T("noneLab")}</option>
            {(["circuit", "balance", "logic"] as const).map((k) => (
              <option key={k} value={k}>
                {labRefTitle({ kind: k }, lang)}
              </option>
            ))}
            {LABS.map((l) => (
              <option key={l.key} value={`model:${l.key}`}>
                {labRefTitle({ kind: "model", key: l.key }, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{L({ uz: "Matn tili", tg: "Забони матн", ru: "Язык текста" }, lang)}</span>
          <select className={input} value={f.textLang} onChange={(e) => set("textLang", e.target.value)}>
            <option value="uz">O&apos;zbekcha</option>
            <option value="tg">Тоҷикӣ</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">{T("goalField")}</span>
          <input className={input} value={f.goal} onChange={(e) => set("goal", e.target.value)} maxLength={400} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("theoryField")}</span>
          <textarea className={input} rows={4} value={f.theory} onChange={(e) => set("theory", e.target.value)} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("stepsField")}</span>
          <textarea className={input} rows={4} value={f.steps} onChange={(e) => set("steps", e.target.value)} />
        </label>
        {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
        <div className="sm:col-span-2">
          <button className={btnPrimary} disabled={busy || (!f.titleUz.trim() && !f.titleTg.trim())}>
            <Plus size={14} /> {T("add")}
          </button>
        </div>
      </form>
      {items.length > 0 && (
        <ul className="grid gap-1 border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
          {items.map((x) => (
            <li key={x.id} className="flex items-center gap-2">
              <span className="flex-1">
                {x.grade}
                {t(lang, "gradeSuffix")} · {L(SUBJECTS[x.subject], lang)} · {tx(x.title, lang)}
              </span>
              <button
                className={btn}
                aria-label={T("remove")}
                onClick={async () => {
                  const r = await fetch(`/api/labs/catalog?id=${encodeURIComponent(x.id)}`, { method: "DELETE" });
                  if (r.ok) onRemove(x.id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
