/**
 * 3D laboratoriyalar uchun umumiy realizm vositalari: atrof-muhit aksi (metall va shisha uchun),
 * soyalarni belgilash va tashqi faylsiz (canvas'da chiziladigan) teksturalar.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type SurfaceKind = "wood" | "tile" | "bench" | "tissue";

/** Sahnaga xona aksini beradi; qaytgan funksiya GPU resursini bo'shatadi */
export function addStudioLight(renderer: THREE.WebGLRenderer, scene: THREE.Scene, intensity = 0.6) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = intensity;
  pmrem.dispose();
  return () => {
    scene.environment = null;
    env.dispose();
  };
}

/** Shaffof bo'lmagan barcha meshlar soya tashlaydi va soya qabul qiladi */
export function markShadows(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const solid = mats.every((x) => !x.transparent);
    m.castShadow = solid;
    m.receiveShadow = solid;
  });
}

/** Har safar bir xil naqsh chiqishi uchun oddiy urug'li tasodifiy son */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const CANVASES = new Map<SurfaceKind, HTMLCanvasElement>();

function drawSurface(kind: SurfaceKind) {
  const cached = CANVASES.get(kind);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  const rnd = seeded(kind.length * 7919);
  if (kind === "wood") {
    g.fillStyle = "#b98a56";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i++) {
      const y = rnd() * 512;
      const wave = 4 + rnd() * 10;
      g.strokeStyle = `rgba(${rnd() > 0.5 ? "84,52,24" : "222,184,135"},${0.05 + rnd() * 0.2})`;
      g.lineWidth = 0.6 + rnd() * 2.2;
      g.beginPath();
      for (let x = 0; x <= 512; x += 16) g.lineTo(x, y + Math.sin(x / 70 + i) * wave);
      g.stroke();
    }
  } else if (kind === "tile") {
    g.fillStyle = "#94a3b8";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2; i++)
      for (let j = 0; j < 2; j++) {
        const v = 222 + rnd() * 14;
        g.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
        g.fillRect(i * 256 + 3, j * 256 + 3, 250, 250);
      }
  } else if (kind === "bench") {
    g.fillStyle = "#f4f7fb";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5200; i++) {
      g.fillStyle = `rgba(${rnd() > 0.5 ? "71,85,105" : "148,163,184"},${0.08 + rnd() * 0.3})`;
      g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  } else {
    g.fillStyle = "#b0b0b0";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1500; i++) {
      const v = 90 + rnd() * 150;
      g.fillStyle = `rgba(${v},${v},${v},0.32)`;
      g.beginPath();
      g.arc(rnd() * 512, rnd() * 512, 2 + rnd() * 9, 0, Math.PI * 2);
      g.fill();
    }
  }
  CANVASES.set(kind, c);
  return c;
}

export function surfaceTexture(kind: SurfaceKind, repeatX = 1, repeatY = repeatX) {
  const t = new THREE.CanvasTexture(drawSurface(kind));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 4;
  return t;
}

/** Tekstura va undan olingan bo'rtiqli sirt */
export function surfaceMaterial(kind: SurfaceKind, repeatX = 1, repeatY = repeatX, o: THREE.MeshStandardMaterialParameters = {}) {
  const map = surfaceTexture(kind, repeatX, repeatY);
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.6, roughness: 0.6, ...o });
}
