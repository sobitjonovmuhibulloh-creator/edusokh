"use client";

/**
 * Dars slaydlari pleyeri: klaviatura (← →), suring (swipe), to'liq ekran.
 * Slayd turlari: title, bullets, video (YouTube embed), lab (3D laboratoriya), embed (tashqi slaydlar).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import LabsCanvas from "@/components/3D/LabsCanvas";
import { L, LL, t, type Lang } from "@/lib/i18n";
import type { Slide } from "@/lib/lesson-template";

export interface SlidePlayerProps {
  slides: Slide[];
  lang: Lang;
}

/** Faqat ishonchli manbalardagi iframe'larga ruxsat beramiz */
const SAFE_EMBED = /^https:\/\/(www\.youtube-nocookie\.com\/embed\/|docs\.google\.com\/presentation\/|onedrive\.live\.com\/embed)/;

export default function SlidePlayer({ slides, lang }: SlidePlayerProps) {
  const [[index, dir], setPage] = useState<[number, number]>([0, 0]);
  const boxRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const n = slides.length;
  const i = Math.min(index, n - 1);
  const slide = slides[i];

  const go = useCallback((delta: number) => {
    setPage(([cur]) => {
      const next = Math.max(0, Math.min(n - 1, cur + delta));
      return next === cur ? [cur, 0] : [next, delta];
    });
  }, [n]);

  useEffect(() => setPage([0, 0]), [slides]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [go]);

  if (!slide) return null;
  const bullets = LL(slide.bullets, lang);
  const embed = slide.embedUrl && SAFE_EMBED.test(slide.embedUrl) ? slide.embedUrl : null;

  return (
    <div className="grid gap-2">
      <div
        ref={boxRef}
        tabIndex={0}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-cobalt-500 text-white outline-none focus-visible:ring-2 focus-visible:ring-saffron-500"
        style={{ aspectRatio: "16 / 9" }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <AnimatePresence initial={false} custom={dir} mode="wait">
          <motion.div
            key={i}
            custom={dir}
            initial={{ opacity: 0, x: dir >= 0 ? 60 : -60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir >= 0 ? -60 : 60 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col overflow-auto p-[clamp(16px,4vw,40px)]"
          >
            <h4 className={`font-bold ${slide.kind === "title" ? "text-[clamp(24px,4.5vw,44px)] mt-auto" : "text-[clamp(20px,3.5vw,34px)]"}`}>{L(slide.title, lang)}</h4>
            {bullets.length > 0 && (
              <ul className={`mt-4 grid gap-2 pl-6 text-[clamp(14px,2.2vw,22px)] ${slide.kind === "title" ? "list-none pl-0 mb-auto opacity-90" : "list-disc"}`}>
                {bullets.map((b, k) => (
                  <motion.li key={k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * k + 0.1 }}>
                    {b}
                  </motion.li>
                ))}
              </ul>
            )}
            {(slide.kind === "video" || slide.kind === "embed") && embed && (
              <iframe className="mt-3 w-full flex-1 rounded-xl bg-black" src={embed} title={L(slide.title, lang)} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            )}
            {slide.kind === "lab" && slide.labKey && (
              <div className="mt-3 flex-1 rounded-xl bg-white p-2 text-slate-900">
                <LabsCanvas lang={lang} labKey={slide.labKey} showPicker={false} height={300} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <button className="rounded-lg border border-slate-300 p-2 disabled:opacity-40 dark:border-slate-600" onClick={() => go(-1)} disabled={i === 0} aria-label={t(lang, "prev")}>
            <ChevronLeft size={18} />
          </button>
          <button className="rounded-lg border border-slate-300 p-2 disabled:opacity-40 dark:border-slate-600" onClick={() => go(1)} disabled={i === n - 1} aria-label={t(lang, "next")}>
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {slides.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-brand-500" : "w-1.5 bg-slate-300 dark:bg-slate-600"}`} />
          ))}
        </div>
        <span className="font-mono text-sm text-slate-500">
          {i + 1} / {n}
        </span>
        <button
          className="rounded-lg border border-slate-300 p-2 dark:border-slate-600"
          onClick={() => boxRef.current?.requestFullscreen?.().catch(() => undefined)}
          aria-label={t(lang, "fullscreen")}
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </div>
  );
}
