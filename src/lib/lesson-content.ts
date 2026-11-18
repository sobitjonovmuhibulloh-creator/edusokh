/**
 * Darslikdan yaratilgan mavzular (public/lessons/*.json) uchun umumiy turlar.
 * Skript (scripts/build-lessons.ts) yozadi, simulyator o'qiydi.
 */
import type { SubjectCode } from "./curriculum";

/** Dars mazmuni yoziladigan tillar (interfeys uch tilli, mazmun — ikki tilli) */
export const CONTENT_LANGS = ["uz", "tg"] as const;
export type ContentLang = (typeof CONTENT_LANGS)[number];

export interface TopicSlide {
  title: string;
  bullets: string[];
  /** O'qituvchi uchun qisqa izoh (slaydda ko'rinmaydi) */
  note?: string;
}

export interface TopicQuestion {
  q: string;
  options: string[];
  answer: number;
}

export interface TopicVideo {
  id: string;
  title: string;
  channel: string;
  /** Rasmiy kanal (OFFICIAL_CHANNELS) videosi bo'lsa true; aks holda o'qituvchi tekshirishi kerak */
  official: boolean;
}

export interface TopicLang {
  title: string;
  goal: string;
  keyConcepts: string[];
  slides: TopicSlide[];
  questions: TopicQuestion[];
  homework: string;
  /** Darslik PDF'idagi betlar (1 dan boshlab), [boshi, oxiri] */
  pdfPages: [number, number];
  /** Kitobda bosilgan bet raqami */
  printedPage: number;
  textbookUrl: string;
  video: TopicVideo | null;
}

export interface TopicEntry {
  n: number;
  chapter: string;
  /** Bob nomi har bir tilda (bo'lmasa chapter ko'rsatiladi) */
  chapterI18n?: Partial<Record<ContentLang, string>>;
  labKey: string | null;
  uz?: TopicLang;
  tg?: TopicLang;
}

export interface SubjectLessons {
  grade: number;
  subject: SubjectCode;
  model: string;
  generatedAt: string;
  topics: TopicEntry[];
}

export interface LessonsIndexItem {
  grade: number;
  subject: SubjectCode;
  file: string;
  topics: number;
  langs: ContentLang[];
}
