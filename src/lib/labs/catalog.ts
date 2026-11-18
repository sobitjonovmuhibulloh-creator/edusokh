/**
 * 3D laboratoriya katalogi: sinf → fan → mavzu → laboratoriya (interaktiv qism).
 *
 * MUHIM: mavzular O'zbekiston maktab dasturiga mo'ljallab tanlangan, lekin amaldagi darsliklar
 * nashri bilan HALI TEKSHIRILMAGAN (interfeysda shunday ko'rsatiladi). Sinfga to'g'ri kelishini
 * fan o'qituvchisi tasdiqlashi kerak.
 *
 * Yangi mavzu qo'shish: T(...) qatorini qo'shing. To'liq laboratoriya uchun content.ts ga mazmun yozing.
 * Administrator saytning o'zida ham mavzu qo'sha oladi (data/lab-catalog.json, /api/labs/catalog).
 * Brauzerda katalogga public/lessons dagi darslar mavzulari ham "nazariya" holatida qo'shiladi.
 */
import type { SubjectCode } from "../curriculum";
import type { CatalogTopic, LabRef, LabStatus, Tx } from "./types";

const M = (key: string): LabRef => ({ kind: "model", key });
const CIRCUIT: LabRef = { kind: "circuit" };
const BALANCE: LabRef = { kind: "balance" };
const LOGIC: LabRef = { kind: "logic" };
/** Laboratoriya xonasidagi realistik 3D tajriba (components/Labs/pro/labs.ts) */
const PRO = (key: string): LabRef => ({ kind: "pro", key });

/** Doimiy ID: sinf, fan va o'zbekcha nomdan (ro'yxatga yangi mavzu qo'shilsa ham eski havolalar buzilmaydi) */
const slug = (s: string) => s.toLowerCase().replace(/[ʻʼ'`‘’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function T(grade: number, subject: SubjectCode, uz: string, tg: string, status: LabStatus, labs: LabRef[] = [], content?: string): CatalogTopic {
  return { id: `c${grade}-${subject}-${slug(uz)}`, grade, subject, title: { uz, tg } as Tx, status, labs, content, source: "catalog" };
}

export const CATALOG: CatalogTopic[] = [
  /* ── 1–4-sinflar ── */
  T(1, "matematika", "Shakllar va jismlar: kub, shar, silindr", "Шаклҳо ва ҷисмҳо: куб, кура, силиндр", "model", [M("solids")]),
  T(1, "matematika", "10 gacha sonlar: sanash va taqqoslash", "Ададҳо то 10: шумурдан ва муқоиса", "planned"),
  T(1, "tabiiy_fanlar", "O'simlikning qismlari", "Қисмҳои растанӣ", "planned"),
  T(1, "ona_tili", "So'z va buyum: 3D lug'at", "Калима ва ашё: луғати 3D", "model", [M("vocab")]),
  T(2, "matematika", "Ko'paytirish jadvali", "Ҷадвали зарб", "planned"),
  T(2, "tabiiy_fanlar", "Yil fasllari", "Фаслҳои сол", "model", [M("seasons")]),
  T(2, "ingliz_tili", "Vocabulary: things around us", "Vocabulary: ашёҳои атроф", "model", [M("vocab")]),
  T(3, "matematika", "Perimetr va yuza", "Периметр ва масоҳат", "planned"),
  T(3, "tabiiy_fanlar", "Inson tanasi: skelet", "Бадани инсон: скелет", "model", [M("skeleton")]),
  T(3, "tabiiy_fanlar", "Tabiatda suvning aylanishi", "Гардиши об дар табиат", "planned"),
  T(3, "texnologiya", "Oddiy mexanizmlar: richag", "Механизмҳои оддӣ: фишанг", "planned"),
  T(4, "matematika", "To'g'ri burchakli parallelepiped va kub", "Параллелепипеди росткунҷа ва куб", "model", [M("solids")]),
  T(4, "tabiiy_fanlar", "Quyosh tizimi", "Системаи офтобӣ", "model", [M("solar")]),
  T(4, "tabiiy_fanlar", "Oddiy elektr zanjiri: batareya va lampochka", "Занҷири оддии электрикӣ: батарея ва лампочка", "full", [CIRCUIT], "circuitBuild"),

  /* ── 5–6-sinflar ── */
  T(5, "matematika", "Kub va parallelepiped hajmi", "Ҳаҷми куб ва параллелепипед", "model", [M("solids")]),
  T(5, "matematika", "Oddiy kasrlar", "Касрҳои оддӣ", "planned"),
  T(5, "tabiiy_fanlar", "Hujayra — tiriklikning asosi", "Ҳуҷайра — асоси ҳаёт", "full", [PRO("cell"), M("cell")], "cell"),
  T(5, "tabiiy_fanlar", "Moddaning tuzilishi: atom va molekula", "Сохти модда: атом ва молекула", "model", [M("atom"), M("molecule")]),
  T(5, "geografiya", "Yerning ichki tuzilishi", "Сохти дохилии Замин", "full", [PRO("earth"), M("earth-layers")], "earth"),
  T(5, "geografiya", "Xarita va globus bilan ishlash", "Кор бо харита ва глобус", "planned"),
  T(5, "informatika", "Algoritm va blok-sxemalar", "Алгоритм ва блок-схемаҳо", "planned"),
  T(5, "tarix", "Qadimgi me'morchilik: minora (virtual sayohat)", "Меъмории қадим: манора (саёҳати виртуалӣ)", "model", [M("monument")]),
  T(5, "ona_tili", "So'z turkumlari", "Ҳиссаҳои нутқ", "planned"),
  T(6, "matematika", "Koordinata tekisligi", "Ҳамвории координатӣ", "planned"),
  T(6, "matematika", "Aylana va doira", "Давра ва доира", "planned"),
  T(6, "geografiya", "Yerning harakati va yil fasllari", "Ҳаракати Замин ва фаслҳои сол", "model", [M("seasons")]),
  T(6, "geografiya", "Vulqonlar va zilzilalar", "Вулқонҳо ва заминларзаҳо", "planned"),
  T(6, "geografiya", "Iqlim va ob-havo", "Иқлим ва обу ҳаво", "planned"),
  T(6, "tabiiy_fanlar", "Fotosintez", "Фотосинтез", "planned"),
  T(6, "informatika", "Ikkilik sanoq sistemasi va mantiq", "Системаи ҳисоби дуӣ ва мантиқ", "full", [LOGIC], "logic"),
  T(6, "texnologiya", "Robot-manipulyator", "Дасти робот", "model", [M("robot")]),

  /* ── 7–9-sinflar ── */
  T(7, "fizika", "Elektr zanjiri", "Занҷири электрикӣ", "full", [CIRCUIT, M("circuit")], "circuitBuild"),
  T(7, "fizika", "Mexanik harakat, tezlik va tezlanish", "Ҳаракати механикӣ, суръат ва шитоб", "model", [M("projectile")]),
  T(7, "fizika", "Kuch, massa va og'irlik", "Қувва, масса ва вазн", "planned"),
  T(7, "fizika", "Elastiklik kuchi. Prujina, yuk va dinamometr (Guk qonuni)", "Қувваи чандирӣ. Пружина, бор ва динамометр (қонуни Гук)", "full", [PRO("spring")], "spring"),
  T(7, "kimyo", "Atom tuzilishi", "Сохти атом", "model", [M("atom")]),
  T(7, "kimyo", "Kimyoviy reaksiya tenglamalari", "Муодилаҳои реаксияҳои кимиёвӣ", "full", [BALANCE, M("reaction")], "balance"),
  T(7, "biologiya", "Hujayra tuzilishi", "Сохти ҳуҷайра", "full", [PRO("cell"), M("cell")], "cell"),
  T(7, "biologiya", "O'simliklarda fotosintez", "Фотосинтез дар растаниҳо", "planned"),
  T(7, "geometriya", "Burchaklar va uchburchaklar", "Кунҷҳо ва секунҷаҳо", "planned"),
  T(7, "algebra", "Chiziqli funksiya va uning grafigi", "Функсияи хаттӣ ва графики он", "planned"),
  T(7, "informatika", "Algoritmlar: tarmoqlanish va takrorlanish", "Алгоритмҳо: шохабандӣ ва такрор", "planned"),
  T(7, "texnologiya", "Mexanizmlar va oddiy mashinalar", "Механизмҳо ва мошинҳои оддӣ", "planned"),
  T(8, "fizika", "Elektr zanjirini yig'ish va o'lchash", "Ҷамъ кардан ва чен кардани занҷири электрикӣ", "full", [CIRCUIT], "circuitBuild"),
  T(8, "fizika", "Zanjir qismi uchun Om qonuni", "Қонуни Ом барои қисми занҷир", "full", [M("circuit")], "ohm"),
  T(8, "kimyo", "Molekulalar va kimyoviy bog'lanish", "Молекулаҳо ва банди кимиёвӣ", "model", [M("molecule")]),
  T(8, "kimyo", "Massa saqlanish qonuni", "Қонуни бақои масса", "full", [BALANCE, M("reaction")], "balance"),
  T(7, "kimyo", "Neytrallanish reaksiyasi: kislotani ishqor bilan titrlash (virtual)", "Реаксияи нейтрализатсия: титронидани кислота бо ишқор (виртуалӣ)", "full", [PRO("titration"), M("molecule")], "titration"),
  T(8, "biologiya", "Odam skeleti", "Скелети одам", "model", [M("skeleton")]),
  T(8, "biologiya", "Yurak va qon aylanishi", "Дил ва гардиши хун", "model", [M("heart")]),
  T(8, "fizika", "Elektromagnit va magnit maydon", "Электромагнит ва майдони магнитӣ", "model", [PRO("electromagnet"), M("induction")], "electromagnet"),
  T(8, "fizika", "Yorug'likning sinishi va to'la ichki qaytish", "Шикасти рӯшноӣ ва инъикоси пурраи дохилӣ", "model", [PRO("refraction"), M("lens")], "refraction"),
  T(7, "fizika", "Kuchlar: qiya tekislik va ishqalanish", "Қувваҳо: ҳамвории моил ва соиш", "model", [PRO("incline"), PRO("spring")], "incline"),
  T(7, "kimyo", "Laboratoriya idishlari va jihozlari", "Зарфҳо ва асбобҳои лаборатория", "model", [PRO("glassware")], "glassware"),
  T(8, "kimyo", "Molekulalarning fazoviy tuzilishi", "Сохти фазоии молекулаҳо", "model", [PRO("vsepr"), M("molecule")], "vsepr"),
  T(8, "biologiya", "Inson a'zolari va tizimlari", "Узвҳо ва низомҳои инсон", "model", [PRO("organs"), M("heart"), M("skeleton")], "organs"),
  T(8, "informatika", "Mantiqiy amallar va sxemalar", "Амалҳои мантиқӣ ва схемаҳо", "full", [LOGIC], "logic"),
  T(8, "geometriya", "Ko'pburchaklar yuzi", "Масоҳати бисёркунҷаҳо", "planned"),
  T(8, "algebra", "Kvadrat ildizlar", "Решаҳои квадратӣ", "planned"),
  T(9, "fizika", "Gorizontga burchak ostida otilgan jism harakati", "Ҳаракати ҷисми зери кунҷ ба уфуқ партофташуда", "full", [M("projectile")], "projectile"),
  T(9, "fizika", "Elektromagnit induksiya", "Индуксияи электромагнитӣ", "model", [M("induction")]),
  T(9, "fizika", "Linzalar va tasvir yasash", "Линзаҳо ва сохтани тасвир", "model", [M("lens")]),
  T(9, "kimyo", "Metallar va ularning birikmalari", "Металлҳо ва пайвастагиҳои онҳо", "planned"),
  T(9, "biologiya", "Ekotizimlar va oziq zanjiri", "Экосистемаҳо ва занҷири ғизо", "planned"),
  T(9, "algebra", "Kvadrat funksiya grafigi", "Графики функсияи квадратӣ", "planned"),
  T(9, "informatika", "Kompyuter tarmoqlari", "Шабакаҳои компютерӣ", "planned"),
  T(9, "geografiya", "O'zbekiston relyefi", "Релефи Ӯзбекистон", "planned"),

  /* ── 10–11-sinflar ── */
  T(10, "geometriya", "Fazoviy jismlar: hajm va sirt", "Ҷисмҳои фазоӣ: ҳаҷм ва сатҳ", "full", [PRO("geometry"), M("solids")], "solids"),
  T(10, "geometriya", "Ko'pyoqlarning kesimlari", "Буришҳои бисёррӯяҳо", "model", [M("section")]),
  T(10, "fizika", "Kinematika: otilgan jism", "Кинематика: ҷисми партофташуда", "full", [M("projectile")], "projectile"),
  T(10, "fizika", "To'liq zanjir uchun Om qonuni", "Қонуни Ом барои занҷири пурра", "full", [CIRCUIT], "circuitBuild"),
  T(10, "kimyo", "Organik molekulalar tuzilishi", "Сохти молекулаҳои органикӣ", "model", [M("molecule")]),
  T(10, "biologiya", "Hujayra biologiyasi", "Биологияи ҳуҷайра", "full", [PRO("cell"), M("cell")], "cell"),
  T(10, "informatika", "Mantiq algebrasi", "Алгебраи мантиқ", "full", [LOGIC], "logic"),
  T(11, "astronomiya", "Quyosh tizimi va sayyoralar harakati", "Системаи офтобӣ ва ҳаракати сайёраҳо", "model", [M("solar")]),
  T(11, "astronomiya", "Oy fazalari va tutilishlar", "Фазаҳои Моҳ ва гирифтҳо", "planned"),
  T(11, "fizika", "Elektromagnit induksiya va generator", "Индуксияи электромагнитӣ ва генератор", "model", [M("induction")]),
  T(11, "fizika", "Geometrik optika", "Оптикаи геометрӣ", "model", [M("lens")]),
  T(11, "geografiya", "Yer qobig'i va litosfera plitalari", "Пӯсти Замин ва плитаҳои литосфера", "model", [PRO("earth"), M("earth-layers")]),
  T(11, "geometriya", "Aylanish jismlari", "Ҷисмҳои даврзанӣ", "model", [M("solids")]),
];

export const LAB_STATUS_TEXT: Record<LabStatus, Tx & { ru: string }> = {
  full: { uz: "To'liq laboratoriya", tg: "Лабораторияи пурра", ru: "Полная лаборатория" },
  model: { uz: "Interaktiv model", tg: "Модели интерактивӣ", ru: "Интерактивная модель" },
  theory: { uz: "Nazariya va misollar", tg: "Назария ва мисолҳо", ru: "Теория и примеры" },
  planned: { uz: "Hali ishlab chiqilmagan", tg: "Ҳоло таҳия нашудааст", ru: "Ещё не разработано" },
};

export const LAB_STATUS_COLOR: Record<LabStatus, string> = {
  full: "bg-emerald-600 text-white",
  model: "bg-cobalt-500 text-white",
  theory: "bg-saffron-500 text-white",
  planned: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};
