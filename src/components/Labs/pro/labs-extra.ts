/**
 * Qo'shimcha "Pro" 3D laboratoriyalar (labs.ts bilan bir xil muhitda):
 *   electromagnet — fizika: g'altak, temir o'zak, magnit maydon chiziqlari, kompas, skrepkalar
 *   refraction    — fizika: yarim silindrli blok, lazer, Snell qonuni, to'la ichki qaytish
 *   incline       — fizika: qiya tekislik, kuchlar vektorlari, ishqalanish
 *   glassware     — kimyo: laboratoriya idishlari, spirt lampasida suvni qizdirish
 *   vsepr         — kimyo: molekulalarning fazoviy shakli va bog' burchaklari
 *   organs        — biologiya: inson tanasi a'zolari va tizimlari
 */
import * as THREE from "three";
import { markShadows, surfaceMaterial, surfaceTexture } from "@/components/3D/studio";
import type { Tx } from "@/lib/labs/types";
import { disposeTree, mat, type Params, type PickInfo, type ProContext, type ProInstance, type ProLabDef } from "./engine";

const x = (uz: string, tg: string, ru?: string): Tx => ({ uz, tg, ...(ru ? { ru } : {}) });
const r2 = (v: number) => (Math.round(v * 100) / 100).toString();
const r1 = (v: number) => (Math.round(v * 10) / 10).toString();
const V = (a: number, b: number, c: number) => new THREE.Vector3(a, b, c);
const G = 9.81;
const clamp = THREE.MathUtils.clamp;
const deg = THREE.MathUtils.degToRad;
const rad2deg = THREE.MathUtils.radToDeg;

const glass = (o: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.3, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false, ...o });
const steel = () => mat(0xcbd5e1, { metalness: 0.9, roughness: 0.25 });

function tube(pts: THREE.Vector3[], r: number, m: THREE.Material, seg = 64, radial = 10) {
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, radial), m);
}
function lathe(profile: [number, number][], m: THREE.Material, seg = 56) {
  return new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), m);
}
function cyl(rt: number, rb: number, h: number, m: THREE.Material, y = h / 2, seg = 32) {
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  c.position.y = y;
  return c;
}
function box(w: number, h: number, d: number, m: THREE.Material, px = 0, py = h / 2, pz = 0) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(px, py, pz);
  return b;
}
/** Kuch yoki maydon vektori: silindr va konus */
function arrow(color: number) {
  const m = mat(color, { emissive: color, emissiveIntensity: 0.35, roughness: 0.4 });
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 12), m);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 16), m);
  group.add(shaft, head);
  const UP = V(0, 1, 0);
  return {
    group,
    set(origin: THREE.Vector3, f: THREE.Vector3) {
      const len = f.length();
      group.visible = len > 0.02;
      if (!group.visible) return;
      group.position.copy(origin);
      group.quaternion.setFromUnitVectors(UP, f.clone().normalize());
      const s = Math.max(len - 0.32, 0.02);
      shaft.scale.y = s;
      shaft.position.y = s / 2;
      head.position.y = s + 0.16;
    },
  };
}
/** Nur: ichki yorqin chiziq va tashqi nurlanish */
function beam() {
  const core = new THREE.MeshBasicMaterial({ color: 0xff1a1a, transparent: true, toneMapped: false, depthWrite: false });
  const halo = new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, toneMapped: false, depthWrite: false });
  const group = new THREE.Group();
  const a = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1, 10), core);
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1, 12), halo);
  group.add(a, b);
  const UP = V(0, 1, 0);
  return {
    group,
    set(from: THREE.Vector3, to: THREE.Vector3, alpha: number) {
      group.visible = alpha > 0.01;
      const d = to.clone().sub(from);
      const len = d.length();
      group.position.copy(from).addScaledVector(d, 0.5);
      group.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
      group.scale.y = len;
      core.opacity = clamp(alpha, 0, 1);
      halo.opacity = clamp(alpha * 0.28, 0, 1);
    },
  };
}

/* ═════════════════════ FIZIKA: elektromagnit ═════════════════════ */

class VerticalCoil extends THREE.Curve<THREE.Vector3> {
  constructor(private turns: number, private y0: number, private len: number, private r: number) {
    super();
  }
  getPoint(u: number, t = new THREE.Vector3()) {
    const a = u * this.turns * Math.PI * 2;
    return t.set(this.r * Math.cos(a), this.y0 + this.len * u, this.r * Math.sin(a));
  }
}

/** Soddalashtirilgan model: uzun g'altak formulasi, kalta o'zakning effektiv μ ≈ 100, to'yinish 1,5 T */
export function electromagnetField(N: number, I: number, core: number) {
  const B0 = 4 * Math.PI * 1e-7 * (N / 0.1) * I;
  const B = core ? Math.min(1.5, B0 * 100) : B0;
  return { B0, B, clips: core ? Math.min(12, Math.floor(B / 0.1)) : 0 };
}

const electromagnetLab: ProLabDef = {
  key: "electromagnet",
  title: x("Elektromagnit: g'altak, o'zak va magnit maydon", "Электромагнит: ғалтак, мағзӣ ва майдони магнитӣ", "Электромагнит: катушка, сердечник и магнитное поле"),
  camera: [4.6, 4.6, 9],
  target: [0.3, 2.3, 0],
  params: [
    { id: "I", label: x("Tok kuchi I", "Қувваи ҷараён I", "Сила тока I"), value: 2, min: 0, max: 5, step: 0.5, unit: "A" },
    { id: "N", label: x("O'ramlar soni N", "Шумораи печҳо N", "Число витков N"), value: 100, options: [{ value: 50, label: x("50 o'ram", "50 печ", "50 витков") }, { value: 100, label: x("100 o'ram", "100 печ", "100 витков") }, { value: 200, label: x("200 o'ram", "200 печ", "200 витков") }] },
    { id: "core", label: x("O'zak", "Мағзӣ", "Сердечник"), value: 1, options: [{ value: 1, label: x("Temir o'zak", "Мағзии оҳанӣ", "Железный") }, { value: 0, label: x("O'zaksiz (havo)", "Бе мағзӣ (ҳаво)", "Без сердечника") }] },
    { id: "dir", label: x("Tok yo'nalishi", "Самти ҷараён", "Направление тока"), value: 1, options: [{ value: 1, label: x("To'g'ri", "Рост", "Прямое") }, { value: -1, label: x("Teskari", "Баръакс", "Обратное") }] },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const CY = 3.2;
    const COIL_Y0 = 2.1;
    const COIL_LEN = 2.2;
    // Shtativ
    const stand = new THREE.Group();
    stand.add(box(1.9, 0.14, 1.3, surfaceMaterial("wood", 1, 0.7), -2.2, 0.07));
    const rodM = steel();
    const post = cyl(0.06, 0.06, 5.2, rodM, 2.6);
    post.position.x = -2.2;
    const arm = box(2.3, 0.1, 0.1, rodM, -1.05, 4.95);
    stand.add(post, arm);
    ctx.pickable(stand, "stand");
    scene.add(stand);
    // O'zak
    const coreMesh = cyl(0.22, 0.22, 3.2, mat(0x6b7280, { metalness: 0.92, roughness: 0.38 }), 3.3, 40);
    ctx.pickable(coreMesh, "core");
    scene.add(coreMesh);
    // G'altak: uch xil o'ram zichligi
    const bobbin = glass({ color: 0xfde68a, opacity: 0.5 });
    const flangeA = cyl(0.56, 0.56, 0.05, bobbin, COIL_Y0 - 0.04, 40);
    const flangeB = cyl(0.56, 0.56, 0.05, bobbin, COIL_Y0 + COIL_LEN + 0.04, 40);
    scene.add(flangeA, flangeB);
    const copper = mat(0xc77b30, { metalness: 0.9, roughness: 0.27 });
    const coils = new Map<number, THREE.Mesh>();
    for (const [n, turns, wire] of [[50, 13, 0.075], [100, 25, 0.041], [200, 46, 0.023]] as const) {
      const c = new THREE.Mesh(new THREE.TubeGeometry(new VerticalCoil(turns, COIL_Y0, COIL_LEN, 0.34), turns * 28, wire, 8), copper);
      ctx.pickable(c, "coil");
      scene.add(c);
      coils.set(n, c);
    }
    // Quvvat manbai va simlar
    const psu = new THREE.Group();
    psu.add(box(1.5, 0.9, 1, mat(0x1e293b, { roughness: 0.35, metalness: 0.2 }), 0, 0.45, 0));
    const red = mat(0xdc2626, { roughness: 0.3 });
    const black = mat(0x111827, { roughness: 0.3 });
    const t1 = cyl(0.07, 0.07, 0.14, red, 0.5);
    t1.position.set(-0.4, 0.5, 0.53);
    t1.rotation.x = Math.PI / 2;
    const t2 = cyl(0.07, 0.07, 0.14, black, 0.5);
    t2.position.set(0.4, 0.5, 0.53);
    t2.rotation.x = Math.PI / 2;
    psu.add(t1, t2);
    psu.position.set(3.5, 0, -1);
    ctx.pickable(psu, "psu");
    scene.add(psu);
    scene.add(tube([V(3.1, 0.5, -0.4), V(2.2, 0.3, 0.6), V(1.2, 1.4, 0.7), V(0.34, COIL_Y0, 0)], 0.03, red));
    scene.add(tube([V(3.9, 0.5, -0.4), V(3, 2.6, -0.4), V(1.6, 4.4, -0.2), V(0.34, COIL_Y0 + COIL_LEN, 0)], 0.03, black));
    const display = ctx.label("I = 0 A", { bg: "rgba(5,46,22,0.95)", color: "#86efac", scale: 0.6 });
    display.sprite.position.set(3.5, 1.35, -1);
    scene.add(display.sprite);
    // Qutblar
    const poleTop = ctx.label("N", { bg: "rgba(220,38,38,0.92)", scale: 0.42 });
    const poleBottom = ctx.label("S", { bg: "rgba(37,99,235,0.92)", scale: 0.42 });
    poleTop.sprite.position.set(0.55, 5, 0.3);
    poleBottom.sprite.position.set(0.7, 1.55, 0.3);
    scene.add(poleTop.sprite, poleBottom.sprite);
    // Maydon chiziqlari va harakatlanuvchi strelkalar
    const fieldMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, depthWrite: false });
    const flows: { curve: THREE.CatmullRomCurve3; cones: THREE.Mesh[] }[] = [];
    const coneGeo = new THREE.ConeGeometry(0.07, 0.2, 12);
    for (let k = 0; k < 8; k++) {
      const phi = (k / 8) * Math.PI * 2;
      const a = 2.2 + (k % 2) * 0.35;
      const b = 1.05 + (k % 2) * 0.55;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 32; i++) {
        const t = 0.1 + (i / 32) * (Math.PI - 0.2);
        const rho = b * Math.sin(t);
        pts.push(V(rho * Math.cos(phi), CY + a * Math.cos(t), rho * Math.sin(phi)));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 72, 0.012, 6), fieldMat));
      const cones = [0, 1].map(() => {
        const c = new THREE.Mesh(coneGeo, fieldMat);
        scene.add(c);
        return c;
      });
      flows.push({ curve, cones });
    }
    // Skrepkalar
    const clipCurve = new THREE.CatmullRomCurve3([V(-0.13, -0.04, 0), V(-0.13, 0.04, 0), V(0.13, 0.04, 0), V(0.13, -0.04, 0)], true, "catmullrom", 0.8);
    const clipGeo = new THREE.TubeGeometry(clipCurve, 40, 0.012, 6, true);
    const clipMat = mat(0x64748b, { metalness: 0.9, roughness: 0.3 });
    const clipGroup = new THREE.Group();
    const clips = Array.from({ length: 12 }, (_, i) => {
      const a = i * 2.4;
      const r = 0.35 + (i % 4) * 0.2;
      const m = new THREE.Mesh(clipGeo, clipMat);
      const home = V(Math.cos(a) * r, 0.02, Math.sin(a) * r);
      const stuck = V(Math.cos(i * 1.57) * 0.2, 1.55 - Math.floor(i / 4) * 0.24, Math.sin(i * 1.57) * 0.2);
      m.position.copy(home);
      m.rotation.set(Math.PI / 2, 0, a);
      clipGroup.add(m);
      return { m, home, stuck, spin: a };
    });
    ctx.pickable(clipGroup, "clips");
    scene.add(clipGroup);
    // Kompas
    const compass = new THREE.Group();
    compass.add(cyl(0.6, 0.62, 0.1, mat(0x7c3f12, { metalness: 0.5, roughness: 0.4 }), 0.05, 48));
    compass.add(cyl(0.54, 0.54, 0.02, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 }), 0.11, 48));
    const needle = new THREE.Group();
    needle.add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 4).rotateZ(-Math.PI / 2).translate(0.25, 0, 0), mat(0xdc2626, { metalness: 0.3 })));
    needle.add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 4).rotateZ(Math.PI / 2).translate(-0.25, 0, 0), mat(0x475569, { metalness: 0.3 })));
    needle.position.y = 0.17;
    compass.add(needle);
    compass.position.set(2.2, 0, 1.2);
    ctx.pickable(compass, "compass");
    scene.add(compass);

    return {
      reset() {
        for (const c of clips) c.m.position.copy(c.home);
      },
      frame(p, time) {
        const f = electromagnetField(p.N, p.I, p.core);
        coils.forEach((c, n) => (c.visible = n === p.N));
        coreMesh.visible = Boolean(p.core);
        display.set(`I = ${p.I} A`);
        poleTop.set(p.dir > 0 ? "N" : "S");
        poleBottom.set(p.dir > 0 ? "S" : "N");
        const on = f.B > 1e-6;
        poleTop.sprite.visible = poleBottom.sprite.visible = on;
        fieldMat.opacity = on ? clamp((Math.log10(f.B) + 4) / 4.2, 0.08, 0.9) : 0;
        fieldMat.visible = on;
        flows.forEach((fl, k) => {
          fl.cones.forEach((c, j) => {
            let u = (time * (0.12 + f.B * 0.25) + j / 2 + k / 8) % 1;
            if (p.dir < 0) u = 1 - u;
            c.position.copy(fl.curve.getPointAt(u));
            const tan = fl.curve.getTangentAt(u).multiplyScalar(p.dir > 0 ? 1 : -1);
            c.quaternion.setFromUnitVectors(V(0, 1, 0), tan);
          });
        });
        clips.forEach((c, i) => {
          const held = i < f.clips;
          c.m.position.lerp(held ? c.stuck : c.home, 0.14);
          c.m.rotation.x = THREE.MathUtils.lerp(c.m.rotation.x, held ? 0 : Math.PI / 2, 0.14);
          c.m.rotation.z = THREE.MathUtils.lerp(c.m.rotation.z, held ? Math.PI / 2 : c.spin, 0.14);
        });
        // Past qutb maydoni kompas tomon: Yer maydoni (−z) bilan qo'shiladi
        const toCoil = V(-2.2, 0, -1.2).normalize().multiplyScalar(p.dir * clamp(f.B * 3, 0, 3));
        const net = toCoil.add(V(0, 0, -0.25));
        needle.rotation.y = -Math.atan2(net.z, net.x);
      },
      pick(id, p): PickInfo {
        const f = electromagnetField(p.N, p.I, p.core);
        if (id === "core") return { title: x("Temir o'zak", "Мағзии оҳанӣ", "Железный сердечник"), body: x("Temir magnitlanib, g'altak maydonini ko'p marta kuchaytiradi. Tok o'chsa, magnitlanish deyarli yo'qoladi.", "Оҳан магнитӣ шуда, майдони ғалтакро чандин маротиба пурзӯр мекунад. Ҷараён хомӯш шавад, магнитнокӣ қариб нест мешавад.") };
        if (id === "coil") return { title: x(`G'altak: ${p.N} o'ram`, `Ғалтак: ${p.N} печ`), body: x("Mis simdan o'ralgan. O'ramlar soni yoki tok ortsa, maydon kuchayadi: B ~ N·I.", "Аз сими мис печонида шудааст. Шумораи печҳо ё ҷараён зиёд шавад, майдон қавитар мешавад: B ~ N·I.") };
        if (id === "psu") return { title: x("Tok manbai", "Манбаи ҷараён", "Источник тока"), body: x("G'altakka o'zgarmas tok beradi. Yo'nalish teskari bo'lsa, N va S qutblar almashadi.", "Ба ғалтак ҷараёни доимӣ медиҳад. Самт баръакс шавад, қутбҳои N ва S иваз мешаванд.") };
        if (id === "clips") return { title: x(`Skrepkalar: ${f.clips} ta tortilgan`, `Скрепкаҳо: ${f.clips} дона кашида шуд`), body: x("Po'lat skrepkalar magnit maydonida o'zi ham magnitlanib, o'zakka yopishadi.", "Скрепкаҳои пӯлодӣ дар майдони магнитӣ худ магнитӣ шуда, ба мағзӣ мечаспанд.") };
        if (id === "compass") return { title: x("Kompas", "Қутбнамо", "Компас"), body: x("Qizil uchi maydon yo'nalishini ko'rsatadi. Tok yo'nalishini o'zgartirib, burilishini kuzating.", "Нӯги сурх самти майдонро нишон медиҳад. Самти ҷараёнро иваз карда, гардишашро мушоҳида кунед.") };
        return { title: x("Shtativ", "Штатив", "Штатив"), body: x("Elektromagnitni stol ustida ushlab turadi.", "Электромагнитро дар болои миз нигоҳ медорад.") };
      },
      readout(p) {
        const f = electromagnetField(p.N, p.I, p.core);
        return [
          { label: x("Tok kuchi I", "Ҷараён I"), value: `${p.I} A` },
          { label: x("O'zaksiz maydon B₀", "Майдон бе мағзӣ B₀"), value: `${r2(f.B0 * 1000)} mT` },
          { label: x("Haqiqiy maydon B", "Майдони воқеӣ B"), value: `${r2(f.B * 1000)} mT` },
          { label: x("Tortilgan skrepkalar", "Скрепкаҳои кашидашуда"), value: `${f.clips} / 12` },
          { label: x("Yuqori qutb", "Қутби боло"), value: f.B > 1e-6 ? (p.dir > 0 ? "N" : "S") : "—" },
        ];
      },
      measure(p) {
        const f = electromagnetField(p.N, p.I, p.core);
        return { I: p.I, N: p.N, B: Math.round(f.B * 100000) / 100, clips: f.clips };
      },
      hint(p) {
        return p.I === 0 ? x("Tok kuchini oshiring va skrepkalarni kuzating", "Қувваи ҷараёнро зиёд кунед ва скрепкаҳоро мушоҳида кунед") : null;
      },
    };
  },
};

/* ═════════════════════ FIZIKA: yorug'lik sinishi ═════════════════════ */

/** Snell qonuni va Frenel qaytishi (qutblanmagan nur). sin > 1 bo'lsa — to'la ichki qaytish */
export function refractionCalc(n1: number, n2: number, a1deg: number) {
  const a1 = deg(a1deg);
  const s = (n1 / n2) * Math.sin(a1);
  if (s >= 1) return { tir: true, a2: 0, R: 1 };
  const a2 = Math.asin(s);
  const c1 = Math.cos(a1);
  const c2 = Math.cos(a2);
  const Rs = ((n1 * c1 - n2 * c2) / (n1 * c1 + n2 * c2)) ** 2;
  const Rp = ((n1 * c2 - n2 * c1) / (n1 * c2 + n2 * c1)) ** 2;
  return { tir: false, a2: rad2deg(a2), R: (Rs + Rp) / 2 };
}

const MEDIA: { n: number; label: Tx; color: number }[] = [
  { n: 1.33, label: x("Suv (n = 1,33)", "Об (n = 1,33)", "Вода (n = 1,33)"), color: 0x7cc4f5 },
  { n: 1.47, label: x("Glitserin (n = 1,47)", "Глитсерин (n = 1,47)", "Глицерин (n = 1,47)"), color: 0xf0d060 },
  { n: 1.5, label: x("Shisha (n = 1,50)", "Шиша (n = 1,50)", "Стекло (n = 1,50)"), color: 0x7fdcc4 },
  { n: 2.42, label: x("Olmos (n = 2,42)", "Алмос (n = 2,42)", "Алмаз (n = 2,42)"), color: 0xd6e4ff },
];

const refractionLab: ProLabDef = {
  key: "refraction",
  title: x("Yorug'likning sinishi va to'la ichki qaytish", "Шикасти рӯшноӣ ва инъикоси пурраи дохилӣ", "Преломление света и полное внутреннее отражение"),
  camera: [1.2, 7.2, 6.6],
  target: [0, 0.3, 0],
  params: [
    { id: "a", label: x("Tushish burchagi", "Кунҷи афтиш", "Угол падения"), value: 40, min: 0, max: 85, step: 1, unit: "°" },
    { id: "n", label: x("Blok moddasi", "Моддаи блок", "Материал блока"), value: 1.5, options: MEDIA.map((m) => ({ value: m.n, label: m.label })) },
    { id: "dir", label: x("Nur yo'nalishi", "Самти нур", "Направление луча"), value: 0, options: [{ value: 0, label: x("Havodan moddaga", "Аз ҳаво ба модда", "Из воздуха в среду") }, { value: 1, label: x("Moddadan havoga", "Аз модда ба ҳаво", "Из среды в воздух") }] },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const Y = 0.32;
    const RAY = 3.05;
    const O = V(0, Y, 0);
    // Burchak o'lchagich diski
    scene.add(cyl(3.05, 3.08, 0.06, mat(0x334155, { metalness: 0.6, roughness: 0.35 }), 0.03, 96));
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const g = c.getContext("2d") as CanvasRenderingContext2D;
    g.fillStyle = "#f8fafc";
    g.fillRect(0, 0, 1024, 1024);
    g.translate(512, 512);
    g.strokeStyle = g.fillStyle = "#0f172a";
    g.textAlign = "center";
    g.textBaseline = "middle";
    for (let d = 0; d < 360; d += 5) {
      const big = d % 10 === 0;
      g.save();
      g.rotate(deg(d));
      g.lineWidth = big ? 3 : 1.5;
      g.beginPath();
      g.moveTo(0, -500);
      g.lineTo(0, big ? -462 : -482);
      g.stroke();
      if (d % 30 === 0) {
        const shown = d <= 90 ? d : d <= 180 ? 180 - d : d <= 270 ? d - 180 : 360 - d;
        g.font = "bold 30px sans-serif";
        g.fillText(String(shown), 0, -432);
      }
      g.restore();
    }
    g.strokeStyle = "#64748b";
    g.lineWidth = 3;
    g.setLineDash([18, 12]);
    g.beginPath();
    g.moveTo(0, -460);
    g.lineTo(0, 460);
    g.stroke();
    g.setLineDash([]);
    g.strokeStyle = "#0f172a";
    g.beginPath();
    g.moveTo(-460, 0);
    g.lineTo(460, 0);
    g.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const face = new THREE.Mesh(new THREE.CircleGeometry(3, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    face.rotation.x = -Math.PI / 2;
    face.position.y = 0.064;
    ctx.pickable(face, "disc");
    scene.add(face);
    // Yarim silindrli blok (z < 0 tomonda)
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 2, Math.PI, Math.PI * 2, false);
    shape.closePath();
    const blockMat = glass({ opacity: 0.42, side: THREE.FrontSide });
    const block = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false, curveSegments: 72 }), blockMat);
    block.rotation.x = Math.PI / 2;
    block.position.y = 0.57;
    ctx.pickable(block, "block");
    block.add(new THREE.LineSegments(new THREE.EdgesGeometry(block.geometry, 30), new THREE.LineBasicMaterial({ color: 0x0e7c86 })));
    scene.add(block);
    // Lazer
    const laser = new THREE.Group();
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.9, 28).rotateX(Math.PI / 2), mat(0x1e293b, { metalness: 0.7, roughness: 0.3 }));
    housing.position.z = -0.35;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.18, 24).rotateX(Math.PI / 2), steel());
    nozzle.position.z = 0.18;
    const stem = box(0.08, Y, 0.08, steel(), 0, -Y / 2, -0.35);
    laser.add(housing, nozzle, stem);
    ctx.pickable(laser, "laser");
    scene.add(laser);
    const incident = beam();
    const refracted = beam();
    const reflected = beam();
    scene.add(incident.group, refracted.group, reflected.group);
    const a1Tag = ctx.label("", { bg: "rgba(220,38,38,0.92)", scale: 0.5 });
    const a2Tag = ctx.label("", { bg: "rgba(14,124,134,0.92)", scale: 0.5 });
    scene.add(a1Tag.sprite, a2Tag.sprite);

    const calc = (p: Params) => (p.dir ? refractionCalc(p.n, 1, p.a) : refractionCalc(1, p.n, p.a));
    return {
      reset() {},
      frame(p) {
        const a = deg(p.a);
        const zs = p.dir ? -1 : 1; // nur keladigan tomon
        const S = V(-Math.sin(a) * 3.6, Y, zs * Math.cos(a) * 3.6);
        laser.position.copy(S);
        laser.lookAt(O);
        const res = calc(p);
        blockMat.color.setHex(MEDIA.find((m) => m.n === p.n)?.color ?? 0xffffff);
        blockMat.opacity = p.n > 2 ? 0.7 : 0.55;
        incident.set(S, O, 1);
        reflected.set(O, V(Math.sin(a) * RAY, Y, zs * Math.cos(a) * RAY), Math.max(0.08, res.R));
        if (res.tir) refracted.group.visible = false;
        else {
          const b = deg(res.a2);
          refracted.set(O, V(Math.sin(b) * RAY, Y, -zs * Math.cos(b) * RAY), Math.max(0.15, 1 - res.R));
        }
        a1Tag.set(`α = ${p.a}°`);
        a1Tag.sprite.position.set(-Math.sin(a / 2 + 0.12) * 1.35, 0.9, zs * Math.cos(a / 2 + 0.12) * 1.35);
        a2Tag.set(res.tir ? "R = 100%" : `β = ${r1(res.a2)}°`);
        const b2 = deg(res.tir ? p.a : res.a2);
        a2Tag.sprite.position.set(Math.sin(b2 / 2 + 0.14) * 1.45, 0.9, (res.tir ? zs : -zs) * Math.cos(b2 / 2 + 0.14) * 1.45);
      },
      pick(id, p): PickInfo {
        if (id === "block") return { title: x(`Blok: n = ${p.n}`, `Блок: n = ${p.n}`), body: x("Sindirish ko'rsatkichi yorug'lik moddada vakuumga nisbatan necha marta sekin tarqalishini bildiradi: n = c / v.", "Нишондиҳандаи шикаст нишон медиҳад, ки рӯшноӣ дар модда нисбат ба вакуум чанд маротиба сусттар паҳн мешавад: n = c / v.") };
        if (id === "laser") return { title: x("Lazer", "Лазер", "Лазер"), body: x("Bir rangli ingichka nur beradi. Yarim silindrning egri tomonidan radius bo'ylab o'tgan nur sinmaydi.", "Нури бориками якранг медиҳад. Нуре, ки аз тарафи каҷи нимсилиндр бо радиус мегузарад, намешиканад.") };
        return { title: x("Burchak o'lchagich", "Кунҷсанҷ", "Угломер"), body: x("Burchaklar normaldan (shtrix chiziq) hisoblanadi.", "Кунҷҳо аз нормал (хати нуқтануқта) ҳисоб мешаванд.") };
      },
      readout(p) {
        const res = calc(p);
        const critical = rad2deg(Math.asin(1 / p.n));
        return [
          { label: x("Tushish burchagi α", "Кунҷи афтиш α"), value: `${p.a}°` },
          { label: x("Sinish burchagi β", "Кунҷи шикаст β"), value: res.tir ? "—" : `${r1(res.a2)}°` },
          { label: x("Qaytgan ulush R", "Ҳиссаи инъикос R"), value: `${r1(res.R * 100)} %` },
          { label: x("Chegaraviy burchak", "Кунҷи ҳудудӣ"), value: `${r1(critical)}°` },
          { label: x("Holat", "Ҳолат"), value: res.tir ? "TIR" : "n₁·sinα = n₂·sinβ" },
        ];
      },
      measure(p) {
        const res = calc(p);
        return { a: p.a, b: Math.round(res.a2 * 10) / 10, n: p.n, R: Math.round(res.R * 1000) / 10 };
      },
      hint(p) {
        return p.dir && calc(p).tir ? x("To'la ichki qaytish: nur moddadan chiqa olmayapti", "Инъикоси пурраи дохилӣ: нур аз модда баромада наметавонад") : null;
      },
    };
  },
};

/* ═════════════════════ FIZIKA: qiya tekislik ═════════════════════ */

const inclineLab: ProLabDef = {
  key: "incline",
  title: x("Qiya tekislik: kuchlar va ishqalanish", "Ҳамвории моил: қувваҳо ва соиш", "Наклонная плоскость: силы и трение"),
  camera: [0.8, 3.8, 11],
  target: [-0.8, 2, 0],
  animated: true,
  params: [
    { id: "angle", label: x("Qiyalik burchagi α", "Кунҷи моилӣ α", "Угол наклона α"), value: 30, min: 5, max: 45, step: 1, unit: "°" },
    { id: "m", label: x("Jism massasi m", "Массаи ҷисм m", "Масса тела m"), value: 2, min: 0.5, max: 5, step: 0.1, unit: "kg" },
    { id: "mu", label: x("Ishqalanish koeffitsiyenti μ", "Зариби соиш μ", "Коэффициент трения μ"), value: 0.3, min: 0, max: 0.8, step: 0.01 },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const START = 6.8;
    const END = 0.9;
    const hinge = V(-4, 0.2, 0);
    const plank = new THREE.Group();
    plank.position.copy(hinge);
    const board = box(8, 0.14, 1.7, surfaceMaterial("wood", 3, 0.7), 4, -0.07, 0);
    plank.add(board);
    plank.add(box(0.14, 0.45, 1.7, mat(0x334155, { metalness: 0.5 }), 0.32, 0.22, 0));
    ctx.pickable(plank, "board");
    scene.add(plank);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.9, 24).rotateX(Math.PI / 2), steel());
    pin.position.copy(hinge);
    scene.add(pin);
    scene.add(box(0.5, 0.2, 1.9, mat(0x334155, { metalness: 0.5 }), hinge.x, 0.1, 0));
    const support = cyl(0.07, 0.07, 1, steel(), 0, 20);
    scene.add(support);
    const foot = cyl(0.42, 0.46, 0.08, mat(0x334155, { metalness: 0.5 }), 0.04, 32);
    scene.add(foot);
    const block = new THREE.Mesh(new THREE.BoxGeometry(1, 0.56, 0.9), mat(0xc8a24a, { metalness: 0.85, roughness: 0.32 }));
    plank.add(block);
    ctx.pickable(block, "block");
    const aG = arrow(0xdc2626);
    const aN = arrow(0x2563eb);
    const aF = arrow(0xf59e0b);
    const aNet = arrow(0x16a34a);
    scene.add(aG.group, aN.group, aF.group, aNet.group);
    const tG = ctx.label("P", { bg: "rgba(220,38,38,0.92)", scale: 0.34 });
    const tN = ctx.label("N", { bg: "rgba(37,99,235,0.92)", scale: 0.34 });
    const tF = ctx.label("F", { bg: "rgba(217,119,6,0.92)", scale: 0.34 });
    scene.add(tG.sprite, tN.sprite, tF.sprite);

    let s = START;
    let v = 0;
    const forces = (p: Params) => {
      const a = deg(p.angle);
      const P = p.m * G;
      const N = P * Math.cos(a);
      const par = P * Math.sin(a);
      const fMax = p.mu * N;
      const slides = v > 0 || par > fMax;
      const atEnd = s <= END;
      const F = atEnd || !slides ? Math.min(par, fMax) : fMax;
      return { a, P, N, par, F, net: atEnd ? 0 : par - F, slides: slides && !atEnd };
    };
    return {
      reset() {
        s = START;
        v = 0;
      },
      step(dt, p) {
        const f = forces(p);
        if (!f.slides) {
          v = 0;
          return;
        }
        v = Math.max(0, v + ((f.par - p.mu * f.N) / p.m) * dt);
        s -= v * dt;
        if (s <= END) {
          s = END;
          v = 0;
        }
      },
      frame(p) {
        const f = forces(p);
        plank.rotation.z = f.a;
        const k = Math.cbrt(p.m / 2);
        block.scale.setScalar(k);
        block.position.set(s, 0.28 * k, 0);
        const sx = hinge.x + 7 * Math.cos(f.a);
        const top = hinge.y + 7 * Math.sin(f.a) - 0.14;
        support.scale.y = top;
        support.position.set(sx, top / 2, 0);
        foot.position.set(sx, 0.04, 0);
        block.updateWorldMatrix(true, false);
        const c = block.getWorldPosition(V(0, 0, 0)).setZ(0.55 * k + 0.1);
        const down = V(-Math.cos(f.a), -Math.sin(f.a), 0);
        const nrm = V(-Math.sin(f.a), Math.cos(f.a), 0);
        const K = 0.06;
        const gv = V(0, -f.P * K, 0);
        const nv = nrm.clone().multiplyScalar(f.N * K);
        const fv = down.clone().multiplyScalar(-f.F * K);
        aG.set(c, gv);
        aN.set(c, nv);
        aF.set(c, fv);
        aNet.set(c, down.clone().multiplyScalar(f.net * K));
        tG.sprite.position.copy(c).add(gv).add(V(0.25, -0.1, 0));
        tN.sprite.position.copy(c).add(nv).add(V(0, 0.28, 0));
        tF.sprite.position.copy(c).add(fv).add(V(0.25, 0.2, 0));
        tF.sprite.visible = f.F > 0.3;
      },
      pick(id, p): PickInfo {
        if (id === "block") return { title: x(`Jism: ${p.m} kg`, `Ҷисм: ${p.m} кг`), body: x("Qizil — og'irlik kuchi, ko'k — tayanch reaksiyasi, sariq — ishqalanish, yashil — teng ta'sir etuvchi kuch.", "Сурх — қувваи вазнинӣ, кабуд — аксуламали такя, зард — соиш, сабз — қувваи натиҷавӣ.") };
        return { title: x("Qiya taxta", "Тахтаи моил", "Наклонная доска"), body: x(`Jism tg α > μ bo'lganda sirpanadi. Chegaraviy burchak: ${r1(rad2deg(Math.atan(p.mu)))}°.`, `Ҷисм ҳангоми tg α > μ лағжида меравад. Кунҷи ҳудудӣ: ${r1(rad2deg(Math.atan(p.mu)))}°.`) };
      },
      readout(p) {
        const f = forces(p);
        return [
          { label: x("Og'irlik P = mg", "Вазн P = mg"), value: `${r2(f.P)} N` },
          { label: x("Tayanch reaksiyasi N", "Аксуламали такя N"), value: `${r2(f.N)} N` },
          { label: x("Ishqalanish F", "Соиш F"), value: `${r2(f.F)} N` },
          { label: x("Tezlanish a", "Шитоб a"), value: `${r2(f.net / p.m)} m/s²` },
          { label: x("Tezlik v", "Суръат v"), value: `${r2(v)} m/s` },
          { label: x("Chegaraviy burchak", "Кунҷи ҳудудӣ"), value: `${r1(rad2deg(Math.atan(p.mu)))}°` },
        ];
      },
      measure(p) {
        const f = forces(p);
        return { angle: p.angle, m: p.m, mu: p.mu, a: Math.round((f.net / p.m) * 100) / 100, F: Math.round(f.F * 100) / 100 };
      },
      hint(p) {
        return forces(p).slides ? null : x("Jism joyida turibdi: burchakni oshiring yoki μ ni kamaytiring", "Ҷисм дар ҷояш аст: кунҷро зиёд кунед ё μ-ро кам кунед");
      },
    };
  },
};

/* ═════════════════════ KIMYO: idishlar va qizdirish ═════════════════════ */

const GLASSWARE_INFO: Record<string, PickInfo> = {
  beaker: { title: x("Kimyoviy stakan", "Стакани кимиёвӣ", "Химический стакан"), body: x("Eritmalarni aralashtirish va qizdirish uchun. Shkalasi taxminiy, aniq o'lchov uchun emas.", "Барои омехта ва гарм кардани маҳлулҳо. Ҷадвалаш тахминӣ аст, на барои ченкунии дақиқ.") },
  erlen: { title: x("Konussimon (Erlenmeyer) kolba", "Колбаи конусӣ (Эрленмейер)", "Коническая колба (Эрленмейера)"), body: x("Tor bo'g'zi chayqatganda suyuqlik sachramasligini ta'minlaydi; titrlashda ishlatiladi.", "Гардани танг ҳангоми ҷунбонидан аз пошидани моеъ нигоҳ медорад; дар титронидан истифода мешавад.") },
  round: { title: x("Yumaloq tubli kolba", "Колбаи таги мудаввар", "Круглодонная колба"), body: x("Bir tekis qizdirish va haydash uchun; shtativga mahkamlanadi.", "Барои гарм кардани баробар ва тақтир; ба штатив маҳкам мешавад.") },
  graduated: { title: x("O'lchov silindri", "Силиндри ченкунӣ", "Мерный цилиндр"), body: x("Suyuqlik hajmini aniq o'lchaydi. Sath meniskning pastki nuqtasi bo'yicha o'qiladi.", "Ҳаҷми моеъро дақиқ чен мекунад. Сатҳ аз нуқтаи поёнии мениск хонда мешавад.") },
  funnel: { title: x("Voronka", "Қиф", "Воронка"), body: x("Suyuqlikni tor idishga quyish va filtr qog'oz bilan filtrlash uchun.", "Барои рехтани моеъ ба зарфи танг ва полоиш бо коғази филтр.") },
  tubes: { title: x("Probirkalar", "Пробиркаҳо", "Пробирки"), body: x("Kichik hajmdagi tajribalar uchun. Qizdirganda og'zini odamga qaratmang.", "Барои таҷрибаҳои ҳаҷми хурд. Ҳангоми гарм кардан даҳонашро ба одам нигаронед.") },
  mortar: { title: x("Hovoncha va dasta", "Ҳован ва дастак", "Ступка и пестик"), body: x("Qattiq moddalarni maydalash uchun.", "Барои майда кардани моддаҳои сахт.") },
  bottle: { title: x("Reaktiv shishasi", "Шишаи реактив", "Склянка для реактивов"), body: x("To'q rangli shisha yorug'likdan parchalanadigan moddalarni saqlaydi. Yorliqsiz idishdagi moddani ishlatmang.", "Шишаи торик моддаҳои аз рӯшноӣ таҷзияшавандаро нигоҳ медорад. Моддаи зарфи бебаргчаро истифода набаред.") },
  burner: { title: x("Spirt lampasi", "Чароғи спиртӣ", "Спиртовка"), body: x("Qopqoq bilan o'chiriladi, puflab o'chirilmaydi. Yonib turgan lampaga spirt quyilmaydi.", "Бо сарпӯш хомӯш карда мешавад, пуф карда не. Ба чароғи сӯзон спирт рехта намешавад.") },
  tripod: { title: x("Tagkursi va to'r", "Сепоя ва тӯр", "Треножник с сеткой"), body: x("To'r olovni tarqatib, shisha idishning yorilishidan saqlaydi.", "Тӯр оташро паҳн карда, зарфи шишагиро аз кафидан нигоҳ медорад.") },
  thermo: { title: x("Termometr", "Ҳароратсанҷ", "Термометр"), body: x("Haroratni o'lchaydi; idish tubiga tegmasligi kerak.", "Ҳароратро чен мекунад; набояд ба таги зарф расад.") },
};

const glasswareLab: ProLabDef = {
  key: "glassware",
  title: x("Kimyo laboratoriyasi jihozlari: suvni qizdirish", "Асбобҳои лабораторияи кимиё: гарм кардани об", "Оборудование химической лаборатории: нагрев воды"),
  camera: [0.6, 4.6, 10],
  target: [0, 1.5, 0],
  animated: true,
  params: [
    { id: "fire", label: x("Spirt lampasi", "Чароғи спиртӣ", "Спиртовка"), value: 1, options: [{ value: 1, label: x("Yoqilgan", "Фурӯзон", "Зажжена") }, { value: 0, label: x("O'chirilgan", "Хомӯш", "Погашена") }] },
    { id: "ml", label: x("Suv hajmi", "Ҳаҷми об", "Объём воды"), value: 100, min: 50, max: 200, step: 10, unit: "ml" },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const place = (o: THREE.Object3D, id: string, px: number, pz: number) => {
      o.position.x = px;
      o.position.z = pz;
      ctx.pickable(o, id);
      scene.add(o);
    };
    const liquid = (color: number, opacity = 0.72) => new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: 0.12, clearcoat: 1, depthWrite: false });
    const BEAKER_Y = 1.72;
    // Tagkursi va to'r
    const tripod = new THREE.Group();
    const iron = mat(0x374151, { metalness: 0.75, roughness: 0.45 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      tripod.add(tube([V(Math.cos(a) * 0.95, 0.02, Math.sin(a) * 0.95), V(Math.cos(a) * 0.82, 0.9, Math.sin(a) * 0.82), V(Math.cos(a) * 0.72, 1.62, Math.sin(a) * 0.72)], 0.035, iron, 16));
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.035, 10, 48).rotateX(Math.PI / 2), iron);
    ring.position.y = 1.64;
    const gc = document.createElement("canvas");
    gc.width = gc.height = 256;
    const gg = gc.getContext("2d") as CanvasRenderingContext2D;
    gg.clearRect(0, 0, 256, 256);
    gg.strokeStyle = "#475569";
    gg.lineWidth = 2;
    for (let i = 0; i <= 256; i += 16) {
      gg.beginPath();
      gg.moveTo(i, 0);
      gg.lineTo(i, 256);
      gg.moveTo(0, i);
      gg.lineTo(256, i);
      gg.stroke();
    }
    gg.fillStyle = "#e2e8f0";
    gg.beginPath();
    gg.arc(128, 128, 62, 0, Math.PI * 2);
    gg.fill();
    const gauzeTex = new THREE.CanvasTexture(gc);
    gauzeTex.colorSpace = THREE.SRGBColorSpace;
    const gauze = new THREE.Mesh(new THREE.CircleGeometry(0.76, 48), new THREE.MeshStandardMaterial({ map: gauzeTex, transparent: true, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.4 }));
    gauze.rotation.x = -Math.PI / 2;
    gauze.position.y = 1.67;
    tripod.add(ring, gauze);
    place(tripod, "tripod", 0, 0);
    // Spirt lampasi
    const burner = new THREE.Group();
    burner.add(lathe([[0, 0], [0.38, 0], [0.45, 0.14], [0.42, 0.38], [0.18, 0.56], [0.14, 0.62], [0, 0.62]], glass({ color: 0xbfdbfe, opacity: 0.55 }), 48));
    burner.add(lathe([[0, 0.02], [0.36, 0.02], [0.42, 0.14], [0.4, 0.28], [0, 0.28]], liquid(0x93c5fd, 0.6), 40));
    burner.add(cyl(0.13, 0.15, 0.1, steel(), 0.66, 28));
    burner.add(cyl(0.05, 0.05, 0.2, mat(0xf5f5f4, { roughness: 0.9 }), 0.8, 14));
    place(burner, "burner", 0, 0);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa726, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
    const flameCore = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false });
    const profile: [number, number][] = [[0, 0], [0.11, 0.08], [0.13, 0.18], [0.08, 0.36], [0.03, 0.5], [0, 0.58]];
    const flame = lathe(profile, flameMat, 24);
    const inner = lathe(profile.map(([r, y]) => [r * 0.55, y * 0.5] as [number, number]), flameCore, 20);
    flame.add(inner);
    flame.position.set(0, 0.88, 0);
    scene.add(flame);
    const fireLight = new THREE.PointLight(0xffa64d, 0, 7, 1.6);
    fireLight.position.set(0, 1.2, 0);
    scene.add(fireLight);
    // Stakan, suv va termometr
    const beaker = new THREE.Group();
    beaker.add(lathe([[0, 0], [0.56, 0], [0.6, 0.05], [0.6, 1.25], [0.66, 1.32]], glass({ opacity: 0.32 }), 64));
    const tc = document.createElement("canvas");
    tc.width = 256;
    tc.height = 256;
    const tg2 = tc.getContext("2d") as CanvasRenderingContext2D;
    tg2.fillStyle = tg2.strokeStyle = "#1e3a8a";
    tg2.font = "bold 26px sans-serif";
    tg2.lineWidth = 3;
    for (let ml = 50; ml <= 200; ml += 50) {
      const y = 256 - ((ml / 250) * 1.15 + 0.08) * (256 / 1.25);
      tg2.beginPath();
      tg2.moveTo(40, y);
      tg2.lineTo(96, y);
      tg2.stroke();
      tg2.fillText(`${ml}`, 104, y + 9);
    }
    const scale = new THREE.CanvasTexture(tc);
    scale.colorSpace = THREE.SRGBColorSpace;
    const marks = new THREE.Mesh(new THREE.CylinderGeometry(0.606, 0.606, 1.25, 40, 1, true, -0.6, 1.2), new THREE.MeshBasicMaterial({ map: scale, transparent: true, depthWrite: false }));
    marks.position.y = 0.625;
    beaker.add(marks);
    const waterMat = liquid(0x9bd2f5, 0.55);
    const water = cyl(0.57, 0.57, 1, waterMat, 0, 56);
    beaker.add(water);
    beaker.position.y = BEAKER_Y;
    place(beaker, "beaker", 0, 0);
    const thermo = new THREE.Group();
    thermo.add(cyl(0.035, 0.035, 2.2, glass({ opacity: 0.5 }), 1.1, 12));
    const merc = cyl(0.018, 0.018, 1, mat(0xdc2626, { emissive: 0x7f1d1d }), 0, 10);
    thermo.add(merc, cyl(0.05, 0.05, 0.12, mat(0xdc2626), 0.06, 12));
    thermo.position.set(0.3, BEAKER_Y + 0.14, 0.05);
    thermo.rotation.z = -0.1;
    ctx.pickable(thermo, "thermo");
    scene.add(thermo);
    const tempTag = ctx.label("20.0 °C", { bg: "rgba(14,124,134,0.92)", scale: 0.55 });
    tempTag.sprite.position.set(1.35, BEAKER_Y + 1.7, 0);
    scene.add(tempTag.sprite);
    const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.05, depthWrite: false });
    const bubbles = Array.from({ length: 22 }, (_, i) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.025 + (i % 3) * 0.015, 10, 8), bubbleMat);
      scene.add(b);
      return b;
    });
    const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false });
    const steam = Array.from({ length: 12 }, () => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), steamMat);
      scene.add(b);
      return b;
    });
    // Javondagi idishlar
    const erlen = new THREE.Group();
    erlen.add(lathe([[0, 0], [0.62, 0], [0.68, 0.07], [0.2, 1.2], [0.2, 1.58], [0.26, 1.63]], glass(), 56));
    erlen.add(lathe([[0, 0.03], [0.6, 0.03], [0.64, 0.08], [0.46, 0.5], [0, 0.5]], liquid(0xf472b6), 48));
    place(erlen, "erlen", -3.1, 0.4);
    const roundPts: [number, number][] = [[0, 0]];
    for (let i = 1; i <= 22; i++) {
      const t = -Math.PI / 2 + (i / 22) * Math.PI * 0.86;
      roundPts.push([0.62 * Math.cos(t), 0.62 + 0.62 * Math.sin(t)]);
    }
    roundPts.push([0.15, 1.45], [0.15, 1.8], [0.2, 1.86]);
    const round = new THREE.Group();
    round.add(lathe(roundPts, glass(), 56));
    round.add(sphereLiquid(0.58, 0.62, 0.45, liquid(0xfbbf24)));
    round.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 12, 36).rotateX(Math.PI / 2), mat(0x9a7b4f, { roughness: 0.9 })));
    round.children[2].position.y = 0.08;
    place(round, "round", -4.6, -1);
    const grad = new THREE.Group();
    grad.add(lathe([[0, 0], [0.42, 0], [0.42, 0.05], [0.2, 0.09], [0.16, 0.12], [0.16, 2.3], [0.22, 2.36]], glass({ opacity: 0.38 }), 40));
    grad.add(cyl(0.14, 0.14, 1.3, liquid(0x86efac), 0.8, 32));
    place(grad, "graduated", -2.2, -1.5);
    const funnel = new THREE.Group();
    funnel.add(lathe([[0.05, 0], [0.05, 0.62], [0.5, 1.15], [0.54, 1.2]], glass({ opacity: 0.38 }), 48));
    funnel.position.y = 1.08;
    place(funnel, "funnel", -3.1, 0.4);
    // Probirkalar
    const rack = new THREE.Group();
    const rackWood = surfaceMaterial("wood", 1, 0.3);
    rack.add(box(2.4, 0.1, 0.7, rackWood, 0, 0.05), box(2.4, 0.08, 0.7, rackWood, 0, 0.95), box(0.1, 1, 0.7, rackWood, -1.15, 0.5), box(0.1, 1, 0.7, rackWood, 1.15, 0.5));
    [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308].forEach((col, i) => {
      const t = new THREE.Group();
      const pts: [number, number][] = [[0, 0.1]];
      for (let k = 1; k <= 8; k++) {
        const a = -Math.PI / 2 + (k / 8) * (Math.PI / 2);
        pts.push([0.14 * Math.cos(a), 0.24 + 0.14 * Math.sin(a)]);
      }
      t.add(lathe([...pts, [0.14, 1.75], [0.17, 1.8]], glass({ opacity: 0.4 }), 28));
      t.add(lathe([...pts, [0.13, 0.9], [0, 0.9]], liquid(col), 24));
      t.position.x = -0.75 + i * 0.5;
      rack.add(t);
    });
    place(rack, "tubes", 3.2, -1.3);
    // Hovoncha
    const mortar = new THREE.Group();
    const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xf5f5f0, roughness: 0.38, clearcoat: 0.5 });
    mortar.add(lathe([[0, 0], [0.34, 0], [0.42, 0.08], [0.62, 0.55], [0.66, 0.62], [0.58, 0.62], [0.36, 0.2], [0, 0.14]], ceramic, 48));
    const pestle = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.95, 10, 18), ceramic);
    pestle.position.set(0.18, 0.72, 0);
    pestle.rotation.z = -0.55;
    mortar.add(pestle);
    place(mortar, "mortar", 2.6, 1.6);
    // Reaktiv shishasi
    const bottle = new THREE.Group();
    bottle.add(lathe([[0, 0], [0.42, 0], [0.46, 0.06], [0.46, 0.92], [0.2, 1.2], [0.17, 1.42], [0.21, 1.46], [0, 1.46]], new THREE.MeshPhysicalMaterial({ color: 0x7c2d12, roughness: 0.15, clearcoat: 1 }), 48));
    const tagTex = new THREE.CanvasTexture(
      (() => {
        const c = document.createElement("canvas");
        c.width = 256;
        c.height = 128;
        const g = c.getContext("2d") as CanvasRenderingContext2D;
        g.fillStyle = "#fffbeb";
        g.fillRect(0, 0, 256, 128);
        g.fillStyle = "#111827";
        g.font = "bold 58px sans-serif";
        g.textAlign = "center";
        g.fillText("AgNO₃", 128, 84);
        return c;
      })(),
    );
    tagTex.colorSpace = THREE.SRGBColorSpace;
    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.465, 0.465, 0.42, 32, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({ map: tagTex, roughness: 0.7, transparent: true }));
    tag.position.y = 0.48;
    bottle.add(tag);
    place(bottle, "bottle", 4.6, 0.6);

    let T = 20;
    let t = 0;
    const SPEED = 30; // Vaqt tezlashtirilgan: 1 s ekranda = 30 s tajribada
    const POWER = 40; // Stakanga yetib boradigan foydali quvvat, W
    const LOSS = 0.0004;
    return {
      reset() {
        T = 20;
        t = 0;
      },
      step(dt, p) {
        const dtSim = dt * SPEED;
        t += dtSim;
        const heat = p.fire ? POWER / ((p.ml / 1000) * 4180) : 0;
        T = clamp(T + (heat - LOSS * (T - 20)) * dtSim, 20, 100);
      },
      frame(p, time) {
        flame.visible = Boolean(p.fire);
        const flick = 1 + Math.sin(time * 19) * 0.07 + Math.sin(time * 31) * 0.05;
        flame.scale.set(1 / Math.sqrt(flick), flick, 1 / Math.sqrt(flick));
        fireLight.intensity = p.fire ? 7 * flick : 0;
        const fill = 0.08 + (p.ml / 250) * 1.15;
        water.scale.y = fill - 0.05;
        water.position.y = 0.05 + (fill - 0.05) / 2;
        const k = (T - 20) / 80;
        merc.scale.y = 0.35 + k * 1.5;
        merc.position.y = merc.scale.y / 2 + 0.06;
        tempTag.set(`${r1(T)} °C`);
        const boiling = p.fire && T > 70;
        const shown = boiling ? Math.ceil(((T - 70) / 30) * bubbles.length) : 0;
        bubbles.forEach((b, i) => {
          b.visible = i < shown;
          if (!b.visible) return;
          const u = (time * (0.6 + (i % 5) * 0.12) + i * 0.37) % 1;
          const a = i * 2.39;
          const r = 0.12 + (i % 4) * 0.11;
          b.position.set(Math.cos(a) * r, BEAKER_Y + 0.08 + u * (fill - 0.1), Math.sin(a) * r);
        });
        const steaming = T >= 95;
        steam.forEach((s, i) => {
          s.visible = steaming;
          if (!steaming) return;
          const u = (time * 0.22 + i / steam.length) % 1;
          s.position.set(Math.sin(i * 2.1 + time * 0.5) * (0.15 + u * 0.4), BEAKER_Y + 1.3 + u * 2.2, Math.cos(i * 1.3) * (0.1 + u * 0.3));
          s.scale.setScalar(0.5 + u * 1.6);
        });
        steamMat.opacity = 0.16;
      },
      pick: (id) => GLASSWARE_INFO[id] ?? null,
      readout(p) {
        return [
          { label: x("Suv harorati T", "Ҳарорати об T"), value: `${r1(T)} °C` },
          { label: x("Tajriba vaqti", "Вақти таҷриба"), value: `${Math.round(t)} s` },
          { label: x("Olingan issiqlik Q", "Гармии гирифташуда Q"), value: `${r1(((p.ml / 1000) * 4180 * (T - 20)) / 1000)} kJ` },
          { label: x("Tezlashtirish", "Тезонӣ"), value: `×${SPEED}` },
          { label: x("Holat", "Ҳолат"), value: T >= 100 ? "100 °C" : p.fire ? "↑" : "↓" },
        ];
      },
      measure(p) {
        return { t: Math.round(t), T: Math.round(T * 10) / 10, ml: p.ml, Q: Math.round((p.ml / 1000) * 4180 * (T - 20)) / 1000 };
      },
    };
  },
};

function sphereLiquid(r: number, cy: number, top: number, m: THREE.Material) {
  const pts: [number, number][] = [[0, cy - r]];
  for (let i = 1; i <= 16; i++) {
    const t = -Math.PI / 2 + (i / 16) * (Math.PI / 2 + Math.asin(clamp((top - cy) / r, -1, 1)));
    pts.push([r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  pts.push([0, top]);
  return lathe(pts, m, 44);
}

/* ═════════════════════ KIMYO: fazoviy tuzilish ═════════════════════ */

const ATOM = {
  H: { sym: "H", color: 0xf4f6fb, r: 0.24 },
  C: { sym: "C", color: 0x2f3640, r: 0.42 },
  N: { sym: "N", color: 0x3050f8, r: 0.4 },
  O: { sym: "O", color: 0xe0392b, r: 0.38 },
  B: { sym: "B", color: 0xf5b7a0, r: 0.42 },
  F: { sym: "F", color: 0x9be66a, r: 0.3 },
  P: { sym: "P", color: 0xff8000, r: 0.5 },
  S: { sym: "S", color: 0xe6c32a, r: 0.5 },
  Cl: { sym: "Cl", color: 0x35d635, r: 0.4 },
};

const unit = (a: number, b: number, c: number) => V(a, b, c).normalize();
const planar3 = [0, 120, 240].map((d) => V(Math.cos(deg(d)), 0, Math.sin(deg(d))));
/** Uchta bog' pastga, o'zaro γ burchak bilan; yuqorida erkin juft joylashadi */
const pyramid3 = (gammaDeg: number) => {
  const beta = Math.asin(Math.sqrt((1 - Math.cos(deg(gammaDeg))) / 1.5));
  return [90, 210, 330].map((d) => V(Math.sin(beta) * Math.cos(deg(d)), -Math.cos(beta), Math.sin(beta) * Math.sin(deg(d))));
};
const bent = (gammaDeg: number) => [1, -1].map((s) => V(s * Math.sin(deg(gammaDeg / 2)), -Math.cos(deg(gammaDeg / 2)), 0));

const SHAPES: { name: string; center: keyof typeof ATOM; outer: keyof typeof ATOM; dirs: THREE.Vector3[]; lone: THREE.Vector3[]; order: number; shape: Tx; angle: string; polar: boolean }[] = [
  { name: "CO₂", center: "C", outer: "O", dirs: [V(1, 0, 0), V(-1, 0, 0)], lone: [], order: 2, shape: x("Chiziqli", "Хаттӣ", "Линейная"), angle: "180°", polar: false },
  { name: "BF₃", center: "B", outer: "F", dirs: planar3, lone: [], order: 1, shape: x("Yassi uchburchak", "Секунҷаи ҳамвор", "Плоская треугольная"), angle: "120°", polar: false },
  { name: "CH₄", center: "C", outer: "H", dirs: [unit(1, 1, 1), unit(1, -1, -1), unit(-1, 1, -1), unit(-1, -1, 1)], lone: [], order: 1, shape: x("Tetraedr", "Тетраэдр", "Тетраэдрическая"), angle: "109,5°", polar: false },
  { name: "NH₃", center: "N", outer: "H", dirs: pyramid3(107), lone: [V(0, 1, 0)], order: 1, shape: x("Uchburchakli piramida", "Пирамидаи секунҷа", "Тригональная пирамида"), angle: "107°", polar: true },
  { name: "H₂O", center: "O", outer: "H", dirs: bent(104.5), lone: [unit(0, 0.58, 0.81), unit(0, 0.58, -0.81)], order: 1, shape: x("Burchakli", "Кунҷдор", "Угловая"), angle: "104,5°", polar: true },
  { name: "PCl₅", center: "P", outer: "Cl", dirs: [V(0, 1, 0), V(0, -1, 0), ...planar3], lone: [], order: 1, shape: x("Uchburchakli bipiramida", "Бипирамидаи секунҷа", "Тригональная бипирамида"), angle: "90° / 120°", polar: false },
  { name: "SF₆", center: "S", outer: "F", dirs: [V(1, 0, 0), V(-1, 0, 0), V(0, 1, 0), V(0, -1, 0), V(0, 0, 1), V(0, 0, -1)], lone: [], order: 1, shape: x("Oktaedr", "Октаэдр", "Октаэдрическая"), angle: "90°", polar: false },
];

const vseprLab: ProLabDef = {
  key: "vsepr",
  title: x("Molekulalarning fazoviy tuzilishi", "Сохти фазоии молекулаҳо", "Пространственное строение молекул"),
  camera: [2.6, 4.6, 8.8],
  target: [0, 2.4, 0],
  params: [
    { id: "mol", label: x("Molekula", "Молекула", "Молекула"), value: 2, options: SHAPES.map((s, i) => ({ value: i, label: { uz: s.name, tg: s.name, ru: s.name } })) },
    { id: "style", label: x("Ko'rinish", "Намуд", "Вид"), value: 0, options: [{ value: 0, label: x("Shar va tayoqcha", "Кура ва чӯбча", "Шаростержневая") }, { value: 1, label: x("Hajmli (to'la)", "Ҳаҷмӣ (пурра)", "Объёмная") }] },
    { id: "spin", label: x("Aylanish tezligi", "Суръати гардиш", "Скорость вращения"), value: 0.4, min: 0, max: 1.5, step: 0.1 },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const CY = 2.9;
    const BOND = 1.3;
    // Taglik
    const base = new THREE.Group();
    base.add(cyl(1.1, 1.25, 0.14, mat(0x1e293b, { metalness: 0.65, roughness: 0.3 }), 0.07, 72));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.02, 10, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: false }));
    halo.position.y = 0.16;
    base.add(halo);
    scene.add(base);
    const holder = new THREE.Group();
    holder.position.y = CY;
    ctx.pickable(holder, "holder");
    scene.add(holder);
    let key = "";
    let rot = 0;
    let last = 0;

    const atomMat = (c: number) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.15 });
    const add = (o: THREE.Object3D, id: string) => {
      o.userData.pickId = id;
      holder.add(o);
    };
    const bondBetween = (a: THREE.Vector3, b: THREE.Vector3, offset: THREE.Vector3, r: number, m: THREE.Material) => {
      const d = b.clone().sub(a);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 20), m);
      c.position.copy(a).addScaledVector(d, 0.5).add(offset);
      c.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
      add(c, "bond");
    };
    const rebuild = (p: Params) => {
      for (const c of [...holder.children]) {
        holder.remove(c);
        disposeTree(c);
      }
      const s = SHAPES[Math.round(p.mol)];
      const full = Math.round(p.style) === 1;
      const cA = ATOM[s.center];
      const oA = ATOM[s.outer];
      const scale = full ? 2 : 1;
      const center = new THREE.Mesh(new THREE.SphereGeometry(cA.r * scale, 56, 40), atomMat(cA.color));
      add(center, "center");
      const cL = ctx.label(cA.sym, { scale: 0.32 });
      cL.sprite.position.set(0, cA.r * scale + 0.22, 0);
      holder.add(cL.sprite);
      const bondMat = new THREE.MeshPhysicalMaterial({ color: 0xcbd5e1, metalness: 0.3, roughness: 0.3, clearcoat: 0.6 });
      for (const d of s.dirs) {
        const pos = d.clone().multiplyScalar(BOND);
        const m = new THREE.Mesh(new THREE.SphereGeometry(oA.r * scale, 48, 34), atomMat(oA.color));
        m.position.copy(pos);
        add(m, "outer");
        if (!full) {
          if (s.order === 2) {
            const side = V(0, 0, 1).cross(d).normalize().multiplyScalar(0.1);
            bondBetween(V(0, 0, 0), pos, side, 0.05, bondMat);
            bondBetween(V(0, 0, 0), pos, side.clone().negate(), 0.05, bondMat);
          } else bondBetween(V(0, 0, 0), pos, V(0, 0, 0), 0.08, bondMat);
        }
        const l = ctx.label(oA.sym, { scale: 0.26 });
        l.sprite.position.copy(pos).addScaledVector(d, oA.r * scale + 0.2);
        holder.add(l.sprite);
      }
      for (const d of s.lone) {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), glass({ color: 0xc084fc, opacity: 0.42 }));
        lobe.scale.set(0.75, 1.3, 0.75);
        lobe.position.copy(d).multiplyScalar(0.72);
        lobe.quaternion.setFromUnitVectors(V(0, 1, 0), d);
        add(lobe, "lone");
      }
      if (!full && s.dirs.length >= 2) {
        const a = s.dirs[0];
        const b = s.dirs[s.dirs.length >= 5 ? 2 : 1];
        const axis = a.clone().cross(b);
        const fullAngle = a.angleTo(b);
        {
          if (axis.lengthSq() < 1e-6) axis.set(0, 0, 1);
          axis.normalize();
          const pts = Array.from({ length: 33 }, (_, i) => a.clone().applyAxisAngle(axis, (i / 32) * fullAngle).multiplyScalar(0.72));
          const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.018, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b, toneMapped: false }));
          holder.add(arc);
          const mid = a.clone().applyAxisAngle(axis, fullAngle / 2).multiplyScalar(1);
          const tag = ctx.label(s.dirs.length === 5 ? "90°" : s.angle, { bg: "rgba(217,119,6,0.92)", scale: 0.42 });
          tag.sprite.position.copy(mid);
          holder.add(tag.sprite);
        }
      }
      markShadows(holder);
    };

    return {
      reset() {
        key = "";
      },
      frame(p, time) {
        const k = `${p.mol}-${p.style}`;
        if (k !== key) {
          key = k;
          rebuild(p);
        }
        rot += Math.min(time - last, 0.1) * p.spin;
        last = time;
        holder.rotation.y = rot;
      },
      pick(id, p): PickInfo {
        const s = SHAPES[Math.round(p.mol)];
        if (id === "center") return { title: x(`Markaziy atom: ${s.center}`, `Атоми марказӣ: ${s.center}`), body: x("Elektron juftlari bir-biridan iloji boricha uzoqlashadi va shu molekula shaklini belgilaydi.", "Ҷуфтҳои электронӣ то ҳадди имкон аз ҳам дур мешаванд ва шакли молекуларо муайян мекунанд.") };
        if (id === "outer") return { title: x(`Atom: ${s.outer}`, `Атом: ${s.outer}`), body: x(`Markaziy atomga kovalent bog' bilan birikkan. Bog'lar soni: ${s.dirs.length}.`, `Ба атоми марказӣ бо банди ковалентӣ пайваст аст. Шумораи бандҳо: ${s.dirs.length}.`) };
        if (id === "lone") return { title: x("Erkin elektron jufti", "Ҷуфти озоди электронӣ"), body: x("Bog' hosil qilmaydi, lekin ko'proq joy egallaydi va bog' burchagini kichraytiradi.", "Банд намесозад, вале ҷойи бештар мегирад ва кунҷи бандро хурд мекунад.") };
        return { title: x("Kovalent bog'", "Банди ковалентӣ", "Ковалентная связь"), body: x(s.order === 2 ? "Qo'sh bog': ikki juft umumiy elektron." : "Yakka bog': bir juft umumiy elektron.", s.order === 2 ? "Банди дучанда: ду ҷуфт электрони умумӣ." : "Банди якчанда: як ҷуфт электрони умумӣ.") };
      },
      readout(p) {
        const s = SHAPES[Math.round(p.mol)];
        return [
          { label: x("Molekula", "Молекула"), value: s.name },
          { label: s.shape, value: s.angle },
          { label: x("Bog'lar soni", "Шумораи бандҳо"), value: String(s.dirs.length) },
          { label: x("Erkin juftlar", "Ҷуфтҳои озод"), value: String(s.lone.length) },
          { label: x("Qutbli", "Қутбӣ"), value: s.polar ? "✓" : "—" },
        ];
      },
      measure(p) {
        const s = SHAPES[Math.round(p.mol)];
        return { bonds: s.dirs.length, lone: s.lone.length, polar: s.polar ? 1 : 0 };
      },
    };
  },
};

/* ═════════════════════ BIOLOGIYA: inson a'zolari ═════════════════════ */

/** Silliq organik shakl: sharni sinus shovqin bilan o'zgartirib, ellipsoidga cho'zamiz */
function blob(rx: number, ry: number, rz: number, seed: number, amp = 0.06, freq = 3, seg = 56) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * freq + seed) * Math.sin(v.y * freq * 1.3 + seed * 2) * Math.sin(v.z * freq * 0.9 + seed * 0.5);
    v.multiplyScalar(1 + amp * n);
    pos.setXYZ(i, v.x * rx, v.y * ry, v.z * rz);
  }
  g.computeVertexNormals();
  return g;
}

const organMat = (color: number) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, clearcoat: 0.75, clearcoatRoughness: 0.32, bumpMap: surfaceTexture("tissue", 3), bumpScale: 0.7 });

const SYSTEMS: Tx[] = [
  x("Barcha a'zolar", "Ҳамаи узвҳо", "Все органы"),
  x("Nafas olish tizimi", "Низоми нафаскашӣ", "Дыхательная система"),
  x("Qon aylanish tizimi", "Низоми гардиши хун", "Кровеносная система"),
  x("Hazm qilish tizimi", "Низоми ҳозима", "Пищеварительная система"),
  x("Ayirish tizimi", "Низоми ихроҷ", "Выделительная система"),
  x("Nerv tizimi", "Низоми асаб", "Нервная система"),
];

const ORGANS: Record<string, PickInfo & { sys: number }> = {
  brain: { sys: 5, title: x("Bosh miya", "Майнаи сар", "Головной мозг"), body: x("Sezgi, harakat, xotira va tafakkurni boshqaradi. Kattalarda og'irligi taxminan 1,3–1,4 kg.", "Ҳиссиёт, ҳаракат, хотира ва тафаккурро идора мекунад. Дар калонсолон вазнаш тақрибан 1,3–1,4 кг.") },
  trachea: { sys: 1, title: x("Traxeya", "Нойи нафас", "Трахея"), body: x("Havoni bronxlar orqali o'pkaga o'tkazadi; tog'ay halqalari uni ochiq tutadi.", "Ҳаворо тавассути бронхҳо ба шуш мегузаронад; ҳалқаҳои тағоякӣ онро кушода нигоҳ медоранд.") },
  lungL: { sys: 1, title: x("Chap o'pka", "Шуши чап", "Левое лёгкое"), body: x("Yurak uchun joy qoldirgani sababli o'ngdan biroz kichik, ikki bo'lakdan iborat. Alveolalarda gaz almashinadi.", "Барои ҷойи дил аз рост каме хурдтар аст, аз ду бахш иборат. Дар алвеолаҳо газҳо иваз мешаванд.") },
  lungR: { sys: 1, title: x("O'ng o'pka", "Шуши рост", "Правое лёгкое"), body: x("Uch bo'lakdan iborat. Qonga kislorod beradi, karbonat angidridni chiqaradi.", "Аз се бахш иборат. Ба хун оксиген медиҳад ва гази карбонатро хориҷ мекунад.") },
  heart: { sys: 2, title: x("Yurak", "Дил", "Сердце"), body: x("To'rt kamerali muskulli nasos, ko'krak qafasida chapga surilgan. Tinch holatda minutiga 60–80 marta uradi.", "Насоси мушакии чоркамера, дар қафаси сина ба чап майл дорад. Дар ҳолати ором дар як дақиқа 60–80 маротиба мезанад.") },
  liver: { sys: 3, title: x("Jigar", "Ҷигар", "Печень"), body: x("Eng katta ichki bez: o't suyuqligi ishlab chiqaradi, zaharlarni zararsizlantiradi, glikogen saqlaydi.", "Калонтарин ғадуди дохилӣ: заҳра истеҳсол мекунад, заҳрҳоро безарар мегардонад, гликоген захира мекунад.") },
  stomach: { sys: 3, title: x("Oshqozon", "Меъда", "Желудок"), body: x("Ovqatni xlorid kislota va fermentlar bilan parchalaydi.", "Хӯрокро бо кислотаи хлорид ва ферментҳо таҷзия мекунад.") },
  small: { sys: 3, title: x("Ingichka ichak", "Рӯдаи борик", "Тонкая кишка"), body: x("Uzunligi taxminan 5–6 m. Ozuqa moddalarining asosiy qismi shu yerda so'riladi.", "Дарозиаш тақрибан 5–6 м. Қисми асосии моддаҳои ғизоӣ дар ин ҷо ҷаббида мешавад.") },
  large: { sys: 3, title: x("Yo'g'on ichak", "Рӯдаи ғафс", "Толстая кишка"), body: x("Suvni so'radi va chiqindini shakllantiradi.", "Обро ҷаббида, партовро ташаккул медиҳад.") },
  kidneyL: { sys: 4, title: x("Chap buyrak", "Гурдаи чап", "Левая почка"), body: x("Qonni filtrlab, siydik hosil qiladi.", "Хунро полоиш карда, пешоб ҳосил мекунад.") },
  kidneyR: { sys: 4, title: x("O'ng buyrak", "Гурдаи рост", "Правая почка"), body: x("Jigar ostida joylashgani uchun chapdan biroz pastroq turadi.", "Азбаски дар зери ҷигар ҷойгир аст, аз чап каме поёнтар мебошад.") },
  bladder: { sys: 4, title: x("Siydik pufagi", "Масона", "Мочевой пузырь"), body: x("Siydikni vaqtincha to'playdi.", "Пешобро муваққатан ҷамъ мекунад.") },
};

const organsLab: ProLabDef = {
  key: "organs",
  title: x("Inson tanasi: a'zolar va tizimlar", "Бадани инсон: узвҳо ва низомҳо", "Тело человека: органы и системы"),
  camera: [2.8, 4.2, 9.8],
  target: [0, 2.9, 0],
  params: [
    { id: "sys", label: x("Tizim", "Низом", "Система"), value: 0, options: SYSTEMS.map((s, i) => ({ value: i, label: s })) },
    { id: "skin", label: x("Tana shaffofligi", "Шаффофии бадан", "Прозрачность тела"), value: 0.18, min: 0, max: 0.6, step: 0.02 },
    { id: "bpm", label: x("Yurak urishi", "Зарбаи дил", "Пульс"), value: 72, min: 50, max: 160, step: 1, unit: "/min" },
    { id: "br", label: x("Nafas soni", "Шумораи нафас", "Частота дыхания"), value: 16, min: 8, max: 40, step: 1, unit: "/min" },
  ],
  build(ctx: ProContext): ProInstance {
    const { scene } = ctx;
    const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xe9c1a2, transparent: true, opacity: 0.18, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false });
    const body = new THREE.Group();
    const outline = new THREE.SplineCurve([[0.02, 0.92], [0.62, 0.98], [0.92, 1.3], [0.88, 1.8], [0.76, 2.35], [0.86, 2.9], [1.02, 3.5], [1.14, 4.0], [1.02, 4.3], [0.6, 4.48], [0.26, 4.58], [0.02, 4.6]].map(([r, y]) => new THREE.Vector2(r, y)));
    const torso = lathe(outline.getPoints(90).map((q) => [Math.max(0, q.x), q.y] as [number, number]), skinMat, 72);
    torso.scale.z = 0.62;
    const neck = cyl(0.22, 0.25, 0.5, skinMat, 4.75, 32);
    const head = new THREE.Mesh(blob(0.58, 0.72, 0.64, 1.3, 0.02, 2), skinMat);
    head.position.y = 5.4;
    body.add(torso, neck, head);
    scene.add(body);
    // Taglik
    scene.add(cyl(0.85, 1, 0.14, mat(0x1e293b, { metalness: 0.65, roughness: 0.3 }), 0.07, 72));
    scene.add(cyl(0.08, 0.08, 0.85, steel(), 0.5, 20));

    const objects = new Map<string, THREE.Object3D>();
    const reg = (id: string, o: THREE.Object3D) => {
      ctx.pickable(o, id);
      scene.add(o);
      objects.set(id, o);
      return o;
    };
    const place = (m: THREE.Object3D, px: number, py: number, pz: number) => {
      m.position.set(px, py, pz);
      return m;
    };
    // Bosh miya: ikki yarimshar, burmalari bilan
    const brain = new THREE.Group();
    const brainM = organMat(0xe7a6a0);
    brain.add(place(new THREE.Mesh(blob(0.25, 0.4, 0.5, 2.1, 0.075, 8, 128), brainM), -0.26, 0, 0), place(new THREE.Mesh(blob(0.25, 0.4, 0.5, 4.3, 0.075, 8, 128), brainM), 0.26, 0, 0));
    reg("brain", place(brain, 0, 5.5, 0));
    // Nafas yo'llari
    const airway = new THREE.Group();
    const cart = organMat(0xdfe7ee);
    airway.add(tube([V(0, 4.72, 0.05), V(0, 4.2, 0.05), V(0, 3.92, 0.04)], 0.07, cart, 24));
    for (let i = 0; i < 9; i++) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.014, 8, 24).rotateX(Math.PI / 2), cart);
      hoop.position.set(0, 4.66 - i * 0.08, 0.05);
      airway.add(hoop);
    }
    airway.add(tube([V(0, 3.94, 0.04), V(-0.22, 3.72, 0.02), V(-0.42, 3.6, 0)], 0.05, cart, 20), tube([V(0, 3.94, 0.04), V(0.22, 3.72, 0.02), V(0.42, 3.6, 0)], 0.05, cart, 20));
    reg("trachea", airway);
    const lungL = reg("lungL", place(new THREE.Mesh(blob(0.4, 0.72, 0.36, 1.7, 0.06, 4), organMat(0xd98c8c)), 0.54, 3.5, -0.02));
    const lungR = reg("lungR", place(new THREE.Mesh(blob(0.45, 0.74, 0.37, 3.9, 0.06, 4), organMat(0xd98c8c)), -0.54, 3.5, -0.02));
    // Yurak va yirik tomirlar
    const heart = new THREE.Group();
    const heartBody = new THREE.Mesh(blob(0.27, 0.34, 0.24, 2.6, 0.08, 4), organMat(0xa81f2b));
    heartBody.rotation.z = -0.42;
    const artery = organMat(0xcc2936);
    const vein = organMat(0x3456a3);
    heart.add(heartBody, tube([V(-0.05, 0.24, 0), V(-0.02, 0.5, 0.03), V(0.14, 0.62, -0.02), V(0.24, 0.42, -0.1), V(0.24, -0.3, -0.16)], 0.06, artery, 40), tube([V(-0.18, 0.2, -0.04), V(-0.2, 0.6, -0.04)], 0.055, vein, 16));
    reg("heart", place(heart, 0.12, 3.26, 0.2));
    // Hazm a'zolari
    reg("liver", place(new THREE.Mesh(blob(0.56, 0.3, 0.33, 5.1, 0.05, 3), organMat(0x7b3326)), -0.36, 2.72, 0.1));
    const stomachMat = organMat(0xdb9a7d);
    reg("stomach", tube([V(0.08, 3.0, 0.02), V(0.3, 2.86, 0.1), V(0.55, 2.62, 0.14), V(0.46, 2.32, 0.16), V(0.14, 2.28, 0.16), V(-0.05, 2.38, 0.16)], 0.19, stomachMat, 72, 24));
    const smallPts: THREE.Vector3[] = [];
    for (let row = 0; row < 7; row++) {
      const y = 2.05 - row * 0.1;
      const dirX = row % 2 ? -1 : 1;
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        smallPts.push(V(dirX * (-0.4 + 0.8 * u), y + Math.sin(u * Math.PI * 3 + row) * 0.03, 0.18 + Math.cos(u * Math.PI * 4 + row) * 0.08));
      }
    }
    reg("small", tube(smallPts, 0.058, organMat(0xe4a88f), 460, 12));
    reg("large", tube([V(-0.62, 1.42, 0.12), V(-0.68, 1.85, 0.12), V(-0.64, 2.26, 0.1), V(-0.2, 2.2, 0.28), V(0.25, 2.2, 0.28), V(0.66, 2.26, 0.1), V(0.68, 1.85, 0.12), V(0.54, 1.42, 0.14), V(0.1, 1.28, 0.12)], 0.105, organMat(0xc98a6e), 140, 18));
    // Ayirish a'zolari
    const kidneyM = organMat(0x7e2a2f);
    reg("kidneyL", place(new THREE.Mesh(blob(0.17, 0.28, 0.13, 1.1, 0.04, 3), kidneyM), 0.42, 2.3, -0.24));
    reg("kidneyR", place(new THREE.Mesh(blob(0.17, 0.28, 0.13, 3.3, 0.04, 3), kidneyM), -0.42, 2.22, -0.24));
    reg("bladder", place(new THREE.Mesh(blob(0.2, 0.17, 0.18, 2, 0.03, 3), organMat(0xe0b35c)), 0, 1.16, 0.1));

    const heartPhase = { v: 0 };
    const breathPhase = { v: 0 };
    let last = 0;
    return {
      reset() {},
      frame(p, time) {
        const dt = Math.min(time - last, 0.1);
        last = time;
        heartPhase.v += (dt * p.bpm) / 60;
        breathPhase.v += (dt * p.br) / 60;
        skinMat.opacity = p.skin;
        skinMat.visible = p.skin > 0.005;
        const sys = Math.round(p.sys);
        for (const [id, o] of objects) o.visible = sys === 0 || ORGANS[id].sys === sys;
        // Sistola — sikl boshida qisqa qisqarish
        const u = heartPhase.v % 1;
        const beat = u < 0.3 ? Math.sin((u / 0.3) * Math.PI) : 0;
        heart.scale.setScalar(1).multiplyScalar(1 - 0.09 * beat);
        const breath = 0.5 - 0.5 * Math.cos(breathPhase.v * Math.PI * 2);
        for (const l of [lungL, lungR]) l.scale.set(1 + 0.05 * breath, 1 + 0.07 * breath, 1 + 0.08 * breath);
      },
      pick: (id) => ORGANS[id] ?? null,
      readout(p) {
        return [
          { label: SYSTEMS[Math.round(p.sys)], value: String(Object.values(ORGANS).filter((o) => Math.round(p.sys) === 0 || o.sys === Math.round(p.sys)).length) },
          { label: x("Puls", "Набз"), value: `${p.bpm} /min` },
          { label: x("Yurak haydashi (70 ml)", "Ҳаҷми дақиқавии дил (70 мл)"), value: `${r1((p.bpm * 70) / 1000)} l/min` },
          { label: x("Nafas soni", "Шумораи нафас"), value: `${p.br} /min` },
          { label: x("O'pka ventilyatsiyasi (500 ml)", "Вентилятсияи шуш (500 мл)"), value: `${r1(p.br * 0.5)} l/min` },
        ];
      },
      measure(p) {
        return { bpm: p.bpm, Q: Math.round((p.bpm * 70) / 100) / 10, br: p.br, VE: p.br * 0.5 };
      },
      hint(p) {
        return Math.round(p.sys) === 0 ? x("A'zoni bosing — nomi va vazifasi chiqadi", "Узвро пахш кунед — ном ва вазифааш нишон дода мешавад") : null;
      },
    };
  },
};

export const EXTRA_PRO_LABS: Record<string, ProLabDef> = {
  electromagnet: electromagnetLab,
  refraction: refractionLab,
  incline: inclineLab,
  glassware: glasswareLab,
  vsepr: vseprLab,
  organs: organsLab,
};
