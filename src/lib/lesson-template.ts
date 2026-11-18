/**
 * 45 daqiqalik dars shabloni va slayd generatori.
 * Har bir mavzu uchun reja va slaydlar avtomatik qoralama sifatida tuziladi;
 * o'qituvchi keyin ularni tahrirlaydi va tasdiqlaydi.
 */
import type { Localized, LocalizedList } from "./i18n";

export type MethodKey = "FEYNMAN" | "CLUSTER" | "THINK_PAIR_SHARE" | "EXIT_TICKET";

export interface Method {
  name: Localized;
  minutes: number;
  steps: LocalizedList;
}

export const METHODS: Record<MethodKey, Method> = {
  FEYNMAN: {
    name: { uz: "Feynman usuli", tg: "Усули Фейнман", ru: "Метод Фейнмана" },
    minutes: 12,
    steps: {
      uz: ["Mavzuni 5 gapda, murakkab atamalarsiz yozing.", "Juftingizga 2 daqiqada tushuntiring.", "Juftingiz tushunmagan joyni belgilaydi.", "Belgilangan joyni darslikdan aniqlab, qayta tushuntiring."],
      tg: ["Мавзӯъро дар 5 ҷумла бе истилоҳоти мураккаб нависед.", "Дар 2 дақиқа ба ҳамсинф шарҳ диҳед.", "Ҳамсинф ҷойи нофаҳмро қайд мекунад.", "Ҷойи қайдшударо аз китоб равшан карда, дубора шарҳ диҳед."],
      ru: ["Опишите тему в 5 предложениях без сложных терминов.", "Объясните соседу за 2 минуты.", "Сосед отмечает непонятное место.", "Уточните его по учебнику и объясните снова."],
    },
  },
  CLUSTER: {
    name: { uz: "Klaster", tg: "Кластер", ru: "Кластер" },
    minutes: 10,
    steps: {
      uz: ["Markazga mavzu yoziladi.", "Guruh 3–4 asosiy tarmoq chizadi.", "Kichik tarmoqlar qo'shiladi.", "Guruh 2 daqiqada himoya qiladi."],
      tg: ["Дар марказ мавзӯъ навишта мешавад.", "Гурӯҳ 3–4 шохаи асосӣ мекашад.", "Шохаҳои хурд илова мешаванд.", "Гурӯҳ дар 2 дақиқа ҳимоя мекунад."],
      ru: ["В центре записывается тема.", "Группа рисует 3–4 основные ветви.", "Добавляются малые ветви.", "Группа защищает кластер за 2 минуты."],
    },
  },
  THINK_PAIR_SHARE: {
    name: { uz: "Fikrla – juftlash – ulash", tg: "Фикр кун – ҷуфт шав – мубодила кун", ru: "Думай – в паре – поделись" },
    minutes: 8,
    steps: {
      uz: ["Savol beriladi, har kim 1 daqiqa yakka o'ylaydi.", "Juftlikda 2 daqiqa fikr almashadi.", "Bir nechta juftlik sinfga aytadi.", "O'qituvchi umumlashtiradi."],
      tg: ["Савол дода мешавад, ҳама 1 дақиқа танҳо фикр мекунад.", "Дар ҷуфт 2 дақиқа фикр мубодила мекунанд.", "Чанд ҷуфт ба синф мегӯянд.", "Муаллим ҷамъбаст мекунад."],
      ru: ["Задаётся вопрос, каждый думает 1 минуту.", "2 минуты обсуждение в паре.", "Несколько пар делятся с классом.", "Учитель обобщает."],
    },
  },
  EXIT_TICKET: {
    name: { uz: "Chiqish chiptasi", tg: "Чиптаи баромад", ru: "Билет на выход" },
    minutes: 4,
    steps: {
      uz: ["Nimani bildim? Nima tushunarsiz? 1 ta savolim.", "Chiqishda o'qituvchiga topshiriladi.", "Keyingi dars shunga qarab rejalashtiriladi."],
      tg: ["Чиро фаҳмидам? Чӣ нофаҳм? 1 саволи ман.", "Ҳангоми баромадан ба муаллим супорида мешавад.", "Дарси оянда аз рӯи ин ба нақша гирифта мешавад."],
      ru: ["Что я узнал? Что непонятно? Мой вопрос.", "Сдаётся учителю на выходе.", "Следующий урок планируется с учётом ответов."],
    },
  },
};

export interface LessonStage {
  minutes: number;
  title: Localized;
  body: Localized;
}

export interface LessonInput {
  title: Localized;
  goal: Localized;
  keyConcepts?: LocalizedList;
  labKey?: string;
  methods: MethodKey[];
  videoQuery?: string;
}

/** 5 bosqichli 45 daqiqalik reja (5 + 12 + 13 + 10 + 5) */
export function buildLessonPlan(l: LessonInput): LessonStage[] {
  const m = METHODS[l.methods[0] ?? "THINK_PAIR_SHARE"];
  const hasLab = Boolean(l.labKey);
  return [
    {
      minutes: 5,
      title: { uz: "Tashkiliy qism va qiziqtirish", tg: "Қисми ташкилӣ ва ҷалб", ru: "Организационный момент и мотивация" },
      body: {
        uz: `Davomat. «${l.title.uz}» mavzusiga hayotdan bitta savol bering.`,
        tg: `Ҳозиршавӣ. Дар бораи «${l.title.tg}» як саволи ҳаётӣ диҳед.`,
        ru: `Перекличка. Задайте жизненный вопрос по теме «${l.title.ru}».`,
      },
    },
    {
      minutes: 12,
      title: { uz: "Yangi mavzu bayoni", tg: "Баёни мавзӯи нав", ru: "Объяснение новой темы" },
      body: {
        uz: "Qisqa video (3–5 daq.) va asosiy tushunchalarni doskada jamlash.",
        tg: "Видеои кӯтоҳ (3–5 дақ.) ва ҷамъбасти мафҳумҳои асосӣ дар тахта.",
        ru: "Короткое видео (3–5 мин) и запись ключевых понятий на доске.",
      },
    },
    {
      minutes: 13,
      title: hasLab
        ? { uz: "3D laboratoriya", tg: "Лабораторияи 3D", ru: "3D-лаборатория" }
        : { uz: "Amaliy topshiriq", tg: "Вазифаи амалӣ", ru: "Практическое задание" },
      body: hasLab
        ? {
            uz: "Modelni aylantirib, parametrlarni o'zgartiring; har guruh bitta kuzatuvni aytadi.",
            tg: "Моделро гардонед, параметрҳоро тағйир диҳед; ҳар гурӯҳ як мушоҳида мегӯяд.",
            ru: "Вращайте модель, меняйте параметры; каждая группа называет одно наблюдение.",
          }
        : { uz: "Darslikdagi 2–3 mashq yechiladi.", tg: "2–3 машқи китоб ҳал карда мешавад.", ru: "Решаются 2–3 упражнения из учебника." },
    },
    {
      minutes: 10,
      title: m.name,
      body: { uz: m.steps.uz.join(" → "), tg: m.steps.tg.join(" → "), ru: m.steps.ru.join(" → ") },
    },
    {
      minutes: 5,
      title: { uz: "Mustahkamlash va baholash", tg: "Мустаҳкамкунӣ ва баҳогузорӣ", ru: "Закрепление и оценивание" },
      body: {
        uz: "3 ta tezkor test, chiqish chiptasi, uyga vazifa.",
        tg: "3 тести зуд, чиптаи баромад, вазифаи хонагӣ.",
        ru: "3 быстрых теста, билет на выход, домашнее задание.",
      },
    },
  ];
}

export type SlideKind = "title" | "bullets" | "video" | "lab" | "embed";

export interface Slide {
  kind: SlideKind;
  title: Localized;
  bullets?: LocalizedList;
  /** YouTube embed yoki tashqi slayd manzili (Google Slides "publish to web" va h.k.) */
  embedUrl?: string;
  labKey?: string;
}

/** YouTube havolasidan embed manzil yasaydi; noto'g'ri havola bo'lsa null */
export function youTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("/")[0] || null;
    else if (u.hostname.endsWith("youtube.com")) {
      id = u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{6,})/);
      if (!id && m) id = m[2];
    }
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function buildSlides(l: LessonInput, opts: { videoUrl?: string } = {}): Slide[] {
  const slides: Slide[] = [
    { kind: "title", title: l.title, bullets: { uz: [l.goal.uz], tg: [l.goal.tg], ru: [l.goal.ru] } },
    {
      kind: "bullets",
      title: { uz: "Bugun nimani bilib olamiz?", tg: "Имрӯз чиро меомӯзем?", ru: "Что мы сегодня узнаем?" },
      bullets: {
        uz: [`«${l.title.uz}» hayotda qayerda uchraydi?`],
        tg: [`«${l.title.tg}» дар зиндагӣ дар куҷо вомехӯрад?`],
        ru: [`Где в жизни встречается «${l.title.ru}»?`],
      },
    },
    {
      kind: "bullets",
      title: { uz: "Asosiy tushunchalar", tg: "Мафҳумҳои асосӣ", ru: "Ключевые понятия" },
      bullets: l.keyConcepts ?? {
        uz: ["(O'qituvchi to'ldiradi: 3–5 ta tushuncha)"],
        tg: ["(Муаллим пур мекунад: 3–5 мафҳум)"],
        ru: ["(Заполняет учитель: 3–5 понятий)"],
      },
    },
  ];
  const embed = opts.videoUrl ? youTubeEmbed(opts.videoUrl) : null;
  if (embed) slides.push({ kind: "video", title: { uz: "Video", tg: "Видео", ru: "Видео" }, embedUrl: embed });
  if (l.labKey) slides.push({ kind: "lab", title: { uz: "3D laboratoriya", tg: "Лабораторияи 3D", ru: "3D-лаборатория" }, labKey: l.labKey });
  for (const key of l.methods) {
    const m = METHODS[key];
    slides.push({ kind: "bullets", title: m.name, bullets: m.steps });
  }
  slides.push({
    kind: "bullets",
    title: { uz: "Chiqish chiptasi", tg: "Чиптаи баромад", ru: "Билет на выход" },
    bullets: {
      uz: ["Nimani bildim?", "Nima tushunarsiz qoldi?", "Uyga vazifa"],
      tg: ["Чиро фаҳмидам?", "Чӣ нофаҳм монд?", "Вазифаи хонагӣ"],
      ru: ["Что я узнал?", "Что осталось непонятным?", "Домашнее задание"],
    },
  });
  return slides;
}
