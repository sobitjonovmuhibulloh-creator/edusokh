/**
 * "Pro" 3D laboratoriyalar: laboratoriya xonasida, stol ustida.
 *   spring    — fizika: prujina, yuklar, chizg'ich (dinamometr): Guk qonuni va tebranishlar
 *   titration — kimyo: kislota + ishqor titrlash (xavfsiz virtual tajriba): pH, indikator rangi, harorat
 *   cell      — biologiya: o'simlik/hayvon hujayrasi, organoidlarni tanlash, kesim, "toping" rejimi
 *   earth     — geografiya: Yerning ichki qatlamlari, kesim burchagi, chuqurlik zondi
 *   geometry  — matematika: 3D koordinatalar, jismlar, hajm/sirt/diagonal
 * Masshtab: fizika va geometriyada 1 birlik = 1 sm (prujinada 1 birlik = 10 sm).
 */
import * as THREE from "three";
import type { Tx } from "@/lib/labs/types";
import { mat, type Params, type PickInfo, type ProContext, type ProInstance, type ProLabDef } from "./engine";
import { EXTRA_PRO_LABS } from "./labs-extra";

const x = (uz: string, tg: string, ru?: string): Tx => ({ uz, tg, ...(ru ? { ru } : {}) });
const r2 = (v: number) => (Math.round(v * 100) / 100).toString();
const r1 = (v: number) => (Math.round(v * 10) / 10).toString();
const G = 9.81;
const glassMat = () => new THREE.MeshPhysicalMaterial({ color: 0xdff1ff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private turns: number, private radius: number) {
    super();
  }
  getPoint(u: number, t = new THREE.Vector3()) {
    const a = u * this.turns * Math.PI * 2;
    return t.set(this.radius * Math.cos(a), -u, this.radius * Math.sin(a));
  }
}

/* ═════════════════════ FIZIKA: prujina va yuklar ═════════════════════ */

const WEIGHTS = [
  { id: "w50", m: 0.05, h: 0.16, home: [2.2, 1.3] },
  { id: "w100a", m: 0.1, h: 0.26, home: [3.0, 1.3] },
  { id: "w100b", m: 0.1, h: 0.26, home: [3.8, 1.3] },
  { id: "w200", m: 0.2, h: 0.46, home: [4.6, 1.3] },
] as const;

export const springLab: ProLabDef = {
  key: "spring",
  title: x("Prujina, yuklar va dinamometr: Guk qonuni", "Пружина, борҳо ва динамометр: қонуни Гук", "Пружина, грузы и динамометр: закон Гука"),
  camera: [3.5, 5.2, 9.5],
  target: [0.6, 2.6, 0],
  animated: true,
  params: [
    {
      id: "k",
      label: x("Prujina bikrligi k", "Сахтии пружина k", "Жёсткость пружины k"),
      value: 20,
      options: [
        { value: 10, label: x("Yumshoq — 10 N/m", "Нарм — 10 Н/м") },
        { value: 20, label: x("O'rtacha — 20 N/m", "Миёна — 20 Н/м") },
        { value: 40, label: x("Qattiq — 40 N/m", "Сахт — 40 Н/м") },
      ],
    },
    { id: "c", label: x("Havo qarshiligi (so'nish)", "Муқовимати ҳаво (суст шудан)", "Затухание"), value: 0.05, min: 0, max: 0.5, step: 0.01, unit: "kg/s" },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const TOP = 4.95;
    const L0 = 1.0; // prujinaning erkin uzunligi: 10 sm
    // Shtativ
    const stand = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 1.1), mat(0x334155, { metalness: 0.5 }));
    base.position.set(-1.5, 0.08, 0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.4, 16), mat(0xcbd5e1, { metalness: 0.8, roughness: 0.25 }));
    rod.position.set(-1.9, 2.7, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 12), mat(0xcbd5e1, { metalness: 0.8, roughness: 0.25 }));
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-0.9, TOP + 0.08, 0);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat(0x1f4fa3));
    clamp.position.set(-1.9, TOP + 0.08, 0);
    stand.add(base, rod, arm, clamp);
    ctx.pickable(stand, "stand");
    scene.add(stand);
    // Prujina
    const springMesh = new THREE.Mesh(new THREE.TubeGeometry(new Helix(16, 0.17), 400, 0.022, 8), mat(0x94a3b8, { metalness: 0.9, roughness: 0.2 }));
    springMesh.position.set(0, TOP, 0);
    ctx.pickable(springMesh, "spring");
    scene.add(springMesh);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 20), mat(0x64748b, { metalness: 0.9 }));
    scene.add(hook);
    // Chizg'ich: noldan (erkin uchidan) pastga 35 sm
    const ruler = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 3.8, 0.05),
      new THREE.MeshStandardMaterial({
        map: (() => {
          const c = document.createElement("canvas");
          c.width = 128;
          c.height = 960;
          const g = c.getContext("2d") as CanvasRenderingContext2D;
          g.fillStyle = "#fef9c3";
          g.fillRect(0, 0, 128, 960);
          g.fillStyle = "#0f172a";
          g.font = "bold 26px sans-serif";
          // 3.8 birlik = 38 sm; yuqori 2 sm — zaxira
          for (let cm = -2; cm <= 36; cm++) {
            const y = ((cm + 2) / 38) * 960;
            const w = cm % 5 === 0 ? 50 : 25;
            g.fillRect(0, y - 1, w, 2);
            if (cm % 5 === 0 && cm >= 0) g.fillText(String(cm), 60, y + 9);
          }
          const t = new THREE.CanvasTexture(c);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        })(),
        roughness: 0.7,
      }),
    );
    ruler.position.set(0.55, TOP - L0 - 1.7, -0.05);
    ctx.pickable(ruler, "ruler");
    scene.add(ruler);
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 3), mat(0xdc2626));
    pointer.rotation.z = Math.PI / 2;
    scene.add(pointer);
    const dyno = ctx.label("F = 0 N", { bg: "rgba(14,124,134,0.92)", scale: 0.9 });
    dyno.sprite.position.set(1.7, TOP - 0.3, 0);
    scene.add(dyno.sprite);
    // Yuklar
    const brass = mat(0xc8a24a, { metalness: 0.85, roughness: 0.3 });
    const wObj = new Map<string, THREE.Group>();
    for (const w of WEIGHTS) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, w.h, 28), brass);
      body.position.y = w.h / 2;
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 16), brass);
      loop.position.y = w.h + 0.07;
      const tag = ctx.label(`${w.m * 1000} g`, { scale: 0.45 });
      tag.sprite.position.y = w.h + 0.35;
      g.add(body, loop, tag.sprite);
      ctx.draggable(g, w.id);
      scene.add(g);
      wObj.set(w.id, g);
    }

    let attached: string[] = [];
    const pos = new Map<string, [number, number]>();
    let dragging: string | null = null;
    let xm = 0; // cho'zilish, m (pastga musbat)
    let v = 0;
    let t = 0;
    let lastTop = -1;
    let period = 0;
    const mass = () => attached.reduce((s, id) => s + (WEIGHTS.find((w) => w.id === id)?.m ?? 0), 0);

    const inst: ProInstance = {
      reset() {
        attached = [];
        for (const w of WEIGHTS) pos.set(w.id, [w.home[0], w.home[1]]);
        xm = 0;
        v = 0;
        t = 0;
        lastTop = -1;
        period = 0;
      },
      step(dt, p) {
        const m = Math.max(mass(), 0.005); // bo'sh prujina ham deyarli darhol tinchlanadi
        const a = (m * G - p.k * xm - p.c * v) / m;
        v += a * dt;
        xm += v * dt;
        t += dt;
        // Yuqori nuqtadan o'tish (v manfiydan musbatga) — davrni o'lchash
        if (v > 0 && v - a * dt <= 0 && mass() > 0) {
          if (lastTop > 0) period = t - lastTop;
          lastTop = t;
        }
      },
      frame(p) {
        const L = L0 + xm * 10;
        springMesh.scale.set(1, Math.max(0.3, L), 1);
        const bottom = TOP - Math.max(0.3, L);
        hook.position.set(0, bottom - 0.06, 0);
        pointer.position.set(0.25, bottom, 0);
        let y = bottom - 0.14;
        for (const w of WEIGHTS) {
          const g = wObj.get(w.id) as THREE.Group;
          if (attached.includes(w.id)) {
            y -= w.h + 0.14;
            g.position.set(0, y, 0);
          } else if (w.id !== dragging || pos.has(w.id)) {
            const [px, pz] = pos.get(w.id) ?? [w.home[0], w.home[1]];
            g.position.set(px, dragging === w.id ? 0.4 : 0, pz);
          }
        }
        dyno.set(`F = ${r2(p.k * Math.max(0, xm))} N`);
      },
      dragStart(id) {
        dragging = id;
        if (attached.includes(id)) attached = attached.filter((a) => a !== id);
      },
      drop(id, px, pz) {
        if (Number.isNaN(px)) {
          // Qo'yib yuborildi: ilgak yaqinida bo'lsa — osamiz
          const [qx, qz] = pos.get(id) ?? [0, 0];
          if (Math.hypot(qx, qz) < 1.0 && !attached.includes(id)) attached.push(id);
          if (attached.includes(id)) {
            const home = WEIGHTS.find((w) => w.id === id)?.home ?? [3, 1.3];
            pos.set(id, [home[0], home[1]]);
          }
          dragging = null;
          return;
        }
        pos.set(id, [px, pz]);
      },
      pick(id, p) {
        const w = WEIGHTS.find((q) => q.id === id);
        if (w) return { title: x(`Yuk: ${w.m * 1000} g`, `Бор: ${w.m * 1000} г`), body: x(`Og'irlik kuchi P = m·g = ${w.m} · 9,81 = ${r2(w.m * G)} N. Uni prujina ilgagiga sudrab olib boring.`, `Қувваи вазнинӣ P = m·g = ${w.m} · 9,81 = ${r2(w.m * G)} Н. Онро ба қалмоқи пружина кашида баред.`) };
        if (id === "spring") return { title: x(`Prujina, k = ${p.k} N/m`, `Пружина, k = ${p.k} Н/м`), body: x("Guk qonuni: F = k·x. Bikrlik qancha katta bo'lsa, bir xil yukda cho'zilish shuncha kichik.", "Қонуни Гук: F = k·x. Сахтӣ калонтар бошад, бо бори якхела дарозшавӣ хурдтар аст.") };
        if (id === "ruler") return { title: x("Chizg'ich (sm)", "Ҷадвал (см)"), body: x("Nol — prujina erkin uchining joyi. Qizil ko'rsatkich cho'zilishni ko'rsatadi.", "Сифр — ҷойи нӯги озоди пружина. Нишондиҳандаи сурх дарозшавиро нишон медиҳад.") };
        return { title: x("Shtativ", "Штатив"), body: x("Prujina mahkamlangan tayanch.", "Такягоҳе, ки пружина ба он маҳкам аст.") };
      },
      readout(p) {
        const m = mass();
        const F = m * G;
        const xcm = xm * 100;
        return [
          { label: x("Yuk massasi m", "Массаи бор m"), value: `${Math.round(m * 1000)} g` },
          { label: x("Og'irlik F = mg", "Вазн F = mg"), value: `${r2(F)} N` },
          { label: x("Cho'zilish x", "Дарозшавӣ x"), value: `${r1(xcm)} sm` },
          { label: x("k = F / x", "k = F / x"), value: m > 0 && xcm > 0.5 ? `${r1(F / xm)} N/m` : "—" },
          { label: x("T = 2π√(m/k)", "T = 2π√(m/k)"), value: m > 0 ? `${r2(2 * Math.PI * Math.sqrt(m / p.k))} s` : "—" },
          { label: x("T (o'lchangan)", "T (ченшуда)"), value: period > 0 ? `${r2(period)} s` : "—" },
        ];
      },
      measure(p) {
        const m = mass();
        return { m: Math.round(m * 1000), F: Math.round(m * G * 100) / 100, x: Math.round(xm * 1000) / 10, k: p.k };
      },
      hint() {
        return attached.length ? null : x("Yukni sichqoncha bilan prujina ilgagiga sudrab olib boring, keyin «Boshlash» ni bosing", "Борро бо муш ба қалмоқи пружина кашида баред, баъд «Оғоз»-ро пахш кунед");
      },
    };
    return inst;
  },
};

/* ═════════════════════ KIMYO: titrlash (xavfsiz virtual) ═════════════════════ */

/** Kuchli kislota + kuchli ishqor (HCl + NaOH): pH aralashmadagi ortiqcha H⁺ yoki OH⁻ dan */
export function titrationPH(cA: number, vA: number, cB: number, vB: number) {
  const nA = (cA * vA) / 1000;
  const nB = (cB * vB) / 1000;
  const V = (vA + vB) / 1000;
  const d = nA - nB;
  if (Math.abs(d) < 1e-9) return 7;
  if (d > 0) return Math.max(0, -Math.log10(d / V));
  return Math.min(14, 14 + Math.log10(-d / V));
}
function indicatorColor(kind: number, pH: number): [THREE.Color, number] {
  const c = new THREE.Color();
  if (kind === 0) {
    // Fenolftalein: rangsiz < 8,2; pushti 8,2–10
    const k = THREE.MathUtils.clamp((pH - 8.2) / 1.8, 0, 1);
    return [c.setRGB(1, 1 - 0.75 * k, 1 - 0.35 * k), 0.15 + 0.6 * k];
  }
  if (kind === 1) {
    // Metilzarg'aldog'i: qizil < 3,1; to'q sariq 3,1–4,4; sariq > 4,4
    const k = THREE.MathUtils.clamp((pH - 3.1) / 1.3, 0, 1);
    return [c.setRGB(0.92, 0.2 + 0.6 * k, 0.15 + 0.05 * k), 0.6];
  }
  // Universal indikator: qizil (1) → yashil (7) → binafsha (14)
  const h = pH <= 7 ? (pH / 7) * 0.33 : 0.33 + ((pH - 7) / 7) * 0.45;
  return [c.setHSL(h, 0.8, 0.5), 0.6];
}

export const titrationLab: ProLabDef = {
  key: "titration",
  title: x("Neytrallanish: kislotani ishqor bilan titrlash", "Нейтрализатсия: титронидани кислота бо ишқор", "Нейтрализация: титрование кислоты щёлочью"),
  camera: [3.2, 4.4, 8.5],
  target: [0.4, 2, 0],
  animated: true,
  params: [
    {
      id: "ind",
      label: x("Indikator", "Индикатор", "Индикатор"),
      value: 0,
      options: [
        { value: 0, label: x("Fenolftalein", "Фенолфталеин") },
        { value: 1, label: x("Metilzarg'aldog'i", "Метилоранж") },
        { value: 2, label: x("Universal indikator", "Индикатори универсалӣ") },
      ],
    },
    { id: "cA", label: x("HCl konsentratsiyasi", "Консентратсияи HCl"), value: 0.1, min: 0.05, max: 0.2, step: 0.01, unit: "mol/l" },
    { id: "vA", label: x("HCl hajmi (kolbada)", "Ҳаҷми HCl (дар колба)"), value: 20, min: 10, max: 30, step: 1, unit: "ml" },
    { id: "cB", label: x("NaOH konsentratsiyasi", "Консентратсияи NaOH"), value: 0.1, min: 0.05, max: 0.2, step: 0.01, unit: "mol/l" },
    { id: "rate", label: x("Tomizish tezligi", "Суръати чаккондан"), value: 0.6, min: 0.1, max: 2, step: 0.1, unit: "ml/s" },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    // Shtativ va byuretka (50 ml)
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6.4, 16), mat(0xcbd5e1, { metalness: 0.8, roughness: 0.25 }));
    rod.position.set(-1.4, 3.2, -0.4);
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 1.4), mat(0x334155, { metalness: 0.4 }));
    base.position.set(-0.8, 0.07, -0.2);
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.12), mat(0x1f4fa3));
    clamp.position.set(-0.7, 5.2, -0.2);
    scene.add(rod, base, clamp);
    const BUR_TOP = 6.0;
    const BUR_BOT = 2.4;
    const burette = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, BUR_TOP - BUR_BOT, 24, 1, true), glassMat());
    burette.position.set(0, (BUR_TOP + BUR_BOT) / 2, -0.2);
    ctx.pickable(burette, "burette");
    scene.add(burette);
    const naohMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.75 });
    const naoh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 20), naohMat);
    scene.add(naoh);
    const tap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.07), mat(0xdc2626));
    tap.position.set(0, BUR_BOT - 0.12, -0.2);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 12), glassMat());
    tip.rotation.x = Math.PI;
    tip.position.set(0, BUR_BOT - 0.35, -0.2);
    ctx.pickable(tap, "tap");
    scene.add(tap, tip);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), naohMat);
    scene.add(drop);
    // Magnit aralashtirgich va kolba
    const stirrer = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.4), mat(0xf1f5f9, { roughness: 0.4 }));
    stirrer.position.set(0, 0.15, -0.2);
    scene.add(stirrer);
    const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.75, 1.6, 32, 1, true), glassMat());
    flask.position.set(0, 1.1, -0.2);
    ctx.pickable(flask, "flask");
    scene.add(flask);
    const liquidMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.2 });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 1, 32), liquidMat);
    scene.add(liquid);
    // pH-metr
    const meter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.9), mat(0x1e293b, { roughness: 0.4 }));
    meter.position.set(2.3, 0.25, 0.4);
    ctx.pickable(meter, "meter");
    scene.add(meter);
    const screen = ctx.label("pH 1.00", { bg: "rgba(5,46,22,0.95)", color: "#86efac", scale: 0.6 });
    screen.sprite.position.set(2.3, 0.85, 0.4);
    scene.add(screen.sprite);
    const probe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.2, 10), mat(0x0f172a));
    probe.position.set(0.25, 1.4, -0.1);
    probe.rotation.z = -0.12;
    scene.add(probe);
    // Termometr
    const thermo = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 10), glassMat());
    thermo.position.set(-0.22, 1.45, -0.05);
    thermo.rotation.z = 0.12;
    ctx.pickable(thermo, "thermo");
    scene.add(thermo);
    const mercury = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), mat(0xdc2626));
    scene.add(mercury);
    const tLabel = ctx.label("20.0 °C", { scale: 0.45 });
    tLabel.sprite.position.set(-0.9, 2.7, -0.05);
    scene.add(tLabel.sprite);
    // Reaktiv shishalari (bezak)
    const bottles: [string, number, number][] = [["HCl", 0xfef08a, 3.3], ["NaOH", 0xbfdbfe, 4.1], ["Ind.", 0xfbcfe8, 4.9]];
    for (const [name, col, bx] of bottles) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.8, 20), mat(col, { roughness: 0.3 }));
      b.position.set(bx, 0.4, -1.4);
      const l = ctx.label(name, { scale: 0.4 });
      l.sprite.position.set(bx, 1.05, -1.4);
      scene.add(b, l.sprite);
    }

    let vB = 0;
    let dropY = 0;
    const state = (p: Params) => {
      const pH = titrationPH(p.cA, p.vA, p.cB, vB);
      const n = Math.min((p.cA * p.vA) / 1000, (p.cB * vB) / 1000);
      const T = 20 + (57100 * n) / ((p.vA + vB) * 4.18); // neytrallanish issiqligi 57,1 kJ/mol
      return { pH, T, vEq: (p.cA * p.vA) / p.cB };
    };
    return {
      reset() {
        vB = 0;
        dropY = 0;
      },
      step(dt, p) {
        if (vB < 50) vB = Math.min(50, vB + p.rate * dt);
        dropY = (dropY + dt * 3) % 1;
      },
      frame(p) {
        const s = state(p);
        const frac = Math.max(0, 1 - vB / 50);
        const hBur = (BUR_TOP - BUR_BOT - 0.2) * frac;
        naoh.scale.set(1, Math.max(0.001, hBur), 1);
        naoh.position.set(0, BUR_BOT + 0.1 + hBur / 2, -0.2);
        const vol = p.vA + vB;
        const h = 0.25 + (vol / 80) * 1.1;
        liquid.scale.set(1, h, 1);
        liquid.position.set(0, 0.3 + h / 2, -0.2);
        const [col, op] = indicatorColor(p.ind, s.pH);
        liquidMat.color.copy(col);
        liquidMat.opacity = op;
        drop.visible = vB > 0 && vB < 50 && dropY > 0;
        drop.position.set(0, BUR_BOT - 0.55 - dropY * (BUR_BOT - 0.55 - (0.3 + h)), -0.2);
        tap.rotation.y = drop.visible ? Math.PI / 2 : 0;
        const tH = THREE.MathUtils.clamp((s.T - 15) / 15, 0.05, 1) * 1.8;
        mercury.scale.set(1, tH, 1);
        mercury.position.set(-0.22 - Math.sin(0.12) * 0, 0.4 + tH / 2, -0.05);
        screen.set(`pH ${s.pH.toFixed(2)}`);
        tLabel.set(`${s.T.toFixed(1)} °C`);
      },
      pick(id, p) {
        const s = state(p);
        const map: Record<string, PickInfo> = {
          burette: { title: x(`Byuretka: NaOH, ${p.cB} mol/l`, `Бюретка: NaOH, ${p.cB} мол/л`), body: x(`Qo'shildi: ${r2(vB)} ml. Ekvivalent nuqta: ${r2(s.vEq)} ml (c₁V₁ = c₂V₂).`, `Илова шуд: ${r2(vB)} мл. Нуқтаи эквивалентӣ: ${r2(s.vEq)} мл (c₁V₁ = c₂V₂).`) },
          tap: { title: x("Jo'mrak", "Ҷӯмрак"), body: x("«Boshlash» — jo'mrak ochiladi, ishqor tomchilab tushadi. «To'xtatish» — yopiladi.", "«Оғоз» — ҷӯмрак кушода мешавад, ишқор қатра-қатра мечакад. «Боздоштан» — пӯшида мешавад.") },
          flask: { title: x(`Kolba: HCl ${p.vA} ml + indikator`, `Колба: HCl ${p.vA} мл + индикатор`), body: x("HCl + NaOH → NaCl + H₂O. H⁺ + OH⁻ → H₂O. Ekvivalent nuqtada eritma neytral (pH = 7).", "HCl + NaOH → NaCl + H₂O. H⁺ + OH⁻ → H₂O. Дар нуқтаи эквивалентӣ маҳлул нейтрал аст (pH = 7).") },
          meter: { title: x("pH-metr", "pH-метр"), body: x("pH = −lg[H⁺]. pH < 7 — kislotali, 7 — neytral, > 7 — ishqoriy.", "pH = −lg[H⁺]. pH < 7 — туршӣ, 7 — нейтрал, > 7 — ишқорӣ.") },
          thermo: { title: x("Termometr", "Термометр"), body: x("Neytrallanish ekzotermik: 1 mol suv hosil bo'lganda ≈ 57,1 kJ issiqlik ajraladi — eritma biroz isiydi.", "Нейтрализатсия экзотермӣ аст: ҳангоми ҳосил шудани 1 мол об ≈ 57,1 кҶ гармӣ ҷудо мешавад — маҳлул каме гарм мешавад.") },
        };
        return map[id] ?? null;
      },
      readout(p) {
        const s = state(p);
        return [
          { label: x("Qo'shilgan NaOH", "NaOH-и иловашуда"), value: `${r2(vB)} ml` },
          { label: x("pH", "pH"), value: s.pH.toFixed(2) },
          { label: x("Muhit", "Муҳит"), value: s.pH < 6.5 ? "kislotali / туршӣ" : s.pH > 7.5 ? "ishqoriy / ишқорӣ" : "neytral / нейтрал" },
          { label: x("Harorat", "Ҳарорат"), value: `${s.T.toFixed(1)} °C` },
          { label: x("Ekvivalent nuqta", "Нуқтаи эквивалентӣ"), value: `${r2(s.vEq)} ml` },
        ];
      },
      measure(p) {
        const s = state(p);
        return { V: Math.round(vB * 10) / 10, pH: Math.round(s.pH * 100) / 100, T: Math.round(s.T * 10) / 10 };
      },
      hint() {
        return vB === 0 ? x("«Boshlash» ni bosing — byuretka jo'mragi ochiladi. Rang o'zgarishini kuzating.", "«Оғоз»-ро пахш кунед — ҷӯмраки бюретка кушода мешавад. Тағйири рангро мушоҳида кунед.") : null;
      },
    };
  },
};

/* ═════════════════════ BIOLOGIYA: hujayra ═════════════════════ */

const ORG: Record<string, { name: Tx; body: Tx; plantOnly?: boolean }> = {
  membrane: { name: x("Hujayra membranasi", "Мембранаи ҳуҷайра"), body: x("Hujayrani o'rab turadi, moddalarning kirishi va chiqishini boshqaradi.", "Ҳуҷайраро иҳота мекунад, даромад ва баромади моддаҳоро идора мекунад.") },
  nucleus: { name: x("Yadro", "Ядро"), body: x("Irsiy axborot (DNK) saqlanadi va hujayra faoliyatini boshqaradi. Ichida yadrocha bor.", "Иттилооти ирсӣ (ДНК) нигоҳ дошта мешавад ва фаъолияти ҳуҷайраро идора мекунад. Дар дохилаш ядрочка ҳаст.") },
  mito: { name: x("Mitoxondriya", "Митохондрия"), body: x("Nafas olish jarayonida energiya (ATF) hosil qiladi — «energiya stansiyasi».", "Дар раванди нафаскашӣ энергия (АТФ) ҳосил мекунад — «нерӯгоҳ».") },
  er: { name: x("Endoplazmatik to'r", "Шабакаи эндоплазматикӣ"), body: x("Oqsil va yog'larni sintez qiladi va tashiydi. Ribosomalar uning ustida joylashadi.", "Сафедаҳо ва равғанҳоро синтез ва интиқол медиҳад. Рибосомаҳо дар болои он ҷойгиранд.") },
  golgi: { name: x("Golji apparati", "Дастгоҳи Голҷи"), body: x("Moddalarni saralaydi, qadoqlaydi va hujayradan chiqaradi.", "Моддаҳоро ҷудо, бастабандӣ ва аз ҳуҷайра хориҷ мекунад.") },
  lyso: { name: x("Lizosoma", "Лизосома"), body: x("Fermentlar yordamida keraksiz moddalarni parchalaydi.", "Бо ёрии ферментҳо моддаҳои нолозимро тақсим мекунад.") },
  ribo: { name: x("Ribosomalar", "Рибосомаҳо"), body: x("Oqsil sintez qiladigan mayda donachalar.", "Донаҳои хурде, ки сафеда синтез мекунанд.") },
  chloro: { name: x("Xloroplast", "Хлоропласт"), body: x("Fotosintez: yorug'lik energiyasi hisobiga CO₂ va suvdan glyukoza hosil qiladi. Faqat o'simlikda.", "Фотосинтез: аз ҳисоби энергияи рӯшноӣ аз CO₂ ва об глюкоза ҳосил мекунад. Танҳо дар растанӣ."), plantOnly: true },
  vacuole: { name: x("Markaziy vakuola", "Вакуолаи марказӣ"), body: x("Hujayra shirasini saqlaydi va hujayra shaklini ushlab turadi. O'simlikda katta.", "Шираи ҳуҷайраро нигоҳ медорад ва шакли ҳуҷайраро нигоҳ медорад. Дар растанӣ калон аст."), plantOnly: true },
  wall: { name: x("Hujayra devori", "Девори ҳуҷайра"), body: x("Sellyulozadan iborat mustahkam qobiq. Faqat o'simlikda.", "Пӯсти мустаҳками селлюлозагӣ. Танҳо дар растанӣ."), plantOnly: true },
};

export const cellLab: ProLabDef = {
  key: "cell",
  title: x("Hujayraning 3D modeli", "Модели 3D-и ҳуҷайра", "3D-модель клетки"),
  camera: [0.5, 4.2, 8.5],
  target: [0, 2.5, 0],
  params: [
    { id: "type", label: x("Hujayra", "Ҳуҷайра", "Клетка"), value: 0, options: [{ value: 0, label: x("Hayvon hujayrasi", "Ҳуҷайраи ҳайвон") }, { value: 1, label: x("O'simlik hujayrasi", "Ҳуҷайраи растанӣ") }] },
    { id: "cut", label: x("Kesim (ichini ko'rish)", "Буриш (дидани дарун)", "Разрез"), value: 0.5, min: 0, max: 1, step: 0.05 },
    { id: "mode", label: x("Rejim", "Реҷа", "Режим"), value: 0, options: [{ value: 0, label: x("O'rganish", "Омӯзиш") }, { value: 1, label: x("Toping (o'yin)", "Ёбед (бозӣ)") }] },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const C = new THREE.Vector3(0, 2.6, 0);
    // Golografik proyektor
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.25, 48), mat(0xe2e8f0, { metalness: 0.4, roughness: 0.3 }));
    pad.position.y = 0.125;
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.02, 48), new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
    glow.position.y = 0.26;
    scene.add(pad, glow);
    const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    const groups = new Map<string, THREE.Group>();
    const mats = new Map<string, THREE.MeshStandardMaterial[]>();
    const root = new THREE.Group();
    root.position.copy(C);
    scene.add(root);
    const part = (id: string, color: number, opts: THREE.MeshStandardMaterialParameters = {}) => {
      const m = mat(color, opts);
      (mats.get(id) ?? mats.set(id, []).get(id) as THREE.MeshStandardMaterial[]).push(m);
      let g = groups.get(id);
      if (!g) {
        g = new THREE.Group();
        groups.set(id, g);
        root.add(g);
      }
      return { m, g };
    };
    const add = (id: string, geo: THREE.BufferGeometry, color: number, opts: THREE.MeshStandardMaterialParameters = {}, p: [number, number, number] = [0, 0, 0], rot?: [number, number, number]) => {
      const { m, g } = part(id, color, opts);
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(...p);
      if (rot) mesh.rotation.set(...rot);
      g.add(mesh);
      return mesh;
    };
    // Membrana va devor (kesiladi)
    add("membrane", new THREE.SphereGeometry(2, 48, 32), 0xf9a8d4, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, clippingPlanes: [clip], depthWrite: false }).scale.set(1.25, 0.8, 1);
    add("wall", new THREE.BoxGeometry(5.3, 3.5, 4.3, 4, 4, 4), 0x65a30d, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, clippingPlanes: [clip], depthWrite: false });
    // Yadro
    add("nucleus", new THREE.SphereGeometry(0.62, 32, 24), 0x7c3aed, { roughness: 0.4 }, undefined);
    add("nucleus", new THREE.SphereGeometry(0.24, 20, 16), 0x4c1d95, {}).position.set(0.15, 0.12, 0.42);
    // Mitoxondriyalar
    for (const [i, p] of ([[1.4, 0.4, 0.4], [-1.3, -0.3, 0.6], [0.7, -0.7, -0.5], [-0.6, 0.7, -0.8]] as [number, number, number][]).entries()) add("mito", new THREE.CapsuleGeometry(0.16, 0.42, 6, 12), 0xf97316, { roughness: 0.5 }, p, [0.3 * i, i, Math.PI / 2]);
    // Endoplazmatik to'r — yadro atrofidagi halqalar
    for (let i = 0; i < 3; i++) add("er", new THREE.TorusGeometry(0.85 + i * 0.16, 0.035, 8, 48, Math.PI * 1.2), 0x60a5fa, {}, [0, 0, 0], [Math.PI / 2, 0, i * 0.5]);
    // Golji — egilgan disklar to'plami
    for (let i = 0; i < 4; i++) add("golgi", new THREE.TorusGeometry(0.4 - i * 0.04, 0.05, 8, 24, Math.PI), 0xfacc15, {}, [-1.25, 0.55 + i * 0.12, -0.2], [Math.PI / 2, 0, 0]);
    // Lizosomalar
    for (const p of [[1.1, 0.8, -0.6], [-1.6, 0.1, -0.4], [0.3, -0.8, 0.9]] as [number, number, number][]) add("lyso", new THREE.SphereGeometry(0.13, 16, 12), 0x334155, {}, p);
    // Ribosomalar
    const rpts: number[] = [];
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.9 + Math.random() * 1.2;
      rpts.push(Math.cos(a) * r, (Math.random() - 0.5) * 1.6, Math.sin(a) * r * 0.8);
    }
    const ribo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 6, 4), part("ribo", 0x1e3a8a).m, 90);
    for (let i = 0; i < 90; i++) ribo.setMatrixAt(i, new THREE.Matrix4().makeTranslation(rpts[i * 3], rpts[i * 3 + 1], rpts[i * 3 + 2]));
    (groups.get("ribo") as THREE.Group).add(ribo);
    // O'simlikka xos: xloroplastlar va markaziy vakuola
    for (const [i, p] of ([[1.6, -0.6, -0.6], [-1.7, 0.6, 0.5], [1.2, 0.9, 0.9], [-0.9, -0.9, -1.0], [0.4, 1.1, -1.2]] as [number, number, number][]).entries()) {
      const c = add("chloro", new THREE.SphereGeometry(0.3, 24, 16), 0x16a34a, { roughness: 0.5 }, p, [0, i, 0.4]);
      c.scale.set(1.4, 0.6, 0.8);
    }
    add("vacuole", new THREE.SphereGeometry(1, 32, 24), 0x38bdf8, { transparent: true, opacity: 0.45 }, [0.9, -0.1, -0.2]).scale.set(1.2, 0.9, 1);
    for (const [id, g] of groups) ctx.pickable(g, id);

    let selected: string | null = null;
    let target: string | null = null;
    let score = 0;
    let wrong = 0;
    let lastMode = 0;
    let lastType = -1;
    const present = (p: Params) => Object.keys(ORG).filter((k) => p.type === 1 || !ORG[k].plantOnly).filter((k) => k !== "wall" || p.type === 1);
    const newTarget = (p: Params) => {
      const list = present(p).filter((k) => k !== target);
      target = list[Math.floor(Math.random() * list.length)];
    };
    return {
      reset(p) {
        selected = null;
        score = 0;
        wrong = 0;
        target = null;
        if (p.mode === 1) newTarget(p);
      },
      frame(p, time) {
        if (p.mode !== lastMode || p.type !== lastType) {
          lastMode = p.mode;
          lastType = p.type;
          if (p.mode === 1) newTarget(p);
          else target = null;
        }
        const plant = p.type === 1;
        for (const id of ["chloro", "vacuole", "wall"]) (groups.get(id) as THREE.Group).visible = plant;
        (groups.get("membrane") as THREE.Group).scale.setScalar(plant ? 1.02 : 1);
        // Kesim: z o'qi bo'yicha oldingi qismini olib tashlaymiz
        clip.constant = C.z + 2.2 - p.cut * 2.4;
        for (const [id, ms] of mats) for (const m of ms) m.emissive.setHex(id === selected ? 0x444444 + Math.round((Math.sin(time * 6) + 1) * 30) * 0x010101 : 0x000000);
        root.rotation.y = Math.sin(time * 0.15) * 0.15;
      },
      pick(id, p) {
        selected = id;
        const o = ORG[id];
        if (!o) return null;
        if (p.mode === 1 && target) {
          if (id === target) {
            score += 1;
            newTarget(p);
            return { title: x(`✓ To'g'ri: ${o.name.uz}`, `✓ Дуруст: ${o.name.tg}`), body: o.body };
          }
          wrong += 1;
          return { title: x(`✗ Bu — ${o.name.uz}`, `✗ Ин — ${o.name.tg}`), body: x(`Qidirilayotgan: ${ORG[target].name.uz}. Qayta urinib ko'ring.`, `Ҷустуҷӯ мешавад: ${ORG[target].name.tg}. Боз кӯшиш кунед.`) };
        }
        return { title: o.name, body: o.body };
      },
      readout(p) {
        return [
          { label: x("Hujayra", "Ҳуҷайра"), value: p.type === 1 ? "o'simlik / растанӣ" : "hayvon / ҳайвон" },
          { label: x("Organoidlar", "Органоидҳо"), value: String(present(p).length) },
          { label: x("To'g'ri topildi", "Дуруст ёфт"), value: String(score) },
          { label: x("Xato", "Хато"), value: String(wrong) },
        ];
      },
      measure(p) {
        return { type: p.type, organoids: present(p).length, score, wrong };
      },
      hint(p) {
        if (p.mode === 1 && target) return x(`Toping: ${ORG[target].name.uz}`, `Ёбед: ${ORG[target].name.tg}`, `Найдите: ${ORG[target].name.uz}`);
        return null;
      },
    };
  },
};

/* ═════════════════════ GEOGRAFIYA: Yerning ichki qatlamlari ═════════════════════ */

/** Chegaralar (chuqurlik, km) — PREM modeli bo'yicha yaxlitlangan qiymatlar */
const EARTH_R = 6371;
const LAYERS = [
  { id: "crust", top: 0, bottom: 35, color: 0x8b5a2b, name: x("Yer qobig'i", "Пӯсти Замин"), state: x("qattiq", "сахт"), comp: x("granit, bazalt (kremniy, alyuminiy)", "гранит, базалт (силитсий, алюминий)") },
  { id: "mantle", top: 35, bottom: 2891, color: 0xea580c, name: x("Mantiya", "Мантия"), state: x("qattiq, lekin juda sekin oqadi (plastik)", "сахт, вале хеле оҳиста ҷорӣ мешавад (пластикӣ)"), comp: x("silikatlar: magniy, temir", "силикатҳо: магний, оҳан") },
  { id: "outer", top: 2891, bottom: 5150, color: 0xfacc15, name: x("Tashqi yadro", "Ядрои берунӣ"), state: x("suyuq", "моеъ"), comp: x("temir, nikel", "оҳан, никел") },
  { id: "inner", top: 5150, bottom: 6371, color: 0xfef3c7, name: x("Ichki yadro", "Ядрои дохилӣ"), state: x("qattiq (ulkan bosim tufayli)", "сахт (аз фишори бузург)"), comp: x("temir, nikel", "оҳан, никел") },
] as const;
/** Taxminiy harorat (°C) va bosim (GPa) — chuqurlik bo'yicha chiziqli interpolyatsiya */
const PROFILE: [number, number, number][] = [[0, 15, 0], [35, 500, 1], [660, 1600, 24], [2891, 3700, 136], [5150, 5000, 330], [6371, 5400, 364]];
function profile(d: number) {
  for (let i = 1; i < PROFILE.length; i++) {
    const [d1, t1, p1] = PROFILE[i];
    const [d0, t0, p0] = PROFILE[i - 1];
    if (d <= d1) {
      const k = (d - d0) / (d1 - d0);
      return { T: t0 + k * (t1 - t0), P: p0 + k * (p1 - p0) };
    }
  }
  return { T: 5400, P: 364 };
}
const layerAt = (d: number) => LAYERS.find((l) => d >= l.top && d <= l.bottom) ?? LAYERS[3];

export const earthLab: ProLabDef = {
  key: "earth",
  title: x("Yerning ichki tuzilishi", "Сохти дохилии Замин", "Внутреннее строение Земли"),
  camera: [2.5, 4.2, 9],
  target: [0, 2.7, 0],
  params: [
    { id: "wedge", label: x("Kesim burchagi", "Кунҷи буриш", "Угол разреза"), value: 90, min: 0, max: 170, step: 5, unit: "°" },
    { id: "depth", label: x("Zond chuqurligi", "Чуқурии зонд", "Глубина зонда"), value: 1000, min: 0, max: 6371, step: 10, unit: "km" },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const C = new THREE.Vector3(0, 2.7, 0);
    const R = 2.0;
    // Qobiq ko'rinishi uchun 4 marta qalinlashtirilgan (haqiqiy nisbat ~0,5% — ko'zga ko'rinmaydi)
    const rOf = (d: number) => {
      const crustVis = 0.02 * 4;
      if (d <= 35) return R - (d / 35) * crustVis;
      const rReal = (EARTH_R - d) / (EARTH_R - 35);
      return (R - crustVis) * rReal;
    };
    // Globus tagligi
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.25, 40), mat(0x1f4fa3, { metalness: 0.3 }));
    base.position.y = 0.125;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), mat(0x94a3b8, { metalness: 0.8 }));
    stem.position.y = 0.45;
    scene.add(base, stem);
    // Yer yuzasi teksturasi (sxematik materiklar)
    const tex = (() => {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 512;
      const g = c.getContext("2d") as CanvasRenderingContext2D;
      g.fillStyle = "#1d6fb8";
      g.fillRect(0, 0, 1024, 512);
      let s = 7;
      const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 26; i++) {
        const cx = rnd() * 1024, cy = 90 + rnd() * 330, rr = 30 + rnd() * 80;
        g.fillStyle = rnd() > 0.4 ? "#4d7c0f" : "#a16207";
        g.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.3) g.lineTo(cx + Math.cos(a) * rr * (0.6 + rnd() * 0.6), cy + Math.sin(a) * rr * (0.5 + rnd() * 0.5));
        g.fill();
      }
      g.fillStyle = "#f1f5f9";
      g.fillRect(0, 0, 1024, 28);
      g.fillRect(0, 484, 1024, 28);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const pA = new THREE.Plane();
    const pB = new THREE.Plane();
    const clipOpts = { clippingPlanes: [pA, pB], clipIntersection: true, side: THREE.DoubleSide };
    const shells = new THREE.Group();
    shells.position.copy(C);
    scene.add(shells);
    const faces = new THREE.Group();
    faces.position.copy(C);
    scene.add(faces);
    for (const l of LAYERS) {
      const rTop = rOf(l.top);
      const rBot = l.bottom >= EARTH_R ? 0 : rOf(l.bottom);
      const sph = new THREE.Mesh(new THREE.SphereGeometry(rTop, 64, 40), l.id === "crust" ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, ...clipOpts }) : mat(l.color, { roughness: 0.7, ...clipOpts }));
      sph.userData.layer = l.id;
      shells.add(sph);
      ctx.pickable(sph, l.id);
      // Kesim yuzalari: ikki tekislikda yarim halqalar
      for (const side of [0, 1]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(rBot, rTop, 64, 1, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: l.color, side: THREE.DoubleSide, roughness: 0.8 }));
        ring.userData = { side };
        faces.add(ring);
        ctx.pickable(ring, l.id);
      }
    }
    const probe = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), mat(0x22d3ee, { emissive: 0x22d3ee, emissiveIntensity: 0.8 }));
    scene.add(probe);
    const probeLabel = ctx.label("", { scale: 0.55 });
    scene.add(probeLabel.sprite);
    let lastWedge = -1;

    return {
      reset() {
        lastWedge = -1;
      },
      frame(p) {
        const th = THREE.MathUtils.degToRad(p.wedge);
        if (p.wedge !== lastWedge) {
          lastWedge = p.wedge;
          const f0 = -th / 2;
          const f1 = th / 2;
          // Kesilgan sektor kameraga qaragan (+z) tomonda: f0..f1 orasidagi nuqtalar olib tashlanadi
          pA.setFromNormalAndCoplanarPoint(new THREE.Vector3(-Math.cos(f0), 0, Math.sin(f0)), C);
          pB.setFromNormalAndCoplanarPoint(new THREE.Vector3(Math.cos(f1), 0, -Math.sin(f1)), C);
          for (const ring of faces.children) {
            const f = ring.userData.side === 0 ? f0 : f1;
            ring.rotation.set(0, f - Math.PI / 2, 0);
            ring.visible = p.wedge > 0;
          }
          if (p.wedge === 0) {
            // Kesim yo'q: tekisliklar hamma nuqtani "musbat" tomonda qoldiradi — hech narsa kesilmaydi
            pA.set(new THREE.Vector3(0, -1, 0), 100);
            pB.set(new THREE.Vector3(0, -1, 0), 100);
          }
        }
        // Zond: birinchi kesim yuzasida, ekvator bo'ylab
        const f0 = -th / 2;
        const r = rOf(Math.min(p.depth, EARTH_R - 1));
        const dir = new THREE.Vector3(Math.sin(f0), 0, Math.cos(f0));
        probe.position.copy(C).addScaledVector(dir, r).add(new THREE.Vector3(0, 0, 0.01));
        probe.visible = p.wedge > 0;
        probeLabel.sprite.position.copy(probe.position).add(new THREE.Vector3(0, 0.45, 0.2));
        probeLabel.sprite.visible = probe.visible;
        probeLabel.set(`${p.depth} km`);
      },
      pick(id) {
        const l = LAYERS.find((q) => q.id === id);
        if (!l) return null;
        const mid = profile((l.top + l.bottom) / 2);
        return {
          title: l.name,
          body: x(
            `Chuqurligi ${l.top}–${l.bottom} km (qalinligi ${l.bottom - l.top} km). Holati: ${l.state.uz}. Tarkibi: ${l.comp.uz}. O'rtacha harorat ≈ ${Math.round(mid.T)} °C.${l.id === "crust" ? " Qobiq ko'rinish uchun kattalashtirilgan." : ""}`,
            `Чуқурӣ ${l.top}–${l.bottom} км (ғафсӣ ${l.bottom - l.top} км). Ҳолат: ${l.state.tg}. Таркиб: ${l.comp.tg}. Ҳарорати миёна ≈ ${Math.round(mid.T)} °C.${l.id === "crust" ? " Пӯст барои намоиш калон карда шудааст." : ""}`,
          ),
        };
      },
      readout(p) {
        const l = layerAt(p.depth);
        const pr = profile(p.depth);
        return [
          { label: x("Chuqurlik", "Чуқурӣ"), value: `${p.depth} km` },
          { label: x("Qatlam", "Қабат"), value: l.name.uz + " / " + l.name.tg },
          { label: x("Harorat ≈", "Ҳарорат ≈"), value: `${Math.round(pr.T)} °C` },
          { label: x("Bosim ≈", "Фишор ≈"), value: `${Math.round(pr.P)} GPa` },
          { label: x("Holati", "Ҳолат"), value: l.state.uz },
        ];
      },
      measure(p) {
        const pr = profile(p.depth);
        return { d: p.depth, T: Math.round(pr.T), P: Math.round(pr.P) };
      },
    };
  },
};

/* ═════════════════════ MATEMATIKA: 3D koordinatalar va jismlar ═════════════════════ */

const SHAPES = [x("To'g'ri burchakli parallelepiped", "Параллелепипеди росткунҷа"), x("Silindr", "Силиндр"), x("Konus", "Конус"), x("Shar", "Кура"), x("To'rtburchakli piramida", "Пирамидаи чоркунҷа")];
export function solidCalc(k: number, p: Params) {
  const { a, b, c, r, h } = p;
  const P = Math.PI;
  if (k === 0) return { V: a * b * c, S: 2 * (a * b + b * c + a * c), d: Math.sqrt(a * a + b * b + c * c) };
  if (k === 1) return { V: P * r * r * h, S: 2 * P * r * (r + h), d: Math.sqrt(4 * r * r + h * h) };
  if (k === 2) {
    const l = Math.sqrt(r * r + h * h);
    return { V: (P * r * r * h) / 3, S: P * r * (r + l), d: l };
  }
  if (k === 3) return { V: (4 / 3) * P * r ** 3, S: 4 * P * r * r, d: 2 * r };
  const ap = Math.sqrt(h * h + (a / 2) ** 2);
  return { V: (a * a * h) / 3, S: a * a + 2 * a * ap, d: ap };
}

export const geometryLab: ProLabDef = {
  key: "geometry",
  title: x("3D koordinatalar va fazoviy jismlar", "Координатаҳои 3D ва ҷисмҳои фазоӣ", "3D-координаты и тела"),
  camera: [7, 6.5, 8],
  target: [1.5, 1.2, 1],
  params: [
    { id: "kind", label: x("Jism", "Ҷисм", "Тело"), value: 0, options: SHAPES.map((s, i) => ({ value: i, label: s })) },
    { id: "a", label: x("a (sm) — x o'qi", "a (см) — тири x"), value: 3, min: 1, max: 5, step: 0.5 },
    { id: "b", label: x("b (sm) — z o'qi", "b (см) — тири z"), value: 2, min: 1, max: 5, step: 0.5 },
    { id: "c", label: x("c (sm) — y o'qi", "c (см) — тири y"), value: 2, min: 1, max: 5, step: 0.5 },
    { id: "r", label: x("Radius r (sm)", "Радиус r (см)"), value: 1.5, min: 0.5, max: 2.5, step: 0.25 },
    { id: "h", label: x("Balandlik h (sm)", "Баландӣ h (см)"), value: 3, min: 1, max: 5, step: 0.5 },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const Y0 = 0.02;
    const grid = new THREE.GridHelper(12, 12, 0x93c5fd, 0xdbeafe);
    grid.position.y = Y0;
    scene.add(grid);
    const axis = (dir: THREE.Vector3, color: number, name: string) => {
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, Y0, 0), 5.5, color, 0.3, 0.15);
      scene.add(arrow);
      const l = ctx.label(name, { bg: `#${color.toString(16).padStart(6, "0")}`, scale: 0.35 });
      l.sprite.position.copy(dir.clone().multiplyScalar(5.9)).add(new THREE.Vector3(0, Y0, 0));
      scene.add(l.sprite);
      for (let i = 1; i <= 5; i++) {
        const t = ctx.label(String(i), { bg: "rgba(255,255,255,0.9)", color: "#0f172a", scale: 0.22 });
        t.sprite.position.copy(dir.clone().multiplyScalar(i)).add(new THREE.Vector3(0, Y0 + 0.15, 0));
        scene.add(t.sprite);
      }
    };
    axis(new THREE.Vector3(1, 0, 0), 0xdc2626, "x");
    axis(new THREE.Vector3(0, 1, 0), 0x16a34a, "y");
    axis(new THREE.Vector3(0, 0, 1), 0x2563eb, "z");
    const solidMat = mat(0x0e7c86, { transparent: true, opacity: 0.55, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false });
    let holder = new THREE.Group();
    scene.add(holder);
    const labels: ReturnType<ProContext["label"]>[] = [];
    let key = "";
    const rebuild = (p: Params) => {
      scene.remove(holder);
      holder.traverse((c) => (c as THREE.Mesh).geometry?.dispose());
      holder = new THREE.Group();
      holder.position.y = Y0;
      scene.add(holder);
      for (const l of labels.splice(0)) scene.remove(l.sprite);
      const k = Math.round(p.kind);
      let geo: THREE.BufferGeometry;
      const center = new THREE.Vector3();
      if (k === 0) {
        geo = new THREE.BoxGeometry(p.a, p.c, p.b);
        center.set(p.a / 2, p.c / 2, p.b / 2);
      } else if (k === 1) {
        geo = new THREE.CylinderGeometry(p.r, p.r, p.h, 48);
        center.set(p.r, p.h / 2, p.r);
      } else if (k === 2) {
        geo = new THREE.ConeGeometry(p.r, p.h, 48);
        center.set(p.r, p.h / 2, p.r);
      } else if (k === 3) {
        geo = new THREE.SphereGeometry(p.r, 48, 32);
        center.set(p.r, p.r, p.r);
      } else {
        geo = new THREE.ConeGeometry(p.a / Math.SQRT2, p.h, 4, 1);
        geo.rotateY(Math.PI / 4);
        center.set(p.a / 2, p.h / 2, p.a / 2);
      }
      const mesh = new THREE.Mesh(geo, solidMat);
      mesh.position.copy(center);
      holder.add(mesh);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), new THREE.LineBasicMaterial({ color: 0x0a2e33 }));
      edges.position.copy(center);
      holder.add(edges);
      ctx.pickable(mesh, "solid");
      const tag = (text: string, at: THREE.Vector3) => {
        const l = ctx.label(text, { bg: "rgba(31,79,163,0.9)", scale: 0.4 });
        l.sprite.position.copy(at).add(new THREE.Vector3(0, Y0, 0));
        scene.add(l.sprite);
        labels.push(l);
      };
      if (k === 0) {
        // Uchlar koordinatalari va fazoviy diagonal
        for (const [vx, vy, vz] of [[p.a, 0, 0], [0, p.c, 0], [0, 0, p.b], [p.a, p.c, p.b]] as [number, number, number][]) tag(`(${vx}; ${vy}; ${vz})`, new THREE.Vector3(vx, vy + 0.35, vz));
        const diag = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(p.a, p.c, p.b)]), new THREE.LineDashedMaterial({ color: 0xdc2626, dashSize: 0.15, gapSize: 0.08 }));
        diag.computeLineDistances();
        holder.add(diag);
      } else if (k === 3) tag(`r = ${p.r}`, center.clone().add(new THREE.Vector3(0, p.r + 0.4, 0)));
      else tag(k === 4 ? `a = ${p.a}, h = ${p.h}` : `r = ${p.r}, h = ${p.h}`, center.clone().add(new THREE.Vector3(0, p.h / 2 + 0.45, 0)));
    };
    return {
      reset() {
        key = "";
      },
      frame(p) {
        const k = JSON.stringify(p);
        if (k !== key) {
          key = k;
          rebuild(p);
        }
      },
      pick(_id, p) {
        const k = Math.round(p.kind);
        const f = ["V = a·b·c;  S = 2(ab + bc + ac);  d = √(a² + b² + c²)", "V = πr²h;  S = 2πr(r + h)", "V = πr²h / 3;  S = πr(r + l),  l = √(r² + h²)", "V = 4πr³ / 3;  S = 4πr²", "V = a²h / 3;  S = a² + 2a·√(h² + (a/2)²)"][k];
        return { title: SHAPES[k], body: { uz: f, tg: f } };
      },
      readout(p) {
        const k = Math.round(p.kind);
        const s = solidCalc(k, p);
        return [
          { label: x("Hajm V", "Ҳаҷм V"), value: `${r2(s.V)} sm³` },
          { label: x("To'la sirt S", "Сатҳи пурра S"), value: `${r2(s.S)} sm²` },
          { label: k === 0 ? x("Diagonal d", "Диагонал d") : k === 2 ? x("Yasovchi l", "Ҳосилкунанда l") : k === 4 ? x("Apofema", "Апофема") : x("Diametr / kesim", "Диаметр / буриш"), value: `${r2(s.d)} sm` },
        ];
      },
      measure(p) {
        const k = Math.round(p.kind);
        const s = solidCalc(k, p);
        return { a: p.a, b: p.b, c: p.c, r: p.r, h: p.h, V: Math.round(s.V * 100) / 100, S: Math.round(s.S * 100) / 100 };
      },
    };
  },
};

export const PRO_LABS: Record<string, ProLabDef> = { spring: springLab, titration: titrationLab, cell: cellLab, earth: earthLab, geometry: geometryLab, ...EXTRA_PRO_LABS };
