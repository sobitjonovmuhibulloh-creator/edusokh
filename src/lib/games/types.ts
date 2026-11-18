/**
 * EduSokh Games: savollar va to'plamlar turlari.
 * Savollar mavzuning haqiqiy materiallaridan (dars testi, laboratoriya testi) yoki o'qituvchidan olinadi
 * va materialning asl tilida qoladi — avtomatik tarjima qilinmaydi.
 */

export interface GameQuestion {
  q: string;
  options: string[];
  /** To'g'ri variant indeksi */
  answer: number;
  /** Qayerdan: "Dars testi", "Laboratoriya", "O'qituvchi" */
  src: string;
}

export interface GamePair {
  a: string;
  b: string;
}

export interface GameGroup {
  name: string;
  items: string[];
}

/** O'qituvchi yoki mualliflar tayyorlagan to'plam (bitta mavzu uchun) */
export interface GameSet {
  topicId: string;
  questions?: GameQuestion[];
  pairs?: GamePair[];
  groups?: GameGroup[];
  author?: string;
  updatedAt?: string;
}

/** Tashqi manbadagi material havolasi (fayl ko'chirilmaydi) */
export interface MaterialLink {
  id: string;
  topicId: string;
  kind: "slide" | "video" | "other";
  url: string;
  title: string;
  /** Material tili (asl) */
  lang: "uz" | "tg" | "ru" | "other";
  source: string;
  note: string;
  addedAt: string;
}

export const TOPIC_ID_RE = /^[a-z0-9_]{3,60}:\d{1,4}$/;
