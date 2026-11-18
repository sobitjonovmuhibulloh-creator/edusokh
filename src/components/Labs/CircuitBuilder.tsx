"use client";

/**
 * Sudrab yig'iladigan elektr zanjiri laboratoriyasi.
 * Holat (asboblar, simlar) bitta; uni ikki ko'rinish chizadi: 3D (Three.js) va 2D sxema (SVG).
 * 3D ishlamaydigan qurilmada avtomatik 2D ochiladi. Hisob-kitob — src/lib/labs/circuit-solver.ts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { L, type Lang } from "@/lib/i18n";
import { solveCircuit, terminal, type CircuitResult, type Part, type PartKind, type Wire } from "@/lib/labs/circuit-solver";
import type { Measure } from "@/lib/labs/types";
import { LAB_TEXT } from "@/lib/labs/ui-text";

const KINDS: PartKind[] = ["battery", "switch", "bulb", "resistor", "ammeter", "voltmeter"];
const TERM_OFFSET = 0.8;
const BOARD = { w: 13, h: 8 };
const SNAP = 0.25;
const DEFAULT_VALUE: Record<PartKind, number> = { battery: 6, bulb: 11.5, resistor: 10, switch: 0, ammeter: 0, voltmeter: 0 };
const SYMBOL: Record<PartKind, string> = { battery: "E", bulb: "⊗", resistor: "R", switch: "K", ammeter: "A", voltmeter: "V" };

const btn = "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-semibold disabled:opacity-50 dark:border-slate-600";
const btnPrimary = "inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-600";

type Selection = { type: "part" | "wire"; id: string } | null;
interface BoardState {
  parts: Part[];
  wires: Wire[];
}

const clampX = (v: number) => Math.max(-BOARD.w / 2 + 1, Math.min(BOARD.w / 2 - 1, v));
const clampY = (v: number) => Math.max(-BOARD.h / 2 + 0.6, Math.min(BOARD.h / 2 - 0.6, v));
const snap = (v: number) => Math.round(v / SNAP) * SNAP;

/** Qisqichning taxtadagi joyi */
function termPos(p: Part, t: "a" | "b"): [number, number] {
  const d = t === "a" ? -TERM_OFFSET : TERM_OFFSET;
  const r = (p.rot * Math.PI) / 180;
  return [p.x + d * Math.cos(r), p.y + d * Math.sin(r)];
}

const mk = (id: string, kind: PartKind, x: number, y: number, rot = 0): Part => ({ id, kind, x, y, rot, value: DEFAULT_VALUE[kind] });

/** Boshlang'ich holat: asboblar taxtada, simlar ulanmagan — o'quvchi o'zi yig'adi */
function initialBoard(): BoardState {
  return {
    parts: [mk("B1", "battery", -4.5, 0, 90), mk("K1", "switch", -1.5, -2.6), mk("A1", "ammeter", 1.5, -2.6), mk("L1", "bulb", 4.5, 0, 90), mk("V1", "voltmeter", 3, 2.6), mk("R1", "resistor", -1, 2.6)],
    wires: [],
  };
}

/** Namuna: manba → kalit → ampermetr → lampochka → manba, voltmetr lampochkaga parallel */
function sampleBoard(): BoardState {
  const parts = [mk("B1", "battery", -4.5, 0, 90), mk("K1", "switch", -1.5, -2.6), mk("A1", "ammeter", 1.5, -2.6), mk("L1", "bulb", 4.5, 0, 90), mk("V1", "voltmeter", 3, 2.6)];
  parts[1].value = 1;
  const w = (from: string, to: string, i: number): Wire => ({ id: `w${i}`, from, to });
  // battery rot=90: a (+) yuqorida (y−), b (−) pastda (y+)
  return { parts, wires: [w("B1:a", "K1:a", 1), w("K1:b", "A1:a", 2), w("A1:b", "L1:a", 3), w("L1:b", "B1:b", 4), w("V1:a", "L1:a", 5), w("V1:b", "L1:b", 6)] };
}

const fmt = (v: number, unit: string) => `${Math.abs(v) < 0.0005 ? "0" : (Math.round(v * 1000) / 1000).toString()} ${unit}`;

export default function CircuitBuilder({ lang, onMeasure }: { lang: Lang; onMeasure?: (m: Measure) => void }) {
  const T = (k: keyof typeof LAB_TEXT) => L(LAB_TEXT[k], lang);
  const [board, setBoard] = useState<BoardState>(initialBoard);
  const [selected, setSelected] = useState<Selection>(null);
  const [pending, setPending] = useState<string | null>(null);
  // Telefonda 2D sxema qulayroq (barmoq bilan aniq bosish); 3D tugma bilan yoqiladi
  const [view, setView] = useState<"3d" | "2d">(() => (typeof window !== "undefined" && window.innerWidth < 640 ? "2d" : "3d"));
  const [noWebgl, setNoWebgl] = useState(false);
  const result = useMemo(() => solveCircuit(board.parts, board.wires), [board]);

  // O'lchov: birinchi manba, ampermetr va voltmetr ko'rsatkichlari
  const measure = useMemo<Measure>(() => {
    const bat = board.parts.find((p) => p.kind === "battery");
    const am = board.parts.find((p) => p.kind === "ammeter");
    const vm = board.parts.find((p) => p.kind === "voltmeter");
    const P = board.parts.filter((p) => p.kind === "bulb").reduce((s, p) => s + (result.parts[p.id]?.power ?? 0), 0);
    const r3 = (v: number) => Math.round(v * 1000) / 1000;
    return {
      E: bat?.value ?? 0,
      I: r3(am ? (result.parts[am.id]?.reading ?? 0) : bat ? (result.parts[bat.id]?.current ?? 0) : 0),
      U: r3(vm ? (result.parts[vm.id]?.reading ?? 0) : 0),
      P: r3(P),
    };
  }, [board, result]);
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;
  useEffect(() => onMeasureRef.current?.(measure), [measure]);

  /* ───── Umumiy amallar (3D va 2D uchun bir xil) ───── */

  const stateRef = useRef({ board, pending, selected });
  stateRef.current = { board, pending, selected };

  const clickTerminal = useCallback((term: string) => {
    const { pending: pend, board: b } = stateRef.current;
    if (!pend) {
      setPending(term);
      setSelected(null);
      return;
    }
    setPending(null);
    if (pend === term || pend.split(":")[0] === term.split(":")[0]) return;
    const dup = b.wires.some((w) => (w.from === pend && w.to === term) || (w.from === term && w.to === pend));
    if (dup) return;
    setBoard((s) => ({ ...s, wires: [...s.wires, { id: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, from: pend, to: term }] }));
  }, []);

  const movePart = useCallback((id: string, x: number, y: number) => {
    setBoard((s) => ({ ...s, parts: s.parts.map((p) => (p.id === id ? { ...p, x: clampX(snap(x)), y: clampY(snap(y)) } : p)) }));
  }, []);

  const clickPart = useCallback((id: string) => {
    const p = stateRef.current.board.parts.find((q) => q.id === id);
    setPending(null);
    setSelected({ type: "part", id });
    if (p?.kind === "switch") setBoard((s) => ({ ...s, parts: s.parts.map((q) => (q.id === id ? { ...q, value: q.value ? 0 : 1 } : q)) }));
  }, []);

  const clickWire = useCallback((id: string) => {
    setPending(null);
    setSelected({ type: "wire", id });
  }, []);

  const clickEmpty = useCallback(() => {
    setPending(null);
    setSelected(null);
  }, []);

  const removeSelected = useCallback(() => {
    const sel = stateRef.current.selected;
    if (!sel) return;
    setBoard((s) =>
      sel.type === "wire"
        ? { ...s, wires: s.wires.filter((w) => w.id !== sel.id) }
        : { parts: s.parts.filter((p) => p.id !== sel.id), wires: s.wires.filter((w) => !w.from.startsWith(`${sel.id}:`) && !w.to.startsWith(`${sel.id}:`)) },
    );
    setSelected(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) removeSelected();
      if (e.key === "Escape") clickEmpty();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeSelected, clickEmpty]);

  const addPart = (kind: PartKind) => {
    setBoard((s) => {
      const n = s.parts.filter((p) => p.kind === kind).length + 1;
      let id = `${SYMBOL[kind] === "⊗" ? "L" : SYMBOL[kind]}${n}`;
      while (s.parts.some((p) => p.id === id)) id += "'";
      // Bo'sh joy: markazdan spiral bo'ylab qidiramiz
      let x = 0, y = 0;
      for (let k = 0; k < 40; k++) {
        x = snap(((k % 5) - 2) * 2);
        y = snap((Math.floor(k / 5) % 3) - 1) * 2;
        if (!s.parts.some((p) => Math.abs(p.x - x) < 1.8 && Math.abs(p.y - y) < 1.2)) break;
      }
      return { ...s, parts: [...s.parts, mk(id, kind, x, y)] };
    });
  };

  const selPart = selected?.type === "part" ? board.parts.find((p) => p.id === selected.id) : undefined;
  const setValue = (id: string, value: number) => setBoard((s) => ({ ...s, parts: s.parts.map((p) => (p.id === id ? { ...p, value } : p)) }));
  const rotate = (id: string) => setBoard((s) => ({ ...s, parts: s.parts.map((p) => (p.id === id ? { ...p, rot: (p.rot + 90) % 360 } : p)) }));

  const handlers = { clickTerminal, movePart, clickPart, clickWire, clickEmpty };
  const status = result.shortCircuit ? T("shortCircuit") : result.flowing ? T("closed") : T("open");

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{T("parts")}:</span>
        {KINDS.map((k) => (
          <button key={k} className={btn} onClick={() => addPart(k)}>
            <span className="font-mono text-brand-600">{SYMBOL[k]}</span> {T(k)}
          </button>
        ))}
        <span className="flex-1" />
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
          {(["3d", "2d"] as const).map((v) => (
            <button key={v} disabled={v === "3d" && noWebgl} onClick={() => setView(v)} aria-pressed={view === v} className={`px-3 py-1.5 text-sm font-semibold disabled:opacity-40 ${view === v ? "bg-cobalt-500 text-white" : ""}`}>
              {T(v === "3d" ? "view3d" : "view2d")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700" style={{ touchAction: "none" }}>
          {view === "3d" && !noWebgl ? (
            <Board3D
              board={board}
              result={result}
              selected={selected}
              pending={pending}
              handlers={handlers}
              onFail={() => {
                setNoWebgl(true);
                setView("2d");
              }}
            />
          ) : (
            <Board2D board={board} result={result} selected={selected} pending={pending} handlers={handlers} />
          )}
          <div className={`pointer-events-none absolute left-2 top-2 rounded-lg px-2 py-1 text-xs font-semibold ${result.shortCircuit ? "bg-red-600 text-white" : result.flowing ? "bg-emerald-600 text-white" : "bg-white/90 text-slate-700"}`} role="status">
            {status}
          </div>
          {pending && <div className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-saffron-100 px-2 py-1 text-center text-xs text-slate-800">{T("pendingWire")}</div>}
        </div>

        <aside className="grid content-start gap-2 text-sm">
          {noWebgl && <p className="rounded-lg bg-saffron-100 p-2 text-xs text-slate-800">{T("noWebgl")}</p>}
          <div className="grid gap-1 rounded-xl bg-brand-100 p-3 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100" aria-live="polite">
            {board.parts
              .filter((p) => p.kind === "ammeter" || p.kind === "voltmeter" || p.kind === "bulb")
              .map((p) => {
                const r = result.parts[p.id];
                return (
                  <div key={p.id} className="flex justify-between gap-2 font-mono">
                    <span>
                      {T(p.kind)} {p.id}
                    </span>
                    <b>{p.kind === "ammeter" ? fmt(r?.reading ?? 0, "A") : p.kind === "voltmeter" ? fmt(r?.reading ?? 0, "V") : `${fmt(r?.power ?? 0, "W")}${r?.lit ? " 💡" : ""}`}</b>
                  </div>
                );
              })}
          </div>

          {selPart ? (
            <div className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <b>
                {T(selPart.kind)} {selPart.id}
              </b>
              {selPart.kind === "battery" && (
                <label className="grid gap-1">
                  <span>
                    {T("voltage")}: <b className="font-mono">{selPart.value} V</b>
                  </span>
                  <input type="range" min={1.5} max={12} step={0.5} value={selPart.value} onChange={(e) => setValue(selPart.id, Number(e.target.value))} />
                </label>
              )}
              {(selPart.kind === "resistor" || selPart.kind === "bulb") && (
                <label className="grid gap-1">
                  <span>
                    {T("resistance")}: <b className="font-mono">{selPart.value} Ω</b>
                  </span>
                  <input type="range" min={1} max={selPart.kind === "bulb" ? 30 : 50} step={0.5} value={selPart.value} onChange={(e) => setValue(selPart.id, Number(e.target.value))} />
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {selPart.kind === "switch" && (
                  <button className={btnPrimary} onClick={() => clickPart(selPart.id)}>
                    {T("toggle")}
                  </button>
                )}
                <button className={btn} onClick={() => rotate(selPart.id)}>
                  ↻ {T("rotate")}
                </button>
                <button className={btn} onClick={removeSelected}>
                  ✕ {T("deletePart")}
                </button>
              </div>
            </div>
          ) : selected?.type === "wire" ? (
            <button className={btn} onClick={removeSelected}>
              ✂ {T("deleteWire")}
            </button>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              className={btn}
              onClick={() => {
                setBoard(sampleBoard());
                clickEmpty();
              }}
            >
              {T("sample")}
            </button>
            <button
              className={btn}
              onClick={() => {
                setBoard(initialBoard());
                clickEmpty();
              }}
            >
              {T("clearBoard")}
            </button>
          </div>
          <p className="text-xs text-slate-500">{T("wireHint")}</p>
        </aside>
      </div>
    </div>
  );
}

interface ViewProps {
  board: BoardState;
  result: CircuitResult;
  selected: Selection;
  pending: string | null;
  handlers: {
    clickTerminal(term: string): void;
    movePart(id: string, x: number, y: number): void;
    clickPart(id: string): void;
    clickWire(id: string): void;
    clickEmpty(): void;
  };
}

/* ───────────────────────── 2D sxema (SVG) ───────────────────────── */

function Board2D({ board, result, selected, pending, handlers }: ViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean; sx: number; sy: number } | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  const toBoard = (e: React.PointerEvent): [number, number] => {
    const svg = svgRef.current as SVGSVGElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return [p.x, p.y];
  };
  const pos = (term: string): [number, number] => {
    const [id, t] = term.split(":");
    const p = board.parts.find((q) => q.id === id);
    return p ? termPos(p, t as "a" | "b") : [0, 0];
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${-BOARD.w / 2} ${-BOARD.h / 2} ${BOARD.w} ${BOARD.h}`}
      className="block max-h-[440px] w-full select-none bg-[#f7f3e8] dark:bg-slate-900"
      style={{ aspectRatio: `${BOARD.w} / ${BOARD.h}` }}
      onPointerMove={(e) => {
        const [x, y] = toBoard(e);
        if (pending) setCursor([x, y]);
        const d = drag.current;
        if (!d) return;
        if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
        if (d.moved) handlers.movePart(d.id, x - d.dx, y - d.dy);
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved) handlers.clickPart(d.id);
      }}
      onPointerDown={(e) => {
        if (e.target === svgRef.current) handlers.clickEmpty();
      }}
    >
      <defs>
        <pattern id="grid" width="0.5" height="0.5" patternUnits="userSpaceOnUse">
          <path d="M 0.5 0 L 0 0 0 0.5" fill="none" stroke="#d9cfb4" strokeWidth="0.02" />
        </pattern>
      </defs>
      <rect x={-BOARD.w / 2} y={-BOARD.h / 2} width={BOARD.w} height={BOARD.h} fill="url(#grid)" pointerEvents="none" />
      {board.wires.map((w) => {
        const [x1, y1] = pos(w.from);
        const [x2, y2] = pos(w.to);
        const sel = selected?.type === "wire" && selected.id === w.id;
        return (
          <g key={w.id} onPointerDown={(e) => (e.stopPropagation(), handlers.clickWire(w.id))} className="cursor-pointer">
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={0.35} />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={sel ? "#e8a317" : "#b45309"} strokeWidth={sel ? 0.12 : 0.07} strokeLinecap="round" />
          </g>
        );
      })}
      {pending && cursor && <line x1={pos(pending)[0]} y1={pos(pending)[1]} x2={cursor[0]} y2={cursor[1]} stroke="#0e7c86" strokeWidth={0.05} strokeDasharray="0.15 0.1" pointerEvents="none" />}
      {board.parts.map((p) => {
        const r = result.parts[p.id];
        const sel = selected?.type === "part" && selected.id === p.id;
        const label = p.kind === "ammeter" ? fmt(r?.reading ?? 0, "A") : p.kind === "voltmeter" ? fmt(r?.reading ?? 0, "V") : p.kind === "battery" ? `${p.value} V` : p.kind === "resistor" || p.kind === "bulb" ? `${p.value} Ω` : p.value ? "ON" : "OFF";
        return (
          <g key={p.id}>
            <g
              transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`}
              className="cursor-grab"
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(e.pointerId);
                const [x, y] = toBoard(e);
                drag.current = { id: p.id, dx: x - p.x, dy: y - p.y, moved: false, sx: e.clientX, sy: e.clientY };
              }}
            >
              <line x1={-TERM_OFFSET} y1={0} x2={TERM_OFFSET} y2={0} stroke="#334155" strokeWidth={0.05} />
              <Symbol2D part={p} lit={Boolean(r?.lit)} power={r?.power ?? 0} />
              {sel && <rect x={-0.95} y={-0.6} width={1.9} height={1.2} rx={0.15} fill="none" stroke="#e8a317" strokeWidth={0.05} strokeDasharray="0.12 0.08" />}
            </g>
            <text x={p.x} y={p.y + (p.rot % 180 ? 0.15 : 0.85)} dx={p.rot % 180 ? 0.7 : 0} fontSize={0.32} textAnchor={p.rot % 180 ? "start" : "middle"} fill="#0f172a" pointerEvents="none" fontFamily="monospace">
              {p.id}: {label}
            </text>
            {(["a", "b"] as const).map((t) => {
              const [x, y] = termPos(p, t);
              const term = terminal(p.id, t);
              const isPending = pending === term;
              return (
                <circle
                  key={t}
                  cx={x}
                  cy={y}
                  r={isPending ? 0.2 : 0.14}
                  fill={p.kind === "battery" ? (t === "a" ? "#dc2626" : "#1e293b") : t === "a" ? "#0e7c86" : "#475569"}
                  stroke={isPending ? "#e8a317" : "white"}
                  strokeWidth={0.04}
                  className="cursor-crosshair"
                  onPointerDown={(e) => (e.stopPropagation(), handlers.clickTerminal(term))}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

function Symbol2D({ part, lit, power }: { part: Part; lit: boolean; power: number }) {
  const bg = { fill: "#ffffff", stroke: "#334155", strokeWidth: 0.05 };
  switch (part.kind) {
    case "battery":
      return (
        <g>
          <rect x={-0.35} y={-0.4} width={0.7} height={0.8} fill="#f7f3e8" opacity={0.9} />
          <line x1={-0.1} y1={-0.4} x2={-0.1} y2={0.4} stroke="#dc2626" strokeWidth={0.07} />
          <line x1={0.1} y1={-0.22} x2={0.1} y2={0.22} stroke="#1e293b" strokeWidth={0.12} />
          <text x={-0.35} y={-0.45} fontSize={0.3} fill="#dc2626">+</text>
        </g>
      );
    case "bulb":
      return (
        <g>
          {lit && <circle r={0.38 + Math.min(power, 6) * 0.06} fill="#facc15" opacity={0.45} />}
          <circle r={0.32} {...bg} fill={lit ? "#fde047" : "#ffffff"} />
          <line x1={-0.22} y1={-0.22} x2={0.22} y2={0.22} stroke="#334155" strokeWidth={0.05} />
          <line x1={-0.22} y1={0.22} x2={0.22} y2={-0.22} stroke="#334155" strokeWidth={0.05} />
        </g>
      );
    case "resistor":
      return <rect x={-0.45} y={-0.17} width={0.9} height={0.34} {...bg} />;
    case "switch":
      return (
        <g>
          <rect x={-0.5} y={-0.3} width={1} height={0.6} fill="#f7f3e8" opacity={0.9} />
          <circle cx={-0.4} r={0.06} fill="#334155" />
          <circle cx={0.4} r={0.06} fill="#334155" />
          <line x1={-0.4} y1={0} x2={part.value ? 0.4 : 0.28} y2={part.value ? 0 : -0.35} stroke="#334155" strokeWidth={0.07} strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <circle r={0.36} {...bg} />
          <text y={0.13} fontSize={0.38} textAnchor="middle" fontWeight="bold" fill="#0f172a">
            {SYMBOL[part.kind]}
          </text>
        </g>
      );
  }
}

/* ───────────────────────── 3D ko'rinish (Three.js) ───────────────────────── */

function textSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(1.6, 0.4, 1);
  sprite.renderOrder = 10;
  let last = "";
  const set = (text: string, bg = "rgba(15,23,42,0.85)") => {
    if (text === last) return;
    last = text;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(4, 6, 248, 52, 14);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 30px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 33);
    tex.needsUpdate = true;
  };
  return { sprite, set };
}

interface PartView {
  group: THREE.Group;
  body: THREE.Group;
  kind: PartKind;
  label: ReturnType<typeof textSprite>;
  bulbMat?: THREE.MeshStandardMaterial;
  light?: THREE.PointLight;
  lever?: THREE.Object3D;
  highlight: THREE.Mesh;
  terms: Record<"a" | "b", THREE.Mesh>;
}

const m3 = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...o });

function buildPart(p: Part): PartView {
  const group = new THREE.Group();
  const body = new THREE.Group();
  body.userData = { pick: "part", id: p.id };
  group.add(body);
  const add = (mesh: THREE.Mesh) => {
    mesh.userData = { pick: "part", id: p.id };
    body.add(mesh);
    return mesh;
  };
  // Asos taglik (hamma asboblarda)
  add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 0.7), m3(0x475569))).position.y = 0.04;
  let bulbMat: THREE.MeshStandardMaterial | undefined;
  let light: THREE.PointLight | undefined;
  let lever: THREE.Object3D | undefined;
  switch (p.kind) {
    case "battery": {
      const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 24), m3(0x1f4fa3)));
      c.rotation.z = Math.PI / 2;
      c.position.y = 0.38;
      const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.25, 24), m3(0xdc2626)));
      cap.rotation.z = Math.PI / 2;
      cap.position.set(-0.55, 0.38, 0);
      break;
    }
    case "bulb": {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 20), m3(0x9ca3af, { metalness: 0.6 }))).position.y = 0.23;
      bulbMat = m3(0xfffbe6, { emissive: 0xffc400, emissiveIntensity: 0, transparent: true, opacity: 0.9, roughness: 0.15 });
      add(new THREE.Mesh(new THREE.SphereGeometry(0.38, 28, 20), bulbMat)).position.y = 0.72;
      light = new THREE.PointLight(0xffd36b, 0, 6);
      light.position.y = 0.8;
      group.add(light);
      break;
    }
    case "resistor": {
      const r = add(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.9, 18), m3(0xd6b98c)));
      r.rotation.z = Math.PI / 2;
      r.position.y = 0.3;
      [-0.25, -0.05, 0.15].forEach((x, i) => {
        const band = add(new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.07, 18), m3([0x7c2d12, 0x111827, 0xdc2626][i])));
        band.rotation.z = Math.PI / 2;
        band.position.set(x, 0.3, 0);
      });
      break;
    }
    case "switch": {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.25), m3(0x334155))).position.set(-0.55, 0.2, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.25), m3(0x334155))).position.set(0.55, 0.17, 0);
      const pivot = new THREE.Group();
      pivot.position.set(-0.55, 0.3, 0);
      const bar = add(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.06, 0.12), m3(0xb87333, { metalness: 0.7 })));
      body.remove(bar);
      bar.position.x = 0.575;
      pivot.add(bar);
      const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), m3(0x111827)));
      body.remove(knob);
      knob.position.x = 1.0;
      knob.position.y = 0.06;
      pivot.add(knob);
      pivot.userData = { pick: "part", id: p.id };
      body.add(pivot);
      lever = pivot;
      break;
    }
    default: {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.3, 32), m3(p.kind === "ammeter" ? 0x0e7c86 : 0x7c3aed))).position.y = 0.22;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 32), m3(0xffffff))).position.y = 0.38;
    }
  }
  const highlight = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.05, 40), new THREE.MeshBasicMaterial({ color: 0xe8a317, side: THREE.DoubleSide }));
  highlight.rotation.x = -Math.PI / 2;
  highlight.position.y = 0.02;
  highlight.scale.set(1, 0.55, 1);
  highlight.visible = false;
  group.add(highlight);

  const terms = {} as PartView["terms"];
  for (const t of ["a", "b"] as const) {
    const color = p.kind === "battery" ? (t === "a" ? 0xdc2626 : 0x1e293b) : t === "a" ? 0x0e7c86 : 0x475569;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), m3(color, { metalness: 0.4 }));
    s.position.set(t === "a" ? -TERM_OFFSET : TERM_OFFSET, 0.14, 0);
    s.userData = { pick: "terminal", term: terminal(p.id, t) };
    // Barmoq bilan bosish oson bo'lishi uchun ko'rinmas kattaroq soha
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData = s.userData;
    s.add(hit);
    group.add(s);
    terms[t] = s;
  }
  const label = textSprite();
  label.sprite.position.y = p.kind === "bulb" ? 1.45 : 1.0;
  group.add(label.sprite);
  return { group, body, kind: p.kind, label, bulbMat, light, lever, highlight, terms };
}

function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mt of mats) {
      (mt as THREE.SpriteMaterial).map?.dispose();
      mt.dispose();
    }
  });
}

function Board3D({ board, result, selected, pending, handlers, onFail }: ViewProps & { onFail: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ sync(): void } | null>(null);
  const propsRef = useRef({ board, result, selected, pending, handlers });
  propsRef.current = { board, result, selected, pending, handlers };
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onFailRef.current();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xe9eef5);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    const BASE_CAM = new THREE.Vector3(0, 10.5, 7.5);
    camera.position.copy(BASE_CAM);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.3;
    controls.minDistance = 5;
    controls.maxDistance = 22;
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(4, 10, 6);
    scene.add(sun);

    const table = new THREE.Mesh(new THREE.BoxGeometry(BOARD.w + 0.6, 0.3, BOARD.h + 0.6), m3(0xc8a97e, { roughness: 0.8 }));
    table.position.y = -0.15;
    table.userData = { pick: "board" };
    scene.add(table);
    const grid = new THREE.GridHelper(BOARD.w, BOARD.w * 2, 0xb39064, 0xb39064);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = 0.005;
    scene.add(grid);

    const views = new Map<string, PartView>();
    const wireGroup = new THREE.Group();
    scene.add(wireGroup);
    const wireMat = m3(0xb45309, { metalness: 0.5, roughness: 0.35 });
    const wireSelMat = m3(0xe8a317, { emissive: 0xe8a317, emissiveIntensity: 0.4 });
    const pendingLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0x0e7c86, dashSize: 0.2, gapSize: 0.12 }));
    pendingLine.visible = false;
    scene.add(pendingLine);

    const termWorld = (term: string) => {
      const [id, t] = term.split(":");
      const p = propsRef.current.board.parts.find((q) => q.id === id);
      const [x, y] = p ? termPos(p, t as "a" | "b") : [0, 0];
      return new THREE.Vector3(x, 0.14, y);
    };

    const sync = () => {
      const { board: b, result: r, selected: sel } = propsRef.current;
      // Asboblar
      for (const [id, v] of views) {
        if (!b.parts.some((p) => p.id === id && p.kind === v.kind)) {
          scene.remove(v.group);
          disposeTree(v.group);
          views.delete(id);
        }
      }
      for (const p of b.parts) {
        let v = views.get(p.id);
        if (!v) {
          v = buildPart(p);
          views.set(p.id, v);
          scene.add(v.group);
        }
        v.group.position.set(p.x, 0, p.y);
        v.group.rotation.y = (-p.rot * Math.PI) / 180;
        v.label.sprite.material.rotation = 0;
        v.highlight.visible = sel?.type === "part" && sel.id === p.id;
        const res = r.parts[p.id];
        if (v.bulbMat && v.light) {
          const glow = res?.lit ? Math.min(2.2, 0.4 + (res.power ?? 0) * 0.5) : 0;
          v.bulbMat.emissiveIntensity = glow;
          v.light.intensity = glow * 4;
        }
        if (v.lever) v.lever.rotation.z = p.value ? 0 : 0.6;
        const text =
          p.kind === "ammeter" ? fmt(res?.reading ?? 0, "A") : p.kind === "voltmeter" ? fmt(res?.reading ?? 0, "V") : p.kind === "battery" ? `${p.value} V` : p.kind === "switch" ? (p.value ? "ON" : "OFF") : `${p.value} Ω`;
        v.label.set(`${p.id}  ${text}`, p.kind === "ammeter" ? "rgba(14,124,134,0.92)" : p.kind === "voltmeter" ? "rgba(124,58,237,0.92)" : undefined);
      }
      // Simlar — har safar qayta chiziladi (soni kam)
      for (const c of [...wireGroup.children]) {
        wireGroup.remove(c);
        (c as THREE.Mesh).geometry.dispose();
      }
      for (const w of b.wires) {
        const a = termWorld(w.from);
        const z = termWorld(w.to);
        const mid = a.clone().lerp(z, 0.5);
        mid.y = 0.25 + Math.min(1.2, a.distanceTo(z) * 0.12);
        const curve = new THREE.QuadraticBezierCurve3(a, mid, z);
        const isSel = sel?.type === "wire" && sel.id === w.id;
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, isSel ? 0.06 : 0.045, 8), isSel ? wireSelMat : wireMat);
        mesh.userData = { pick: "wire", id: w.id };
        wireGroup.add(mesh);
      }
    };
    api.current = { sync };
    sync();

    const fit = () => {
      const w = el.clientWidth || 300;
      const h = 440;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Tor ekranda taxta to'liq sig'ishi uchun kamerani uzoqlashtiramiz (kenglik/balandlik ≈ 1,5 da sig'adi)
      const k = Math.max(1, 1.5 / camera.aspect);
      camera.position.copy(BASE_CAM).multiplyScalar(k);
      controls.maxDistance = 22 * k;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    // ── Sichqoncha / sensor ──
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const boardPoint = (e: PointerEvent) => {
      ray.setFromCamera(ndc(e), camera);
      const hit = new THREE.Vector3();
      return ray.ray.intersectPlane(plane, hit) ? hit : null;
    };
    const pick = (e: PointerEvent) => {
      ray.setFromCamera(ndc(e), camera);
      const hits = ray.intersectObjects(scene.children, true).map((h) => h.object.userData as { pick?: string; id?: string; term?: string }).filter((d) => d.pick);
      // Qisqich asbob korpusi orqasida qolsa ham bosilishi kerak — qisqichlar ustun
      return hits.find((d) => d.pick === "terminal") ?? hits[0] ?? null;
    };
    let drag: { id: string; dx: number; dz: number; sx: number; sy: number; moved: boolean } | null = null;
    let tap: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      const d = pick(e);
      const h = propsRef.current.handlers;
      if (d?.pick === "terminal" && d.term) {
        h.clickTerminal(d.term);
        return;
      }
      if (d?.pick === "wire" && d.id) {
        h.clickWire(d.id);
        return;
      }
      if (d?.pick === "part" && d.id) {
        const p = propsRef.current.board.parts.find((q) => q.id === d.id);
        const at = boardPoint(e);
        if (p && at) {
          drag = { id: p.id, dx: at.x - p.x, dz: at.z - p.y, sx: e.clientX, sy: e.clientY, moved: false };
          controls.enabled = false;
          renderer.domElement.setPointerCapture(e.pointerId);
        }
        return;
      }
      tap = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      const { pending: pend } = propsRef.current;
      if (pend) {
        const at = boardPoint(e);
        if (at) {
          pendingLine.geometry.setFromPoints([termWorld(pend), at.setY(0.14)]);
          pendingLine.computeLineDistances();
          pendingLine.visible = true;
        }
      } else pendingLine.visible = false;
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
      const at = boardPoint(e);
      if (drag.moved && at) propsRef.current.handlers.movePart(drag.id, at.x - drag.dx, at.z - drag.dz);
    };
    const onUp = (e: PointerEvent) => {
      if (drag) {
        if (!drag.moved) propsRef.current.handlers.clickPart(drag.id);
        drag = null;
        controls.enabled = true;
      } else if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 5) {
        propsRef.current.handlers.clickEmpty();
        pendingLine.visible = false;
      }
      tap = null;
    };
    const cv = renderer.domElement;
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      controls.dispose();
      disposeTree(scene);
      renderer.dispose();
      cv.remove();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.sync();
  }, [board, result, selected, pending]);

  return <div ref={mountRef} className="min-h-[440px]" />;
}
