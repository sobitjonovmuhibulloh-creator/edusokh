/**
 * 3D laboratoriya katalogi uchun turlar: sinf → fan → mavzu → laboratoriya.
 * Mazmun o'zbek va tojik tilida yoziladi; ruscha bo'lmasa, interfeys buni ochiq ko'rsatadi.
 */
import type { SubjectCode } from "../curriculum";

/** Ko'p tilli matn. ru ixtiyoriy — bo'lmasa o'zbekchasi ko'rsatiladi va "tarjima yo'q" belgisi chiqadi */
export type Tx = { uz: string; tg: string; ru?: string };

/**
 * Mavzu holati:
 *  full    — to'liq ishlaydigan laboratoriya (yo'riqnoma, tajriba, misollar, topshiriqlar, test, hisobot)
 *  model   — interaktiv 3D model yoki mashq mavjud
 *  theory  — nazariy material va misollar/savollar mavjud
 *  planned — hali ishlab chiqilmagan
 */
export type LabStatus = "full" | "model" | "theory" | "planned";
export const LAB_STATUSES: LabStatus[] = ["full", "model", "theory", "planned"];

/**
 * Interaktiv qism:
 *  model    — LabsCanvas ichidagi parametrli 3D model (key: "circuit", "cell", ...)
 *  circuit  — sudrab yig'iladigan elektr zanjiri (CircuitBuilder)
 *  balance  — kimyoviy tenglamani tenglashtirish
 *  logic    — mantiqiy elementlar (VA, YOKI, EMAS, XOR)
 *  pro      — laboratoriya xonasidagi realistik 3D tajriba (components/Labs/pro/labs.ts: spring, titration, cell, earth, geometry)
 */
export type InteractiveKind = "model" | "circuit" | "balance" | "logic" | "pro";
export interface LabRef {
  kind: InteractiveKind;
  key?: string;
  title?: Tx;
}

export interface CatalogTopic {
  id: string;
  grade: number;
  subject: SubjectCode;
  title: Tx;
  status: LabStatus;
  labs: LabRef[];
  /** LAB_CONTENT dagi to'liq mazmun kaliti */
  content?: string;
  /** Qayerdan: o'rnatilgan katalog, darslar (public/lessons) yoki administrator qo'shgan */
  source: "catalog" | "lessons" | "admin";
  /** Admin/darslardan kelgan qisqa mazmun (to'liq LabContent bo'lmaganda) */
  goal?: Tx;
  theory?: Tx[];
  steps?: Tx[];
  quiz?: QuizItem[];
}

/** O'lchov: laboratoriya joriy holatidan olingan qiymatlar, masalan { U: 6, I: 0.5 } */
export type Measure = Record<string, number>;

export interface MeasureCol {
  key: string;
  label: string;
  unit?: string;
}

export interface ExampleInput {
  id: string;
  label: Tx;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface ExampleDef {
  title: Tx;
  /** Masala sharti; {id} o'rniga joriy qiymat qo'yiladi */
  text: Tx;
  inputs: ExampleInput[];
  /** Yechim bosqichlari (formulalar tarjimasiz, izohlar Tx) */
  solve(v: Record<string, number>): (string | Tx)[];
}

export interface TaskDef {
  text: Tx;
  /** Son javob bo'lsa avtomatik tekshiriladi */
  answer?: number;
  tol?: number;
  unit?: string;
}

export interface QuizItem {
  q: Tx;
  options: Tx[];
  answer: number;
}

export interface LabContent {
  goal: Tx;
  equipment: Tx[];
  theory: Tx[];
  /** Asosiy formulalar (tarjimasiz) */
  formulas: string[];
  steps: Tx[];
  tasks: TaskDef[];
  examples: ExampleDef[];
  /** O'lchovlar jadvali ustunlari va grafik o'qlari */
  columns?: MeasureCol[];
  graph?: { x: string; y: string };
  /** model turidagi laboratoriyada parametrlar → o'lchov */
  measure?(p: Record<string, number>): Measure;
  quiz: QuizItem[];
  conclusion: Tx;
}
