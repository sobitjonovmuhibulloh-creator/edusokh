"use client";

/**
 * Laboratoriya shabloni: har bir mavzu shu 13 bo'lim bilan ochiladi —
 * 1 nom va sinf, 2 maqsad, 3 jihozlar, 4 nazariya, 5 yo'riqnoma, 6 interaktiv tajriba, 7 topshiriqlar,
 * 8–9 misollar va yechim bosqichlari, 10 o'lchovlar va grafik, 11 test, 12 xulosa va hisobot,
 * 13 "Qayta boshlash" / "Keyingi tajriba".
 * Mazmun bo'lmagan bo'limlar ko'rsatilmaydi (masalan, "model" holatidagi mavzuda faqat bor narsa chiqadi).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Expand, Monitor, Printer, RotateCcw, Save, Send } from "lucide-react";
import LabsCanvas, { LABS } from "@/components/3D/LabsCanvas";
import { SUBJECTS } from "@/lib/curriculum";
import { L, t, type Lang } from "@/lib/i18n";
import { LAB_STATUS_COLOR, LAB_STATUS_TEXT } from "@/lib/labs/catalog";
import type { CatalogTopic, ExampleDef, LabContent, LabRef, Measure, MeasureCol, QuizItem, TaskDef, Tx } from "@/lib/labs/types";
import { LAB_TEXT } from "@/lib/labs/ui-text";
import CircuitBuilder from "./CircuitBuilder";
import ProLab from "./pro/engine";
import { PRO_LABS } from "./pro/labs";
import { EquationBalancer, LogicGates } from "./Widgets";

const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const btn = "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600";
const btnPrimary = "inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50";
const input = "rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 dark:border-slate-600";
const RESULTS_KEY = "edusokh-lab-results-v1";

/** Tx dan joriy tildagi matn; bo'lmasa asl tildagisi */
export function tx(v: Tx | undefined, lang: Lang): string {
  if (!v) return "";
  return (lang === "ru" ? v.ru : v[lang]) || v.uz || v.tg || v.ru || "";
}
/** Joriy tilda tarjimasi yo'q bo'lsa — asl til nomi */
export function originalLang(v: Tx | undefined, lang: Lang): string | null {
  if (!v || (lang === "ru" ? v.ru : v[lang])) return null;
  return v.uz ? "O'zbekcha" : v.tg ? "Тоҷикӣ" : null;
}

export function labRefTitle(ref: LabRef, lang: Lang): string {
  if (ref.title) return tx(ref.title, lang);
  if (ref.kind === "circuit") return L({ uz: "Elektr zanjirini yig'ish (3D, sudrab ulash)", tg: "Ҷамъ кардани занҷири электрикӣ (3D, кашида пайваст кардан)", ru: "Сборка электрической цепи (3D, перетаскивание)" }, lang);
  if (ref.kind === "balance") return L({ uz: "Kimyoviy tenglamani tenglashtirish", tg: "Баробар кардани муодилаи кимиёвӣ", ru: "Уравнивание химических уравнений" }, lang);
  if (ref.kind === "logic") return L({ uz: "Mantiqiy elementlar va rostlik jadvali", tg: "Элементҳои мантиқӣ ва ҷадвали ростӣ", ru: "Логические элементы и таблица истинности" }, lang);
  if (ref.kind === "pro") {
    const pro = PRO_LABS[ref.key ?? ""];
    return pro ? `${tx(pro.title, lang)} (3D lab)` : String(ref.key);
  }
  const def = LABS.find((l) => l.key === ref.key);
  return def ? `${L(def.title, lang)} (3D)` : String(ref.key);
}

const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : (Math.round(v * 1000) / 1000).toString());
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

interface Props {
  topic: CatalogTopic;
  content?: LabContent;
  lang: Lang;
  initialLab?: number;
  onBack(): void;
  onNext?: () => void;
  nextTitle?: string;
}

export default function LabRunner({ topic, content, lang, initialLab = 0, onBack, onNext, nextTitle }: Props) {
  const T = (k: keyof typeof LAB_TEXT) => L(LAB_TEXT[k], lang);
  const X = (v?: Tx) => tx(v, lang);
  const rootRef = useRef<HTMLDivElement>(null);
  const expRef = useRef<HTMLDivElement>(null);
  const [labIdx, setLabIdx] = useState(Math.min(initialLab, Math.max(0, topic.labs.length - 1)));
  const [run, setRun] = useState(0); // Qayta boshlash: interaktiv qism va javoblar yangidan
  const [live, setLive] = useState<Measure>({});
  const [rows, setRows] = useState<Measure[]>([]);
  const [taskAns, setTaskAns] = useState<Record<number, { value: string; ok?: boolean; done?: boolean }>>({});
  const [quizAns, setQuizAns] = useState<Record<number, number>>({});
  const [quizChecked, setQuizChecked] = useState(false);
  const [student, setStudent] = useState("");
  const [notice, setNotice] = useState("");
  const [projector, setProjector] = useState(false);

  const lab = topic.labs[labIdx];
  const goal = content?.goal ?? topic.goal;
  const theory = content?.theory ?? topic.theory ?? [];
  const steps = content?.steps ?? topic.steps ?? [];
  const quiz: QuizItem[] = content?.quiz ?? topic.quiz ?? [];
  const tasks: TaskDef[] = content?.tasks ?? [];
  const examples: ExampleDef[] = content?.examples ?? [];
  const columns: MeasureCol[] = useMemo(() => {
    if (content?.columns) return content.columns;
    const keys = Object.keys(rows[0] ?? live);
    return keys.map((k) => ({ key: k, label: k }));
  }, [content, rows, live]);
  const missing = originalLang(topic.title, lang) ?? originalLang(goal, lang);

  const restart = () => {
    setRun((n) => n + 1);
    setRows([]);
    setTaskAns({});
    setQuizAns({});
    setQuizChecked(false);
    setLive({});
  };
  useEffect(restart, [topic.id, labIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bir xil qiymat qayta kelsa holatni o'zgartirmaymiz (keraksiz qayta chizish bo'lmasin)
  const onMeasure = useCallback((m: Measure) => setLive((prev) => (JSON.stringify(prev) === JSON.stringify(m) ? prev : m)), []);
  const onParams = useCallback((p: Record<string, number>) => onMeasure(content?.measure ? content.measure(p) : p), [content, onMeasure]);

  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(""), 3500);
  };

  const fullscreen = (el: HTMLElement | null) => {
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setProjector(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const quizScore = quiz.reduce((s, q, i) => s + (quizAns[i] === q.answer ? 1 : 0), 0);
  const tasksOk = tasks.filter((_, i) => taskAns[i]?.ok || taskAns[i]?.done).length;
  const subjectName = L(SUBJECTS[topic.subject], lang);
  const heading = `${topic.grade}${t(lang, "gradeSuffix")} · ${subjectName}`;

  const assign = async () => {
    const url = `${location.origin}/simulator?tab=labs&topic=${encodeURIComponent(topic.id)}`;
    const text = [`${heading}: ${X(topic.title)}`, X(goal), "", ...tasks.map((tk, i) => `${i + 1}. ${X(tk.text)}`), "", url].filter((s, i, a) => s || a[i - 1]).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      flash(T("assignCopied"));
    } catch {
      window.prompt(T("assign"), text);
    }
  };

  const saveResult = () => {
    try {
      const all = JSON.parse(localStorage.getItem(RESULTS_KEY) ?? "[]") as unknown[];
      all.push({ topic: topic.id, title: X(topic.title), student, rows, quiz: `${quizScore}/${quiz.length}`, tasks: `${tasksOk}/${tasks.length}`, at: new Date().toISOString() });
      localStorage.setItem(RESULTS_KEY, JSON.stringify(all.slice(-200)));
      flash(T("saved"));
    } catch {
      flash("localStorage —");
    }
  };

  const reportHtml = () => {
    const tr = (cells: string[], tag = "td") => `<tr>${cells.map((c) => `<${tag}>${esc(c)}</${tag}>`).join("")}</tr>`;
    const sec = (title: string, body: string) => (body ? `<h2>${esc(title)}</h2>${body}` : "");
    return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(X(topic.title))}</title>
<style>body{font:15px/1.5 Arial,sans-serif;max-width:800px;margin:24px auto;padding:0 16px;color:#0f172a}h1{font-size:22px;margin:0}h2{font-size:17px;margin:20px 0 6px;color:#0e7c86}table{border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:4px 10px;text-align:center}.muted{color:#64748b}</style></head><body>
<p class="muted">EduSokh · ${esc(heading)} · ${esc(new Date().toLocaleString())}</p>
<h1>${esc(X(topic.title))}</h1>
<p><b>${esc(T("student"))}:</b> ${esc(student || "________________")}</p>
${sec(T("sGoal"), goal ? `<p>${esc(X(goal))}</p>` : "")}
${sec(T("sResults"), rows.length ? `<table>${tr(columns.map((c) => c.label + (c.unit ? `, ${c.unit}` : "")), "th")}${rows.map((r) => tr(columns.map((c) => (r[c.key] == null ? "" : fmtNum(r[c.key]))))).join("")}</table>` : `<p class="muted">—</p>`)}
${sec(T("sTasks"), tasks.length ? `<ol>${tasks.map((tk, i) => `<li>${esc(X(tk.text))}<br><b>${esc(T("answer"))}:</b> ${esc(taskAns[i]?.value ?? "")} ${taskAns[i]?.ok ? "✓" : taskAns[i]?.done ? "✓" : ""}</li>`).join("")}</ol>` : "")}
${sec(T("sQuiz"), quiz.length ? `<p>${esc(T("score"))}: <b>${quizChecked ? `${quizScore} / ${quiz.length}` : "—"}</b></p>` : "")}
${sec(T("sConclusion"), content ? `<p>${esc(X(content.conclusion))}</p>` : "")}
</body></html>`;
  };

  const downloadReport = () => {
    const blob = new Blob([reportHtml()], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `EduSokh-${topic.grade}-${topic.subject}-${(student || "hisobot").replace(/[^\p{L}\p{N}]+/gu, "_")}.html`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const printReport = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(reportHtml());
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div ref={rootRef} className={`grid gap-4 ${projector ? "overflow-y-auto bg-slate-50 p-6 text-lg dark:bg-slate-900" : ""}`}>
      {/* 1. Nom, sinf va o'qituvchi tugmalari */}
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button className={btn} onClick={onBack}>
            <ArrowLeft size={14} /> {T("back")}
          </button>
          <span className="flex-1" />
          <button className={btn} onClick={() => fullscreen(expRef.current)} title={T("fullscreen")}>
            <Expand size={14} /> <span className="hidden sm:inline">{T("fullscreen")}</span>
          </button>
          <button
            className={btn}
            onClick={() => {
              setProjector(!projector);
              fullscreen(rootRef.current);
            }}
          >
            <Monitor size={14} /> <span className="hidden sm:inline">{projector ? T("exitProjector") : T("projector")}</span>
          </button>
          <button className={btnPrimary} onClick={() => void assign()}>
            <Send size={14} /> <span className="hidden sm:inline">{T("assign")}</span>
          </button>
        </div>
        {notice && (
          <p className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white" role="status">
            {notice}
          </p>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-brand-600">
            <span>1 · {heading}</span>
            <span className={`rounded-full px-2 py-0.5 normal-case ${LAB_STATUS_COLOR[topic.status]}`}>{L(LAB_STATUS_TEXT[topic.status], lang)}</span>
          </div>
          <h2 className="text-2xl font-extrabold">{X(topic.title)}</h2>
          {missing && <p className="mt-1 w-fit rounded-lg bg-saffron-100 px-2 py-1 text-xs text-slate-800">{lang === "ru" && !topic.title.ru ? T("untranslated") : L(LAB_TEXT.untranslatedOne, lang).replace("{lang}", missing)}</p>}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {goal && (
          <Section n={2} title={T("sGoal")}>
            <p>{X(goal)}</p>
          </Section>
        )}
        {content && content.equipment.length > 0 && (
          <Section n={3} title={T("sEquipment")}>
            <ul className="grid list-disc gap-0.5 pl-5">
              {content.equipment.map((e, i) => (
                <li key={i}>{X(e)}</li>
              ))}
            </ul>
          </Section>
        )}
        {theory.length > 0 && (
          <Section n={4} title={T("sTheory")}>
            <ul className="grid list-disc gap-1 pl-5">
              {theory.map((e, i) => (
                <li key={i}>{X(e)}</li>
              ))}
            </ul>
            {content && content.formulas.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {content.formulas.map((f) => (
                  <code key={f} className="rounded-lg bg-cobalt-100 px-2 py-1 font-mono text-sm text-cobalt-700 dark:bg-cobalt-700/40 dark:text-cobalt-100">
                    {f}
                  </code>
                ))}
              </div>
            )}
          </Section>
        )}
        {steps.length > 0 && (
          <Section n={5} title={T("sSteps")}>
            <ol className="grid list-decimal gap-1 pl-5">
              {steps.map((e, i) => (
                <li key={i}>{X(e)}</li>
              ))}
            </ol>
          </Section>
        )}
      </div>

      {/* 6. Interaktiv tajriba */}
      <section ref={expRef} className={`${card} grid gap-3 [&:fullscreen]:overflow-y-auto [&:fullscreen]:p-6`}>
        <h3 className="flex flex-wrap items-center gap-2 font-bold">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-xs text-white">6</span>
          {T("sExperiment")}
          <span className="flex-1" />
          <button className={btn} onClick={() => fullscreen(expRef.current)} aria-label={T("fullscreen")}>
            <Expand size={14} />
          </button>
        </h3>
        {topic.labs.length > 1 && (
          <div className="flex flex-wrap gap-2" role="tablist">
            {topic.labs.map((r, i) => (
              <button key={i} role="tab" aria-selected={i === labIdx} onClick={() => setLabIdx(i)} className={`rounded-lg border px-3 py-1.5 text-sm ${i === labIdx ? "border-cobalt-500 bg-cobalt-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                {labRefTitle(r, lang)}
              </button>
            ))}
          </div>
        )}
        {!lab ? (
          <p className="text-sm text-slate-500">{T("noLab")}</p>
        ) : lab.kind === "circuit" ? (
          <CircuitBuilder key={run} lang={lang} onMeasure={onMeasure} />
        ) : lab.kind === "balance" ? (
          <EquationBalancer key={run} lang={lang} onMeasure={onMeasure} />
        ) : lab.kind === "logic" ? (
          <LogicGates key={run} lang={lang} onMeasure={onMeasure} />
        ) : lab.kind === "pro" && PRO_LABS[lab.key ?? ""] ? (
          <ProLab key={`${run}-${lab.key}`} def={PRO_LABS[lab.key as string]} lang={lang} steps={steps} onMeasure={onMeasure} />
        ) : (
          <LabsCanvas key={`${run}-${lab.key}`} lang={lang} labKey={lab.key} showPicker={false} height={420} onParams={onParams} />
        )}
        {lab && Object.keys(live).length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm dark:bg-slate-900">
            <span className="text-slate-500">{T("current")}:</span>
            {columns.map((c) => (
              <span key={c.key} className="rounded-md bg-white px-2 py-0.5 font-mono dark:bg-slate-700">
                {c.label} = {live[c.key] == null ? "—" : fmtNum(live[c.key])}
                {c.unit ? ` ${c.unit}` : ""}
              </span>
            ))}
            <span className="flex-1" />
            <button className={btnPrimary} onClick={() => setRows((r) => [...r, live])}>
              + {T("record")} ({rows.length})
            </button>
          </div>
        )}
      </section>

      {/* 7. Amaliy topshiriqlar */}
      {tasks.length > 0 && (
        <Section n={7} title={T("sTasks")}>
          <ol className="grid gap-3">
            {tasks.map((tk, i) => {
              const a = taskAns[i];
              return (
                <li key={i} className="grid gap-1.5">
                  <span>
                    <b>{i + 1}.</b> {X(tk.text)}
                  </span>
                  {tk.answer != null ? (
                    <form
                      className="flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = Number(String(a?.value ?? "").replace(",", "."));
                        const ok = Number.isFinite(v) && Math.abs(v - (tk.answer as number)) <= (tk.tol ?? 0) + 1e-9;
                        setTaskAns((s) => ({ ...s, [i]: { value: a?.value ?? "", ok } }));
                      }}
                    >
                      <input className={`${input} w-28 font-mono`} inputMode="decimal" value={a?.value ?? ""} onChange={(e) => setTaskAns((s) => ({ ...s, [i]: { value: e.target.value } }))} aria-label={T("answer")} />
                      {tk.unit && <span className="text-sm text-slate-500">{tk.unit}</span>}
                      <button className={btn}>{T("check")}</button>
                      {a?.ok === true && <span className="text-sm font-semibold text-emerald-600">✓ {T("correct")}</span>}
                      {a?.ok === false && <span className="text-sm font-semibold text-red-600">✗ {T("wrong")}</span>}
                    </form>
                  ) : (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean(a?.done)} onChange={(e) => setTaskAns((s) => ({ ...s, [i]: { value: e.target.checked ? "✓" : "", done: e.target.checked } }))} />
                      {T("done")}
                    </label>
                  )}
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      {/* 8–9. Misollar va yechim bosqichlari */}
      {examples.length > 0 && (
        <Section n={8} title={T("sExamples")}>
          <div className="grid gap-3 lg:grid-cols-2">
            {examples.map((ex, i) => (
              <ExampleCard key={`${run}-${i}`} ex={ex} lang={lang} />
            ))}
          </div>
        </Section>
      )}

      {/* 10. Natijalar, o'lchovlar va grafik */}
      {lab && Object.keys(live).length > 0 && (
        <Section n={10} title={T("sResults")}>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">{T("noMeasures")}</p>
          ) : (
            <>
              <div>
                <button className={btn} onClick={() => setRows([])}>
                  {T("clearTable")}
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                <div className="overflow-x-auto">
                  <table className="text-sm">
                    <thead>
                      <tr>
                        <th className="border border-slate-200 px-2 py-1 dark:border-slate-700">№</th>
                        {columns.map((c) => (
                          <th key={c.key} className="border border-slate-200 px-2 py-1 font-mono dark:border-slate-700">
                            {c.label}
                            {c.unit ? `, ${c.unit}` : ""}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td className="border border-slate-200 px-2 py-1 text-center dark:border-slate-700">{i + 1}</td>
                          {columns.map((c) => (
                            <td key={c.key} className="border border-slate-200 px-2 py-1 text-center font-mono dark:border-slate-700">
                              {r[c.key] == null ? "" : fmtNum(r[c.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {content?.graph && rows.length >= 2 && <Graph rows={rows} x={content.graph.x} y={content.graph.y} cols={columns} />}
              </div>
            </>
          )}
        </Section>
      )}

      {/* 11. Test */}
      {quiz.length > 0 && (
        <Section n={11} title={T("sQuiz")}>
          <ol className="grid gap-3">
            {quiz.map((q, i) => (
              <li key={i} className="grid gap-1">
                <b>
                  {i + 1}. {X(q.q)}
                </b>
                <div className="grid gap-1 sm:grid-cols-2">
                  {q.options.map((o, j) => {
                    const chosen = quizAns[i] === j;
                    const mark = quizChecked ? (j === q.answer ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" : chosen ? "border-red-500 bg-red-50 dark:bg-red-900/30" : "") : chosen ? "border-brand-500 bg-brand-100 dark:bg-brand-700/30" : "";
                    return (
                      <label key={j} className={`flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm dark:border-slate-700 ${mark}`}>
                        <input type="radio" name={`q${topic.id}-${i}`} checked={chosen} disabled={quizChecked} onChange={() => setQuizAns((s) => ({ ...s, [i]: j }))} />
                        {X(o)}
                      </label>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <button className={btnPrimary} onClick={() => setQuizChecked(true)} disabled={quizChecked || Object.keys(quizAns).length === 0}>
              {T("check")}
            </button>
            {quizChecked && (
              <b role="status">
                {T("score")}: {quizScore} / {quiz.length}
              </b>
            )}
          </div>
        </Section>
      )}

      {/* 12. Xulosa va hisobot */}
      <Section n={12} title={T("sConclusion")}>
        {content && <p>{X(content.conclusion)}</p>}
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{T("student")}</span>
            <input className={`${input} w-64 max-w-full`} value={student} onChange={(e) => setStudent(e.target.value)} maxLength={80} />
          </label>
          <button className={btn} onClick={saveResult}>
            <Save size={14} /> {T("save")}
          </button>
          <button className={btn} onClick={downloadReport}>
            <Download size={14} /> {T("report")}
          </button>
          <button className={btn} onClick={printReport}>
            <Printer size={14} /> {T("print")}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {rows.length} · {T("sTasks")}: {tasksOk}/{tasks.length} · {T("sQuiz")}: {quizChecked ? `${quizScore}/${quiz.length}` : "—"}
        </p>
      </Section>

      {/* 13. Qayta boshlash / Keyingi tajriba */}
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={restart}>
          <RotateCcw size={14} /> {T("restart")}
        </button>
        {onNext && (
          <button className={btnPrimary} onClick={onNext}>
            {T("next")}
            {nextTitle ? `: ${nextTitle}` : ""} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className={`${card} grid content-start gap-2`}>
      <h3 className="flex items-center gap-2 font-bold">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500 text-xs text-white">{n}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/* ───── Interaktiv misol: qiymat o'zgarsa, yechim ham o'zgaradi ───── */

function ExampleCard({ ex, lang }: { ex: ExampleDef; lang: Lang }) {
  const [v, setV] = useState<Record<string, number>>(() => Object.fromEntries(ex.inputs.map((i) => [i.id, i.value])));
  const text = tx(ex.text, lang).replace(/\{(\w+)\}/g, (_, id: string) => (v[id] != null ? fmtNum(v[id]) : `{${id}}`));
  const steps = ex.solve(v);
  return (
    <div className="grid content-start gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <b>{tx(ex.title, lang)}</b>
      <p className="text-sm">{text}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ex.inputs.map((inp) => (
          <label key={inp.id} className="grid gap-0.5 text-sm">
            <span>
              {tx(inp.label, lang)} = <b className="font-mono text-brand-600">{fmtNum(v[inp.id])}</b> {inp.unit}
            </span>
            <input type="range" min={inp.min} max={inp.max} step={inp.step} value={v[inp.id]} onChange={(e) => setV((s) => ({ ...s, [inp.id]: Number(e.target.value) }))} />
          </label>
        ))}
      </div>
      <div className="grid gap-0.5 rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-900">
        <span className="text-xs font-semibold uppercase text-slate-500">{L(LAB_TEXT.solution, lang)}</span>
        {steps.map((s, i) => (typeof s === "string" ? <code key={i} className="font-mono">{s}</code> : <span key={i} className="font-semibold">{tx(s, lang)}</span>))}
      </div>
    </div>
  );
}

/* ───── Grafik (SVG): o'lchov nuqtalari va ularni tutashtiruvchi chiziq ───── */

function Graph({ rows, x, y, cols }: { rows: Measure[]; x: string; y: string; cols: MeasureCol[] }) {
  const pts = rows.filter((r) => Number.isFinite(r[x]) && Number.isFinite(r[y])).map((r) => [r[x], r[y]] as const).sort((a, b) => a[0] - b[0]);
  if (pts.length < 2) return null;
  const W = 360, H = 220, P = 40;
  const xmax = Math.max(...pts.map((p) => p[0])) || 1;
  const ymax = Math.max(...pts.map((p) => p[1])) || 1;
  const xmin = Math.min(0, ...pts.map((p) => p[0]));
  const ymin = Math.min(0, ...pts.map((p) => p[1]));
  const sx = (v: number) => P + ((v - xmin) / (xmax - xmin || 1)) * (W - P - 12);
  const sy = (v: number) => H - P + 10 - ((v - ymin) / (ymax - ymin || 1)) * (H - P - 10);
  const lab = (k: string) => {
    const c = cols.find((q) => q.key === k);
    return c ? `${c.label}${c.unit ? `, ${c.unit}` : ""}` : k;
  };
  const ticks = (lo: number, hi: number) => [0, 0.25, 0.5, 0.75, 1].map((f) => lo + (hi - lo) * f);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" role="img" aria-label={`${lab(y)} (${lab(x)})`}>
      {ticks(ymin, ymax).map((v, i) => (
        <g key={`y${i}`}>
          <line x1={P} x2={W - 12} y1={sy(v)} y2={sy(v)} stroke="#e2e8f0" />
          <text x={P - 4} y={sy(v) + 4} fontSize="10" textAnchor="end" fill="#64748b">
            {fmtNum(Math.round(v * 100) / 100)}
          </text>
        </g>
      ))}
      {ticks(xmin, xmax).map((v, i) => (
        <text key={`x${i}`} x={sx(v)} y={H - P + 24} fontSize="10" textAnchor="middle" fill="#64748b">
          {fmtNum(Math.round(v * 100) / 100)}
        </text>
      ))}
      <line x1={P} x2={P} y1={10} y2={H - P + 10} stroke="#334155" />
      <line x1={P} x2={W - 12} y1={H - P + 10} y2={H - P + 10} stroke="#334155" />
      <polyline points={pts.map((p) => `${sx(p[0])},${sy(p[1])}`).join(" ")} fill="none" stroke="#0e7c86" strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={sx(p[0])} cy={sy(p[1])} r="4" fill="#1f4fa3" />
      ))}
      <text x={W - 12} y={H - 4} fontSize="11" textAnchor="end" fill="#0f172a" fontWeight="bold">
        {lab(x)}
      </text>
      <text x={P + 4} y={12} fontSize="11" fill="#0f172a" fontWeight="bold">
        {lab(y)}
      </text>
    </svg>
  );
}
