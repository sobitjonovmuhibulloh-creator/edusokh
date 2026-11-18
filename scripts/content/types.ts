/**
 * Qo'lda yozilgan dars mazmuni uchun ixcham format.
 * scripts/write-manual-lessons.ts uni public/lessons/*.json ga aylantiradi.
 */

/** [slayd sarlavhasi, ...bandlar] */
export type S = [string, ...string[]];
/** [savol, TO'G'RI javob, noto'g'ri 1, noto'g'ri 2, noto'g'ri 3] — tartib keyin aralashtiriladi */
export type Q = [string, string, string, string, string];

export interface LangContent {
  /** Mavzu nomi (mundarijadagidek) */
  t: string;
  /** Dars maqsadi */
  g: string;
  /** Asosiy tushunchalar */
  k: string[];
  /** Mazmun slaydlari (1-slayd — sarlavha va maqsad — avtomatik qo'shiladi) */
  s: S[];
  q: Q[];
  /** Uyga vazifa */
  h: string;
}

export interface ManualTopic {
  n: number;
  /** Kitobdagi boshlanish beti */
  p: number;
  /** Bob raqami (CHAPTERS indeksi, 0 dan) */
  c: number;
  lab?: string;
  uz: LangContent;
  tg: LangContent;
}

export interface ManualSubject {
  grade: number;
  subject: string;
  /** Kitobdagi bet raqami = PDF bet raqami + offset */
  offset: number;
  /** Oxirgi mavzudan keyingi bo'limning boshlanish beti (mavzu betlarini hisoblash uchun) */
  endPage: number;
  chapters: { uz: string; tg: string }[];
  topics: ManualTopic[];
}
