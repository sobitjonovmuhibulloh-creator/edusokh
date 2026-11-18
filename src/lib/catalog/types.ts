/**
 * Darsliklar katalogi: Sinf → Fan → Darslik → Bob → Mavzu → O'quv materiallari.
 * Manba ma'lumotlari: scripts/build-catalog.ts → public/catalog/index.json va public/catalog/books/<id>.json.
 * Qoida: darslik yoki mavzu ma'lumoti PDF'dan tekshirilmagan bo'lsa, o'ylab topilmaydi —
 * `toc: "needed"` ("ma'lumot kerak") bo'lib qoladi.
 */
import type { SubjectCode } from "../curriculum";

export type BookLang = "uz" | "tg" | "ru";

/**
 * Mundarija holati:
 *  verified — boblar va mavzular darslik PDF'idan o'qib kiritilgan
 *  needed   — hali kiritilmagan ("ma'lumot kerak")
 *  missing  — darslik fayli manbada yo'q (404)
 */
export type TocStatus = "verified" | "needed" | "missing";

export interface TextbookSummary {
  /** Fayl nomi (.pdf siz), masalan "fizika_8_uzb". Doimiy ID */
  id: string;
  /** Bitta kitob bir nechta sinf uchun bo'lishi mumkin (masalan, jismoniy tarbiya 7–8) */
  grades: number[];
  subject: SubjectCode;
  lang: BookLang;
  title: string;
  /** Rasmiy manba havolasi */
  sourceUrl: string;
  sourceName: string;
  /** Manbaga yuklangan sana (HTTP Last-Modified) — nashr yili EMAS */
  uploadedAt: string | null;
  bytes: number | null;
  /** Titul/imprint betidan o'qilgan ma'lumotlar; o'qilmagan bo'lsa null */
  year: number | null;
  publisher: string | null;
  /** Nashr raqami, ISBN, mualliflar (titul betidan) */
  imprint: string | null;
  toc: TocStatus;
  chapterCount: number;
  topicCount: number;
}

/** Mavzu holati belgilari (boshqaruv panelidagi ustunlar) */
export interface TopicFlags {
  /** Mavzu katalogga kiritilgan (har doim true — mavzu mavjud bo'lsa) */
  listed: true;
  /** Mavzu nomi va beti darslik PDF'idan tekshirilgan */
  sourceVerified: boolean;
  theory: boolean;
  slides: boolean;
  video: boolean;
  lab: boolean;
  test: boolean;
}

export const FLAG_KEYS = ["listed", "sourceVerified", "theory", "slides", "video", "lab", "test"] as const satisfies readonly (keyof TopicFlags)[];

/** Mavzuga bog'langan materiallar: faqat ID va havolalar; mazmunning o'zi o'z joyida qoladi */
export interface TopicMaterials {
  /** public/lessons/<file> dagi dars (nazariya, slayd matni, savollar, uyga vazifa) */
  lesson?: { file: string; n: number };
  /** Slaydlar kutubxonasi (/api/slides) dagi fayllar ID'lari */
  slideDecks?: string[];
  /** Video: YouTube ID */
  video?: { id: string; title: string; channel: string; official: boolean };
  /** 3D laboratoriya katalogidagi mavzu ID'lari (src/lib/labs/catalog.ts) */
  labs?: string[];
}

export interface CatalogTopic {
  /** "<kitobId>:<n>" */
  id: string;
  n: number;
  title: string;
  /** Kitobda bosilgan bet; noma'lum bo'lsa null */
  page: number | null;
  materials: TopicMaterials;
  flags: TopicFlags;
}

export interface CatalogChapter {
  title: string;
  topics: CatalogTopic[];
}

export interface TextbookDetail extends TextbookSummary {
  /** PDF beti = floor(bosilgan bet / pagesPerPdfPage) + pageOffset; noma'lum bo'lsa null */
  pageOffset: number | null;
  /** Skan ikki betni bitta PDF betiga joylagan bo'lsa 2 */
  pagesPerPdfPage: 1 | 2;
  /** Mundarija qayerdan va kim tomonidan olingani */
  tocSource: string | null;
  chapters: CatalogChapter[];
}

/** scripts/toc/<id>.json — qo'lda o'qilgan mundarija fayli */
export interface TocFile {
  id: string;
  year: number | null;
  publisher: string | null;
  /** PDF beti = floor(bosilgan bet / pagesPerPdfPage) + pageOffset */
  pageOffset: number | null;
  pagesPerPdfPage?: 1 | 2;
  /** Titul betidagi qo'shimcha: nashr raqami, ISBN, mualliflar */
  imprint?: string;
  /** Masalan: "PDF 171–173-betlar (mundarija), 2-bet (titul)" */
  source: string;
  chapters: { title: string; topics: { title: string; page: number | null }[] }[];
}
