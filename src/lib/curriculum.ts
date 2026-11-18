/**
 * 1–11-sinflar o'quv dasturi katalogi, namunaviy darslar va zaxira savollar banki.
 *
 * DIQQAT: fanlar ro'yxati Xalq ta'limi vazirligining amaldagi o'quv rejasi bilan
 * solishtirilishi kerak — bu yerda taxminiy taqsimot berilgan. Ma'lumotlar bazasi
 * `prisma/seed.ts` orqali shu katalogdan to'ldiriladi; o'qituvchilar keyin o'z
 * fanlari va mavzularini qo'sha oladi.
 */
import type { Localized } from "./i18n";
import type { MethodKey } from "./lesson-template";

export type StageKey = "PRIMARY" | "MIDDLE" | "HIGH" | "UPPER";

export const SUBJECTS = {
  ona_tili: { uz: "Ona tili", tg: "Забони модарӣ", ru: "Родной язык" },
  oqish: { uz: "O'qish savodxonligi", tg: "Хониш", ru: "Чтение" },
  adabiyot: { uz: "Adabiyot", tg: "Адабиёт", ru: "Литература" },
  matematika: { uz: "Matematika", tg: "Математика", ru: "Математика" },
  algebra: { uz: "Algebra", tg: "Алгебра", ru: "Алгебра" },
  geometriya: { uz: "Geometriya", tg: "Геометрия", ru: "Геометрия" },
  tabiiy_fanlar: { uz: "Tabiiy fanlar", tg: "Илмҳои табиӣ", ru: "Естественные науки" },
  fizika: { uz: "Fizika", tg: "Физика", ru: "Физика" },
  kimyo: { uz: "Kimyo", tg: "Химия", ru: "Химия" },
  biologiya: { uz: "Biologiya", tg: "Биология", ru: "Биология" },
  geografiya: { uz: "Geografiya", tg: "География", ru: "География" },
  astronomiya: { uz: "Astronomiya", tg: "Астрономия", ru: "Астрономия" },
  tarix: { uz: "Tarix", tg: "Таърих", ru: "История" },
  huquq: { uz: "Huquq", tg: "Ҳуқуқ", ru: "Право" },
  iqtisod: { uz: "Iqtisodiy bilim asoslari", tg: "Асосҳои дониши иқтисодӣ", ru: "Основы экономики" },
  informatika: { uz: "Informatika", tg: "Информатика", ru: "Информатика" },
  ingliz_tili: { uz: "Ingliz tili", tg: "Забони англисӣ", ru: "Английский язык" },
  rus_tili: { uz: "Rus tili", tg: "Забони русӣ", ru: "Русский язык" },
  tarbiya: { uz: "Tarbiya", tg: "Тарбия", ru: "Воспитание" },
  musiqa: { uz: "Musiqa", tg: "Мусиқӣ", ru: "Музыка" },
  tasviriy: { uz: "Tasviriy san'at", tg: "Санъати тасвирӣ", ru: "Изобразительное искусство" },
  texnologiya: { uz: "Texnologiya", tg: "Технология", ru: "Технология" },
  jismoniy: { uz: "Jismoniy tarbiya", tg: "Тарбияи ҷисмонӣ", ru: "Физическая культура" },
  chqbt: { uz: "Chaqiruvga qadar boshlang'ich tayyorgarlik", tg: "Тайёрии ибтидоии пеш аз даъват", ru: "Начальная допризывная подготовка" },
  chizmachilik: { uz: "Chizmachilik", tg: "Нақшакашӣ", ru: "Черчение" },
  nemis_tili: { uz: "Nemis tili", tg: "Забони немисӣ", ru: "Немецкий язык" },
  fransuz_tili: { uz: "Fransuz tili", tg: "Забони фаронсавӣ", ru: "Французский язык" },
  tojik_tili: { uz: "Tojik tili", tg: "Забони тоҷикӣ", ru: "Таджикский язык" },
  ozbek_tili: { uz: "O'zbek tili", tg: "Забони ӯзбекӣ", ru: "Узбекский язык" },
} satisfies Record<string, Localized>;

export type SubjectCode = keyof typeof SUBJECTS;

const PRIMARY: SubjectCode[] = ["ona_tili", "oqish", "matematika", "tabiiy_fanlar", "ingliz_tili", "rus_tili", "tarbiya", "musiqa", "tasviriy", "texnologiya", "jismoniy"];
const MIDDLE: SubjectCode[] = ["ona_tili", "adabiyot", "matematika", "tabiiy_fanlar", "tarix", "geografiya", "informatika", "ingliz_tili", "rus_tili", "tarbiya", "musiqa", "tasviriy", "texnologiya", "jismoniy"];
const HIGH: SubjectCode[] = ["ona_tili", "adabiyot", "algebra", "geometriya", "fizika", "kimyo", "biologiya", "tarix", "geografiya", "informatika", "ingliz_tili", "rus_tili", "tarbiya", "texnologiya", "jismoniy"];
const UPPER: SubjectCode[] = ["ona_tili", "adabiyot", "algebra", "geometriya", "fizika", "kimyo", "biologiya", "astronomiya", "informatika", "tarix", "geografiya", "huquq", "iqtisod", "ingliz_tili", "rus_tili", "chqbt", "jismoniy"];

export const GRADES: { number: number; stage: StageKey; subjects: SubjectCode[] }[] = Array.from({ length: 11 }, (_, i) => {
  const n = i + 1;
  if (n <= 4) return { number: n, stage: "PRIMARY" as const, subjects: n === 1 ? PRIMARY.filter((s) => s !== "rus_tili") : PRIMARY };
  if (n <= 6) return { number: n, stage: "MIDDLE" as const, subjects: MIDDLE };
  if (n <= 9) return { number: n, stage: "HIGH" as const, subjects: n >= 8 ? [...HIGH, "huquq" as const] : HIGH };
  return { number: n, stage: "UPPER" as const, subjects: n === 10 ? UPPER.filter((s) => s !== "astronomiya") : UPPER };
});

/** 10–11-sinf ixtisoslashtirilgan yo'nalishlari: chuqurlashtirilgan fanlar */
export const UPPER_TRACKS: { key: string; name: Localized; focus: SubjectCode[] }[] = [
  { key: "math", name: { uz: "Matematika", tg: "Математика", ru: "Математика" }, focus: ["algebra", "geometriya", "informatika"] },
  { key: "physics", name: { uz: "Fizika-texnika", tg: "Физика-техника", ru: "Физико-технический" }, focus: ["fizika", "algebra", "astronomiya"] },
  { key: "chembio", name: { uz: "Kimyo-biologiya", tg: "Химия-биология", ru: "Химико-биологический" }, focus: ["kimyo", "biologiya"] },
  { key: "cs", name: { uz: "Informatika", tg: "Информатика", ru: "Информатика" }, focus: ["informatika", "algebra"] },
  { key: "humanities", name: { uz: "Ijtimoiy-gumanitar", tg: "Ҷамъиятӣ-гуманитарӣ", ru: "Социально-гуманитарный" }, focus: ["tarix", "huquq", "adabiyot"] },
];

/* ───── Namunaviy darslar ───── */

export interface DemoLesson {
  id: string;
  subject: SubjectCode;
  grade: number;
  title: Localized;
  goal: Localized;
  keyConcepts: Record<"uz" | "tg" | "ru", string[]>;
  labKey?: string;
  methods: MethodKey[];
  videoQuery: string;
}

export const DEMO_LESSONS: DemoLesson[] = [
  {
    id: "ohm", subject: "fizika", grade: 8, labKey: "circuit", methods: ["THINK_PAIR_SHARE", "EXIT_TICKET"],
    title: { uz: "Elektr zanjiri va Om qonuni", tg: "Занҷири барқӣ ва қонуни Ом", ru: "Электрическая цепь и закон Ома" },
    goal: { uz: "Tok kuchi, kuchlanish va qarshilik orasidagi bog'lanishni tushuntirish", tg: "Шарҳи вобастагии қувваи ҷараён, шиддат ва муқовимат", ru: "Объяснить связь между силой тока, напряжением и сопротивлением" },
    keyConcepts: {
      uz: ["Tok kuchi I (A)", "Kuchlanish U (V)", "Qarshilik R (Ω)", "Om qonuni: I = U / R"],
      tg: ["Қувваи ҷараён I (A)", "Шиддат U (V)", "Муқовимат R (Ω)", "Қонуни Ом: I = U / R"],
      ru: ["Сила тока I (А)", "Напряжение U (В)", "Сопротивление R (Ом)", "Закон Ома: I = U / R"],
    },
    videoQuery: "Om qonuni 8-sinf fizika",
  },
  {
    id: "induction", subject: "fizika", grade: 9, labKey: "induction", methods: ["FEYNMAN", "EXIT_TICKET"],
    title: { uz: "Elektromagnit induksiya (Faradey tajribasi)", tg: "Индуксияи электромагнитӣ (таҷрибаи Фарадей)", ru: "Электромагнитная индукция (опыт Фарадея)" },
    goal: { uz: "Magnit oqimi o'zgarganda induksion tok paydo bo'lishini kuzatish", tg: "Мушоҳидаи пайдоиши ҷараёни индуксионӣ ҳангоми тағйири ҷараёни магнитӣ", ru: "Наблюдать возникновение индукционного тока при изменении магнитного потока" },
    keyConcepts: {
      uz: ["Magnit oqimi Φ", "Induksiya EYuK: ε = −N·ΔΦ/Δt", "Magnit tez harakatlansa, tok kuchliroq", "Lens qoidasi"],
      tg: ["Ҷараёни магнитӣ Φ", "ЭДС-и индуксия: ε = −N·ΔΦ/Δt", "Магнит тезтар ҳаракат кунад, ҷараён қавитар", "Қоидаи Ленс"],
      ru: ["Магнитный поток Φ", "ЭДС индукции: ε = −N·ΔΦ/Δt", "Чем быстрее магнит, тем сильнее ток", "Правило Ленца"],
    },
    videoQuery: "elektromagnit induksiya Faradey tajribasi",
  },
  {
    id: "atom", subject: "kimyo", grade: 7, labKey: "atom", methods: ["CLUSTER", "EXIT_TICKET"],
    title: { uz: "Atom tuzilishi", tg: "Сохти атом", ru: "Строение атома" },
    goal: { uz: "Proton, neytron va elektronlarni, elektron qavatlarni aniqlash", tg: "Муайян кардани протон, нейтрон, электрон ва қабатҳои электронӣ", ru: "Определять протоны, нейтроны, электроны и электронные слои" },
    keyConcepts: {
      uz: ["Yadro: proton (+) va neytron", "Elektronlar (−) qavatlarda", "Tartib raqami = protonlar soni", "Qavatlar sig'imi: 2, 8, 8…"],
      tg: ["Ядро: протон (+) ва нейтрон", "Электронҳо (−) дар қабатҳо", "Рақами тартибӣ = шумораи протонҳо", "Ғунҷоиши қабатҳо: 2, 8, 8…"],
      ru: ["Ядро: протоны (+) и нейтроны", "Электроны (−) на слоях", "Порядковый номер = число протонов", "Ёмкость слоёв: 2, 8, 8…"],
    },
    videoQuery: "atom tuzilishi kimyo 7-sinf",
  },
  {
    id: "cell", subject: "biologiya", grade: 7, labKey: "cell", methods: ["CLUSTER", "FEYNMAN"],
    title: { uz: "O'simlik va hayvon hujayrasi", tg: "Ҳуҷайраи растанӣ ва ҳайвонот", ru: "Растительная и животная клетка" },
    goal: { uz: "Organoidlar vazifasini va ikki hujayra farqini tushuntirish", tg: "Шарҳи вазифаи органоидҳо ва фарқи ду ҳуҷайра", ru: "Объяснить функции органоидов и различия двух типов клеток" },
    keyConcepts: {
      uz: ["Yadro — boshqaruv markazi", "Mitoxondriya — energiya", "Xloroplast — fotosintez (faqat o'simlikda)", "Hujayra devori va katta vakuola — o'simlikda"],
      tg: ["Ядро — маркази идора", "Митохондрия — энергия", "Хлоропласт — фотосинтез (танҳо дар растанӣ)", "Девори ҳуҷайра ва вакуолаи калон — дар растанӣ"],
      ru: ["Ядро — центр управления", "Митохондрия — энергия", "Хлоропласт — фотосинтез (только у растений)", "Клеточная стенка и большая вакуоль — у растений"],
    },
    videoQuery: "o'simlik va hayvon hujayrasi farqi",
  },
  {
    id: "solids", subject: "geometriya", grade: 10, labKey: "solids", methods: ["THINK_PAIR_SHARE", "EXIT_TICKET"],
    title: { uz: "Fazoviy jismlar va kesimlar", tg: "Ҷисмҳои фазоӣ ва буришҳо", ru: "Пространственные тела и сечения" },
    goal: { uz: "Ko'pyoqlar elementlarini sanash va Eyler formulasini tekshirish", tg: "Шумурдани унсурҳои бисёррӯяҳо ва санҷиши формулаи Эйлер", ru: "Считать элементы многогранников и проверять формулу Эйлера" },
    keyConcepts: {
      uz: ["Uch, qirra, yoq", "Eyler: U − Q + Yo = 2", "Kub kesimi: kvadrat, to'g'ri to'rtburchak, oltiburchak", "Hajm: V = a³, V = πr²h"],
      tg: ["Қулла, қирра, рӯя", "Эйлер: Қ − Қр + Р = 2", "Буриши куб: квадрат, росткунҷа, шашкунҷа", "Ҳаҷм: V = a³, V = πr²h"],
      ru: ["Вершина, ребро, грань", "Эйлер: В − Р + Г = 2", "Сечение куба: квадрат, прямоугольник, шестиугольник", "Объём: V = a³, V = πr²h"],
    },
    videoQuery: "kub kesimlari stereometriya",
  },
  {
    id: "solar", subject: "astronomiya", grade: 11, labKey: "solar", methods: ["FEYNMAN", "EXIT_TICKET"],
    title: { uz: "Quyosh tizimi", tg: "Системаи офтобӣ", ru: "Солнечная система" },
    goal: { uz: "Sayyoralar tartibini va aylanish davrlarini taqqoslash", tg: "Муқоисаи тартиби сайёраҳо ва давраҳои гардиши онҳо", ru: "Сравнить порядок планет и периоды их обращения" },
    keyConcepts: {
      uz: ["8 ta sayyora", "Yer guruhi va gigant sayyoralar", "Kepler III qonuni: T² ~ a³", "Yer yili — 365,25 kun"],
      tg: ["8 сайёра", "Сайёраҳои гурӯҳи Замин ва азим", "Қонуни III Кеплер: T² ~ a³", "Соли Замин — 365,25 рӯз"],
      ru: ["8 планет", "Планеты земной группы и гиганты", "III закон Кеплера: T² ~ a³", "Земной год — 365,25 суток"],
    },
    videoQuery: "quyosh tizimi sayyoralar astronomiya",
  },
];

/* ───── Zaxira savollar banki (AI ulanmagan holat uchun) ───── */

export interface BankQuestion {
  topic: string; // DemoLesson.id
  subject: SubjectCode;
  text: Localized;
  /** Birinchi variant — to'g'ri javob (tarqatishda baribir aralashtiriladi) */
  options: [Localized, Localized, Localized, Localized];
  explanation?: Localized;
}

const s = (v: string): Localized => ({ uz: v, tg: v, ru: v });

export const QUESTION_BANK: BankQuestion[] = [
  { topic: "ohm", subject: "fizika", text: { uz: "Kuchlanish 12 V, qarshilik 4 Ω. Tok kuchi necha amper?", tg: "Шиддат 12 V, муқовимат 4 Ω. Қувваи ҷараён чанд ампер?", ru: "Напряжение 12 В, сопротивление 4 Ом. Чему равна сила тока?" }, options: [s("3 A"), s("48 A"), s("8 A"), s("0,33 A")], explanation: s("I = U / R = 12 / 4 = 3 A") },
  { topic: "ohm", subject: "fizika", text: { uz: "Qarshilik birligi qaysi?", tg: "Воҳиди муқовимат кадом аст?", ru: "Единица сопротивления?" }, options: [{ uz: "Om", tg: "Ом", ru: "Ом" }, { uz: "Volt", tg: "Волт", ru: "Вольт" }, { uz: "Amper", tg: "Ампер", ru: "Ампер" }, { uz: "Vatt", tg: "Ватт", ru: "Ватт" }] },
  { topic: "ohm", subject: "fizika", text: { uz: "Kuchlanish o'zgarmasa, qarshilik 2 marta oshsa, tok kuchi…", tg: "Агар шиддат тағйир наёбад ва муқовимат 2 маротиба зиёд шавад, қувваи ҷараён…", ru: "Если напряжение не меняется, а сопротивление выросло в 2 раза, сила тока…" }, options: [{ uz: "2 marta kamayadi", tg: "2 маротиба кам мешавад", ru: "уменьшится в 2 раза" }, { uz: "2 marta ortadi", tg: "2 маротиба зиёд мешавад", ru: "увеличится в 2 раза" }, { uz: "o'zgarmaydi", tg: "тағйир намеёбад", ru: "не изменится" }, { uz: "4 marta kamayadi", tg: "4 маротиба кам мешавад", ru: "уменьшится в 4 раза" }] },
  { topic: "ohm", subject: "fizika", text: { uz: "6 V kuchlanishda 2 A tok o'tsa, qarshilik qancha?", tg: "Агар дар шиддати 6 V ҷараёни 2 A гузарад, муқовимат чанд аст?", ru: "При напряжении 6 В течёт ток 2 А. Каково сопротивление?" }, options: [s("3 Ω"), s("12 Ω"), s("0,33 Ω"), s("8 Ω")] },
  { topic: "ohm", subject: "fizika", text: { uz: "Om qonuni formulasi qaysi?", tg: "Формулаи қонуни Ом кадом аст?", ru: "Какая формула выражает закон Ома?" }, options: [s("I = U / R"), s("I = U · R"), s("R = U · I"), s("U = I / R")] },

  { topic: "induction", subject: "fizika", text: { uz: "Induksion tok qachon paydo bo'ladi?", tg: "Ҷараёни индуксионӣ кай пайдо мешавад?", ru: "Когда возникает индукционный ток?" }, options: [{ uz: "Magnit oqimi o'zgarganda", tg: "Ҳангоми тағйири ҷараёни магнитӣ", ru: "При изменении магнитного потока" }, { uz: "Magnit g'altak ichida tinch turganda", tg: "Вақте магнит дар ғалтак ором истад", ru: "Когда магнит неподвижен в катушке" }, { uz: "Faqat o'zgarmas tok manbai ulanganda", tg: "Танҳо ҳангоми пайвасти манбаи ҷараёни доимӣ", ru: "Только при подключении источника постоянного тока" }, { uz: "Hech qachon", tg: "Ҳеҷ гоҳ", ru: "Никогда" }] },
  { topic: "induction", subject: "fizika", text: { uz: "G'altakdagi o'ramlar sonini 2 marta oshirsak, induksiya EYuK…", tg: "Агар шумораи печҳои ғалтакро 2 маротиба зиёд кунем, ЭДС-и индуксия…", ru: "Если число витков катушки увеличить в 2 раза, ЭДС индукции…" }, options: [{ uz: "2 marta ortadi", tg: "2 маротиба зиёд мешавад", ru: "увеличится в 2 раза" }, { uz: "2 marta kamayadi", tg: "2 маротиба кам мешавад", ru: "уменьшится в 2 раза" }, { uz: "o'zgarmaydi", tg: "тағйир намеёбад", ru: "не изменится" }, { uz: "nolga teng bo'ladi", tg: "ба сифр баробар мешавад", ru: "станет равной нулю" }] },
  { topic: "induction", subject: "fizika", text: { uz: "Elektromagnit induksiya hodisasini kim kashf etgan?", tg: "Падидаи индуксияи электромагнитиро кӣ кашф кардааст?", ru: "Кто открыл явление электромагнитной индукции?" }, options: [{ uz: "Maykl Faradey", tg: "Майкл Фарадей", ru: "Майкл Фарадей" }, { uz: "Isaak Nyuton", tg: "Исаак Нютон", ru: "Исаак Ньютон" }, { uz: "Georg Om", tg: "Георг Ом", ru: "Георг Ом" }, { uz: "Aleksandr Volta", tg: "Алессандро Волта", ru: "Алессандро Вольта" }] },

  { topic: "atom", subject: "kimyo", text: { uz: "Atom yadrosi qaysi zarrachalardan iborat?", tg: "Ядрои атом аз кадом зарраҳо иборат аст?", ru: "Из каких частиц состоит ядро атома?" }, options: [{ uz: "Proton va neytron", tg: "Протон ва нейтрон", ru: "Протоны и нейтроны" }, { uz: "Elektron va proton", tg: "Электрон ва протон", ru: "Электроны и протоны" }, { uz: "Faqat elektron", tg: "Танҳо электрон", ru: "Только электроны" }, { uz: "Neytron va elektron", tg: "Нейтрон ва электрон", ru: "Нейтроны и электроны" }] },
  { topic: "atom", subject: "kimyo", text: { uz: "Kislorod (O, tartib raqami 8) atomida nechta elektron bor?", tg: "Дар атоми оксиген (O, рақами тартибӣ 8) чанд электрон ҳаст?", ru: "Сколько электронов в атоме кислорода (O, порядковый номер 8)?" }, options: [s("8"), s("6"), s("16"), s("2")] },
  { topic: "atom", subject: "kimyo", text: { uz: "Birinchi elektron qavatga ko'pi bilan nechta elektron sig'adi?", tg: "Дар қабати якуми электронӣ ҳадди аксар чанд электрон ҷой мегирад?", ru: "Сколько электронов максимально вмещает первый электронный слой?" }, options: [s("2"), s("8"), s("18"), s("1")] },
  { topic: "atom", subject: "kimyo", text: { uz: "Natriy (Na, 11) atomining elektron qavatlari bo'yicha taqsimoti:", tg: "Тақсимоти электронҳои атоми натрий (Na, 11) аз рӯи қабатҳо:", ru: "Распределение электронов атома натрия (Na, 11) по слоям:" }, options: [s("2, 8, 1"), s("2, 9"), s("8, 2, 1"), s("2, 7, 2")] },

  { topic: "cell", subject: "biologiya", text: { uz: "Hujayraning «energiya stansiyasi» qaysi organoid?", tg: "«Нерӯгоҳи энергия»-и ҳуҷайра кадом органоид аст?", ru: "Какой органоид называют «энергетической станцией» клетки?" }, options: [{ uz: "Mitoxondriya", tg: "Митохондрия", ru: "Митохондрия" }, { uz: "Ribosoma", tg: "Рибосома", ru: "Рибосома" }, { uz: "Lizosoma", tg: "Лизосома", ru: "Лизосома" }, { uz: "Golji apparati", tg: "Дастгоҳи Голҷи", ru: "Аппарат Гольджи" }] },
  { topic: "cell", subject: "biologiya", text: { uz: "Fotosintez qaysi organoidda boradi?", tg: "Фотосинтез дар кадом органоид мегузарад?", ru: "В каком органоиде происходит фотосинтез?" }, options: [{ uz: "Xloroplast", tg: "Хлоропласт", ru: "Хлоропласт" }, { uz: "Mitoxondriya", tg: "Митохондрия", ru: "Митохондрия" }, { uz: "Yadro", tg: "Ядро", ru: "Ядро" }, { uz: "Ribosoma", tg: "Рибосома", ru: "Рибосома" }] },
  { topic: "cell", subject: "biologiya", text: { uz: "Qaysi tuzilma hayvon hujayrasida bo'lmaydi?", tg: "Кадом сохтор дар ҳуҷайраи ҳайвонот нест?", ru: "Какой структуры нет в животной клетке?" }, options: [{ uz: "Sellyulozali hujayra devori", tg: "Девори селлюлозии ҳуҷайра", ru: "Целлюлозная клеточная стенка" }, { uz: "Yadro", tg: "Ядро", ru: "Ядро" }, { uz: "Mitoxondriya", tg: "Митохондрия", ru: "Митохондрия" }, { uz: "Hujayra membranasi", tg: "Мембранаи ҳуҷайра", ru: "Клеточная мембрана" }] },
  { topic: "cell", subject: "biologiya", text: { uz: "Irsiy axborot (DNK) asosan qayerda saqlanadi?", tg: "Иттилооти ирсӣ (ДНК) асосан дар куҷо нигоҳ дошта мешавад?", ru: "Где в основном хранится наследственная информация (ДНК)?" }, options: [{ uz: "Yadroda", tg: "Дар ядро", ru: "В ядре" }, { uz: "Vakuolada", tg: "Дар вакуола", ru: "В вакуоли" }, { uz: "Hujayra devorida", tg: "Дар девори ҳуҷайра", ru: "В клеточной стенке" }, { uz: "Sitoplazma membranasida", tg: "Дар мембранаи ситоплазма", ru: "В мембране цитоплазмы" }] },

  { topic: "solids", subject: "geometriya", text: { uz: "Kubning nechta qirrasi bor?", tg: "Куб чанд қирра дорад?", ru: "Сколько рёбер у куба?" }, options: [s("12"), s("6"), s("8"), s("10")] },
  { topic: "solids", subject: "geometriya", text: { uz: "Eyler formulasi qaysi?", tg: "Формулаи Эйлер кадом аст?", ru: "Какова формула Эйлера?" }, options: [s("V − E + F = 2"), s("V + E + F = 2"), s("V − E − F = 0"), s("V · F = E")] },
  { topic: "solids", subject: "geometriya", text: { uz: "Silindr hajmi formulasi qaysi?", tg: "Формулаи ҳаҷми силиндр кадом аст?", ru: "Формула объёма цилиндра?" }, options: [s("V = πr²h"), s("V = ⅓πr²h"), s("V = 4/3·πr³"), s("V = 2πrh")] },
  { topic: "solids", subject: "geometriya", text: { uz: "Kubni tekislik bilan kesganda qaysi shakl hosil bo'la OLMAYDI?", tg: "Ҳангоми буридани куб бо ҳамворӣ кадом шакл ҳосил шуда НАМЕТАВОНАД?", ru: "Какая фигура НЕ может быть сечением куба плоскостью?" }, options: [{ uz: "Yettiburchak", tg: "Ҳафткунҷа", ru: "Семиугольник" }, { uz: "Oltiburchak", tg: "Шашкунҷа", ru: "Шестиугольник" }, { uz: "Uchburchak", tg: "Секунҷа", ru: "Треугольник" }, { uz: "Kvadrat", tg: "Квадрат", ru: "Квадрат" }] },

  { topic: "solar", subject: "astronomiya", text: { uz: "Quyoshga eng yaqin sayyora qaysi?", tg: "Наздиктарин сайёра ба Офтоб кадом аст?", ru: "Какая планета ближе всего к Солнцу?" }, options: [{ uz: "Merkuriy", tg: "Уторид (Меркурий)", ru: "Меркурий" }, { uz: "Venera", tg: "Зӯҳра (Венера)", ru: "Венера" }, { uz: "Mars", tg: "Миррих (Марс)", ru: "Марс" }, { uz: "Yer", tg: "Замин", ru: "Земля" }] },
  { topic: "solar", subject: "astronomiya", text: { uz: "Quyosh tizimidagi eng katta sayyora qaysi?", tg: "Калонтарин сайёраи системаи офтобӣ кадом аст?", ru: "Самая большая планета Солнечной системы?" }, options: [{ uz: "Yupiter", tg: "Муштарӣ (Юпитер)", ru: "Юпитер" }, { uz: "Saturn", tg: "Зуҳал (Сатурн)", ru: "Сатурн" }, { uz: "Neptun", tg: "Нептун", ru: "Нептун" }, { uz: "Yer", tg: "Замин", ru: "Земля" }] },
  { topic: "solar", subject: "astronomiya", text: { uz: "Yil fasllarining almashinishiga asosiy sabab nima?", tg: "Сабаби асосии ивазшавии фаслҳои сол чист?", ru: "Главная причина смены времён года?" }, options: [{ uz: "Yer o'qining orbitaga og'ishi (~23,4°)", tg: "Хамии меҳвари Замин нисбат ба мадор (~23,4°)", ru: "Наклон земной оси к орбите (~23,4°)" }, { uz: "Yerning Quyoshdan uzoqlashishi", tg: "Дуршавии Замин аз Офтоб", ru: "Удаление Земли от Солнца" }, { uz: "Oyning tortishishi", tg: "Ҷозибаи Моҳ", ru: "Притяжение Луны" }, { uz: "Quyosh faolligi", tg: "Фаъолияти Офтоб", ru: "Солнечная активность" }] },
];
