"use client";

/**
 * Yagona 3D laboratoriya vizualizatori (Three.js).
 * Har bir laboratoriya — LABS ro'yxatidagi bitta yozuv: parametrlar (slayder/tanlov),
 * sahnani quruvchi build() va natijalarni hisoblovchi readout().
 * userData.info berilgan obyektni bosish uning tavsifini ochadi.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { L, t, type Lang, type Localized } from "@/lib/i18n";
import { addStudioLight, markShadows, surfaceMaterial } from "./studio";

/* ───────────────────────── Turlar ───────────────────────── */

export type LabCategory = "PHYSICS" | "CHEMISTRY" | "BIOLOGY" | "GEOMETRY" | "ASTRONOMY" | "OTHER";
type Params = Record<string, number>;

interface ParamDef {
  id: string;
  label: Localized;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: number; label: Localized }[];
}

interface Info {
  title: Localized;
  body: Localized;
}

interface LabInstance {
  update?(p: Params, dt: number, time: number): void;
  readout(p: Params): Localized[];
}

interface LabDef {
  key: string;
  category: LabCategory;
  title: Localized;
  camera: [number, number, number];
  target?: [number, number, number];
  /** "space" — qorong'i fon va Quyosh nuri, ambient yorug'lik kuchsiz */
  lighting?: "default" | "space";
  /** false — ostiga taglik qo'yilmaydi (o'z yeri bor laboratoriyalar uchun) */
  stage?: boolean;
  /** Natijalar animatsiya davomida o'zgaradimi (panelni davriy yangilash uchun) */
  live?: boolean;
  params: ParamDef[];
  build(scene: THREE.Scene, lang: Lang): LabInstance;
}

export const CATEGORY_LABELS: Record<LabCategory, Localized> = {
  PHYSICS: { uz: "Fizika", tg: "Физика", ru: "Физика" },
  CHEMISTRY: { uz: "Kimyo", tg: "Химия", ru: "Химия" },
  BIOLOGY: { uz: "Biologiya", tg: "Биология", ru: "Биология" },
  GEOMETRY: { uz: "Matematika", tg: "Математика", ru: "Математика" },
  ASTRONOMY: { uz: "Astronomiya va geografiya", tg: "Астрономия ва география", ru: "Астрономия и география" },
  OTHER: { uz: "Informatika, tarix, tillar", tg: "Информатика, таърих, забонҳо", ru: "Информатика, история, языки" },
};

/* ───────────────────────── Yordamchilar ───────────────────────── */

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const loc = (uz: string, tg: string, ru: string): Localized => ({ uz, tg, ru });
const same = (s: string): Localized => ({ uz: s, tg: s, ru: s });
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const deg = (d: number) => (d * Math.PI) / 180;
const f2 = (x: number) => x.toFixed(2);

function mat(color: number, o: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...o });
}

function sphere(r: number, m: THREE.Material, pos: [number, number, number] = [0, 0, 0], seg = 24) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg * 0.7))), m);
  s.position.set(...pos);
  return s;
}

/** a va b nuqtalarni birlashtiruvchi silindr (bog', sim, suyak) */
function rod(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 12), m);
  setRod(g, a, b);
  return g;
}
function setRod(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(d.length(), 1e-4);
  g.position.copy(a).add(b).multiplyScalar(0.5);
  g.quaternion.setFromUnitVectors(V(0, 1, 0), d.divideScalar(len));
  g.scale.set(1, len, 1);
}

function info<T extends THREE.Object3D>(o: T, title: Localized, body: Localized): T {
  o.userData.info = { title, body } satisfies Info;
  return o;
}
function noPick<T extends THREE.Object3D>(o: T): T {
  o.userData.noPick = true;
  return o;
}

function line(points: THREE.Vector3[], color: number, dashed = false) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const m = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.18, gapSize: 0.12 })
    : new THREE.LineBasicMaterial({ color });
  const l = new THREE.Line(geo, m);
  if (dashed) l.computeLineDistances();
  return noPick(l);
}

function circle(r: number, color: number, y = 0) {
  const pts = Array.from({ length: 129 }, (_, i) => {
    const a = (i / 128) * Math.PI * 2;
    return V(Math.cos(a) * r, y, Math.sin(a) * r);
  });
  return line(pts, color);
}

/** Matnli yorliq (sprite) — har doim kameraga qarab turadi */
function label(text: string, opts: { color?: string; bg?: string; size?: number } = {}) {
  const font = 40;
  const pad = 12;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = font + pad * 2;
  canvas.width = w;
  canvas.height = h;
  if (opts.bg) {
    ctx.fillStyle = opts.bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  ctx.fillStyle = opts.color ?? "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, h / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const s = opts.size ?? 0.45;
  sp.scale.set((w / h) * s, s, 1);
  return noPick(sp);
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!(o instanceof THREE.Sprite) && m.geometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mm of mats) {
      (mm as THREE.MeshStandardMaterial).map?.dispose();
      (mm as THREE.MeshStandardMaterial).bumpMap?.dispose();
      mm.dispose();
    }
  });
}

/** Parametr o'zgarganda qayta quriladigan guruh (atom, molekula, hujayra turi va h.k.) */
function rebuilder(scene: THREE.Scene) {
  let group: THREE.Group | null = null;
  let lastKey = "";
  return (key: string, build: (g: THREE.Group) => void) => {
    if (key === lastKey && group) return group;
    if (group) {
      scene.remove(group);
      disposeObject(group);
    }
    group = new THREE.Group();
    build(group);
    markShadows(group);
    scene.add(group);
    lastKey = key;
    return group;
  };
}

/* ───────────────────────── FIZIKA ───────────────────────── */

const circuitLab: LabDef = {
  key: "circuit",
  category: "PHYSICS",
  title: loc("Elektr zanjiri (Om qonuni)", "Занҷири барқӣ (қонуни Ом)", "Электрическая цепь (закон Ома)"),
  camera: [0, 0.8, 9.5],
  params: [
    { id: "V", label: loc("Kuchlanish U (V)", "Шиддат U (V)", "Напряжение U (В)"), min: 1, max: 12, step: 0.5, value: 6 },
    { id: "R", label: loc("Qarshilik R (Ω)", "Муқовимат R (Ω)", "Сопротивление R (Ом)"), min: 1, max: 20, step: 0.5, value: 6 },
    { id: "on", label: loc("Kalit", "Калид", "Ключ"), value: 1, options: [{ value: 1, label: loc("Yoqilgan", "Фаъол", "Замкнут") }, { value: 0, label: loc("O'chirilgan", "Хомӯш", "Разомкнут") }] },
  ],
  build(scene) {
    const W = 3, H = 1.6;
    const C = [V(-W, -H, 0), V(W, -H, 0), V(W, H, 0), V(-W, H, 0)];
    const wire = mat(0xb87333, { metalness: 0.6 });
    for (let i = 0; i < 4; i++) scene.add(rod(C[i], C[(i + 1) % 4], 0.05, wire));
    const board = noPick(new THREE.Mesh(new THREE.BoxGeometry(2 * W + 1.6, 2 * H + 2, 0.16), surfaceMaterial("wood", 2, 1.2)));
    board.position.set(0, 0.25, -0.5);
    scene.add(board);
    const battery = new THREE.Group();
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.2, 40), mat(0x1f4fa3, { metalness: 0.35, roughness: 0.3 }));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.34, 40), mat(0xc77b30, { metalness: 0.85, roughness: 0.28 }));
    band.position.y = 0.43;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 24), mat(0xd8dee9, { metalness: 0.95, roughness: 0.2 }));
    cap.position.y = 0.65;
    battery.add(cell, band, cap);
    battery.position.set(-W, 0, 0);
    scene.add(info(battery, loc("Tok manbai", "Манбаи ҷараён", "Источник тока"), loc("Zanjirga kuchlanish beradi.", "Ба занҷир шиддат медиҳад.", "Создаёт напряжение в цепи.")));
    const resistor = new THREE.Group();
    const ceramic = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.1, 10, 28), mat(0xd9c39a, { roughness: 0.45 }));
    resistor.add(ceramic);
    [[-0.38, 0x7c3f12], [-0.14, 0x111827], [0.1, 0xdc2626], [0.42, 0xd4af37]].forEach(([y, c]) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.247, 0.247, 0.1, 28), mat(c, { roughness: 0.4 }));
      ring.position.y = y;
      resistor.add(ring);
    });
    resistor.rotation.z = Math.PI / 2;
    resistor.position.set(0, -H, 0);
    scene.add(info(resistor, loc("Rezistor", "Резистор", "Резистор"), loc("Tokka qarshilik ko'rsatadi: R qancha katta bo'lsa, tok shuncha kichik.", "Ба ҷараён муқовимат мекунад: R калонтар — ҷараён хурдтар.", "Оказывает сопротивление току: чем больше R, тем меньше ток.")));
    const bulbMat = mat(0xfff7d1, { emissive: 0xffc400, emissiveIntensity: 0, transparent: true, opacity: 0.5, roughness: 0.06, depthWrite: false });
    const bulb = new THREE.Group();
    bulb.add(sphere(0.55, bulbMat, [0, 0.72, 0], 40));
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 28), mat(0xb8c0cc, { metalness: 0.95, roughness: 0.25 }));
    socket.position.y = 0.1;
    const filamentMat = mat(0x5b4a2a, { emissive: 0xff9a2e, emissiveIntensity: 0 });
    const filament = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 8, 28, Math.PI * 1.4), filamentMat);
    filament.position.y = 0.72;
    filament.rotation.z = -Math.PI * 0.2;
    bulb.add(socket, filament);
    bulb.position.set(0, H, 0);
    const glow = new THREE.PointLight(0xffc266, 0, 9, 1.6);
    glow.position.set(0, H + 0.72, 0.2);
    scene.add(noPick(glow));
    scene.add(info(bulb, loc("Lampochka", "Лампочка", "Лампочка"), loc("Quvvat P = U·I qancha katta bo'lsa, shuncha yorqin yonadi.", "Иқтидор P = U·I калонтар бошад, равшантар месӯзад.", "Чем больше мощность P = U·I, тем ярче горит.")));
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), mat(0x333333));
    lever.geometry.translate(0, 0.45, 0);
    lever.position.set(W, -0.45, 0);
    scene.add(info(lever, loc("Kalit", "Калид", "Ключ"), loc("Zanjirni ochadi va yopadi.", "Занҷирро мекушояд ва мепӯшад.", "Размыкает и замыкает цепь.")));
    const per = 2 * (2 * W + 2 * H);
    const along = (s: number) => {
      let d = (((s % 1) + 1) % 1) * per;
      for (let i = 0; i < 4; i++) {
        const a = C[i], b = C[(i + 1) % 4], l = a.distanceTo(b);
        if (d <= l) return a.clone().lerp(b, d / l);
        d -= l;
      }
      return C[0].clone();
    };
    const dotMat = mat(0x2f80ff, { emissive: 0x2f80ff, emissiveIntensity: 0.6 });
    const dots = Array.from({ length: 26 }, () => {
      const d = noPick(sphere(0.09, dotMat, [0, 0, 0], 8));
      scene.add(d);
      return d;
    });
    let phase = 0;
    const current = (p: Params) => (p.on ? p.V / p.R : 0);
    return {
      update(p, dt) {
        const I = current(p);
        phase += dt * I * 0.04;
        dots.forEach((d, i) => {
          d.position.copy(along(phase + i / dots.length));
          d.visible = Boolean(p.on);
        });
        bulbMat.emissiveIntensity = clamp((p.V * I) / 20, 0, 1.6);
        filamentMat.emissiveIntensity = clamp((p.V * I) / 4, 0, 6);
        glow.intensity = clamp((p.V * I) / 2, 0, 12);
        lever.rotation.z = p.on ? 0 : -0.8;
      },
      readout(p) {
        const I = current(p);
        return [
          same(`I = U / R = ${p.V} / ${p.R} = ${f2(I)} A`),
          loc(`Quvvat: P = U·I = ${(p.V * I).toFixed(1)} W`, `Иқтидор: P = U·I = ${(p.V * I).toFixed(1)} W`, `Мощность: P = U·I = ${(p.V * I).toFixed(1)} Вт`),
          p.on ? loc("Zanjir yopiq — tok o'tmoqda.", "Занҷир пӯшида — ҷараён мегузарад.", "Цепь замкнута — ток идёт.") : loc("Zanjir ochiq — tok yo'q.", "Занҷир кушода — ҷараён нест.", "Цепь разомкнута — тока нет."),
        ];
      },
    };
  },
};

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private turns: number, private len: number, private r: number) {
    super();
  }
  getPoint(u: number, target = new THREE.Vector3()) {
    const a = u * this.turns * Math.PI * 2;
    return target.set(-this.len / 2 + this.len * u, this.r * Math.cos(a), this.r * Math.sin(a));
  }
}

const inductionLab: LabDef = {
  key: "induction",
  category: "PHYSICS",
  title: loc("Faradey: elektromagnit induksiya", "Фарадей: индуксияи электромагнитӣ", "Фарадей: электромагнитная индукция"),
  camera: [0, 1.5, 10],
  target: [0, -0.6, 0],
  live: true,
  params: [
    { id: "speed", label: loc("Magnit tezligi (rad/s)", "Суръати магнит (rad/s)", "Скорость магнита (рад/с)"), min: 0, max: 3, step: 0.1, value: 1.2 },
    { id: "N", label: loc("O'ramlar soni N", "Шумораи печҳо N", "Число витков N"), min: 50, max: 500, step: 50, value: 200 },
    { id: "B", label: loc("Magnit induksiyasi B (T)", "Индуксияи магнитӣ B (T)", "Магнитная индукция B (Тл)"), min: 0.1, max: 1, step: 0.05, value: 0.5 },
  ],
  build(scene) {
    const AREA = 2.5e-3; // g'altak yuzasi, m²
    const AMP = 3.2;
    const coilMat = mat(0xb87333, { metalness: 0.6, emissive: 0xffaa33, emissiveIntensity: 0 });
    const coil = new THREE.Mesh(new THREE.TubeGeometry(new HelixCurve(10, 3, 0.9), 400, 0.05, 8, false), coilMat);
    scene.add(info(coil, loc("G'altak", "Ғалтак", "Катушка"), loc("Magnit oqimi o'zgarganda unda induksion tok hosil bo'ladi.", "Ҳангоми тағйири ҷараёни магнитӣ дар он ҷараёни индуксионӣ пайдо мешавад.", "При изменении магнитного потока в ней возникает индукционный ток.")));
    const magnet = new THREE.Group();
    const north = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.5), mat(0xd43c3c));
    north.position.x = 0.6;
    const south = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.5), mat(0x2d6fd3));
    south.position.x = -0.6;
    const nl = label("N", { size: 0.35 });
    nl.position.set(1, 0.5, 0);
    const sl = label("S", { size: 0.35 });
    sl.position.set(-1, 0.5, 0);
    magnet.add(north, south, nl, sl);
    scene.add(info(magnet, loc("Doimiy magnit", "Магнити доимӣ", "Постоянный магнит"), loc("Magnit g'altakka kirib-chiqqanda oqim o'zgaradi.", "Вақте магнит ба ғалтак медарояду мебарояд, ҷараён тағйир меёбад.", "Когда магнит входит в катушку и выходит, поток меняется.")));
    const gal = new THREE.Group();
    gal.position.set(0, -2.7, 0);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(1, 40, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xf4f1e6, side: THREE.DoubleSide }));
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.03), mat(0xb3261e));
    needle.geometry.translate(0, 0.45, 0.02);
    gal.add(dial, needle);
    scene.add(info(gal, loc("Galvanometr", "Галванометр", "Гальванометр"), loc("Kichik toklarni o'lchaydi; strelka yo'nalishi tok yo'nalishini ko'rsatadi.", "Ҷараёнҳои хурдро чен мекунад; самти ақрабак самти ҷараёнро нишон медиҳад.", "Измеряет малые токи; отклонение стрелки показывает направление тока.")));
    scene.add(rod(V(-1.5, -0.9, 0), V(-0.8, -2.7, 0), 0.03, mat(0x444444)), rod(V(1.5, -0.9, 0), V(0.8, -2.7, 0), 0.03, mat(0x444444)));

    let phase = 0;
    const live = { emf: 0, v: 0, flux: 0 };
    const shape = (x: number) => Math.pow(1 + (x / 0.8) ** 2, -1.5); // Φ(x) / (B·A)
    const dShape = (x: number) => (-3 * (x / 0.8) / 0.8) * Math.pow(1 + (x / 0.8) ** 2, -2.5);
    return {
      update(p, dt) {
        phase += p.speed * dt;
        const x = AMP * Math.sin(phase);
        const dxdt = AMP * p.speed * Math.cos(phase); // sahna birligi = 0,1 m
        magnet.position.x = x;
        live.flux = p.B * AREA * shape(x);
        live.emf = -p.N * p.B * AREA * dShape(x) * dxdt * 10; // d/dx 1/birlik → 1/m (×10)
        live.v = Math.abs(dxdt) * 0.1;
        needle.rotation.z = -clamp(live.emf / 2, -1, 1) * 1.3;
        coilMat.emissiveIntensity = clamp(Math.abs(live.emf) / 2, 0, 1);
      },
      readout() {
        const mv = (live.emf * 1000).toFixed(0);
        return [
          same(`ε = −N·ΔΦ/Δt ≈ ${mv} mV`),
          loc(`Magnit tezligi: ${f2(live.v)} m/s; Φ = ${(live.flux * 1000).toFixed(3)} mWb`, `Суръати магнит: ${f2(live.v)} m/s; Φ = ${(live.flux * 1000).toFixed(3)} mWb`, `Скорость магнита: ${f2(live.v)} м/с; Φ = ${(live.flux * 1000).toFixed(3)} мВб`),
          loc("Magnit to'xtasa, oqim o'zgarmaydi va tok yo'qoladi. Lens qoidasi: induksion tok magnit harakatiga qarshilik qiladi.", "Агар магнит истад, ҷараён тағйир намеёбад ва ҷараёни барқ нест мешавад. Қоидаи Ленс: ҷараёни индуксионӣ ба ҳаракати магнит муқобилат мекунад.", "Если магнит остановить, поток не меняется и ток исчезает. Правило Ленца: индукционный ток препятствует движению магнита."),
        ];
      },
    };
  },
};

const lensLab: LabDef = {
  key: "lens",
  stage: false,
  category: "PHYSICS",
  title: loc("Yig'uvchi linza (optika)", "Линзаи ҷамъкунанда (оптика)", "Собирающая линза (оптика)"),
  camera: [0, 0, 13],
  params: [
    { id: "f", label: loc("Fokus masofasi F (sm)", "Масофаи фокусӣ F (см)", "Фокусное расстояние F (см)"), min: 5, max: 20, step: 1, value: 10 },
    { id: "d", label: loc("Buyumgacha masofa d (sm)", "Масофа то ашё d (см)", "Расстояние до предмета d (см)"), min: 3, max: 50, step: 1, value: 25 },
    { id: "h", label: loc("Buyum balandligi h (sm)", "Баландии ашё h (см)", "Высота предмета h (см)"), min: 1, max: 4, step: 0.5, value: 3 },
  ],
  build(scene) {
    const X = (cm: number) => cm * 0.12;
    const Y = (cm: number) => cm * 0.55;
    const lens = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.45, roughness: 0.1 }));
    lens.scale.set(0.18, 2.6, 2.6);
    scene.add(info(lens, loc("Yig'uvchi linza", "Линзаи ҷамъкунанда", "Собирающая линза"), loc("Parallel nurlarni fokusda yig'adi.", "Нурҳои параллелро дар фокус ҷамъ мекунад.", "Собирает параллельные лучи в фокусе.")));
    scene.add(line([V(-8, 0, 0), V(8, 0, 0)], 0x888888));
    const dyn = rebuilder(scene);
    const calc = (p: Params) => {
      const di = Math.abs(p.d - p.f) < 1e-6 ? Infinity : (p.f * p.d) / (p.d - p.f);
      return { di, m: Number.isFinite(di) ? -di / p.d : Infinity };
    };
    return {
      update(p) {
        dyn(`${p.f}|${p.d}|${p.h}`, (g) => {
          const { di, m } = calc(p);
          for (const s of [-1, 1]) {
            const F = sphere(0.08, mat(0xe8a317), [X(s * p.f), 0, 0]);
            g.add(F);
            const fl = label(s < 0 ? "F" : "F'", { size: 0.3, color: "#e8a317" });
            fl.position.set(X(s * p.f), -0.35, 0);
            g.add(fl);
          }
          const tip = V(X(-p.d), Y(p.h), 0);
          g.add(rod(V(X(-p.d), 0, 0), tip, 0.05, mat(0x1f4fa3)));
          const xEnd = 8;
          // 1) parallel nur → F' orqali
          const a1 = V(0, Y(p.h), 0);
          const dir1 = V(X(p.f), 0, 0).sub(a1).normalize();
          g.add(line([tip, a1, a1.clone().add(dir1.clone().multiplyScalar((xEnd - 0) / dir1.x))], 0xe5484d));
          // 2) markaz orqali to'g'ri nur
          const dir2 = V(0, 0, 0).sub(tip).normalize();
          g.add(line([tip, tip.clone().add(dir2.clone().multiplyScalar((xEnd - tip.x) / dir2.x))], 0x2fae8a));
          // 3) F orqali → linzadan keyin parallel
          if (Math.abs(p.d - p.f) > 1e-6) {
            const y3 = Y((-p.h * p.f) / (p.d - p.f));
            if (Math.abs(y3) < 6) g.add(line([tip, V(0, y3, 0), V(xEnd, y3, 0)], 0x8a5cd6));
          }
          if (Number.isFinite(di) && Math.abs(X(di)) < 11) {
            const virtual = di < 0;
            const imgMat = mat(virtual ? 0x7aa2f0 : 0xd43c3c, { transparent: virtual, opacity: virtual ? 0.55 : 1 });
            const base = V(X(di), 0, 0), top = V(X(di), Y(m * p.h), 0);
            g.add(rod(base, top, 0.05, imgMat));
            if (virtual) {
              // Mavhum tasvir: sindirilgan nurlarning davomi (punktir)
              g.add(line([V(0, Y(p.h), 0), top], 0xe5484d, true), line([tip, top], 0x2fae8a, true));
            }
          }
        });
      },
      readout(p) {
        const { di, m } = calc(p);
        if (!Number.isFinite(di))
          return [loc("d = F: nurlar parallel chiqadi, tasvir hosil bo'lmaydi.", "d = F: нурҳо параллел мебароянд, тасвир ҳосил намешавад.", "d = F: лучи выходят параллельно, изображения нет.")];
        const real = di > 0;
        const big = Math.abs(m) > 1;
        return [
          same(`1/F = 1/d + 1/f  →  f = ${di.toFixed(1)} cm`),
          loc(`Kattalashtirish Γ = ${Math.abs(m).toFixed(2)}`, `Калонкунӣ Γ = ${Math.abs(m).toFixed(2)}`, `Увеличение Γ = ${Math.abs(m).toFixed(2)}`),
          real
            ? loc(`Haqiqiy, teskari, ${big ? "kattalashgan" : "kichraygan"} tasvir`, `Тасвири ҳақиқӣ, чаппа, ${big ? "калоншуда" : "хурдшуда"}`, `Действительное, перевёрнутое, ${big ? "увеличенное" : "уменьшенное"} изображение`)
            : loc("Mavhum, to'g'ri, kattalashgan tasvir (lupa kabi)", "Тасвири мавҳум, рост, калоншуда (мисли лупа)", "Мнимое, прямое, увеличенное изображение (как лупа)"),
        ];
      },
    };
  },
};

const projectileLab: LabDef = {
  key: "projectile",
  stage: false,
  category: "PHYSICS",
  title: loc("Kuch va harakat: otilgan jism", "Қувва ва ҳаракат: ҷисми партофташуда", "Сила и движение: брошенное тело"),
  camera: [0, 2.5, 12],
  target: [0, 1.5, 0],
  params: [
    { id: "v0", label: loc("Boshlang'ich tezlik v₀ (m/s)", "Суръати аввала v₀ (m/s)", "Начальная скорость v₀ (м/с)"), min: 5, max: 30, step: 1, value: 20 },
    { id: "ang", label: loc("Burchak α (°)", "Кунҷ α (°)", "Угол α (°)"), min: 10, max: 80, step: 1, value: 45 },
    { id: "g", label: loc("Sayyora", "Сайёра", "Планета"), value: 9.81, options: [{ value: 9.81, label: loc("Yer 9,81", "Замин 9,81", "Земля 9,81") }, { value: 3.71, label: loc("Mars 3,71", "Миррих 3,71", "Марс 3,71") }, { value: 1.62, label: loc("Oy 1,62", "Моҳ 1,62", "Луна 1,62") }] },
  ],
  build(scene) {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 3), mat(0x6b8f4e));
    ground.position.y = -0.1;
    scene.add(noPick(ground));
    const N = 80;
    const pos = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    scene.add(noPick(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe8a317 }))));
    const ball = sphere(0.22, mat(0xe5484d));
    scene.add(ball);
    let clock = 0;
    const calc = (p: Params) => {
      const a = deg(p.ang);
      return { a, T: (2 * p.v0 * Math.sin(a)) / p.g, R: (p.v0 ** 2 * Math.sin(2 * a)) / p.g, H: (p.v0 ** 2 * Math.sin(a) ** 2) / (2 * p.g) };
    };
    return {
      update(p, dt) {
        const { a, T, R, H } = calc(p);
        const s = 10 / Math.max(R, H * 2, 1), x0 = -5;
        for (let i = 0; i < N; i++) {
          const tt = (T * i) / (N - 1);
          pos[i * 3] = x0 + p.v0 * Math.cos(a) * tt * s;
          pos[i * 3 + 1] = (p.v0 * Math.sin(a) * tt - 0.5 * p.g * tt * tt) * s;
        }
        geo.attributes.position.needsUpdate = true;
        clock = (clock + dt) % 3.4;
        const tt = Math.min(clock / 3, 1) * T;
        ball.position.set(x0 + p.v0 * Math.cos(a) * tt * s, Math.max(0, (p.v0 * Math.sin(a) * tt - 0.5 * p.g * tt * tt) * s) + 0.22, 0);
      },
      readout(p) {
        const { T, R, H } = calc(p);
        return [
          same(`t = 2v₀·sinα / g = ${f2(T)} s`),
          loc(`Uzoqlik L = ${R.toFixed(1)} m; balandlik h = ${H.toFixed(1)} m`, `Масофа L = ${R.toFixed(1)} m; баландӣ h = ${H.toFixed(1)} m`, `Дальность L = ${R.toFixed(1)} м; высота h = ${H.toFixed(1)} м`),
          loc("Havo qarshiligi hisobga olinmagan. 45° da uzoqlik eng katta.", "Муқовимати ҳаво ба назар гирифта нашудааст. Дар 45° масофа калонтарин аст.", "Сопротивление воздуха не учитывается. При 45° дальность наибольшая."),
        ];
      },
    };
  },
};

/* ───────────────────────── KIMYO ───────────────────────── */

const ELEMENTS: { sym: string; name: Localized; n: number }[] = [
  { sym: "H", name: loc("Vodorod", "Гидроген", "Водород"), n: 0 },
  { sym: "He", name: loc("Geliy", "Гелий", "Гелий"), n: 2 },
  { sym: "Li", name: loc("Litiy", "Литий", "Литий"), n: 4 },
  { sym: "Be", name: loc("Berilliy", "Бериллий", "Бериллий"), n: 5 },
  { sym: "B", name: loc("Bor", "Бор", "Бор"), n: 6 },
  { sym: "C", name: loc("Uglerod", "Карбон", "Углерод"), n: 6 },
  { sym: "N", name: loc("Azot", "Нитроген", "Азот"), n: 7 },
  { sym: "O", name: loc("Kislorod", "Оксиген", "Кислород"), n: 8 },
  { sym: "F", name: loc("Ftor", "Фтор", "Фтор"), n: 10 },
  { sym: "Ne", name: loc("Neon", "Неон", "Неон"), n: 10 },
  { sym: "Na", name: loc("Natriy", "Натрий", "Натрий"), n: 12 },
  { sym: "Mg", name: loc("Magniy", "Магний", "Магний"), n: 12 },
  { sym: "Al", name: loc("Alyuminiy", "Алюминий", "Алюминий"), n: 14 },
  { sym: "Si", name: loc("Kremniy", "Силитсий", "Кремний"), n: 14 },
  { sym: "P", name: loc("Fosfor", "Фосфор", "Фосфор"), n: 16 },
  { sym: "S", name: loc("Oltingugurt", "Сулфур", "Сера"), n: 16 },
  { sym: "Cl", name: loc("Xlor", "Хлор", "Хлор"), n: 18 },
  { sym: "Ar", name: loc("Argon", "Аргон", "Аргон"), n: 22 },
  { sym: "K", name: loc("Kaliy", "Калий", "Калий"), n: 20 },
  { sym: "Ca", name: loc("Kalsiy", "Калсий", "Кальций"), n: 20 },
];

const shellsFor = (z: number) => [Math.min(z, 2), clamp(z - 2, 0, 8), clamp(z - 10, 0, 8), Math.max(z - 18, 0)].filter((x) => x > 0);

const atomLab: LabDef = {
  key: "atom",
  category: "CHEMISTRY",
  title: loc("Atom tuzilishi (Bor modeli)", "Сохти атом (модели Бор)", "Строение атома (модель Бора)"),
  camera: [0, 3, 9],
  params: [{ id: "Z", label: loc("Tartib raqami Z", "Рақами тартибӣ Z", "Порядковый номер Z"), min: 1, max: 20, step: 1, value: 8 }],
  build(scene) {
    const dyn = rebuilder(scene);
    const electrons: { mesh: THREE.Mesh; shell: number; k: number; count: number }[] = [];
    const tilts: THREE.Group[] = [];
    return {
      update(p, _dt, time) {
        const z = Math.round(p.Z);
        dyn(String(z), (g) => {
          electrons.length = 0;
          tilts.length = 0;
          const el = ELEMENTS[z - 1];
          const A = z + el.n;
          const R = 0.18 * Math.cbrt(A) + 0.05;
          const pm = mat(0xe5484d), nm = mat(0x9aa3ad);
          for (let k = 0; k < A; k++) {
            const y = 1 - (2 * (k + 0.5)) / A;
            const rr = Math.sqrt(1 - y * y), th = k * 2.39996;
            const rad = R * Math.cbrt((k + 0.5) / A);
            // protonlar va neytronlar navbatma-navbat
            const isProton = Math.floor((k * z) / A) !== Math.floor(((k + 1) * z) / A);
            g.add(info(sphere(0.17, isProton ? pm : nm, [Math.cos(th) * rr * rad, y * rad, Math.sin(th) * rr * rad], 12),
              isProton ? loc("Proton (+)", "Протон (+)", "Протон (+)") : loc("Neytron (0)", "Нейтрон (0)", "Нейтрон (0)"),
              isProton ? loc("Musbat zaryadli; soni tartib raqamiga teng.", "Заряди мусбат; шумораш ба рақами тартибӣ баробар.", "Положительный заряд; число равно порядковому номеру.") : loc("Zaryadsiz; yadro massasiga hissa qo'shadi.", "Бе заряд; ба массаи ядро саҳм мегузорад.", "Без заряда; вносит вклад в массу ядра.")));
          }
          const em = mat(0x35b6ff, { emissive: 0x35b6ff, emissiveIntensity: 0.7 });
          shellsFor(z).forEach((count, shell) => {
            const r = 1.3 + shell * 0.85;
            const tg = new THREE.Group();
            tg.rotation.set(deg(70 + shell * 12), deg(shell * 35), 0);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: 0x8fb6d9 }));
            tg.add(noPick(ring));
            for (let k = 0; k < count; k++) {
              const e = info(sphere(0.11, em, [r, 0, 0], 12), loc("Elektron (−)", "Электрон (−)", "Электрон (−)"), loc(`${shell + 1}-qavatda ${count} ta elektron`, `Дар қабати ${shell + 1} — ${count} электрон`, `На ${shell + 1}-м слое ${count} электрон(ов)`));
              tg.add(e);
              electrons.push({ mesh: e, shell, k, count });
            }
            g.add(tg);
            tilts.push(tg);
          });
        });
        for (const e of electrons) {
          const r = 1.3 + e.shell * 0.85;
          const a = time * (1.2 / (e.shell + 1)) + (e.k / e.count) * Math.PI * 2;
          e.mesh.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        }
      },
      readout(p) {
        const z = Math.round(p.Z);
        const el = ELEMENTS[z - 1];
        return [
          loc(`${el.sym} — ${el.name.uz}, Z = ${z}`, `${el.sym} — ${el.name.tg}, Z = ${z}`, `${el.sym} — ${el.name.ru}, Z = ${z}`),
          same(`p⁺ = ${z}, n⁰ = ${el.n}, e⁻ = ${z};  A = ${z + el.n}`),
          loc(`Elektron qavatlar: ${shellsFor(z).join(", ")}`, `Қабатҳои электронӣ: ${shellsFor(z).join(", ")}`, `Электронные слои: ${shellsFor(z).join(", ")}`),
        ];
      },
    };
  },
};

interface MoleculeSpec {
  formula: string;
  center: { sym: string; color: number; r: number };
  ligand: { sym: string; color: number; r: number };
  dirs: THREE.Vector3[];
  bond: number;
  double?: boolean;
  angle: string;
  shape: Localized;
  polar: boolean;
}

const pyramid = (thetaDeg: number) => [0, 120, 240].map((phi) => V(Math.sin(deg(thetaDeg)) * Math.cos(deg(phi)), -Math.cos(deg(thetaDeg)), Math.sin(deg(thetaDeg)) * Math.sin(deg(phi))));
const H_ATOM = { sym: "H", color: 0xf4f6fb, r: 0.32 };

const MOLECULES: MoleculeSpec[] = [
  { formula: "H₂O", center: { sym: "O", color: 0xe0443a, r: 0.55 }, ligand: H_ATOM, dirs: [V(Math.sin(deg(52.25)), -Math.cos(deg(52.25)), 0), V(-Math.sin(deg(52.25)), -Math.cos(deg(52.25)), 0)], bond: 1.3, angle: "104,5°", shape: loc("burchakli", "кунҷдор", "угловая"), polar: true },
  { formula: "CO₂", center: { sym: "C", color: 0x333333, r: 0.45 }, ligand: { sym: "O", color: 0xe0443a, r: 0.5 }, dirs: [V(1, 0, 0), V(-1, 0, 0)], bond: 1.5, double: true, angle: "180°", shape: loc("chiziqli", "хаттӣ", "линейная"), polar: false },
  { formula: "CH₄", center: { sym: "C", color: 0x333333, r: 0.45 }, ligand: H_ATOM, dirs: [V(1, 1, 1), V(1, -1, -1), V(-1, 1, -1), V(-1, -1, 1)].map((v) => v.normalize()), bond: 1.35, angle: "109,5°", shape: loc("tetraedr", "тетраэдр", "тетраэдр"), polar: false },
  { formula: "NH₃", center: { sym: "N", color: 0x3050f8, r: 0.5 }, ligand: H_ATOM, dirs: pyramid(68.2), bond: 1.3, angle: "107°", shape: loc("uchburchakli piramida", "пирамидаи секунҷа", "тригональная пирамида"), polar: true },
];

const moleculeLab: LabDef = {
  key: "molecule",
  category: "CHEMISTRY",
  title: loc("Molekulalar va kimyoviy bog'lar", "Молекулаҳо ва бандҳои кимиёвӣ", "Молекулы и химические связи"),
  camera: [0, 1, 6],
  params: [{ id: "kind", label: loc("Molekula", "Молекула", "Молекула"), value: 0, options: MOLECULES.map((m, i) => ({ value: i, label: same(m.formula) })) }],
  build(scene) {
    const dyn = rebuilder(scene);
    return {
      update(p) {
        const m = MOLECULES[Math.round(p.kind)];
        dyn(m.formula, (g) => {
          const atomInfo = (sym: string) => info(new THREE.Group(), same(sym), loc(`${m.formula} molekulasidagi ${sym} atomi`, `Атоми ${sym} дар молекулаи ${m.formula}`, `Атом ${sym} в молекуле ${m.formula}`));
          const c = atomInfo(m.center.sym);
          c.add(sphere(m.center.r, mat(m.center.color, { roughness: 0.35 }), [0, 0, 0], 32));
          g.add(c);
          const stick = mat(0xb4bfd0, { roughness: 0.4 });
          for (const d of m.dirs) {
            const end = d.clone().multiplyScalar(m.bond);
            const a = atomInfo(m.ligand.sym);
            a.add(sphere(m.ligand.r, mat(m.ligand.color, { roughness: 0.35 }), [end.x, end.y, end.z], 28));
            g.add(a);
            if (m.double) {
              const off = new THREE.Vector3(0, 0.1, 0);
              g.add(rod(off.clone(), end.clone().add(off), 0.06, stick), rod(off.clone().negate(), end.clone().sub(off), 0.06, stick));
            } else g.add(rod(V(0, 0, 0), end, 0.08, stick));
          }
        });
      },
      readout(p) {
        const m = MOLECULES[Math.round(p.kind)];
        return [
          loc(`${m.formula}: shakli ${m.shape.uz}, bog' burchagi ${m.angle}`, `${m.formula}: шакл ${m.shape.tg}, кунҷи банд ${m.angle}`, `${m.formula}: форма ${m.shape.ru}, валентный угол ${m.angle}`),
          m.polar
            ? loc("Molekula qutbli: zaryadlar markazlari ustma-ust tushmaydi.", "Молекула қутбӣ аст: марказҳои зарядҳо мувофиқ намеоянд.", "Молекула полярная: центры зарядов не совпадают.")
            : loc("Molekula qutbsiz: simmetriya tufayli qutblar bir-birini yo'qotadi.", "Молекула ғайриқутбӣ: аз ҳисоби симметрия қутбҳо якдигарро нест мекунанд.", "Молекула неполярная: из-за симметрии полярности компенсируются."),
          loc("Bog' turi: kovalent qutbli", "Навъи банд: ковалентии қутбӣ", "Тип связи: ковалентная полярная"),
        ];
      },
    };
  },
};

const reactionLab: LabDef = {
  key: "reaction",
  category: "CHEMISTRY",
  title: loc("Kimyoviy reaksiya: 2H₂ + O₂ → 2H₂O", "Реаксияи кимиёвӣ: 2H₂ + O₂ → 2H₂O", "Химическая реакция: 2H₂ + O₂ → 2H₂O"),
  camera: [0, 0.5, 9],
  live: true,
  params: [
    { id: "auto", label: loc("Rejim", "Реҷа", "Режим"), value: 1, options: [{ value: 1, label: loc("Avtomatik", "Худкор", "Автоматически") }, { value: 0, label: loc("Qo'lda", "Дастӣ", "Вручную") }] },
    { id: "progress", label: loc("Reaksiya borishi (%)", "Рафти реаксия (%)", "Ход реакции (%)"), min: 0, max: 100, step: 1, value: 0 },
  ],
  build(scene) {
    const hM = mat(0xf4f6fb, { roughness: 0.35 }), oM = mat(0xe0443a, { roughness: 0.35 });
    const start = [V(-4.2, 1.3, 0), V(-3.5, 1.3, 0), V(-4.2, -1.3, 0), V(-3.5, -1.3, 0), V(-1.7, 0.4, 0), V(-1.7, -0.4, 0)];
    const end = [V(3.75, 1.85, 0), V(2.25, 1.85, 0), V(3.75, -0.75, 0), V(2.25, -0.75, 0), V(3, 1.3, 0), V(3, -1.3, 0)];
    const atoms = start.map((s, i) => {
      const isO = i >= 4;
      const m = sphere(isO ? 0.45 : 0.3, isO ? oM : hM, [s.x, s.y, s.z], 24);
      scene.add(info(m, same(isO ? "O" : "H"), isO ? loc("Kislorod atomi", "Атоми оксиген", "Атом кислорода") : loc("Vodorod atomi", "Атоми гидроген", "Атом водорода")));
      return m;
    });
    const stick = mat(0xb4bfd0);
    const before: [number, number][] = [[0, 1], [2, 3], [4, 5]];
    const after: [number, number][] = [[4, 0], [4, 1], [5, 2], [5, 3]];
    const bondsBefore = before.map(() => noPick(rod(V(0, 0, 0), V(0, 1, 0), 0.07, stick)));
    const bondsAfter = after.map(() => noPick(rod(V(0, 0, 0), V(0, 1, 0), 0.07, stick)));
    scene.add(...bondsBefore, ...bondsAfter);
    const ease = (x: number) => x * x * (3 - 2 * x);
    let cycle = 0;
    let progress = 0;
    return {
      update(p, dt) {
        if (p.auto) {
          cycle = (cycle + dt) % 6;
          progress = clamp((cycle - 1.5) / 2.5, 0, 1);
        } else progress = p.progress / 100;
        const k = ease(progress);
        atoms.forEach((a, i) => {
          a.position.lerpVectors(start[i], end[i], k);
          a.position.z = Math.sin(k * Math.PI) * (i % 2 ? 0.8 : -0.8); // to'qnashuvdagi "aralashish"
        });
        const showAfter = progress >= 0.5;
        before.forEach(([i, j], n) => {
          setRod(bondsBefore[n], atoms[i].position, atoms[j].position);
          bondsBefore[n].visible = !showAfter;
        });
        after.forEach(([i, j], n) => {
          setRod(bondsAfter[n], atoms[i].position, atoms[j].position);
          bondsAfter[n].visible = showAfter;
        });
      },
      readout() {
        const stage = progress < 0.05 ? loc("Boshlang'ich moddalar", "Моддаҳои аввала", "Исходные вещества") : progress > 0.95 ? loc("Reaksiya mahsuloti", "Маҳсули реаксия", "Продукты реакции") : loc("Eski bog'lar uziladi, yangilari hosil bo'ladi", "Бандҳои кӯҳна канда, навҳо ҳосил мешаванд", "Старые связи рвутся, образуются новые");
        return [
          loc(`Bosqich: ${stage.uz} (${Math.round(progress * 100)}%)`, `Марҳила: ${stage.tg} (${Math.round(progress * 100)}%)`, `Этап: ${stage.ru} (${Math.round(progress * 100)}%)`),
          loc("Atomlar soni saqlanadi: H 4 = 4, O 2 = 2", "Шумораи атомҳо нигоҳ дошта мешавад: H 4 = 4, O 2 = 2", "Число атомов сохраняется: H 4 = 4, O 2 = 2"),
          loc("Massa saqlanadi: 4 g + 32 g = 36 g", "Масса нигоҳ дошта мешавад: 4 г + 32 г = 36 г", "Масса сохраняется: 4 г + 32 г = 36 г"),
        ];
      },
    };
  },
};

/* ───────────────────────── BIOLOGIYA ───────────────────────── */

const ORGANELLES = {
  nucleus: [loc("Yadro", "Ядро", "Ядро"), loc("Irsiy axborot (DNK) saqlanadi, hujayra faoliyatini boshqaradi.", "Иттилооти ирсӣ (ДНК) нигоҳ дошта мешавад, фаъолияти ҳуҷайраро идора мекунад.", "Хранит наследственную информацию (ДНК), управляет клеткой.")],
  mito: [loc("Mitoxondriya", "Митохондрия", "Митохондрия"), loc("Energiya (ATF) hosil qiladi — «energiya stansiyasi».", "Энергия (АТФ) истеҳсол мекунад — «нерӯгоҳ».", "Вырабатывает энергию (АТФ) — «энергетическая станция».")],
  er: [loc("Endoplazmatik to'r", "Шабакаи эндоплазматикӣ", "Эндоплазматическая сеть"), loc("Oqsil va yog'larni sintez qiladi va tashiydi.", "Сафедаҳо ва равғанҳоро синтез ва интиқол медиҳад.", "Синтезирует и транспортирует белки и липиды.")],
  golgi: [loc("Golji apparati", "Дастгоҳи Голҷи", "Аппарат Гольджи"), loc("Moddalarni qadoqlaydi va jo'natadi.", "Моддаҳоро бастабандӣ ва фиристода мекунад.", "Упаковывает и отправляет вещества.")],
  lyso: [loc("Lizosoma", "Лизосома", "Лизосома"), loc("Fermentlar bilan keraksiz moddalarni parchalaydi.", "Бо ферментҳо моддаҳои нолозимро тақсим мекунад.", "Расщепляет ненужные вещества ферментами.")],
  chloro: [loc("Xloroplast", "Хлоропласт", "Хлоропласт"), loc("Fotosintez: yorug'lik energiyasidan glyukoza hosil qiladi. Faqat o'simlikda.", "Фотосинтез: аз энергияи нур глюкоза ҳосил мекунад. Танҳо дар растанӣ.", "Фотосинтез: образует глюкозу за счёт света. Только у растений.")],
  vacuole: [loc("Markaziy vakuola", "Вакуолаи марказӣ", "Центральная вакуоль"), loc("Hujayra shirasini saqlaydi va hujayra shaklini tutib turadi.", "Шираи ҳуҷайраро нигоҳ медорад ва шакли ҳуҷайраро нигоҳ медорад.", "Хранит клеточный сок и поддерживает форму клетки.")],
  wall: [loc("Hujayra devori", "Девори ҳуҷайра", "Клеточная стенка"), loc("Sellyulozadan iborat mustahkam qobiq. Faqat o'simlikda.", "Пӯсти мустаҳкам аз селлюлоза. Танҳо дар растанӣ.", "Прочная оболочка из целлюлозы. Только у растений.")],
} as const;

const cellLab: LabDef = {
  key: "cell",
  category: "BIOLOGY",
  title: loc("O'simlik va hayvon hujayrasi", "Ҳуҷайраи растанӣ ва ҳайвонот", "Растительная и животная клетка"),
  camera: [0, 1.5, 8],
  params: [{ id: "type", label: loc("Hujayra", "Ҳуҷайра", "Клетка"), value: 0, options: [{ value: 0, label: loc("Hayvon", "Ҳайвон", "Животная") }, { value: 1, label: loc("O'simlik", "Растанӣ", "Растительная") }] }],
  build(scene) {
    const dyn = rebuilder(scene);
    const add = (g: THREE.Group, key: keyof typeof ORGANELLES, objs: THREE.Object3D[]) => {
      const holder = info(new THREE.Group(), ORGANELLES[key][0], ORGANELLES[key][1]);
      holder.add(...objs);
      g.add(holder);
    };
    return {
      update(p, dt) {
        const plant = Math.round(p.type) === 1;
        const g = dyn(plant ? "plant" : "animal", (g) => {
          if (plant) {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 3.2), new THREE.MeshStandardMaterial({ color: 0x5fae4f, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
            const edges = new THREE.LineSegments(new THREE.EdgesGeometry(wall.geometry), new THREE.LineBasicMaterial({ color: 0x3e8a35 }));
            add(g, "wall", [noPick(wall), edges]);
            add(g, "vacuole", [sphere(1.05, mat(0x9fd8ff, { transparent: true, opacity: 0.55 }), [0.5, -0.1, 0])]);
            add(g, "chloro", [[-1.9, 1.1, 1.1], [1.9, 1.1, -1.0], [-1.8, -1.1, -1.0], [1.8, -1.1, 1.1], [0.2, 1.3, 1.2], [-0.4, -1.3, -1.2]].map(([x, y, z]) => {
              const c = sphere(0.3, mat(0x2f9e44), [x, y, z], 20);
              c.scale.set(1.6, 0.8, 0.8);
              return c;
            }));
            add(g, "nucleus", [sphere(0.6, mat(0x4466e0), [-1.3, 0.4, 0.3]), sphere(0.22, mat(0x1c2f8a), [-1.15, 0.5, 0.75])]);
          } else {
            g.add(noPick(sphere(2.1, new THREE.MeshStandardMaterial({ color: 0x56c2c9, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }), [0, 0, 0], 48)));
            add(g, "nucleus", [sphere(0.78, mat(0x4466e0), [0.3, 0.25, 0]), sphere(0.28, mat(0x1c2f8a), [0.45, 0.35, 0.6])]);
            add(g, "lyso", [[1.3, 0.6, 0.9], [-0.4, 1.5, 0.6], [0.2, -1.4, 0.9], [-1.5, 0.1, -0.2]].map(([x, y, z]) => sphere(0.16, mat(0x62c37a), [x, y, z], 14)));
          }
          const mitoPos = plant ? [[-0.4, 1.0, -1.0], [1.4, 0.4, 1.0], [-0.6, -0.9, 1.0]] : [[-1.2, 0.7, 0.5], [1.3, -0.7, 0.5], [-0.7, -1.2, -0.4]];
          add(g, "mito", mitoPos.map(([x, y, z], i) => {
            const m = sphere(0.32, mat(0xf0a030), [x, y, z], 20);
            m.scale.set(1.8, 0.75, 0.75);
            m.rotation.set(0, i, i * 0.7);
            return m;
          }));
          add(g, "er", [0, 1].map((i) => {
            const torus = new THREE.Mesh(new THREE.TorusGeometry(1.05 + i * 0.15, 0.07, 8, 48, Math.PI * 1.4), mat(0xa66bd6));
            torus.position.set(plant ? -1.3 : 0.3, plant ? 0.4 : 0.25, 0);
            torus.rotation.set(deg(70 + i * 40), deg(i * 50), 0);
            return torus;
          }));
          add(g, "golgi", [0, 1, 2].map((i) => {
            const s = sphere(0.45, mat(0xe86a9a), [plant ? 1.6 : -1.1, -0.3 + i * 0.2, plant ? -0.9 : -0.9], 16);
            s.scale.set(1.4 - i * 0.12, 0.13, 0.9);
            return s;
          }));
        });
        g.rotation.y += dt * 0.15;
      },
      readout(p) {
        return Math.round(p.type) === 1
          ? [
              loc("O'simlik hujayrasi: hujayra devori, xloroplastlar va katta markaziy vakuola bor.", "Ҳуҷайраи растанӣ: девори ҳуҷайра, хлоропластҳо ва вакуолаи калони марказӣ дорад.", "Растительная клетка: есть клеточная стенка, хлоропласты и большая центральная вакуоль."),
              loc("Organoidni bosib, vazifasini o'qing.", "Органоидро пахш карда, вазифаашро хонед.", "Нажмите на органоид, чтобы прочитать его функцию."),
            ]
          : [
              loc("Hayvon hujayrasi: devor va xloroplast yo'q, lizosomalar bor.", "Ҳуҷайраи ҳайвонот: девор ва хлоропласт нест, лизосомаҳо ҳаст.", "Животная клетка: нет стенки и хлоропластов, есть лизосомы."),
              loc("Organoidni bosib, vazifasini o'qing.", "Органоидро пахш карда, вазифаашро хонед.", "Нажмите на органоид, чтобы прочитать его функцию."),
            ];
      },
    };
  },
};

const skeletonLab: LabDef = {
  key: "skeleton",
  category: "BIOLOGY",
  title: loc("Odam skeleti", "Скелети одам", "Скелет человека"),
  camera: [0, 0, 11],
  params: [{ id: "spin", label: loc("Aylanish", "Гардиш", "Вращение"), value: 1, options: [{ value: 1, label: loc("Yoqilgan", "Фаъол", "Вкл.") }, { value: 0, label: loc("To'xtagan", "Қатъ", "Выкл.") }] }],
  build(scene) {
    const body = new THREE.Group();
    scene.add(body);
    const bone = mat(0xefe6d0, { roughness: 0.7 });
    const part = (title: Localized, text: Localized, objs: THREE.Object3D[]) => {
      const gr = info(new THREE.Group(), title, text);
      gr.add(...objs);
      body.add(gr);
    };
    const skull = sphere(0.55, bone, [0, 2.75, 0], 28);
    skull.scale.set(1, 1.1, 1.05);
    part(loc("Bosh suyagi", "Косахонаи сар", "Череп"), loc("Miyani himoya qiladi. Pastki jag' — yagona harakatchan suyagi.", "Мағзи сарро муҳофизат мекунад. Ҷоғи поён — ягона устухони ҳаракатнок.", "Защищает мозг. Нижняя челюсть — единственная подвижная кость."), [skull, sphere(0.3, bone, [0, 2.3, 0.22], 16)]);
    part(loc("Umurtqa pog'onasi", "Сутунмуҳра", "Позвоночник"), loc("Tananing tayanchi: bo'yin 7, ko'krak 12, bel 5 umurtqa.", "Такягоҳи бадан: гардан 7, сина 12, камар 5 муҳра.", "Опора тела: шейных 7, грудных 12, поясничных 5 позвонков."),
      Array.from({ length: 24 }, (_, i) => {
        const v = new THREE.Mesh(new THREE.CylinderGeometry(0.08 + i * 0.002, 0.09 + i * 0.002, 0.13, 10), bone);
        v.position.set(0, 2.0 - (i / 23) * 2.6, -0.42 + Math.sin((i / 23) * Math.PI * 2) * 0.07);
        return v;
      }));
    part(loc("Qovurg'alar", "Қабурғаҳо", "Рёбра"), loc("12 juft qovurg'a yurak va o'pkani himoya qiladi.", "12 ҷуфт қабурға дил ва шушро муҳофизат мекунад.", "12 пар рёбер защищают сердце и лёгкие."),
      Array.from({ length: 12 }, (_, i) => {
        const R = 0.38 + 0.3 * Math.sin(((i + 1) / 13) * Math.PI);
        const r = new THREE.Mesh(new THREE.TorusGeometry(R, 0.028, 6, 32, Math.PI * 1.7), bone);
        r.rotation.set(Math.PI / 2 + 0.1, 0, Math.PI / 2 + 0.85);
        r.scale.set(1, 0.75, 1);
        r.position.set(0, 1.72 - i * 0.165, -0.42 + R * 0.75);
        return r;
      }));
    const limbs = (s: number) => [rod(V(s * 0.98, 1.78, 0), V(s * 1.18, 0.78, 0), 0.06, bone), rod(V(s * 1.18, 0.78, 0), V(s * 1.32, -0.15, 0.05), 0.045, bone)];
    part(loc("Qo'l suyaklari", "Устухонҳои даст", "Кости руки"), loc("Yelka, bilak va tirsak suyaklari, kaft va barmoqlar.", "Устухонҳои китф, бозу ва оринҷ, каф ва ангуштон.", "Плечевая, лучевая и локтевая кости, кисть."), [...limbs(1), ...limbs(-1), rod(V(-0.98, 1.85, 0.2), V(0.98, 1.85, 0.2), 0.035, bone)]);
    const pelvis = sphere(0.5, bone, [0, -0.8, -0.1], 20);
    pelvis.scale.set(1.5, 0.7, 0.6);
    part(loc("Tos suyaklari", "Устухонҳои кос", "Кости таза"), loc("Ichki a'zolarni tutib turadi, og'irlikni oyoqlarga uzatadi.", "Узвҳои дарунро нигоҳ медорад, вазнро ба пойҳо мегузаронад.", "Поддерживает внутренние органы, передаёт вес на ноги."), [pelvis]);
    const leg = (s: number) => [rod(V(s * 0.38, -0.95, 0), V(s * 0.44, -2.05, 0.04), 0.085, bone), rod(V(s * 0.44, -2.1, 0.03), V(s * 0.42, -3.0, 0), 0.06, bone)];
    part(loc("Oyoq suyaklari", "Устухонҳои пой", "Кости ноги"), loc("Son suyagi — skeletdagi eng uzun va mustahkam suyak.", "Устухони рон — дарозтарин ва мустаҳкамтарин устухони скелет.", "Бедренная кость — самая длинная и прочная в скелете."), [...leg(1), ...leg(-1)]);
    return {
      update(p, dt) {
        if (p.spin) body.rotation.y += dt * 0.35;
      },
      readout: () => [
        loc("Kattalar skeletida 206 ta suyak bor.", "Дар скелети калонсолон 206 устухон ҳаст.", "Во взрослом скелете 206 костей."),
        loc("Vazifalari: tayanch, himoya, harakat, qon hosil qilish, minerallar zaxirasi.", "Вазифаҳо: такягоҳ, муҳофизат, ҳаракат, хунсозӣ, захираи минералҳо.", "Функции: опора, защита, движение, кроветворение, запас минералов."),
      ],
    };
  },
};

const heartLab: LabDef = {
  key: "heart",
  category: "BIOLOGY",
  title: loc("Yurak va qon aylanish tizimi", "Дил ва системаи гардиши хун", "Сердце и кровообращение"),
  camera: [0, 0, 11],
  params: [{ id: "bpm", label: loc("Yurak urishi (marta/daq.)", "Зарабони дил (бор/дақ.)", "Пульс (уд./мин)"), min: 40, max: 160, step: 5, value: 72 }],
  build(scene) {
    const chamber = (title: Localized, color: number, pos: [number, number, number], s: [number, number, number]) => {
      const m = sphere(0.55, mat(color, { roughness: 0.45 }), pos, 28);
      m.scale.set(...s);
      scene.add(info(m, title, loc("Yurak bo'lmasi/qorinchasi", "Даҳлез/меъдачаи дил", "Предсердие/желудочек сердца")));
      return m;
    };
    const RA = chamber(loc("O'ng bo'lmacha", "Даҳлези рост", "Правое предсердие"), 0x3b6fd8, [-0.65, 0.55, 0], [1, 0.85, 0.9]);
    const LA = chamber(loc("Chap bo'lmacha", "Даҳлези чап", "Левое предсердие"), 0xd43c3c, [0.65, 0.55, 0], [1, 0.85, 0.9]);
    const RV = chamber(loc("O'ng qorincha", "Меъдачаи рост", "Правый желудочек"), 0x2d5fbf, [-0.55, -0.55, 0], [1, 1.2, 0.95]);
    const LV = chamber(loc("Chap qorincha", "Меъдачаи чап", "Левый желудочек"), 0xb92f2f, [0.6, -0.6, 0], [1.15, 1.35, 1]);
    const lungs = [-1, 1].map((s) => {
      const l = sphere(0.7, mat(0xf2a3b3, { transparent: true, opacity: 0.85 }), [s * 1.1, 3.2, 0], 24);
      l.scale.set(0.9, 1.2, 0.7);
      return info(l, loc("O'pka", "Шуш", "Лёгкое"), loc("Kichik qon aylanish doirasi: qon kislorodga to'yinadi.", "Доираи хурди гардиши хун: хун бо оксиген сер мешавад.", "Малый круг: кровь насыщается кислородом."));
    });
    scene.add(...lungs);
    const bodyBox = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.8), mat(0xe9c7a1));
    bodyBox.position.set(0, -3.6, 0);
    scene.add(info(bodyBox, loc("Tana a'zolari", "Узвҳои бадан", "Органы тела"), loc("Katta qon aylanish doirasi: to'qimalar kislorod oladi.", "Доираи калони гардиши хун: бофтаҳо оксиген мегиранд.", "Большой круг: ткани получают кислород.")));
    const pulmonary = new THREE.CatmullRomCurve3([V(-0.55, -0.55, 0), V(-1.6, 1.6, 0.3), V(-1.1, 3.2, 0.3), V(0, 3.6, 0.3), V(1.1, 3.2, 0.3), V(1.6, 1.6, 0.3), V(0.65, 0.55, 0)]);
    const systemic = new THREE.CatmullRomCurve3([V(0.6, -0.6, 0), V(2.6, -1.0, -0.3), V(1.6, -3.6, -0.3), V(0, -3.9, -0.3), V(-1.6, -3.6, -0.3), V(-2.6, -1.0, -0.3), V(-0.65, 0.55, 0)]);
    for (const c of [pulmonary, systemic]) scene.add(noPick(new THREE.Mesh(new THREE.TubeGeometry(c, 80, 0.06, 8), new THREE.MeshStandardMaterial({ color: 0xc7c7c7, transparent: true, opacity: 0.35 }))));
    const red = new THREE.Color(0xe5322d), blue = new THREE.Color(0x3b6fd8);
    const cells = Array.from({ length: 40 }, (_, i) => {
      const m = noPick(sphere(0.08, new THREE.MeshStandardMaterial({ color: 0xffffff }), [0, 0, 0], 8));
      scene.add(m);
      return { m, curve: i % 2 ? pulmonary : systemic, off: i / 40 };
    });
    let flow = 0;
    return {
      update(p, dt, time) {
        const beat = (time * p.bpm) / 60;
        const ph = beat % 1;
        const atr = 1 + 0.08 * Math.max(0, Math.sin(ph * Math.PI * 2));
        const ven = 1 + 0.1 * Math.max(0, Math.sin((ph - 0.25) * Math.PI * 2));
        RA.scale.set(atr, 0.85 * atr, 0.9 * atr);
        LA.scale.set(atr, 0.85 * atr, 0.9 * atr);
        RV.scale.set(ven, 1.2 * ven, 0.95 * ven);
        LV.scale.set(1.15 * ven, 1.35 * ven, ven);
        flow += (dt * p.bpm) / 600;
        for (const c of cells) {
          const u = (flow + c.off) % 1;
          c.m.position.copy(c.curve.getPointAt(u));
          // Kichik doirada qon o'pkadan keyin qizaradi, kattasida to'qimalardan keyin ko'karadi
          const oxygenated = c.curve === pulmonary ? u > 0.5 : u < 0.5;
          (c.m.material as THREE.MeshStandardMaterial).color.copy(oxygenated ? red : blue);
        }
      },
      readout(p) {
        const lpm = (p.bpm * 70) / 1000;
        return [
          loc(`Puls: ${p.bpm} marta/daq.`, `Набз: ${p.bpm} бор/дақ.`, `Пульс: ${p.bpm} уд./мин`),
          loc(`Yurak har urishda ~70 ml qon haydaydi: ≈ ${lpm.toFixed(1)} l/daq.`, `Дил ҳар зарба ~70 мл хун меронад: ≈ ${lpm.toFixed(1)} л/дақ.`, `За удар ~70 мл крови: ≈ ${lpm.toFixed(1)} л/мин`),
          loc("Qizil — kislorodga boy qon, ko'k — kislorodi kam qon.", "Сурх — хуни сероксиген, кабуд — хуни камоксиген.", "Красная — артериальная кровь, синяя — венозная."),
        ];
      },
    };
  },
};

/* ───────────────────────── GEOMETRIYA ───────────────────────── */

const SOLID_NAMES: Localized[] = [loc("Kub", "Куб", "Куб"), loc("Uchburchakli prizma", "Призмаи секунҷа", "Треугольная призма"), loc("To'rtburchakli piramida", "Пирамидаи чоркунҷа", "Четырёхугольная пирамида"), loc("Silindr", "Силиндр", "Цилиндр"), loc("Konus", "Конус", "Конус"), loc("Shar", "Кура", "Шар")];

const solidsLab: LabDef = {
  key: "solids",
  category: "GEOMETRY",
  title: loc("Stereometriya: fazoviy jismlar", "Стереометрия: ҷисмҳои фазоӣ", "Стереометрия: пространственные тела"),
  camera: [5, 4, 7],
  params: [
    { id: "kind", label: loc("Jism", "Ҷисм", "Тело"), value: 0, options: SOLID_NAMES.map((n, i) => ({ value: i, label: n })) },
    { id: "a", label: loc("O'lcham a (sm), h = a", "Андоза a (см), h = a", "Размер a (см), h = a"), min: 1, max: 5, step: 0.5, value: 3 },
    { id: "wire", label: loc("Ko'rinish", "Намуд", "Вид"), value: 0, options: [{ value: 0, label: loc("Qattiq", "Мустаҳкам", "Сплошной") }, { value: 1, label: loc("Karkas", "Қаркас", "Каркас") }] },
  ],
  build(scene) {
    const grid = new THREE.GridHelper(10, 10, 0x888888, 0xcccccc);
    grid.position.y = -2.2;
    scene.add(noPick(grid));
    const dyn = rebuilder(scene);
    const m = mat(0x1f8a93, { transparent: true, opacity: 0.9 });
    const geo = (k: number): THREE.BufferGeometry => {
      switch (k) {
        case 0: return new THREE.BoxGeometry(1, 1, 1);
        case 1: return new THREE.CylinderGeometry(1 / Math.sqrt(3), 1 / Math.sqrt(3), 1, 3);
        case 2: { const c = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); c.rotateY(Math.PI / 4); return c; }
        case 3: return new THREE.CylinderGeometry(0.5, 0.5, 1, 48);
        case 4: return new THREE.ConeGeometry(0.5, 1, 48);
        default: return new THREE.SphereGeometry(0.5, 40, 28);
      }
    };
    const metrics = (k: number, a: number) => {
      const r = a / 2, h = a, P = Math.PI;
      if (k === 0) return { V: a ** 3, S: 6 * a * a };
      if (k === 1) { const b = (Math.sqrt(3) / 4) * a * a; return { V: b * h, S: 2 * b + 3 * a * h }; }
      if (k === 2) { const l = Math.sqrt(h * h + r * r); return { V: (a * a * h) / 3, S: a * a + 2 * a * l }; }
      if (k === 3) return { V: P * r * r * h, S: 2 * P * r * (r + h) };
      if (k === 4) { const l = Math.sqrt(r * r + h * h); return { V: (P * r * r * h) / 3, S: P * r * (r + l) }; }
      return { V: (4 / 3) * P * r ** 3, S: 4 * P * r * r };
    };
    const EULER = [[8, 12, 6], [6, 9, 5], [5, 8, 5]];
    return {
      update(p, dt) {
        const k = Math.round(p.kind);
        const g = dyn(String(k), (g) => {
          const mesh = info(new THREE.Mesh(geo(k), m), SOLID_NAMES[k], loc("Hajm va sirt formulalari o'ng panelda.", "Формулаҳои ҳаҷм ва сатҳ дар панели рост.", "Формулы объёма и площади — на панели справа."));
          g.add(mesh);
          if (k < 3) g.add(noPick(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x0a2e33 }))));
        });
        const s = p.a * 0.75;
        g.scale.setScalar(s);
        g.position.y = -2.2 + s / 2;
        g.rotation.y += dt * 0.25;
        m.wireframe = p.wire === 1;
      },
      readout(p) {
        const k = Math.round(p.kind), x = metrics(k, p.a);
        const out = [loc(`V = ${f2(x.V)} sm³; S = ${f2(x.S)} sm²`, `V = ${f2(x.V)} см³; S = ${f2(x.S)} см²`, `V = ${f2(x.V)} см³; S = ${f2(x.S)} см²`)];
        if (k < 3) {
          const [v, e, f] = EULER[k];
          out.push(loc(`Uchlar ${v}, qirralar ${e}, yoqlar ${f}: ${v} − ${e} + ${f} = 2 (Eyler)`, `Қуллаҳо ${v}, қирраҳо ${e}, рӯяҳо ${f}: ${v} − ${e} + ${f} = 2 (Эйлер)`, `Вершин ${v}, рёбер ${e}, граней ${f}: ${v} − ${e} + ${f} = 2 (Эйлер)`));
        } else out.push(loc("Aylanish jismi: Eyler formulasi qo'llanmaydi.", "Ҷисми даврзанӣ: формулаи Эйлер татбиқ намешавад.", "Тело вращения: формула Эйлера не применяется."));
        return out;
      },
    };
  },
};

const POLY_NAMES: Record<number, Localized> = {
  3: loc("uchburchak", "секунҷа", "треугольник"),
  4: loc("to'rtburchak", "чоркунҷа", "четырёхугольник"),
  5: loc("beshburchak", "панҷкунҷа", "пятиугольник"),
  6: loc("oltiburchak", "шашкунҷа", "шестиугольник"),
};

const sectionLab: LabDef = {
  key: "section",
  stage: false,
  category: "GEOMETRY",
  title: loc("Kubning tekislik bilan kesimi", "Буриши куб бо ҳамворӣ", "Сечение куба плоскостью"),
  camera: [5, 4, 6],
  params: [
    { id: "offset", label: loc("Tekislik siljishi", "Ҷойивазкунии ҳамворӣ", "Сдвиг плоскости"), min: -0.95, max: 0.95, step: 0.05, value: 0 },
    { id: "tx", label: loc("Og'ish X (°)", "Хамиш X (°)", "Наклон X (°)"), min: 0, max: 60, step: 1, value: 30 },
    { id: "tz", label: loc("Og'ish Z (°)", "Хамиш Z (°)", "Наклон Z (°)"), min: 0, max: 60, step: 1, value: 30 },
  ],
  build(scene) {
    const S = 1.5;
    const cube = new THREE.Mesh(new THREE.BoxGeometry(2 * S, 2 * S, 2 * S), new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.18, depthWrite: false }));
    scene.add(noPick(cube), noPick(new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0x1f4fa3 }))));
    const corners = [-S, S].flatMap((x) => [-S, S].flatMap((y) => [-S, S].map((z) => V(x, y, z))));
    const edges: [number, number][] = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) if (corners[i].distanceTo(corners[j]) === 2 * S) edges.push([i, j]);
    const dyn = rebuilder(scene);
    const compute = (p: Params) => {
      const n = V(Math.tan(deg(p.tx)), 1, Math.tan(deg(p.tz))).normalize();
      const dMax = S * (Math.abs(n.x) + Math.abs(n.y) + Math.abs(n.z));
      const d = p.offset * dMax;
      const pts: THREE.Vector3[] = [];
      for (const [i, j] of edges) {
        const a = corners[i], b = corners[j];
        const denom = n.dot(b.clone().sub(a));
        if (Math.abs(denom) < 1e-9) continue;
        const s = (d - n.dot(a)) / denom;
        if (s < -1e-9 || s > 1 + 1e-9) continue;
        const q = a.clone().lerp(b, s);
        if (!pts.some((x) => x.distanceTo(q) < 1e-6)) pts.push(q);
      }
      const c = pts.reduce((acc, x) => acc.add(x), V(0, 0, 0)).divideScalar(Math.max(1, pts.length));
      const u = new THREE.Vector3().crossVectors(n, Math.abs(n.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0)).normalize();
      const w = new THREE.Vector3().crossVectors(n, u);
      pts.sort((A, B) => Math.atan2(A.clone().sub(c).dot(w), A.clone().sub(c).dot(u)) - Math.atan2(B.clone().sub(c).dot(w), B.clone().sub(c).dot(u)));
      let area = 0;
      for (let i = 0; i < pts.length; i++) area += new THREE.Vector3().crossVectors(pts[i].clone().sub(c), pts[(i + 1) % pts.length].clone().sub(c)).length() / 2;
      return { n, d, pts, c, area };
    };
    return {
      update(p) {
        dyn(`${p.offset}|${p.tx}|${p.tz}`, (g) => {
          const { n, d, pts, c } = compute(p);
          const plane = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ color: 0xe8a317, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
          plane.quaternion.setFromUnitVectors(V(0, 0, 1), n);
          plane.position.copy(n.clone().multiplyScalar(d));
          g.add(noPick(plane));
          if (pts.length >= 3) {
            const pos: number[] = [];
            for (let i = 0; i < pts.length; i++) {
              const a = pts[i], b = pts[(i + 1) % pts.length];
              pos.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
            }
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
            geo.computeVertexNormals();
            g.add(info(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xe8a317, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })), loc("Kesim", "Буриш", "Сечение"), loc("Tekislik va kub qirralarining kesishish nuqtalari.", "Нуқтаҳои буриши ҳамворӣ ва қирраҳои куб.", "Точки пересечения плоскости с рёбрами куба.")));
            g.add(line([...pts, pts[0]], 0xb36b00));
          }
        });
      },
      readout(p) {
        const { pts, area: raw } = compute(p);
        const n = pts.length;
        const area = raw / (4 * S * S); // qirra = 2S → a = 1 birligiga keltirish
        if (n < 3) return [loc("Tekislik kubni kesmayapti.", "Ҳамворӣ кубро намебурад.", "Плоскость не пересекает куб.")];
        const name = POLY_NAMES[n] ?? same(`${n}`);
        return [
          loc(`Kesim: ${name.uz} (${n} ta uch)`, `Буриш: ${name.tg} (${n} қулла)`, `Сечение: ${name.ru} (${n} вершин)`),
          loc(`Yuzasi ≈ ${f2(area)} a² (a — kub qirrasi)`, `Масоҳат ≈ ${f2(area)} a² (a — қирраи куб)`, `Площадь ≈ ${f2(area)} a² (a — ребро куба)`),
          loc("Kub kesimi 3 dan 6 gacha burchakli bo'lishi mumkin.", "Буриши куб метавонад аз 3 то 6 кунҷ дошта бошад.", "Сечение куба может иметь от 3 до 6 углов."),
        ];
      },
    };
  },
};

/* ───────────────────────── ASTRONOMIYA / GEOGRAFIYA ───────────────────────── */

const PLANETS: { name: Localized; dist: number; size: number; color: number; period: number; au: number }[] = [
  { name: loc("Merkuriy", "Уторид", "Меркурий"), dist: 4, size: 0.18, color: 0xa8a29e, period: 88, au: 0.39 },
  { name: loc("Venera", "Зӯҳра", "Венера"), dist: 5.5, size: 0.3, color: 0xe8c27a, period: 225, au: 0.72 },
  { name: loc("Yer", "Замин", "Земля"), dist: 7, size: 0.32, color: 0x3b7dd8, period: 365.25, au: 1 },
  { name: loc("Mars", "Миррих", "Марс"), dist: 8.8, size: 0.24, color: 0xd2552d, period: 687, au: 1.52 },
  { name: loc("Yupiter", "Муштарӣ", "Юпитер"), dist: 12, size: 0.9, color: 0xd8b48a, period: 4333, au: 5.2 },
  { name: loc("Saturn", "Зуҳал", "Сатурн"), dist: 15.5, size: 0.78, color: 0xe3cf8f, period: 10759, au: 9.58 },
  { name: loc("Uran", "Уран", "Уран"), dist: 18.5, size: 0.5, color: 0x9fd8e0, period: 30687, au: 19.2 },
  { name: loc("Neptun", "Нептун", "Нептун"), dist: 21, size: 0.48, color: 0x3f63d8, period: 60190, au: 30.1 },
];

const solarLab: LabDef = {
  key: "solar",
  category: "ASTRONOMY",
  title: loc("Quyosh tizimi", "Системаи офтобӣ", "Солнечная система"),
  camera: [0, 18, 26],
  lighting: "space",
  live: true,
  params: [{ id: "speed", label: loc("Tezlik (kun/soniya)", "Суръат (рӯз/сония)", "Скорость (сут/с)"), min: 1, max: 365, step: 1, value: 60 }],
  build(scene, lang) {
    const sun = sphere(2, new THREE.MeshBasicMaterial({ color: 0xffd34d }), [0, 0, 0], 40);
    scene.add(info(sun, loc("Quyosh", "Офтоб", "Солнце"), loc("Tizim massasining 99,8% i Quyoshda.", "99,8%-и массаи система дар Офтоб аст.", "99,8% массы системы — Солнце.")));
    scene.add(new THREE.PointLight(0xffffff, 3, 0, 0));
    const bodies = PLANETS.map((pl) => {
      scene.add(circle(pl.dist, 0x334155));
      const g = new THREE.Group();
      const m = sphere(pl.size, mat(pl.color, { roughness: 0.8 }), [0, 0, 0], 28);
      g.add(info(m, pl.name, loc(`Quyoshdan ${pl.au} a.b.; yili ${pl.period} Yer kuni`, `Аз Офтоб ${pl.au} в.а.; соли он ${pl.period} рӯзи заминӣ`, `${pl.au} а.е. от Солнца; год — ${pl.period} земных суток`)));
      if (pl.name.uz === "Saturn") {
        const ring = new THREE.Mesh(new THREE.RingGeometry(pl.size * 1.3, pl.size * 2.1, 48), new THREE.MeshBasicMaterial({ color: 0xcdb98a, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
        ring.rotation.x = deg(70);
        g.add(noPick(ring));
      }
      const lb = label(L(pl.name, lang), { size: 0.55 });
      lb.position.y = pl.size + 0.5;
      g.add(lb);
      scene.add(g);
      return { g, pl };
    });
    const live = { days: 0 };
    return {
      update(p, dt) {
        live.days += dt * p.speed;
        for (const { g, pl } of bodies) {
          const a = (live.days / pl.period) * Math.PI * 2;
          g.position.set(Math.cos(a) * pl.dist, 0, -Math.sin(a) * pl.dist);
        }
      },
      readout() {
        const years = live.days / 365.25;
        return [
          loc(`O'tgan vaqt: ${Math.floor(live.days)} kun (${years.toFixed(2)} Yer yili)`, `Вақти гузашта: ${Math.floor(live.days)} рӯз (${years.toFixed(2)} соли Замин)`, `Прошло: ${Math.floor(live.days)} сут (${years.toFixed(2)} земных лет)`),
          loc("Kepler III qonuni: T² ∝ a³ — uzoq sayyoralar sekinroq aylanadi.", "Қонуни III Кеплер: T² ∝ a³ — сайёраҳои дур сусттар давр мезананд.", "III закон Кеплера: T² ∝ a³ — дальние планеты обращаются медленнее."),
          loc("Masofalar va o'lchamlar masshtabsiz (ko'rinish uchun siqilgan).", "Масофаҳо ва андозаҳо бе миқёс (барои намоиш фишурда).", "Расстояния и размеры не в масштабе."),
        ];
      },
    };
  },
};

const MONTHS: Localized[] = ["Yanvar|Январ|Январь", "Fevral|Феврал|Февраль", "Mart|Март|Март", "Aprel|Апрел|Апрель", "May|Май|Май", "Iyun|Июн|Июнь", "Iyul|Июл|Июль", "Avgust|Август|Август", "Sentabr|Сентябр|Сентябрь", "Oktabr|Октябр|Октябрь", "Noyabr|Ноябр|Ноябрь", "Dekabr|Декабр|Декабрь"].map((s) => {
  const [uz, tg, ru] = s.split("|");
  return { uz, tg, ru };
});

const seasonsLab: LabDef = {
  key: "seasons",
  category: "ASTRONOMY",
  title: loc("Yil fasllari", "Фаслҳои сол", "Времена года"),
  camera: [0, 9, 14],
  lighting: "space",
  live: true,
  params: [
    { id: "auto", label: loc("Rejim", "Реҷа", "Режим"), value: 1, options: [{ value: 1, label: loc("Avtomatik", "Худкор", "Автоматически") }, { value: 0, label: loc("Qo'lda", "Дастӣ", "Вручную") }] },
    { id: "month", label: loc("Oy (1–12)", "Моҳ (1–12)", "Месяц (1–12)"), min: 1, max: 12, step: 0.5, value: 6.5 },
  ],
  build(scene) {
    scene.add(info(sphere(1.4, new THREE.MeshBasicMaterial({ color: 0xffd34d }), [0, 0, 0], 32), loc("Quyosh", "Офтоб", "Солнце"), loc("Yerni yoritadi va isitadi.", "Заминро равшан ва гарм мекунад.", "Освещает и нагревает Землю.")));
    scene.add(new THREE.PointLight(0xffffff, 3.5, 0, 0));
    scene.add(circle(6, 0x334155));
    const earth = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.z = -deg(23.44); // shimoliy qutb +x tomonga og'gan (fazoda yo'nalishi o'zgarmaydi)
    const spin = new THREE.Group();
    const north = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x4f9d69));
    const south = new THREE.Mesh(new THREE.SphereGeometry(0.8, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x3b7dd8));
    spin.add(info(north, loc("Shimoliy yarim shar", "Нимкураи шимолӣ", "Северное полушарие"), loc("O'zbekiston va Tojikiston shu yarim sharda.", "Ӯзбекистон ва Тоҷикистон дар ҳамин нимкура.", "Узбекистан и Таджикистан — в этом полушарии.")), info(south, loc("Janubiy yarim shar", "Нимкураи ҷанубӣ", "Южное полушарие"), loc("Fasllar shimolga teskari.", "Фаслҳо баръакси шимол.", "Времена года противоположны северным.")));
    tilt.add(spin, rod(V(0, -1.3, 0), V(0, 1.3, 0), 0.02, mat(0xffffff)));
    earth.add(tilt);
    scene.add(earth);
    const live = { month: 6.5 };
    // 21-mart (≈ 3,7-oy) — bahorgi tengkunlik; 21-iyun (≈ 6,7) — Yer x = −6 da, shimol Quyoshga og'gan
    const angleOf = (m: number) => Math.PI + ((m - 6.7) / 12) * Math.PI * 2;
    return {
      update(p, dt) {
        live.month = p.auto ? ((live.month - 1 + dt * 0.6) % 12) + 1 : p.month;
        const a = angleOf(live.month);
        earth.position.set(Math.cos(a) * 6, 0, -Math.sin(a) * 6);
        spin.rotation.y += dt * 2;
      },
      readout() {
        const m = live.month;
        const decl = 23.44 * Math.sin(((m - 3.7) / 12) * Math.PI * 2);
        const name = MONTHS[Math.floor(m - 1) % 12];
        const season = decl > 8 ? loc("yoz", "тобистон", "лето") : decl < -8 ? loc("qish", "зимистон", "зима") : ((m - 3.7 + 12) % 12) < 6 ? loc("bahor", "баҳор", "весна") : loc("kuz", "тирамоҳ", "осень");
        return [
          loc(`${name.uz}: shimoliy yarim sharda ${season.uz}`, `${name.tg}: дар нимкураи шимолӣ ${season.tg}`, `${name.ru}: в северном полушарии ${season.ru}`),
          loc(`Quyosh og'ishi δ ≈ ${decl.toFixed(1)}°`, `Майли Офтоб δ ≈ ${decl.toFixed(1)}°`, `Склонение Солнца δ ≈ ${decl.toFixed(1)}°`),
          loc("Sabab — Yer o'qining 23,4° og'ishi, masofa emas.", "Сабаб — хамии меҳвари Замин 23,4°, на масофа.", "Причина — наклон земной оси 23,4°, а не расстояние."),
        ];
      },
    };
  },
};

const earthLayersLab: LabDef = {
  key: "earth-layers",
  category: "ASTRONOMY",
  title: loc("Yerning ichki tuzilishi", "Сохти дохилии Замин", "Внутреннее строение Земли"),
  camera: [5, 3, 8],
  params: [{ id: "spin", label: loc("Aylanish", "Гардиш", "Вращение"), value: 1, options: [{ value: 1, label: loc("Yoqilgan", "Фаъол", "Вкл.") }, { value: 0, label: loc("To'xtagan", "Қатъ", "Выкл.") }] }],
  build(scene) {
    const g = new THREE.Group();
    const layer = (r: number, color: number, title: Localized, body: Localized, full = false) => {
      const geo = full ? new THREE.SphereGeometry(r, 48, 32) : new THREE.SphereGeometry(r, 48, 32, 0, Math.PI * 1.5);
      g.add(info(new THREE.Mesh(geo, mat(color, { side: THREE.DoubleSide, roughness: 0.8 })), title, body));
    };
    layer(3.5, 0x6b8f4e, loc("Yer po'sti", "Пӯстаи Замин", "Земная кора"), loc("Qalinligi 5–70 km. Biz shu qatlamda yashaymiz.", "Ғафсӣ 5–70 км. Мо дар ҳамин қабат зиндагӣ мекунем.", "Толщина 5–70 км. Мы живём на этом слое."));
    layer(3.35, 0xd2552d, loc("Mantiya", "Мантия", "Мантия"), loc("~2900 km gacha; qovushqoq, harakatlanuvchi tog' jinslari.", "То ~2900 км; ҷинсҳои часпаки ҳаракаткунанда.", "До ~2900 км; вязкие подвижные породы."));
    layer(1.9, 0xf59a23, loc("Tashqi yadro", "Ядрои берунӣ", "Внешнее ядро"), loc("Suyuq temir-nikel; Yer magnit maydonini hosil qiladi.", "Оҳан-никели моеъ; майдони магнитии Заминро ҳосил мекунад.", "Жидкое железо-никель; создаёт магнитное поле Земли."));
    layer(0.7, 0xffd34d, loc("Ichki yadro", "Ядрои дарунӣ", "Внутреннее ядро"), loc("Radiusi ~1220 km, qattiq, harorati ~5400 °C.", "Радиус ~1220 км, сахт, ҳарорат ~5400 °C.", "Радиус ~1220 км, твёрдое, ~5400 °C."), true);
    scene.add(g);
    return {
      update(p, dt) {
        if (p.spin) g.rotation.y += dt * 0.3;
      },
      readout: () => [
        loc("Po'st → mantiya → tashqi yadro → ichki yadro", "Пӯста → мантия → ядрои берунӣ → ядрои дарунӣ", "Кора → мантия → внешнее ядро → внутреннее ядро"),
        loc("Yer radiusi ≈ 6371 km. Qatlamni bosing.", "Радиуси Замин ≈ 6371 км. Қабатро пахш кунед.", "Радиус Земли ≈ 6371 км. Нажмите на слой."),
      ],
    };
  },
};

/* ───────────────────────── INFORMATIKA, TARIX, TILLAR ───────────────────────── */

const robotLab: LabDef = {
  key: "robot",
  category: "OTHER",
  title: loc("Robot qo'li (kinematika)", "Дасти робот (кинематика)", "Робот-манипулятор (кинематика)"),
  camera: [5, 4, 7],
  target: [0, 1.5, 0],
  live: true,
  params: [
    { id: "base", label: loc("Asos burilishi (°)", "Гардиши асос (°)", "Поворот основания (°)"), min: -180, max: 180, step: 1, value: 30 },
    { id: "shoulder", label: loc("Yelka (°)", "Китф (°)", "Плечо (°)"), min: -80, max: 80, step: 1, value: 20 },
    { id: "elbow", label: loc("Tirsak (°)", "Оринҷ (°)", "Локоть (°)"), min: -130, max: 130, step: 1, value: -50 },
    { id: "grip", label: loc("Changak", "Чангак", "Захват"), min: 0, max: 1, step: 0.05, value: 0.5 },
  ],
  build(scene) {
    const grid = new THREE.GridHelper(8, 8, 0x888888, 0xcccccc);
    scene.add(noPick(grid));
    const metal = mat(0x8a99a8, { metalness: 0.6, roughness: 0.35 }), accent = mat(0xe8a317);
    const base = new THREE.Group();
    base.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.4, 32), metal));
    const shoulder = new THREE.Group();
    shoulder.position.y = 0.5;
    shoulder.add(sphere(0.3, accent));
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 0.3), metal);
    upper.position.y = 1;
    const elbow = new THREE.Group();
    elbow.position.y = 2;
    elbow.add(sphere(0.25, accent));
    const fore = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 0.25), metal);
    fore.position.y = 0.8;
    const wrist = new THREE.Group();
    wrist.position.y = 1.6;
    const fingers = [-1, 1].map((s) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.2), accent);
      f.position.set(s * 0.15, 0.22, 0);
      wrist.add(f);
      return { f, s };
    });
    elbow.add(fore, wrist);
    shoulder.add(upper, elbow);
    base.add(shoulder);
    scene.add(info(base, loc("Robot-manipulator", "Робот-манипулятор", "Робот-манипулятор"), loc("Har bo'g'in burchagini o'zgartirib, qo'l uchini kerakli nuqtaga olib boring.", "Кунҷи ҳар буғумро тағйир дода, нӯги дастро ба нуқтаи лозимӣ баред.", "Меняя углы суставов, приведите захват в нужную точку.")));
    const tip = new THREE.Vector3();
    return {
      update(p) {
        base.rotation.y = deg(p.base);
        shoulder.rotation.z = deg(p.shoulder);
        elbow.rotation.z = deg(p.elbow);
        for (const { f, s } of fingers) f.position.x = s * (0.08 + 0.15 * p.grip);
        wrist.updateWorldMatrix(true, false);
        wrist.getWorldPosition(tip);
      },
      readout: (p) => [
        same(`(x, y, z) = (${f2(tip.x)}, ${f2(tip.y)}, ${f2(tip.z)})`),
        loc(`To'g'ri kinematika: burchaklar (${p.base}°, ${p.shoulder}°, ${p.elbow}°) → uch holati`, `Кинематикаи мустақим: кунҷҳо (${p.base}°, ${p.shoulder}°, ${p.elbow}°) → ҳолати нӯг`, `Прямая кинематика: углы (${p.base}°, ${p.shoulder}°, ${p.elbow}°) → положение захвата`),
        loc("Algoritm mashqi: qo'lni (2; 2; 0) nuqtaga olib boradigan burchaklarni toping.", "Машқи алгоритм: кунҷҳоеро ёбед, ки дастро ба нуқтаи (2; 2; 0) мебаранд.", "Задача: подберите углы, чтобы захват попал в точку (2; 2; 0)."),
      ],
    };
  },
};

const monumentLab: LabDef = {
  key: "monument",
  category: "OTHER",
  title: loc("Tarixiy obida: minora", "Ёдгории таърихӣ: манора", "Исторический памятник: минарет"),
  camera: [6, 4, 10],
  target: [0, 3, 0],
  params: [{ id: "person", label: loc("Masshtab uchun odam", "Одам барои миқёс", "Человек для масштаба"), value: 1, options: [{ value: 1, label: loc("Ko'rsatish", "Нишон додан", "Показать") }, { value: 0, label: loc("Yashirish", "Пинҳон кардан", "Скрыть") }] }],
  build(scene) {
    const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 48), mat(0xd9c7a3));
    ground.rotation.x = -Math.PI / 2;
    scene.add(noPick(ground));
    const tower = new THREE.Group();
    const brick = mat(0xc9a26b, { roughness: 0.9 }), band = mat(0x8b6a3e, { roughness: 0.9 }), tile = mat(0x2fa3a8, { roughness: 0.5 });
    const H = 6.8; // ≈ 46 m
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const r0 = 1.0 - (i / segs) * 0.38, r1 = 1.0 - ((i + 1) / segs) * 0.38;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, H / segs, 32), brick);
      seg.position.y = (i + 0.5) * (H / segs);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r1 + 0.01, 0.04, 6, 32), i === segs - 2 ? tile : band);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = (i + 1) * (H / segs);
      tower.add(seg, ring);
    }
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.62, 0.8, 32), brick);
    lantern.position.y = H + 0.4;
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const arch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.05), mat(0x3b2a1a));
      arch.position.set(Math.cos(a) * 0.72, H + 0.4, Math.sin(a) * 0.72);
      arch.rotation.y = -a + Math.PI / 2;
      tower.add(arch);
    }
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tile);
    cap.position.y = H + 0.8;
    tower.add(lantern, cap);
    scene.add(info(tower, loc("Kalon minorasi (Buxoro)", "Манораи Калон (Бухоро)", "Минарет Калян (Бухара)"), loc("1127-yilda qurilgan, balandligi ≈ 46 m. Model sxematik.", "Соли 1127 сохта шудааст, баландӣ ≈ 46 м. Модел схематикӣ аст.", "Построен в 1127 году, высота ≈ 46 м. Модель схематическая.")));
    const person = new THREE.Group();
    person.add(rod(V(0, 0, 0), V(0, 0.2, 0), 0.04, mat(0x1f4fa3)), sphere(0.045, mat(0xe9c7a1), [0, 0.23, 0], 10));
    person.position.set(1.6, 0, 0.5);
    scene.add(info(person, loc("Odam (1,7 m)", "Одам (1,7 м)", "Человек (1,7 м)"), loc("Minora odamdan taxminan 27 marta baland.", "Манора тақрибан 27 маротиба аз одам баландтар аст.", "Минарет примерно в 27 раз выше человека.")));
    return {
      update(p, dt) {
        person.visible = p.person === 1;
        tower.rotation.y += dt * 0.1;
      },
      readout: () => [
        loc("Qoraxoniylar davri, me'mor — Bako. G'ishtdan naqshli bezak.", "Давраи Қарахониён, меъмор — Бако. Ороиши нақшин аз хишт.", "Эпоха Караханидов, зодчий — Бако. Узорная кирпичная кладка."),
        loc("Mashq: soya uzunligi bo'yicha minora balandligini o'lchash usulini muhokama qiling.", "Машқ: усули чен кардани баландии манораро аз рӯи дарозии соя муҳокима кунед.", "Задание: обсудите, как измерить высоту минарета по длине тени."),
      ],
    };
  },
};

const VOCAB: { word: Localized; en: string; make: () => THREE.Object3D }[] = [
  { word: loc("olma", "себ", "яблоко"), en: "apple", make: () => sphere(0.5, mat(0xd43c3c, { roughness: 0.4 }), [0, 0.5, 0], 32) },
  {
    word: loc("daraxt", "дарахт", "дерево"), en: "tree", make: () => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 12), mat(0x8b5a2b));
      trunk.position.y = 0.4;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.3, 16), mat(0x2f9e44));
      crown.position.y = 1.4;
      g.add(trunk, crown);
      return g;
    },
  },
  {
    word: loc("uy", "хона", "дом"), en: "house", make: () => {
      const g = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.9), mat(0xf2e3c6));
      walls.position.y = 0.4;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.6, 4), mat(0xb3562b));
      roof.position.y = 1.1;
      roof.rotation.y = Math.PI / 4;
      g.add(walls, roof);
      return g;
    },
  },
  {
    word: loc("kitob", "китоб", "книга"), en: "book", make: () => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 1.1), mat(0x1f4fa3));
      b.position.y = 0.09;
      return b;
    },
  },
  { word: loc("to'p", "тӯб", "мяч"), en: "ball", make: () => sphere(0.4, mat(0xe8a317), [0, 0.4, 0], 32) },
];

const vocabLab: LabDef = {
  key: "vocab",
  category: "OTHER",
  title: loc("3D lug'at: so'z va buyum", "Луғати 3D: калима ва ашё", "3D-словарь: слово и предмет"),
  camera: [0, 3, 8],
  target: [0, 0.6, 0],
  params: [{ id: "spin", label: loc("Aylanish", "Гардиш", "Вращение"), value: 1, options: [{ value: 1, label: loc("Yoqilgan", "Фаъол", "Вкл.") }, { value: 0, label: loc("To'xtagan", "Қатъ", "Выкл.") }] }],
  build(scene, lang) {
    const items = VOCAB.map((v, i) => {
      const g = new THREE.Group();
      g.position.x = (i - (VOCAB.length - 1) / 2) * 2;
      const obj = v.make();
      g.add(info(obj, v.word, same(`O'zbekcha: ${v.word.uz} · Тоҷикӣ: ${v.word.tg} · Русский: ${v.word.ru} · English: ${v.en}`)));
      const lb = label(L(v.word, lang), { size: 0.42, color: "#14212b", bg: "rgba(255,255,255,0.85)" });
      lb.position.y = -0.45;
      const en = label(v.en, { size: 0.32, color: "#0e7c86", bg: "rgba(255,255,255,0.85)" });
      en.position.y = -0.95;
      g.add(lb, en);
      scene.add(g);
      return obj;
    });
    return {
      update(p, dt) {
        if (p.spin) for (const o of items) o.rotation.y += dt * 0.6;
      },
      readout: () => [
        loc("Buyumni bosing — so'z to'rt tilda chiqadi.", "Ашёро пахш кунед — калима ба чор забон намоён мешавад.", "Нажмите на предмет — слово появится на четырёх языках."),
        loc("O'yin: o'qituvchi so'zni aytadi, o'quvchi buyumni topadi.", "Бозӣ: муаллим калимаро мегӯяд, хонанда ашёро меёбад.", "Игра: учитель называет слово, ученик находит предмет."),
      ],
    };
  },
};

export const LABS: LabDef[] = [
  inductionLab, circuitLab, lensLab, projectileLab,
  atomLab, moleculeLab, reactionLab,
  cellLab, skeletonLab, heartLab,
  solidsLab, sectionLab,
  solarLab, seasonsLab, earthLayersLab,
  robotLab, monumentLab, vocabLab,
];

const defaults = (def: LabDef): Params => Object.fromEntries(def.params.map((p) => [p.id, p.value]));

/* ───────────────────────── Komponent ───────────────────────── */

export interface LabsCanvasProps {
  lang: Lang;
  /** Boshqariladigan rejim: ota-komponent qaysi laboratoriya ochilishini belgilaydi */
  labKey?: string;
  /** Mashqdan kelgan boshlang'ich qiymatlar, masalan { V: 12, R: 4 } */
  initialParams?: Params;
  showPicker?: boolean;
  height?: number;
  /** Parametrlar o'zgarganda chaqiriladi (laboratoriya o'lchovlari jadvali uchun) */
  onParams?: (p: Params) => void;
}

export default function LabsCanvas({ lang, labKey, initialParams, showPicker = true, height = 460, onParams }: LabsCanvasProps) {
  const [state, setState] = useState(() => {
    const def = LABS.find((l) => l.key === labKey) ?? LABS[0];
    return { key: def.key, params: { ...defaults(def), ...initialParams } };
  });
  const def = useMemo(() => LABS.find((l) => l.key === state.key) ?? LABS[0], [state.key]);
  const [category, setCategory] = useState<LabCategory>(def.category);
  const [selected, setSelected] = useState<Info | null>(null);
  const [error, setError] = useState(false);
  const [, setTick] = useState(0);
  const mountRef = useRef<HTMLDivElement>(null);
  const paramsRef = useRef<Params>(state.params);
  const instRef = useRef<LabInstance | null>(null);
  paramsRef.current = state.params;

  const openLab = useCallback((key: string, init?: Params) => {
    const d = LABS.find((l) => l.key === key);
    if (!d) return;
    setState({ key, params: { ...defaults(d), ...init } });
    setCategory(d.category);
    setSelected(null);
  }, []);

  // Tashqaridan labKey/initialParams o'zgarsa (masalan, mashqdagi "Laboratoriyada" tugmasi).
  // Obyekt har renderda yangi bo'lishi mumkin, shuning uchun qiymat bo'yicha solishtiramiz.
  const initKey = JSON.stringify(initialParams ?? {});
  useEffect(() => {
    if (labKey) openLab(labKey, JSON.parse(initKey) as Params);
  }, [labKey, initKey, openLab]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError(true);
      return;
    }
    setError(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const shadows = window.innerWidth >= 700 && def.lighting !== "space";
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const disposeEnv = def.lighting === "space" ? () => undefined : addStudioLight(renderer, scene, 0.55);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(...def.camera);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(...(def.target ?? [0, 0, 0]));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    if (def.lighting === "space") scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    else {
      scene.add(new THREE.AmbientLight(0xffffff, 0.25));
      key.position.set(5, 8, 6);
      const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
      fill.position.set(-6, -2, -4);
      scene.add(key, fill);
    }
    const inst = def.build(scene, lang);
    inst.update?.(paramsRef.current, 0, 0); // parametrga qarab quriladigan qismlar ham o'lchansin
    instRef.current = inst;
    if (def.lighting !== "space") {
      markShadows(scene);
      const box = new THREE.Box3().setFromObject(scene);
      const size = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3());
      const radius = Math.max(size.x, size.z, 2) * 0.72 + 0.6;
      if (def.stage !== false) {
        const top = surfaceMaterial("bench", 2.5, 2.5, { roughness: 0.35, bumpScale: 0.15 });
        const side = mat(0x334155, { metalness: 0.5, roughness: 0.4 });
        const plinth = noPick(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.02, 0.22, 96), [side, top, side]));
        plinth.position.set(c.x, box.min.y - 0.3, c.z);
        plinth.receiveShadow = true;
        scene.add(plinth);
      }
      const reach = Math.max(radius, size.y) * 1.25;
      key.position.copy(c).add(new THREE.Vector3(0.5, 1, 0.65).normalize().multiplyScalar(reach * 2));
      key.target.position.copy(c);
      scene.add(key.target);
      if (shadows) {
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.radius = 4;
        key.shadow.bias = -0.0005;
        Object.assign(key.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.1, far: reach * 5 });
      }
    }
    setTick((n) => n + 1); // natijalar paneli yangi laboratoriya bilan qayta chizilsin

    const fit = () => {
      const w = el.clientWidth || 300;
      renderer.setSize(w, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = `${height}px`;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    // Obyektni bosish: sudrash bo'lmasa, userData.info ni ko'rsatamiz
    const ray = new THREE.Raycaster();
    ray.params.Line = { threshold: 0.05 };
    ray.params.Points = { threshold: 0.05 };
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      down = null;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      for (const hit of ray.intersectObjects(scene.children, true)) {
        let o: THREE.Object3D | null = hit.object;
        if (o.userData.noPick) continue;
        while (o && !o.userData.info) o = o.parent;
        if (o) {
          setSelected(o.userData.info as Info);
          return;
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1);
      inst.update?.(paramsRef.current, dt, clock.elapsedTime);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();
    const ticker = def.live ? window.setInterval(() => setTick((n) => n + 1), 250) : 0;

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(ticker);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      disposeObject(scene);
      disposeEnv();
      renderer.dispose();
      renderer.domElement.remove();
      instRef.current = null;
    };
  }, [def, lang, height]);

  const onParamsRef = useRef(onParams);
  onParamsRef.current = onParams;
  useEffect(() => onParamsRef.current?.(state.params), [state.params]);

  const readout = instRef.current?.readout(state.params) ?? [];
  const setParam = (id: string, v: number) => setState((s) => ({ ...s, params: { ...s.params, [id]: v } }));
  const categories = Object.keys(CATEGORY_LABELS) as LabCategory[];

  return (
    <div className="grid gap-4">
      {showPicker && (
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 text-sm font-semibold border ${c === category ? "bg-brand-500 text-white border-brand-500" : "border-slate-300 dark:border-slate-600"}`}
              >
                {L(CATEGORY_LABELS[c], lang)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {LABS.filter((l) => l.category === category).map((l) => (
              <button
                key={l.key}
                onClick={() => openLab(l.key)}
                className={`rounded-lg px-3 py-1.5 text-sm border ${l.key === def.key ? "bg-cobalt-500 text-white border-cobalt-500" : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"}`}
              >
                {L(l.title, lang)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div
          ref={mountRef}
          className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 ${def.lighting === "space" ? "bg-slate-950" : "bg-gradient-to-b from-sky-50 to-white dark:from-slate-800 dark:to-slate-900"}`}
          style={{ minHeight: height, touchAction: "none" }}
        >
          {error && <p className="p-4 text-sm">WebGL mavjud emas — 3D laboratoriya uchun zamonaviy brauzer kerak.</p>}
        </div>
        <aside className="grid content-start gap-3">
          <h3 className="text-lg font-bold">{L(def.title, lang)}</h3>
          {def.params.map((p) => (
            <label key={p.id} className="grid gap-1 text-sm">
              <span className="font-semibold">
                {L(p.label, lang)}
                {!p.options && <span className="ml-2 font-mono text-brand-600">{state.params[p.id]}</span>}
              </span>
              {p.options ? (
                <select
                  className="rounded-lg border border-slate-300 bg-transparent px-2 py-1.5 dark:border-slate-600"
                  value={state.params[p.id]}
                  onChange={(e) => setParam(p.id, Number(e.target.value))}
                >
                  {p.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {L(o.label, lang)}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="range" min={p.min} max={p.max} step={p.step} value={state.params[p.id]} onChange={(e) => setParam(p.id, Number(e.target.value))} />
              )}
            </label>
          ))}
          <div className="grid gap-1 rounded-xl bg-brand-100 p-3 text-sm text-brand-700 dark:bg-brand-700/30 dark:text-brand-100" aria-live="polite">
            <div className="text-xs font-bold uppercase tracking-wide">{t(lang, "readout")}</div>
            {readout.map((r, i) => (
              <div key={i}>{L(r, lang)}</div>
            ))}
          </div>
          {selected && (
            <div className="rounded-xl border border-saffron-500/50 bg-saffron-100 p-3 text-sm text-slate-900">
              <div className="flex items-center justify-between gap-2">
                <b>{L(selected.title, lang)}</b>
                <button className="text-xs underline" onClick={() => setSelected(null)}>
                  {t(lang, "close")}
                </button>
              </div>
              <p className="mt-1">{L(selected.body, lang)}</p>
            </div>
          )}
          <p className="text-xs text-slate-500">{t(lang, "dragHint")}</p>
        </aside>
      </div>
    </div>
  );
}
