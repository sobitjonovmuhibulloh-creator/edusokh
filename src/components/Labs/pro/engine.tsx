"use client";

/**
 * "Pro" 3D laboratoriyalar muhiti: yorug' oq-ko'k laboratoriya xonasi, stol, soyalar,
 * obyektni tanlash va stol ustida sudrash, Boshlash / To'xtatish / Qayta boshlash / Natija,
 * tajriba bosqichlari yon paneli. Har bir laboratoriya — labs.ts dagi ProLabDef.
 *
 * Simulyatsiya (step) chizishdan alohida: WebGL bo'lmasa ham hisob-kitob ishlaydi va
 * natijalar jadval ko'rinishida chiqadi (2D muqobil).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Pause, Play, RotateCcw } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { addStudioLight, markShadows, surfaceMaterial } from "@/components/3D/studio";
import { L, type Lang } from "@/lib/i18n";
import type { Measure, Tx } from "@/lib/labs/types";

export type Params = Record<string, number>;

export interface ProParam {
  id: string;
  label: Tx;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: number; label: Tx }[];
}

export interface PickInfo {
  title: Tx;
  body: Tx;
}

export interface ProContext {
  scene: THREE.Scene;
  /** Stol ustki tekisligining balandligi (y) */
  tableY: number;
  /** Obyektni bosiladigan qilish: bosilganda instance.pick(obj) chaqiriladi */
  pickable(o: THREE.Object3D, id: string): void;
  /** Obyektni stol ustida sudraladigan qilish */
  draggable(o: THREE.Object3D, id: string): void;
  /** Matnli yorliq (sprite) */
  label(text: string, opts?: { color?: string; bg?: string; scale?: number }): { sprite: THREE.Sprite; set(text: string): void };
  /** Renderer bor-yo'qligi (clipping va boshqalar uchun) */
  renderer: THREE.WebGLRenderer | null;
}

export interface ProInstance {
  /** Simulyatsiya qadami (faqat "Boshlash" bosilganda chaqiriladi, animated laboratoriyalarda) */
  step?(dt: number, p: Params): void;
  /** Har kadrda ko'rinishni yangilash (parametr o'zgarishi ham shu yerda) */
  frame(p: Params, time: number): void;
  readout(p: Params): { label: Tx; value: string }[];
  measure(p: Params): Measure;
  pick?(id: string, p: Params): PickInfo | null;
  drop?(id: string, x: number, z: number, p: Params): void;
  dragStart?(id: string): void;
  reset(p: Params): void;
  /** Laboratoriya ichidagi qisqa ko'rsatma / vazifa (masalan, "Mitoxondriyani toping") */
  hint?(p: Params): Tx | null;
}

export interface ProLabDef {
  key: string;
  title: Tx;
  camera: [number, number, number];
  target: [number, number, number];
  animated?: boolean;
  params: ProParam[];
  build(ctx: ProContext): ProInstance;
}

const T_UI = {
  start: { uz: "Boshlash", tg: "Оғоз", ru: "Старт" },
  stop: { uz: "To'xtatish", tg: "Боздоштан", ru: "Стоп" },
  reset: { uz: "Qayta boshlash", tg: "Аз нав", ru: "Сброс" },
  result: { uz: "Natijani ko'rish", tg: "Дидани натиҷа", ru: "Результат" },
  steps: { uz: "Tajriba bosqichlari", tg: "Марҳилаҳои таҷриба", ru: "Этапы опыта" },
  params: { uz: "Parametrlar", tg: "Параметрҳо", ru: "Параметры" },
  readings: { uz: "O'lchovlar", tg: "Ченкуниҳо", ru: "Показания" },
  hint: { uz: "Aylantirish — sichqoncha bilan suring, yaqinlashtirish — g'ildirak. Obyektni bosing — tavsif; jihozni stol ustida sudrang.", tg: "Гардонидан — бо муш кашед, наздик кардан — чархак. Объектро пахш кунед — тавсиф; асбобро дар рӯи миз кашед.", ru: "Вращение — перетаскивание, масштаб — колесо. Нажмите на объект — описание; приборы можно двигать по столу." },
  noWebgl: { uz: "Bu qurilmada 3D ishlamayapti. Tajriba hisob-kitobi ishlayapti — parametrlarni o'zgartirib, natijalarni quyida ko'ring.", tg: "Дар ин дастгоҳ 3D кор намекунад. Ҳисоби таҷриба кор мекунад — параметрҳоро иваз карда, натиҷаро дар поён бинед.", ru: "3D на этом устройстве недоступно. Расчёт опыта работает — меняйте параметры и смотрите результаты ниже." },
  close: { uz: "Yopish", tg: "Пӯшидан", ru: "Закрыть" },
  prev: { uz: "Oldingi", tg: "Қаблӣ", ru: "Назад" },
  next: { uz: "Keyingi", tg: "Навбатӣ", ru: "Далее" },
} satisfies Record<string, Tx & { ru: string }>;

const btn = "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
const tx = (v: Tx, lang: Lang) => (lang === "ru" ? v.ru : v[lang]) || v.uz;

/* ───────────────────────── Xona ───────────────────────── */

export const mat = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...o });

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d") as CanvasRenderingContext2D);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const TABLE_Y = 0;

function buildRoom(scene: THREE.Scene, shadows: boolean) {
  scene.background = new THREE.Color(0xeef4fb);
  // Pol
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), surfaceMaterial("tile", 16, 16, { roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -4.2;
  floor.receiveShadow = shadows;
  scene.add(floor);
  // Devorlar: orqa — oq, yon — och ko'k
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), mat(0xf8fafc, { roughness: 0.95 }));
  back.position.set(0, 3.8, -7);
  back.receiveShadow = shadows;
  scene.add(back);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(20, 16), mat(0xdbeafe, { roughness: 0.95 }));
  side.rotation.y = Math.PI / 2;
  side.position.set(-12, 3.8, 3);
  scene.add(side);
  // Ko'k chiziq va logotip paneli
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.35), mat(0x1f4fa3));
  stripe.position.set(0, 0.9, -6.98);
  scene.add(stripe);
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshBasicMaterial({
      map: canvasTexture(512, 128, (c) => {
        c.fillStyle = "#0e7c86";
        c.fillRect(0, 0, 512, 128);
        c.fillStyle = "#fff";
        c.font = "bold 64px sans-serif";
        c.textBaseline = "middle";
        c.fillText("EduSokh", 40, 66);
        c.font = "28px sans-serif";
        c.fillText("LAB", 400, 70);
      }),
    }),
  );
  logo.position.set(-4.5, 5.2, -6.95);
  scene.add(logo);
  // Deraza (yorug' panel)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3.2), new THREE.MeshBasicMaterial({ color: 0xe0f2fe }));
  win.position.set(4.5, 5, -6.95);
  scene.add(win);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(4.5, 3.2)), new THREE.LineBasicMaterial({ color: 0x94a3b8 }));
  frame.position.copy(win.position);
  scene.add(frame);
  // Javon va idishlar (bezak, bosilmaydi)
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 0.8), mat(0xffffff));
  shelf.position.set(-4.5, 3.2, -6.5);
  scene.add(shelf);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.45, roughness: 0.05, transmission: 0.3 });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Mesh(i % 2 ? new THREE.CylinderGeometry(0.18, 0.18, 0.6, 16) : new THREE.ConeGeometry(0.28, 0.6, 16), glass);
    g.position.set(-6.4 + i * 0.75, 3.56, -6.4);
    scene.add(g);
  }
  // Stol: oq ustki qism, ko'k oyoqlar
  const top = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 6), surfaceMaterial("bench", 3, 1.5, { roughness: 0.32, bumpScale: 0.15 }));
  top.position.y = TABLE_Y - 0.125;
  top.receiveShadow = shadows;
  top.userData.table = true;
  scene.add(top);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(12.05, 0.08, 6.05), mat(0x1f4fa3));
  edge.position.y = TABLE_Y - 0.27;
  scene.add(edge);
  for (const [x, z] of [[-5.6, -2.6], [5.6, -2.6], [-5.6, 2.6], [5.6, 2.6]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.9, 0.25), mat(0x1f4fa3, { metalness: 0.4 }));
    leg.position.set(x, -2.25, z);
    leg.castShadow = shadows;
    scene.add(leg);
  }
  // Yorug'lik
  scene.add(new THREE.HemisphereLight(0xffffff, 0xc7d7ea, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(5, 11, 6);
  if (shadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 4;
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.bias = -0.0005;
  }
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdbeafe, 0.5);
  fill.position.set(-6, 4, 2);
  scene.add(fill);
}

function makeLabel(text: string, opts: { color?: string; bg?: string; scale?: number } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  const s = opts.scale ?? 1;
  sprite.scale.set(2 * s, 0.5 * s, 1);
  sprite.renderOrder = 20;
  let last = "";
  const set = (t: string) => {
    if (t === last) return;
    last = t;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = opts.bg ?? "rgba(15,23,42,0.85)";
    ctx.beginPath();
    ctx.roundRect(6, 10, 500, 108, 24);
    ctx.fill();
    ctx.fillStyle = opts.color ?? "#fff";
    ctx.font = "bold 52px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, 256, 66, 480);
    tex.needsUpdate = true;
  };
  set(text);
  return { sprite, set };
}

export function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    m.geometry?.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mt of mats) {
      (mt as THREE.MeshStandardMaterial).map?.dispose();
      (mt as THREE.MeshStandardMaterial).bumpMap?.dispose();
      mt.dispose();
    }
  });
}

/* ───────────────────────── Komponent ───────────────────────── */

export default function ProLab({ def, lang, steps = [], onMeasure }: { def: ProLabDef; lang: Lang; steps?: Tx[]; onMeasure?: (m: Measure) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const defaults = useMemo(() => Object.fromEntries(def.params.map((p) => [p.id, p.value])) as Params, [def]);
  const [params, setParams] = useState<Params>(defaults);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  runningRef.current = running;
  const instRef = useRef<ProInstance | null>(null);
  const [, setTick] = useState(0);
  const [info, setInfo] = useState<PickInfo | null>(null);
  const [noWebgl, setNoWebgl] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      renderer = null;
    }
    setNoWebgl(!renderer);
    const mobile = window.innerWidth < 700;
    const shadows = Boolean(renderer) && !mobile;
    const scene = new THREE.Scene();
    buildRoom(scene, shadows);
    const roomParts = new Set(scene.children);

    const pickables: THREE.Object3D[] = [];
    const draggables = new Set<string>();
    const ctx: ProContext = {
      scene,
      tableY: TABLE_Y,
      renderer,
      pickable(o, id) {
        o.traverse((c) => (c.userData.pickId = id));
        pickables.push(o);
        if (shadows) markShadows(o);
      },
      draggable(o, id) {
        draggables.add(id);
        ctx.pickable(o, id);
      },
      label: makeLabel,
    };
    const inst = def.build(ctx);
    if (shadows) for (const c of scene.children) if (!roomParts.has(c)) markShadows(c);
    instRef.current = inst;
    inst.reset(paramsRef.current);
    setTick((n) => n + 1);

    // Simulyatsiya — chizishdan alohida (WebGL bo'lmasa ham ishlaydi)
    let last = performance.now();
    let simTime = 0;
    const sim = window.setInterval(() => {
      const now = performance.now();
      // Haqiqiy o'tgan vaqt (brauzer sekinlashsa ham vaqt yo'qolmasin); tab yashirilgandan keyingi katta sakrash — 1 s gacha
      const dt = Math.min(1, (now - last) / 1000);
      last = now;
      if (runningRef.current && inst.step) {
        // Barqaror integrallash uchun qadam ≤ 5 ms
        const n = Math.max(1, Math.ceil(dt / 0.005));
        for (let i = 0; i < n; i++) inst.step(dt / n, paramsRef.current);
        simTime += dt;
      }
      setTick((t) => (t + 1) % 1_000_000);
    }, 50);

    if (!renderer) {
      return () => {
        window.clearInterval(sim);
        disposeTree(scene);
      };
    }

    const r = renderer;
    const disposeEnv = addStudioLight(r, scene, 0.55);
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    r.shadowMap.enabled = shadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    el.appendChild(r.domElement);
    r.domElement.style.display = "block";
    r.domElement.style.touchAction = "none";
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    const baseCam = new THREE.Vector3(...def.camera);
    camera.position.copy(baseCam);
    const controls = new OrbitControls(camera, r.domElement);
    controls.target.set(...def.target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 2.5;
    controls.maxDistance = 30;

    const H = () => (document.fullscreenElement ? window.innerHeight - 160 : mobile ? 360 : 480);
    const fit = () => {
      const w = el.clientWidth || 300;
      const h = H();
      r.setSize(w, h, false);
      r.domElement.style.width = "100%";
      r.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const k = Math.max(1, 1.4 / camera.aspect);
      camera.position.copy(baseCam).sub(controls.target).multiplyScalar(k).add(controls.target);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    document.addEventListener("fullscreenchange", fit);

    // ── Tanlash va sudrash ──
    const ray = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TABLE_Y);
    const ndc = (e: PointerEvent) => {
      const b = r.domElement.getBoundingClientRect();
      return new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
    };
    let drag: { id: string; sx: number; sy: number; moved: boolean } | null = null;
    let tap: { x: number; y: number } | null = null;
    const pickAt = (e: PointerEvent) => {
      ray.setFromCamera(ndc(e), camera);
      for (const h of ray.intersectObjects(pickables, true)) {
        const id = h.object.userData.pickId as string | undefined;
        if (id && h.object.visible) return id;
      }
      return null;
    };
    const onDown = (e: PointerEvent) => {
      const id = pickAt(e);
      if (id && draggables.has(id)) {
        drag = { id, sx: e.clientX, sy: e.clientY, moved: false };
        controls.enabled = false;
        r.domElement.setPointerCapture(e.pointerId);
      } else tap = { x: e.clientX, y: e.clientY };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) {
        drag.moved = true;
        inst.dragStart?.(drag.id); // faqat haqiqatan sudralganda (oddiy bosish — faqat tavsif)
      }
      if (!drag.moved) return;
      ray.setFromCamera(ndc(e), camera);
      const hit = new THREE.Vector3();
      if (ray.ray.intersectPlane(plane, hit)) inst.drop?.(drag.id, THREE.MathUtils.clamp(hit.x, -5.5, 5.5), THREE.MathUtils.clamp(hit.z, -2.6, 2.6), paramsRef.current);
    };
    const onUp = (e: PointerEvent) => {
      if (drag) {
        const d = drag;
        drag = null;
        controls.enabled = true;
        if (!d.moved) setInfo(inst.pick?.(d.id, paramsRef.current) ?? null);
        else inst.drop?.(d.id, NaN, NaN, paramsRef.current); // NaN — qo'yib yuborildi
        return;
      }
      if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 5) {
        const id = pickAt(e);
        setInfo(id ? (inst.pick?.(id, paramsRef.current) ?? null) : null);
      }
      tap = null;
    };
    const cv = r.domElement;
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);

    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      inst.frame(paramsRef.current, clock.elapsedTime);
      controls.update();
      r.render(scene, camera);
    };
    loop();
    void simTime;

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(sim);
      ro.disconnect();
      document.removeEventListener("fullscreenchange", fit);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      controls.dispose();
      disposeTree(scene);
      disposeEnv();
      r.dispose();
      cv.remove();
      instRef.current = null;
    };
  }, [def]);

  const inst = instRef.current;
  const readout = inst?.readout(params) ?? [];
  const measure = inst?.measure(params);
  const hint = inst?.hint?.(params) ?? null;
  const measureKey = JSON.stringify(measure ?? {});
  const onMeasureRef = useRef(onMeasure);
  onMeasureRef.current = onMeasure;
  useEffect(() => {
    if (measure) onMeasureRef.current?.(measure);
  }, [measureKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (id: string, v: number) => setParams((s) => ({ ...s, [id]: v }));
  const reset = () => {
    setRunning(false);
    setParams(defaults);
    instRef.current?.reset(defaults);
    setInfo(null);
    setShowResult(false);
    setStepIdx(0);
  };

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {def.animated && (
          <button className={`${btn} ${running ? "" : "border-emerald-600 bg-emerald-600 text-white dark:bg-emerald-600"}`} onClick={() => setRunning((v) => !v)}>
            {running ? <Pause size={14} /> : <Play size={14} />} {tx(running ? T_UI.stop : T_UI.start, lang)}
          </button>
        )}
        <button className={btn} onClick={reset}>
          <RotateCcw size={14} /> {tx(T_UI.reset, lang)}
        </button>
        <button className={btn} onClick={() => setShowResult((v) => !v)} aria-pressed={showResult}>
          <Eye size={14} /> {tx(T_UI.result, lang)}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div ref={mountRef} className="relative min-h-[360px] self-start overflow-hidden rounded-2xl border border-slate-200 bg-[#eef4fb] dark:border-slate-700">
          {noWebgl && <p className="m-3 rounded-lg bg-saffron-100 p-3 text-sm text-slate-800">{tx(T_UI.noWebgl, lang)}</p>}
          {hint && <div className="pointer-events-none absolute left-3 right-3 top-3 rounded-xl bg-cobalt-500/90 px-3 py-2 text-center text-sm font-semibold text-white">{tx(hint, lang)}</div>}
          {info && (
            <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-saffron-500/60 bg-white/95 p-3 text-sm text-slate-900 shadow-lg sm:right-auto sm:max-w-sm">
              <div className="flex items-center justify-between gap-2">
                <b>{tx(info.title, lang)}</b>
                <button className="text-xs underline" onClick={() => setInfo(null)}>
                  {tx(T_UI.close, lang)}
                </button>
              </div>
              <p className="mt-1">{tx(info.body, lang)}</p>
            </div>
          )}
          {showResult && (
            <div className="absolute right-3 top-3 max-w-xs rounded-xl bg-slate-900/90 p-3 text-sm text-white shadow-lg">
              <b className="mb-1 block">{tx(T_UI.result, lang)}</b>
              {readout.map((r, i) => (
                <div key={i} className="flex justify-between gap-3 font-mono">
                  <span>{tx(r.label, lang)}</span>
                  <b>{r.value}</b>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="grid content-start gap-3 text-sm">
          {steps.length > 0 && (
            <div className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <b>{tx(T_UI.steps, lang)}</b>
              <ol className="grid gap-1">
                {steps.map((s, i) => (
                  <li key={i} className={`rounded-lg px-2 py-1 ${i === stepIdx ? "bg-brand-500 text-white" : i < stepIdx ? "text-slate-400 line-through" : ""}`}>
                    {i + 1}. {tx(s, lang)}
                  </li>
                ))}
              </ol>
              <div className="flex gap-2">
                <button className={btn} disabled={stepIdx === 0} onClick={() => setStepIdx((v) => v - 1)}>
                  {tx(T_UI.prev, lang)}
                </button>
                <button className={btn} disabled={stepIdx >= steps.length - 1} onClick={() => setStepIdx((v) => v + 1)}>
                  {tx(T_UI.next, lang)}
                </button>
              </div>
            </div>
          )}
          <div className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <b>{tx(T_UI.params, lang)}</b>
            {def.params.map((p) => (
              <label key={p.id} className="grid gap-1">
                <span>
                  {tx(p.label, lang)}
                  {!p.options && (
                    <b className="ml-1 font-mono text-brand-600">
                      {params[p.id]}
                      {p.unit ? ` ${p.unit}` : ""}
                    </b>
                  )}
                </span>
                {p.options ? (
                  <select className="rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 dark:border-slate-600" value={params[p.id]} onChange={(e) => set(p.id, Number(e.target.value))}>
                    {p.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {tx(o.label, lang)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="range" min={p.min} max={p.max} step={p.step} value={params[p.id]} onChange={(e) => set(p.id, Number(e.target.value))} />
                )}
              </label>
            ))}
          </div>
          <div className="grid gap-1 rounded-xl bg-brand-100 p-3 text-brand-700 dark:bg-brand-700/30 dark:text-brand-100" aria-live="polite">
            <b className="text-xs uppercase">{tx(T_UI.readings, lang)}</b>
            {readout.map((r, i) => (
              <div key={i} className="flex justify-between gap-3 font-mono">
                <span>{tx(r.label, lang)}</span>
                <b>{r.value}</b>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">{tx(T_UI.hint, lang)}</p>
        </aside>
      </div>
    </div>
  );
}
