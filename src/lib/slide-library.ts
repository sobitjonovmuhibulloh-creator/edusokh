/**
 * "Slaydlar va taqdimotlar" kutubxonasi: o'qituvchilar yuklagan PDF/PPTX fayllar.
 * Bu fayl brauzer va server uchun umumiy (turlar, cheklovlar, matnlar).
 * Saqlash — src/lib/slide-store.ts (faqat server), API — src/app/api/slides.
 */
import type { SubjectCode } from "./curriculum";
import type { Localized } from "./i18n";

/** Slayd fayli qaysi tilda yozilgan (asl til; tarjima qilinmaydi) */
export const DECK_LANGS = ["uz", "tg"] as const;
export type DeckLang = (typeof DECK_LANGS)[number];

export const DECK_FORMATS = ["pdf", "pptx"] as const;
export type DeckFormat = (typeof DECK_FORMATS)[number];

export const MAX_DECK_BYTES = 50 * 1024 * 1024;

export interface SlideDeckFile {
  id: string;
  title: string;
  grade: number;
  subject: SubjectCode;
  topic: string;
  lang: DeckLang;
  format: DeckFormat;
  bytes: number;
  /** Necha slayd/bet (aniqlab bo'lmasa 0) */
  pages: number;
  author: string;
  /** Darsliklar katalogidagi mavzu ("<kitobId>:<n>"), bog'lanmagan bo'lsa yo'q */
  topicId?: string;
  /** "demo" — namuna, "upload" — saytda yuklangan */
  source: "demo" | "upload";
  createdAt: string;
}

export const DECK_LANG_LABELS: Record<DeckLang, string> = { uz: "O'zbekcha", tg: "Тоҷикӣ" };

export const SLIDES_TEXT = {
  nav: { uz: "Slaydlar va taqdimotlar", tg: "Слайдҳо ва презентатсияҳо", ru: "Слайды и презентации" },
  search: { uz: "Nomi yoki mavzu bo'yicha qidirish…", tg: "Ҷустуҷӯ аз рӯи ном ё мавзӯъ…", ru: "Поиск по названию или теме…" },
  allGrades: { uz: "Barcha sinflar", tg: "Ҳамаи синфҳо", ru: "Все классы" },
  allSubjects: { uz: "Barcha fanlar", tg: "Ҳамаи фанҳо", ru: "Все предметы" },
  allLangs: { uz: "Barcha tillar", tg: "Ҳамаи забонҳо", ru: "Все языки" },
  grade: { uz: "Sinf", tg: "Синф", ru: "Класс" },
  subject: { uz: "Fan", tg: "Фан", ru: "Предмет" },
  topic: { uz: "Mavzu", tg: "Мавзӯъ", ru: "Тема" },
  title: { uz: "Nomi", tg: "Ном", ru: "Название" },
  lang: { uz: "Til", tg: "Забон", ru: "Язык" },
  format: { uz: "Format", tg: "Формат", ru: "Формат" },
  author: { uz: "Muallif", tg: "Муаллиф", ru: "Автор" },
  file: { uz: "Fayl (PDF yoki PPTX, 50 MB gacha)", tg: "Файл (PDF ё PPTX, то 50 МБ)", ru: "Файл (PDF или PPTX, до 50 МБ)" },
  view: { uz: "Ko'rish", tg: "Дидан", ru: "Смотреть" },
  download: { uz: "Yuklab olish", tg: "Боргирӣ", ru: "Скачать" },
  remove: { uz: "O'chirish", tg: "Нест кардан", ru: "Удалить" },
  removeConfirm: { uz: "Bu slaydni o'chirasizmi?", tg: "Ин слайдро нест мекунед?", ru: "Удалить эту презентацию?" },
  upload: { uz: "Slayd yuklash", tg: "Боркунии слайд", ru: "Загрузить слайды" },
  uploading: { uz: "Yuklanmoqda…", tg: "Бор шуда истодааст…", ru: "Загрузка…" },
  uploaded: { uz: "Slayd yuklandi", tg: "Слайд бор карда шуд", ru: "Слайды загружены" },
  close: { uz: "Yopish", tg: "Пӯшидан", ru: "Закрыть" },
  found: { uz: "ta slayd topildi", tg: "слайд ёфт шуд", ru: "найдено" },
  empty: { uz: "Bu filtrlar bo'yicha slayd topilmadi.", tg: "Аз рӯи ин филтрҳо слайд ёфт нашуд.", ru: "По этим фильтрам ничего не найдено." },
  demo: { uz: "Namuna", tg: "Намуна", ru: "Образец" },
  pages: { uz: "slayd", tg: "слайд", ru: "слайдов" },
  pptxPreview: {
    uz: "PPTX brauzerda to'liq ko'rinmaydi — quyida slaydlar matni. Asl ko'rinishi uchun faylni yuklab oling.",
    tg: "PPTX дар браузер пурра намоён намешавад — дар поён матни слайдҳо. Барои намуди аслӣ файлро боргирӣ кунед.",
    ru: "PPTX нельзя полностью показать в браузере — ниже текст слайдов. Для оригинального вида скачайте файл.",
  },
  officeViewer: { uz: "Office Online'da ochish", tg: "Кушодан дар Office Online", ru: "Открыть в Office Online" },
  noText: { uz: "(matnsiz slayd)", tg: "(слайди бе матн)", ru: "(слайд без текста)" },
  rules: {
    uz: "Faqat o'zingiz tayyorlagan yoki tarqatishga ruxsat berilgan materiallarni yuklang. Fayl asl tilida saqlanadi.",
    tg: "Танҳо маводеро бор кунед, ки худатон тайёр кардаед ё паҳн кардани он иҷозат дода шудааст. Файл бо забони аслӣ нигоҳ дошта мешавад.",
    ru: "Загружайте только собственные материалы или те, распространение которых разрешено. Файл хранится на языке оригинала.",
  },
} satisfies Record<string, Localized>;

export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
