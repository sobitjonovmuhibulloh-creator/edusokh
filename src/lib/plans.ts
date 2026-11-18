/**
 * Tariflar: Oddiy, Pro, Pro Max.
 * Narxlar — taklif (o'qituvchi uchun, oyiga, so'mda); bozor va maktablar bilan suhbatdan keyin aniqlashtiriladi.
 */
import type { Localized } from "./i18n";

export const PLANS = ["basic", "pro", "promax"] as const;
export type Plan = (typeof PLANS)[number];

export type Feature = "books" | "lessons" | "quiz" | "video" | "labs" | "exams" | "ai" | "offline" | "stats" | "support";

export const FEATURE_LABELS: Record<Feature, Localized> = {
  books: { uz: "540+ rasmiy darslik (o'zbek, tojik, rus)", tg: "540+ китоби дарсии расмӣ (ӯзбекӣ, тоҷикӣ, русӣ)", ru: "540+ официальных учебников (узб., тадж., рус.)" },
  lessons: { uz: "Har fan mundarijasi va mavzu slaydlari", tg: "Мундариҷаи ҳар фан ва слайдҳои мавзӯъ", ru: "Оглавление каждого предмета и слайды по темам" },
  quiz: { uz: "Mavzu bo'yicha tezkor tekshiruv", tg: "Санҷиши зуд аз рӯи мавзӯъ", ru: "Быстрая проверка по теме" },
  video: { uz: "Har mavzuga video dars", tg: "Видеодарс барои ҳар мавзӯъ", ru: "Видеоурок к каждой теме" },
  labs: { uz: "18 ta interaktiv 3D laboratoriya", tg: "18 лабораторияи интерактивии 3D", ru: "18 интерактивных 3D-лабораторий" },
  exams: { uz: "BSB/CHSB: PIN bilan tarqatish, anti-cheat, natijalar", tg: "BSB/CHSB: паҳн кардан бо PIN, зидди қаллобӣ, натиҷаҳо", ru: "BSB/CHSB: раздача по PIN, анти-списывание, результаты" },
  ai: { uz: "AI test va slayd generatori", tg: "Генератори AI-и тест ва слайд", ru: "AI-генератор тестов и слайдов" },
  offline: { uz: "Darsliklarni oflayn yuklab olish", tg: "Боргирии офлайни китобҳо", ru: "Офлайн-загрузка учебников" },
  stats: { uz: "Sinf va maktab statistikasi, hisobotlar", tg: "Омори синф ва мактаб, ҳисоботҳо", ru: "Статистика класса и школы, отчёты" },
  support: { uz: "Ustuvor yordam (Telegram)", tg: "Дастгирии афзалиятнок (Telegram)", ru: "Приоритетная поддержка (Telegram)" },
};

export interface PlanInfo {
  name: string;
  /** So'm, o'qituvchi uchun, oyiga */
  monthly: number;
  /** So'm, butun maktab uchun, yiliga (o'qituvchilar soni cheklanmagan) */
  schoolYearly: number;
  tagline: Localized;
  features: Feature[];
}

const BASIC: Feature[] = ["books", "lessons", "quiz"];
const PRO: Feature[] = [...BASIC, "video", "labs", "exams"];
const PROMAX: Feature[] = [...PRO, "ai", "offline", "stats", "support"];

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  basic: {
    name: "Oddiy",
    monthly: 29_000,
    schoolYearly: 1_900_000,
    tagline: { uz: "Darslik va slaydlar bilan ishlash uchun", tg: "Барои кор бо китоб ва слайдҳо", ru: "Для работы с учебниками и слайдами" },
    features: BASIC,
  },
  pro: {
    name: "Pro",
    monthly: 69_000,
    schoolYearly: 4_500_000,
    tagline: { uz: "To'liq dars: video, 3D laboratoriya, imtihonlar", tg: "Дарси пурра: видео, лабораторияи 3D, имтиҳонҳо", ru: "Полный урок: видео, 3D-лаборатории, экзамены" },
    features: PRO,
  },
  promax: {
    name: "Pro Max",
    monthly: 149_000,
    schoolYearly: 9_500_000,
    tagline: { uz: "AI generator va butun maktab uchun boshqaruv", tg: "Генератори AI ва идоракунӣ барои тамоми мактаб", ru: "AI-генератор и управление для всей школы" },
    features: PROMAX,
  },
};

export const hasFeature = (plan: Plan, f: Feature) => PLAN_INFO[plan].features.includes(f);

/** Feature uchun eng arzon tarif */
export const minPlanFor = (f: Feature): Plan => PLANS.find((p) => hasFeature(p, f)) ?? "promax";

export const formatSum = (n: number) => n.toLocaleString("ru-RU").replace(/ /g, " ");

export const PLAN_TEXT = {
  title: { uz: "Tariflar", tg: "Тарифҳо", ru: "Тарифы" },
  perMonth: { uz: "so'm / oy, 1 o'qituvchi", tg: "сӯм / моҳ, 1 муаллим", ru: "сум / мес, 1 учитель" },
  school: { uz: "Butun maktab, yillik", tg: "Тамоми мактаб, солона", ru: "Вся школа, в год" },
  sum: { uz: "so'm", tg: "сӯм", ru: "сум" },
  current: { uz: "Joriy tarif", tg: "Тарифи ҷорӣ", ru: "Текущий тариф" },
  choose: { uz: "Tanlash", tg: "Интихоб", ru: "Выбрать" },
  popular: { uz: "Eng ommabop", tg: "Маъмултарин", ru: "Популярный" },
  students: { uz: "O'quvchilar uchun bepul — maktab yoki o'qituvchi tarifi orqali", tg: "Барои хонандагон ройгон — тавассути тарифи мактаб ё муаллим", ru: "Для учеников бесплатно — через тариф школы или учителя" },
  note: {
    uz: "Narxlar taklif sifatida berilgan. Simulyatorda tarifni almashtirib, har birida nima ochilishini ko'ring.",
    tg: "Нархҳо ҳамчун пешниҳод дода шудаанд. Дар симулятор тарифро иваз карда, бинед, ки дар ҳар кадом чӣ кушода мешавад.",
    ru: "Цены указаны как предложение. Переключите тариф в симуляторе и посмотрите, что открывается в каждом.",
  },
  locked: { uz: "Bu imkoniyat {plan} tarifida mavjud", tg: "Ин имконият дар тарифи {plan} дастрас аст", ru: "Эта возможность доступна в тарифе {plan}" },
  upgrade: { uz: "Tariflarni ko'rish", tg: "Дидани тарифҳо", ru: "Посмотреть тарифы" },
  planLabel: { uz: "Tarif", tg: "Тариф", ru: "Тариф" },
} satisfies Record<string, Localized>;
