"use client";

/**
 * "Slaydlar va taqdimotlar" bo'limi: PDF/PPTX slaydlarni sinf, fan, til va qidiruv bo'yicha filtrlash,
 * saytda ko'rish, yuklab olish va o'qituvchi tomonidan yuklash. Ma'lumot: /api/slides.
 */
import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Presentation, Search, Trash2, Upload, X } from "lucide-react";
import { GRADES, SUBJECTS, type SubjectCode } from "@/lib/curriculum";
import { L, t, type Lang } from "@/lib/i18n";
import { DECK_LANG_LABELS, DECK_LANGS, MAX_DECK_BYTES, SLIDES_TEXT, formatBytes, type DeckLang, type SlideDeckFile } from "@/lib/slide-library";

// simulator/page.tsx dagi uslublar bilan bir xil
const card = "rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800";
const btn = "inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-600";
const btnPrimary = "inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50";
const input = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600";

const gradeLabel = (n: number, lang: Lang) => `${n}${t(lang, "gradeSuffix")}`;
const fileUrl = (d: SlideDeckFile, download = false) => `/api/slides/${encodeURIComponent(d.id)}${download ? "?download=1" : ""}`;
const subjectName = (s: SubjectCode, lang: Lang) => L(SUBJECTS[s], lang);

export default function SlideLibrary({ lang }: { lang: Lang }) {
  const T = (k: keyof typeof SLIDES_TEXT) => L(SLIDES_TEXT[k], lang);
  const [decks, setDecks] = useState<SlideDeckFile[] | null>(null);
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState(0);
  const [subject, setSubject] = useState<SubjectCode | "">("");
  const [deckLang, setDeckLang] = useState<DeckLang | "">("");
  const [open, setOpen] = useState<SlideDeckFile | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetch("/api/slides", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<SlideDeckFile[]>) : []))
      .then(setDecks)
      .catch(() => setDecks([]));
  }, []);

  const subjects = useMemo(
    () => (Object.keys(SUBJECTS) as SubjectCode[]).sort((a, b) => subjectName(a, lang).localeCompare(subjectName(b, lang))),
    [lang],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return (decks ?? [])
      .filter((d) => (!grade || d.grade === grade) && (!subject || d.subject === subject) && (!deckLang || d.lang === deckLang))
      .filter((d) => !q || `${d.title} ${d.topic} ${d.author}`.toLocaleLowerCase().includes(q))
      .sort((a, b) => a.grade - b.grade || a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title));
  }, [decks, query, grade, subject, deckLang]);

  const remove = async (d: SlideDeckFile) => {
    if (!confirm(T("removeConfirm"))) return;
    const r = await fetch(`/api/slides?id=${encodeURIComponent(d.id)}`, { method: "DELETE" });
    if (r.ok) setDecks((all) => (all ?? []).filter((x) => x.id !== d.id));
  };

  return (
    <div className="grid gap-4">
      <div className={`${card} grid gap-3`}>
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${input} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T("search")} aria-label={T("search")} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select className={input} value={grade} onChange={(e) => setGrade(Number(e.target.value))} aria-label={T("grade")}>
            <option value={0}>{T("allGrades")}</option>
            {GRADES.map((g) => (
              <option key={g.number} value={g.number}>
                {gradeLabel(g.number, lang)}
              </option>
            ))}
          </select>
          <select className={input} value={subject} onChange={(e) => setSubject(e.target.value as SubjectCode | "")} aria-label={T("subject")}>
            <option value="">{T("allSubjects")}</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {subjectName(s, lang)}
              </option>
            ))}
          </select>
          <div className="col-span-2 inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600 sm:col-span-1" role="group" aria-label={T("lang")}>
            {(["", ...DECK_LANGS] as const).map((l) => (
              <button
                key={l || "all"}
                onClick={() => setDeckLang(l)}
                aria-pressed={deckLang === l}
                className={`flex-1 px-2 py-2 text-sm font-semibold ${deckLang === l ? "bg-brand-500 text-white" : ""}`}
              >
                {l ? DECK_LANG_LABELS[l] : T("allLangs")}
              </button>
            ))}
          </div>
          <button className={`${btnPrimary} col-span-2 justify-center sm:col-span-1`} onClick={() => setShowUpload((v) => !v)} aria-expanded={showUpload}>
            <Upload size={16} /> {T("upload")}
          </button>
        </div>
      </div>

      {showUpload && (
        <UploadForm
          lang={lang}
          defaults={{ grade: grade || 8, subject: subject || "fizika", deckLang: deckLang || (lang === "tg" ? "tg" : "uz") }}
          onDone={(d) => {
            setDecks((all) => [d, ...(all ?? [])]);
            setShowUpload(false);
          }}
        />
      )}

      {decks === null ? (
        <p className="text-sm text-slate-500">…</p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {filtered.length} {T("found")}
          </p>
          {filtered.length === 0 ? (
            <p className={`${card} text-sm text-slate-500`}>{T("empty")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((d) => (
                <article key={d.id} className={`${card} flex min-w-0 flex-col gap-3`}>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                    <span className={`rounded-md px-2 py-0.5 text-white ${d.format === "pdf" ? "bg-red-600" : "bg-orange-600"}`}>{d.format.toUpperCase()}</span>
                    <span className="rounded-md bg-brand-100 px-2 py-0.5 text-brand-700">{DECK_LANG_LABELS[d.lang]}</span>
                    {d.source === "demo" && <span className="rounded-md bg-saffron-100 px-2 py-0.5 text-slate-800">{T("demo")}</span>}
                  </div>
                  <h3 className="flex items-start gap-2 font-bold leading-snug">
                    {d.format === "pdf" ? <FileText size={18} className="mt-0.5 shrink-0 text-red-600" /> : <Presentation size={18} className="mt-0.5 shrink-0 text-orange-600" />}
                    <span className="min-w-0 break-words">{d.title}</span>
                  </h3>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                    <dt className="text-slate-500">{T("grade")}</dt>
                    <dd>{gradeLabel(d.grade, lang)}</dd>
                    <dt className="text-slate-500">{T("subject")}</dt>
                    <dd>{subjectName(d.subject, lang)}</dd>
                    <dt className="text-slate-500">{T("topic")}</dt>
                    <dd className="min-w-0 break-words">{d.topic}</dd>
                    <dt className="text-slate-500">{T("format")}</dt>
                    <dd>
                      {d.format.toUpperCase()} · {formatBytes(d.bytes)}
                      {d.pages > 0 && ` · ${d.pages} ${T("pages")}`}
                    </dd>
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <button className={btnPrimary} onClick={() => setOpen(d)}>
                      <Eye size={14} /> {T("view")}
                    </button>
                    <a className={btn} href={fileUrl(d, true)} download>
                      <Download size={14} /> {T("download")}
                    </a>
                    {d.source === "upload" && (
                      <button className={btn} onClick={() => void remove(d)} aria-label={T("remove")} title={T("remove")}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {open && <DeckViewer deck={open} lang={lang} onClose={() => setOpen(null)} />}
    </div>
  );
}

/* ───── Ko'rish oynasi ───── */

/** Office Online faylni internetdan o'zi yuklaydi — localhost va ichki tarmoq manzillarida ishlamaydi */
const isPublicHost = (h: string) => !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/.test(h);

function DeckViewer({ deck, lang, onClose }: { deck: SlideDeckFile; lang: Lang; onClose: () => void }) {
  const T = (k: keyof typeof SLIDES_TEXT) => L(SLIDES_TEXT[k], lang);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [failed, setFailed] = useState(false);
  const [officeUrl, setOfficeUrl] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (deck.format !== "pptx") return;
    if (isPublicHost(location.hostname)) {
      setOfficeUrl(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(new URL(fileUrl(deck, true), location.href).href)}`);
    }
    fetch(`${fileUrl(deck)}?preview=1`)
      .then((r) => (r.ok ? (r.json() as Promise<string[][]>) : Promise.reject()))
      .then(setPreview)
      .catch(() => setFailed(true));
  }, [deck]);

  return (
    <div className="fixed inset-0 z-50 grid grid-rows-[auto_1fr] bg-slate-900/80 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label={deck.title} onClick={onClose}>
      <div className="flex flex-wrap items-center gap-2 rounded-t-xl bg-white px-4 py-3 dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        <b className="min-w-0 flex-1 truncate">{deck.title}</b>
        <a className={btn} href={fileUrl(deck, true)} download>
          <Download size={14} /> <span className="hidden sm:inline">{T("download")}</span>
        </a>
        <button className={btnPrimary} onClick={onClose} aria-label={T("close")}>
          <X size={14} /> <span className="hidden sm:inline">{T("close")}</span>
        </button>
      </div>
      <div className="min-h-0 overflow-hidden rounded-b-xl bg-white dark:bg-slate-800" onClick={(e) => e.stopPropagation()}>
        {deck.format === "pdf" ? (
          <iframe className="h-full w-full" src={fileUrl(deck)} title={deck.title} />
        ) : officeUrl ? (
          <iframe className="h-full w-full" src={officeUrl} title={deck.title} />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <p className="mb-3 rounded-lg bg-saffron-100 px-3 py-2 text-sm text-slate-800">{T("pptxPreview")}</p>
            {failed && <p className="text-sm text-red-600">—</p>}
            {preview === null && !failed && <p className="text-sm text-slate-500">…</p>}
            <ol className="grid gap-3 sm:grid-cols-2">
              {preview?.map((paras, i) => (
                <li key={i} className="flex aspect-video flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700">
                  <div className="bg-brand-500 px-3 py-2 text-sm font-bold text-white">
                    {i + 1}. {paras[0] ?? T("noText")}
                  </div>
                  <ul className="grid list-disc gap-1 overflow-y-auto py-2 pl-7 pr-3 text-sm">
                    {paras.slice(1).map((p, j) => (
                      <li key={j}>{p}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Yuklash formasi ───── */

function UploadForm({
  lang,
  defaults,
  onDone,
}: {
  lang: Lang;
  defaults: { grade: number; subject: SubjectCode; deckLang: DeckLang };
  onDone: (d: SlideDeckFile) => void;
}) {
  const T = (k: keyof typeof SLIDES_TEXT) => L(SLIDES_TEXT[k], lang);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [author, setAuthor] = useState("");
  const [grade, setGrade] = useState(defaults.grade);
  const [subject, setSubject] = useState<SubjectCode>(defaults.subject);
  const [deckLang, setDeckLang] = useState<DeckLang>(defaults.deckLang);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = (f: File | null) => {
    setError("");
    if (f && !/\.(pdf|pptx)$/i.test(f.name)) {
      setError("PDF / PPTX");
      f = null;
    } else if (f && f.size > MAX_DECK_BYTES) {
      setError(`${formatBytes(f.size)} > ${formatBytes(MAX_DECK_BYTES)}`);
      f = null;
    }
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.(pdf|pptx)$/i, ""));
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("title", title);
    fd.set("topic", topic);
    fd.set("author", author);
    fd.set("grade", String(grade));
    fd.set("subject", subject);
    fd.set("lang", deckLang);
    try {
      const r = await fetch("/api/slides", { method: "POST", body: fd });
      if (!r.ok) throw new Error(await r.text());
      onDone((await r.json()) as SlideDeckFile);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={`${card} grid gap-3 border-2 border-dashed border-brand-500`}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <b>{T("upload")}</b>
      <p className="text-sm text-slate-500">{T("rules")}</p>
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">{T("file")}</span>
        <input
          className={input}
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("title")}</span>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("topic")}</span>
          <input className={input} value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} required />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("grade")}</span>
          <select className={input} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {GRADES.map((g) => (
              <option key={g.number} value={g.number}>
                {gradeLabel(g.number, lang)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("subject")}</span>
          <select className={input} value={subject} onChange={(e) => setSubject(e.target.value as SubjectCode)}>
            {(Object.keys(SUBJECTS) as SubjectCode[])
              .sort((a, b) => subjectName(a, lang).localeCompare(subjectName(b, lang)))
              .map((s) => (
                <option key={s} value={s}>
                  {subjectName(s, lang)}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("lang")}</span>
          <select className={input} value={deckLang} onChange={(e) => setDeckLang(e.target.value as DeckLang)}>
            {DECK_LANGS.map((l) => (
              <option key={l} value={l}>
                {DECK_LANG_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">{T("author")}</span>
          <input className={input} value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button className={btnPrimary} disabled={busy || !file}>
          <Upload size={14} /> {busy ? T("uploading") : T("upload")}
        </button>
      </div>
    </form>
  );
}
