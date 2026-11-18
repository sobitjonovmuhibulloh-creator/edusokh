/**
 * To'liq laboratoriyalar mazmuni (holati "full" bo'lgan mavzular).
 * Har bir laboratoriya: maqsad, jihozlar, nazariya, formulalar, yo'riqnoma, topshiriqlar,
 * interaktiv misollar (qiymat o'zgarsa yechim ham o'zgaradi), o'lchovlar/grafik, test va xulosa.
 * Tojikcha matnlarni ona tilida so'zlashuvchi fan o'qituvchisi tekshirishi kerak.
 */
import { EXTRA_LAB_CONTENT } from "./content-extra";
import type { LabContent, Tx } from "./types";

const x = (uz: string, tg: string, ru?: string): Tx => ({ uz, tg, ...(ru ? { ru } : {}) });
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const n3 = (v: number) => (Math.round(v * 1000) / 1000).toString();

/* ───────────────────────── FIZIKA: zanjir yig'ish ───────────────────────── */

const circuitBuild: LabContent = {
  goal: x(
    "Elektr zanjirini mustaqil yig'ish, kalit, lampochka, ampermetr va voltmetrdan to'g'ri foydalanishni o'rganish, tok kuchi va kuchlanishni o'lchash.",
    "Мустақилона ҷамъ кардани занҷири электрикӣ, омӯхтани истифодаи дурусти калид, лампочка, амперметр ва волтметр, чен кардани қувваи ҷараён ва шиддат.",
  ),
  equipment: [
    x("Tok manbai (batareya, 1,5–12 V)", "Манбаи ҷараён (батарея, 1,5–12 В)"),
    x("Kalit", "Калид"),
    x("Lampochka", "Лампочка"),
    x("Rezistor", "Резистор"),
    x("Ampermetr — tok kuchini o'lchaydi", "Амперметр — қувваи ҷараёнро чен мекунад"),
    x("Voltmetr — kuchlanishni o'lchaydi", "Волтметр — шиддатро чен мекунад"),
    x("Ulovchi simlar", "Симҳои пайвасткунанда"),
  ],
  theory: [
    x("Elektr toki — zaryadli zarralarning tartibli harakati. Tok faqat yopiq zanjirda o'tadi.", "Ҷараёни электрикӣ — ҳаракати батартиби зарраҳои заряднок. Ҷараён танҳо дар занҷири пӯшида мегузарад."),
    x("Ampermetr zanjirga KETMA-KET ulanadi, voltmetr esa o'lchanayotgan qismga PARALLEL ulanadi.", "Амперметр ба занҷир ПАЙДАРПАЙ, волтметр бошад ба қисми ченшаванда ПАРАЛЛЕЛ пайваст карда мешавад."),
    x("Om qonuni: zanjir qismidagi tok kuchi kuchlanishga to'g'ri, qarshilikka teskari proporsional.", "Қонуни Ом: қувваи ҷараён дар қисми занҷир ба шиддат мустақиман, ба муқовимат баръакс мутаносиб аст."),
    x("Ketma-ket ulashda qarshiliklar qo'shiladi, parallel ulashda umumiy qarshilik eng kichigidan ham kichik bo'ladi.", "Ҳангоми пайвасти пайдарпай муқовиматҳо ҷамъ мешаванд, ҳангоми параллелӣ муқовимати умумӣ аз хурдтаринаш ҳам хурдтар мешавад."),
    x("Qisqa tutashuv — tok manbai qisqichlari qarshiliksiz ulanib qolishi. Bunda tok juda katta bo'ladi va xavfli.", "Пайвасти кӯтоҳ — бе муқовимат пайваст шудани қисқичҳои манбаъ. Дар ин ҳолат ҷараён хеле калон ва хатарнок мешавад."),
  ],
  formulas: ["I = U / R", "R = R₁ + R₂ (ketma-ket / пайдарпай)", "1/R = 1/R₁ + 1/R₂ (parallel)", "P = U · I", "I = E / (R + r)"],
  steps: [
    x("Chapdagi ro'yxatdan kerakli asboblarni taxtaga qo'shing va sichqoncha bilan sudrab joylashtiring.", "Аз рӯйхат асбобҳои лозимиро ба тахта илова кунед ва бо муш кашида ҷойгир кунед."),
    x("Sim ulash: bitta qisqichni (rangli sharcha) bosing, keyin ikkinchisini bosing.", "Пайваст кардани сим: як қисқичро (курачаи ранга) пахш кунед, баъд дуюмашро."),
    x("Manba → kalit → ampermetr → lampochka → manba tartibida ketma-ket zanjir yig'ing.", "Бо тартиби манбаъ → калид → амперметр → лампочка → манбаъ занҷири пайдарпай ҷамъ кунед."),
    x("Voltmetrni lampochkaga parallel ulang.", "Волтметрро ба лампочка параллел пайваст кунед."),
    x("Kalitni bosib yoping: lampochka yonishi va asboblar ko'rsatkichi chiqishi kerak.", "Калидро пахш карда пӯшед: лампочка бояд даргирад ва асбобҳо нишондод диҳанд."),
    x("Manba kuchlanishini o'zgartirib, har safar «O'lchovni yozish» tugmasini bosing.", "Шиддати манбаъро тағйир дода, ҳар дафъа тугмаи «Сабти ченкунӣ»-ро пахш кунед."),
    x("Jadval va grafikdan I va U orasidagi bog'lanishni aniqlang.", "Аз ҷадвал ва график вобастагии байни I ва U-ро муайян кунед."),
  ],
  tasks: [
    { text: x("Lampochka yonadigan eng sodda yopiq zanjirni yig'ing.", "Соддатарин занҷири пӯшидаеро ҷамъ кунед, ки лампочка дар он даргирад.") },
    { text: x("U = 6 V, lampochka qarshiligi 11,5 Ω, manbaning ichki qarshiligi 0,5 Ω. Ampermetr nimani ko'rsatadi? (A)", "U = 6 В, муқовимати лампочка 11,5 Ω, муқовимати дохилии манбаъ 0,5 Ω. Амперметр чиро нишон медиҳад? (A)"), answer: 0.5, tol: 0.02, unit: "A" },
    { text: x("Zanjirga ikkinchi lampochkani ketma-ket ulang. Tok qanday o'zgardi? O'lchab, yangi tok kuchini yozing (A).", "Ба занҷир лампочкаи дуюмро пайдарпай пайваст кунед. Ҷараён чӣ гуна тағйир ёфт? Чен карда, қувваи нави ҷараёнро нависед (A)."), answer: 0.25, tol: 0.03, unit: "A" },
    { text: x("Ampermetrni lampochkaga parallel ulab ko'ring. Nima bo'ldi va nega bunday qilish mumkin emas?", "Амперметрро ба лампочка параллел пайваст карда бинед. Чӣ шуд ва чаро ин тавр кардан мумкин нест?") },
  ],
  examples: [
    {
      title: x("Om qonuni", "Қонуни Ом"),
      text: x("Kuchlanish {U} V, qarshilik {R} Ω. Tok kuchini toping.", "Шиддат {U} В, муқовимат {R} Ω. Қувваи ҷараёнро ёбед."),
      inputs: [
        { id: "U", label: x("Kuchlanish U", "Шиддат U"), unit: "V", value: 6, min: 1, max: 24, step: 0.5 },
        { id: "R", label: x("Qarshilik R", "Муқовимат R"), unit: "Ω", value: 12, min: 1, max: 100, step: 1 },
      ],
      solve: (v) => [x("Om qonuni:", "Қонуни Ом:"), "I = U / R", `I = ${v.U} / ${v.R} = ${n3(v.U / v.R)} A`],
    },
    {
      title: x("Ketma-ket va parallel ulash", "Пайвасти пайдарпай ва параллелӣ"),
      text: x("R₁ = {R1} Ω va R₂ = {R2} Ω. Ikkala ulash usulida umumiy qarshilik va U = {U} V da tok kuchini toping.", "R₁ = {R1} Ω ва R₂ = {R2} Ω. Муқовимати умумӣ ва қувваи ҷараёнро дар U = {U} В барои ҳар ду усул ёбед."),
      inputs: [
        { id: "R1", label: x("R₁", "R₁"), unit: "Ω", value: 4, min: 1, max: 50, step: 1 },
        { id: "R2", label: x("R₂", "R₂"), unit: "Ω", value: 6, min: 1, max: 50, step: 1 },
        { id: "U", label: x("U", "U"), unit: "V", value: 12, min: 1, max: 24, step: 1 },
      ],
      solve: (v) => {
        const s = v.R1 + v.R2;
        const p = (v.R1 * v.R2) / (v.R1 + v.R2);
        return [
          x("Ketma-ket:", "Пайдарпай:"),
          `R = R₁ + R₂ = ${v.R1} + ${v.R2} = ${n2(s)} Ω`,
          `I = U / R = ${v.U} / ${n2(s)} = ${n3(v.U / s)} A`,
          x("Parallel:", "Параллелӣ:"),
          `R = R₁·R₂ / (R₁ + R₂) = ${v.R1}·${v.R2} / ${n2(s)} = ${n2(p)} Ω`,
          `I = U / R = ${v.U} / ${n2(p)} = ${n3(v.U / p)} A`,
        ];
      },
    },
    {
      title: x("To'liq zanjir uchun Om qonuni", "Қонуни Ом барои занҷири пурра"),
      text: x("EYuK E = {E} V, ichki qarshilik r = {r} Ω, tashqi qarshilik R = {R} Ω.", "ҚЭҲ E = {E} В, муқовимати дохилӣ r = {r} Ω, муқовимати берунӣ R = {R} Ω."),
      inputs: [
        { id: "E", label: x("E", "E"), unit: "V", value: 6, min: 1, max: 24, step: 0.5 },
        { id: "r", label: x("r", "r"), unit: "Ω", value: 0.5, min: 0.1, max: 5, step: 0.1 },
        { id: "R", label: x("R", "R"), unit: "Ω", value: 11.5, min: 0.5, max: 100, step: 0.5 },
      ],
      solve: (v) => {
        const I = v.E / (v.R + v.r);
        return [`I = E / (R + r) = ${v.E} / (${v.R} + ${v.r}) = ${n3(I)} A`, `U = I·R = ${n3(I)}·${v.R} = ${n2(I * v.R)} V`, `P = U·I = ${n2(I * v.R * I)} W`];
      },
    },
  ],
  columns: [
    { key: "E", label: "E", unit: "V" },
    { key: "I", label: "I", unit: "A" },
    { key: "U", label: "U (V-metr)", unit: "V" },
    { key: "P", label: "P", unit: "W" },
  ],
  graph: { x: "U", y: "I" },
  quiz: [
    { q: x("Ampermetr zanjirga qanday ulanadi?", "Амперметр ба занҷир чӣ тавр пайваст мешавад?"), options: [x("Ketma-ket", "Пайдарпай"), x("Parallel", "Параллелӣ"), x("Ixtiyoriy", "Дилхоҳ"), x("Ulanmaydi", "Пайваст намешавад")], answer: 0 },
    { q: x("Voltmetr qanday ulanadi?", "Волтметр чӣ тавр пайваст мешавад?"), options: [x("Ketma-ket", "Пайдарпай"), x("O'lchanayotgan qismga parallel", "Ба қисми ченшаванда параллел"), x("Faqat manbaga", "Танҳо ба манбаъ"), x("Kalit o'rniga", "Ба ҷои калид")], answer: 1 },
    { q: x("U = 12 V, R = 4 Ω bo'lsa, I = ?", "Агар U = 12 В, R = 4 Ω бошад, I = ?"), options: [x("3 A", "3 A"), x("48 A", "48 A"), x("0,33 A", "0,33 A"), x("16 A", "16 A")], answer: 0 },
    { q: x("Kalit ochiq bo'lsa, lampochka…", "Агар калид кушода бошад, лампочка…"), options: [x("yonmaydi", "даргир намешавад"), x("yorqinroq yonadi", "равшантар месӯзад"), x("xira yonadi", "хира месӯзад"), x("kuyib ketadi", "месӯзад ва вайрон мешавад")], answer: 0 },
  ],
  conclusion: x(
    "Tok faqat yopiq zanjirda o'tadi. Ampermetr ketma-ket, voltmetr parallel ulanadi. Lampochka uchun tok kuchi kuchlanishga taxminan to'g'ri proporsional (I = U / R).",
    "Ҷараён танҳо дар занҷири пӯшида мегузарад. Амперметр пайдарпай, волтметр параллел пайваст мешавад. Барои лампочка қувваи ҷараён ба шиддат тақрибан мустақиман мутаносиб аст (I = U / R).",
  ),
};

/* ───────────────────────── FIZIKA: Om qonuni (3D model) ───────────────────────── */

const ohm: LabContent = {
  goal: x("Tok kuchining kuchlanish va qarshilikka bog'liqligini tajribada aniqlash, I(U) grafigini chizish.", "Дар таҷриба муайян кардани вобастагии қувваи ҷараён аз шиддат ва муқовимат, сохтани графики I(U)."),
  equipment: [x("Tok manbai (1–12 V)", "Манбаи ҷараён (1–12 В)"), x("Rezistor (1–20 Ω)", "Резистор (1–20 Ω)"), x("Lampochka", "Лампочка"), x("Kalit", "Калид"), x("Simlar", "Симҳо")],
  theory: [
    x("Tok kuchi I — o'tkazgich ko'ndalang kesimidan 1 sekundda o'tadigan zaryad. Birligi — amper (A).", "Қувваи ҷараён I — заряде, ки дар 1 сония аз буриши кӯндаланги ноқил мегузарад. Воҳидаш — ампер (A)."),
    x("Kuchlanish U zaryadni ko'chirishda bajarilgan ishni ko'rsatadi. Birligi — volt (V).", "Шиддат U кореро нишон медиҳад, ки ҳангоми кӯчонидани заряд иҷро мешавад. Воҳидаш — волт (В)."),
    x("Qarshilik R — o'tkazgichning tokka ko'rsatadigan to'sqinligi. Birligi — om (Ω).", "Муқовимат R — монеаи ноқил ба ҷараён. Воҳидаш — ом (Ω)."),
    x("Om qonuni: I = U / R. R o'zgarmas bo'lsa, I(U) grafigi koordinata boshidan o'tuvchi to'g'ri chiziq.", "Қонуни Ом: I = U / R. Агар R доимӣ бошад, графики I(U) хатти ростест, ки аз ибтидои координатаҳо мегузарад."),
  ],
  formulas: ["I = U / R", "U = I · R", "R = U / I", "P = U · I = I² · R"],
  steps: [
    x("Kalitni «Yoqilgan» holatiga qo'ying.", "Калидро ба ҳолати «Фаъол» гузоред."),
    x("R = 6 Ω qilib, U ni 2, 4, 6, 8, 10 V ga o'zgartiring va har birida «O'lchovni yozish» ni bosing.", "R = 6 Ω карда, U-ро ба 2, 4, 6, 8, 10 В иваз кунед ва ҳар дафъа «Сабти ченкунӣ»-ро пахш кунед."),
    x("Grafikda nuqtalar to'g'ri chiziqda yotishini tekshiring.", "Санҷед, ки нуқтаҳо дар график дар як хатти рост ҷойгиранд."),
    x("Endi U = 6 V da R ni o'zgartirib, tok qanday o'zgarishini kuzating.", "Акнун дар U = 6 В муқовиматро тағйир дода, тағйири ҷараёнро мушоҳида кунед."),
    x("Kalitni o'chirib, tok nolga tushishini ko'ring.", "Калидро хомӯш карда, бинед ки ҷараён ба сифр мефарояд."),
  ],
  tasks: [
    { text: x("U = 9 V, R = 4,5 Ω. Tok kuchi qancha? (A)", "U = 9 В, R = 4,5 Ω. Қувваи ҷараён чанд аст? (A)"), answer: 2, tol: 0.01, unit: "A" },
    { text: x("I = 0,5 A, R = 12 Ω. Kuchlanish qancha? (V)", "I = 0,5 A, R = 12 Ω. Шиддат чанд аст? (В)"), answer: 6, tol: 0.01, unit: "V" },
    { text: x("U = 12 V da tok 1,5 A. Qarshilikni toping (Ω).", "Дар U = 12 В ҷараён 1,5 A. Муқовиматро ёбед (Ω)."), answer: 8, tol: 0.01, unit: "Ω" },
    { text: x("Grafikdan foydalanib, R = 6 Ω da U = 9 V uchun tokni toping (A).", "Бо истифода аз график, барои R = 6 Ω ва U = 9 В ҷараёнро ёбед (A)."), answer: 1.5, tol: 0.02, unit: "A" },
  ],
  examples: [
    {
      title: x("Tok kuchini hisoblash", "Ҳисоб кардани қувваи ҷараён"),
      text: x("Rezistorga {U} V kuchlanish berildi, qarshiligi {R} Ω. Tok kuchi va quvvatni toping.", "Ба резистор шиддати {U} В дода шуд, муқовиматаш {R} Ω. Қувваи ҷараён ва тавоноиро ёбед."),
      inputs: [
        { id: "U", label: x("U", "U"), unit: "V", value: 6, min: 1, max: 12, step: 0.5 },
        { id: "R", label: x("R", "R"), unit: "Ω", value: 6, min: 1, max: 20, step: 0.5 },
      ],
      solve: (v) => [`I = U / R = ${v.U} / ${v.R} = ${n3(v.U / v.R)} A`, `P = U · I = ${v.U} · ${n3(v.U / v.R)} = ${n2((v.U * v.U) / v.R)} W`],
    },
    {
      title: x("Qarshilikni topish", "Ёфтани муқовимат"),
      text: x("Ampermetr {I} A, voltmetr {U} V ko'rsatdi. Qarshilik qancha?", "Амперметр {I} A, волтметр {U} В нишон дод. Муқовимат чанд аст?"),
      inputs: [
        { id: "U", label: x("U", "U"), unit: "V", value: 4.5, min: 0.5, max: 24, step: 0.5 },
        { id: "I", label: x("I", "I"), unit: "A", value: 0.3, min: 0.05, max: 5, step: 0.05 },
      ],
      solve: (v) => [`R = U / I = ${v.U} / ${v.I} = ${n2(v.U / v.I)} Ω`],
    },
  ],
  columns: [
    { key: "U", label: "U", unit: "V" },
    { key: "R", label: "R", unit: "Ω" },
    { key: "I", label: "I", unit: "A" },
    { key: "P", label: "P", unit: "W" },
  ],
  graph: { x: "U", y: "I" },
  measure: (p) => {
    const I = p.on ? p.V / p.R : 0;
    return { U: p.V, R: p.R, I: Math.round(I * 1000) / 1000, P: Math.round(p.V * I * 100) / 100 };
  },
  quiz: [
    { q: x("Qarshilik 2 marta oshsa (U o'zgarmas), tok…", "Агар муқовимат 2 маротиба зиёд шавад (U доимӣ), ҷараён…"), options: [x("2 marta kamayadi", "2 маротиба кам мешавад"), x("2 marta oshadi", "2 маротиба зиёд мешавад"), x("o'zgarmaydi", "тағйир намеёбад"), x("4 marta kamayadi", "4 маротиба кам мешавад")], answer: 0 },
    { q: x("1 Ω qanday ta'riflanadi?", "1 Ω чӣ тавр таъриф мешавад?"), options: [x("1 V kuchlanishda 1 A tok o'tadigan qarshilik", "Муқовимате, ки дар шиддати 1 В аз он ҷараёни 1 A мегузарад"), x("1 A·1 s", "1 A·1 с"), x("1 J / 1 C", "1 Ҷ / 1 Кл"), x("1 W / 1 A", "1 Вт / 1 A")], answer: 0 },
    { q: x("I(U) grafigi R o'zgarmas bo'lganda qanday?", "Графики I(U) ҳангоми R-и доимӣ чӣ гуна аст?"), options: [x("Boshidan o'tuvchi to'g'ri chiziq", "Хатти рост аз ибтидо"), x("Parabola", "Парабола"), x("Giperbola", "Гипербола"), x("Gorizontal chiziq", "Хатти уфуқӣ")], answer: 0 },
  ],
  conclusion: x("Tajriba Om qonunini tasdiqladi: R o'zgarmas bo'lsa, tok kuchlanishga to'g'ri proporsional, U o'zgarmas bo'lsa — qarshilikka teskari proporsional.", "Таҷриба қонуни Омро тасдиқ кард: агар R доимӣ бошад, ҷараён ба шиддат мустақиман, агар U доимӣ бошад — ба муқовимат баръакс мутаносиб аст."),
};

/* ───────────────────────── FIZIKA: otilgan jism ───────────────────────── */

const projectile: LabContent = {
  goal: x("Gorizontga burchak ostida otilgan jism harakatini o'rganish: uchish vaqti, uzoqlik va balandlikning tezlik, burchak va g ga bog'liqligi.", "Омӯзиши ҳаракати ҷисме, ки зери кунҷ ба уфуқ партофта шудааст: вобастагии вақти парвоз, масофа ва баландӣ аз суръат, кунҷ ва g."),
  equipment: [x("Virtual otish qurilmasi", "Дастгоҳи виртуалии партофтан"), x("Tezlik va burchak sozlagichlari", "Танзимгарҳои суръат ва кунҷ"), x("Sayyora tanlash (Yer, Mars, Oy)", "Интихоби сайёра (Замин, Миррих, Моҳ)")],
  theory: [
    x("Havo qarshiligi bo'lmasa, gorizontal tezlik o'zgarmaydi: vₓ = v₀·cosα.", "Агар муқовимати ҳаво набошад, суръати уфуқӣ тағйир намеёбад: vₓ = v₀·cosα."),
    x("Vertikal yo'nalishda jism g tezlanish bilan harakatlanadi: v_y = v₀·sinα − g·t.", "Дар самти амудӣ ҷисм бо шитоби g ҳаракат мекунад: v_y = v₀·sinα − g·t."),
    x("Traektoriya — parabola. Bir xil v₀ da eng katta uzoqlik α = 45° da bo'ladi.", "Траектория — парабола. Дар v₀-и якхела масофаи калонтарин дар α = 45° мешавад."),
  ],
  formulas: ["t = 2·v₀·sinα / g", "L = v₀²·sin2α / g", "H = v₀²·sin²α / (2g)"],
  steps: [
    x("v₀ = 20 m/s, α = 45°, Yer tanlang. Uzoqlikni yozing.", "v₀ = 20 м/с, α = 45°, Заминро интихоб кунед. Масофаро нависед."),
    x("Burchakni 15°, 30°, 45°, 60°, 75° ga o'zgartirib, har birida o'lchovni yozing.", "Кунҷро ба 15°, 30°, 45°, 60°, 75° иваз карда, ҳар дафъа ченкуниро сабт кунед."),
    x("Grafikda L(α) ning eng katta qiymatini toping.", "Дар график қимати калонтарини L(α)-ро ёбед."),
    x("Sayyorani Oyga o'zgartiring va natijani solishtiring.", "Сайёраро ба Моҳ иваз карда, натиҷаро муқоиса кунед."),
  ],
  tasks: [
    { text: x("v₀ = 20 m/s, α = 30°, g = 9,81 m/s². Uchish vaqti qancha? (s)", "v₀ = 20 м/с, α = 30°, g = 9,81 м/с². Вақти парвоз чанд аст? (с)"), answer: 2.04, tol: 0.03, unit: "s" },
    { text: x("v₀ = 10 m/s, α = 45°, g = 9,81. Uzoqlik qancha? (m)", "v₀ = 10 м/с, α = 45°, g = 9,81. Масофа чанд аст? (м)"), answer: 10.19, tol: 0.1, unit: "m" },
    { text: x("Qaysi ikki burchakda uzoqlik bir xil bo'ladi? 30° ning «jufti»ni yozing (°).", "Дар кадом ду кунҷ масофа якхела мешавад? «Ҷуфти» 30°-ро нависед (°)."), answer: 60, tol: 0.5, unit: "°" },
  ],
  examples: [
    {
      title: x("Uchish vaqti, uzoqlik va balandlik", "Вақти парвоз, масофа ва баландӣ"),
      text: x("Jism {v} m/s tezlik bilan {a}° burchak ostida otildi (g = {g} m/s²).", "Ҷисм бо суръати {v} м/с зери кунҷи {a}° партофта шуд (g = {g} м/с²)."),
      inputs: [
        { id: "v", label: x("v₀", "v₀"), unit: "m/s", value: 20, min: 1, max: 50, step: 1 },
        { id: "a", label: x("α", "α"), unit: "°", value: 45, min: 5, max: 85, step: 1 },
        { id: "g", label: x("g", "g"), unit: "m/s²", value: 9.81, min: 1.62, max: 24.8, step: 0.01 },
      ],
      solve: (v) => {
        const r = (v.a * Math.PI) / 180;
        return [
          `t = 2·${v.v}·sin${v.a}° / ${v.g} = ${n2((2 * v.v * Math.sin(r)) / v.g)} s`,
          `L = ${v.v}²·sin${2 * v.a}° / ${v.g} = ${n2((v.v * v.v * Math.sin(2 * r)) / v.g)} m`,
          `H = ${v.v}²·sin²${v.a}° / (2·${v.g}) = ${n2((v.v * v.v * Math.sin(r) ** 2) / (2 * v.g))} m`,
        ];
      },
    },
  ],
  columns: [
    { key: "v0", label: "v₀", unit: "m/s" },
    { key: "ang", label: "α", unit: "°" },
    { key: "g", label: "g", unit: "m/s²" },
    { key: "T", label: "t", unit: "s" },
    { key: "L", label: "L", unit: "m" },
    { key: "H", label: "H", unit: "m" },
  ],
  graph: { x: "ang", y: "L" },
  measure: (p) => {
    const r = (p.ang * Math.PI) / 180;
    const T = (2 * p.v0 * Math.sin(r)) / p.g;
    return { v0: p.v0, ang: p.ang, g: p.g, T: Math.round(T * 100) / 100, L: Math.round(((p.v0 * p.v0 * Math.sin(2 * r)) / p.g) * 10) / 10, H: Math.round(((p.v0 * Math.sin(r)) ** 2 / (2 * p.g)) * 10) / 10 };
  },
  quiz: [
    { q: x("Eng katta uzoqlik qaysi burchakda?", "Масофаи калонтарин дар кадом кунҷ?"), options: [x("45°", "45°"), x("30°", "30°"), x("60°", "60°"), x("90°", "90°")], answer: 0 },
    { q: x("Oyda (g kichik) uzoqlik…", "Дар Моҳ (g хурд) масофа…"), options: [x("kattaroq", "калонтар"), x("kichikroq", "хурдтар"), x("bir xil", "якхела"), x("nolga teng", "ба сифр баробар")], answer: 0 },
    { q: x("Traektoriya shakli:", "Шакли траектория:"), options: [x("parabola", "парабола"), x("aylana", "давра"), x("to'g'ri chiziq", "хатти рост"), x("spiral", "спирал")], answer: 0 },
  ],
  conclusion: x("Uzoqlik v₀² ga to'g'ri, g ga teskari proporsional va α = 45° da eng katta. α va 90° − α burchaklarda uzoqlik bir xil.", "Масофа ба v₀² мустақиман, ба g баръакс мутаносиб буда, дар α = 45° калонтарин аст. Дар кунҷҳои α ва 90° − α масофа якхела аст."),
};

/* ───────────────────────── KIMYO: tenglamalarni tenglashtirish ───────────────────────── */

const balance: LabContent = {
  goal: x("Massa saqlanish qonuni asosida kimyoviy reaksiya tenglamalarini tenglashtirishni o'rganish.", "Омӯхтани баробар кардани муодилаҳои реаксияҳои кимиёвӣ дар асоси қонуни бақои масса."),
  equipment: [x("Virtual molekula to'plami", "Маҷмӯи виртуалии молекулаҳо"), x("Koeffitsiyent tanlagichlari", "Интихобгарҳои коэффитсиент"), x("Atomlar hisoblagichi", "Ҳисобкунаки атомҳо"), x("Vodorod yonishining 3D modeli", "Модели 3D-и сӯхтани гидроген")],
  theory: [
    x("Massa saqlanish qonuni (Lomonosov–Lavuazye): reaksiyaga kirgan moddalar massasi hosil bo'lgan moddalar massasiga teng.", "Қонуни бақои масса (Ломоносов–Лавуазе): массаи моддаҳои ба реаксия даромада ба массаи моддаҳои ҳосилшуда баробар аст."),
    x("Shuning uchun har bir element atomlari soni tenglamaning chap va o'ng tomonida bir xil bo'lishi kerak.", "Аз ин рӯ, шумораи атомҳои ҳар як элемент дар тарафи чап ва рости муодила бояд якхела бошад."),
    x("Tenglashtirishda faqat koeffitsiyentlar (formuladan oldingi sonlar) o'zgartiriladi, indekslar o'zgarmaydi.", "Ҳангоми баробар кардан танҳо коэффитсиентҳо (рақамҳои пеш аз формула) иваз мешаванд, индексҳо тағйир намеёбанд."),
  ],
  formulas: ["2H₂ + O₂ → 2H₂O", "CH₄ + 2O₂ → CO₂ + 2H₂O", "4Fe + 3O₂ → 2Fe₂O₃"],
  steps: [
    x("Reaksiyani tanlang.", "Реаксияро интихоб кунед."),
    x("Har bir modda oldidagi koeffitsiyentni + va − tugmalari bilan o'zgartiring.", "Коэффитсиенти пеш аз ҳар модда-ро бо тугмаҳои + ва − иваз кунед."),
    x("Atomlar jadvalida chap va o'ng ustunlar tenglashguncha davom eting.", "То баробар шудани сутунҳои чап ва рост дар ҷадвали атомҳо идома диҳед."),
    x("«Tekshirish» tugmasini bosing. Koeffitsiyentlar eng kichik butun sonlar bo'lishi kerak.", "Тугмаи «Санҷиш»-ро пахш кунед. Коэффитсиентҳо бояд хурдтарин ададҳои бутун бошанд."),
    x("3D modelda 2H₂ + O₂ → 2H₂O reaksiyasida atomlar qanday qayta guruhlanishini kuzating.", "Дар модели 3D бинед, ки дар реаксияи 2H₂ + O₂ → 2H₂O атомҳо чӣ тавр аз нав гурӯҳбандӣ мешаванд."),
  ],
  tasks: [
    { text: x("Metan yonishi: CH₄ + ?O₂ → CO₂ + 2H₂O. Kislorod oldidagi koeffitsiyent?", "Сӯхтани метан: CH₄ + ?O₂ → CO₂ + 2H₂O. Коэффитсиенти пеш аз оксиген?"), answer: 2, tol: 0 },
    { text: x("4Fe + ?O₂ → 2Fe₂O₃. Kislorod oldidagi koeffitsiyent?", "4Fe + ?O₂ → 2Fe₂O₃. Коэффитсиенти пеш аз оксиген?"), answer: 3, tol: 0 },
    { text: x("2H₂ + O₂ → 2H₂O reaksiyasida 4 g vodorod to'liq yonsa, necha gramm suv hosil bo'ladi? (M(H₂)=2, M(H₂O)=18)", "Дар реаксияи 2H₂ + O₂ → 2H₂O агар 4 г гидроген пурра сӯзад, чанд грамм об ҳосил мешавад? (M(H₂)=2, M(H₂O)=18)"), answer: 36, tol: 0.1, unit: "g" },
  ],
  examples: [
    {
      title: x("Reaksiya bo'yicha massa hisobi", "Ҳисоби масса аз рӯи реаксия"),
      text: x("2H₂ + O₂ → 2H₂O. {m} g vodorod yondi. Sarflangan kislorod va hosil bo'lgan suv massasini toping.", "2H₂ + O₂ → 2H₂O. {m} г гидроген сӯхт. Массаи оксигени сарфшуда ва оби ҳосилшударо ёбед."),
      inputs: [{ id: "m", label: x("m(H₂)", "m(H₂)"), unit: "g", value: 4, min: 1, max: 100, step: 1 }],
      solve: (v) => {
        const nH = v.m / 2;
        return [`n(H₂) = m / M = ${v.m} / 2 = ${n2(nH)} mol`, `n(O₂) = n(H₂) / 2 = ${n2(nH / 2)} mol → m(O₂) = ${n2(nH / 2)} · 32 = ${n2(nH * 16)} g`, `n(H₂O) = n(H₂) = ${n2(nH)} mol → m(H₂O) = ${n2(nH)} · 18 = ${n2(nH * 18)} g`, x("Tekshirish: massa saqlanadi.", "Санҷиш: масса нигоҳ дошта мешавад."), `${v.m} + ${n2(nH * 16)} = ${n2(nH * 18)} g`];
      },
    },
    {
      title: x("Molyar massa", "Массаи молярӣ"),
      text: x("CₓHᵧ uglevodorodida x = {c}, y = {h}. Molyar massasini toping (C = 12, H = 1).", "Дар карбогидрогени CₓHᵧ x = {c}, y = {h}. Массаи молярии онро ёбед (C = 12, H = 1)."),
      inputs: [
        { id: "c", label: x("C atomlari", "Атомҳои C"), value: 1, min: 1, max: 10, step: 1 },
        { id: "h", label: x("H atomlari", "Атомҳои H"), value: 4, min: 1, max: 22, step: 1 },
      ],
      solve: (v) => [`M = ${v.c}·12 + ${v.h}·1 = ${v.c * 12 + v.h} g/mol`],
    },
  ],
  quiz: [
    { q: x("Tenglashtirishda nimani o'zgartirish mumkin?", "Ҳангоми баробар кардан чиро иваз кардан мумкин аст?"), options: [x("Faqat koeffitsiyentlarni", "Танҳо коэффитсиентҳоро"), x("Indekslarni", "Индексҳоро"), x("Formulalarni", "Формулаҳоро"), x("Hammasini", "Ҳамаашро")], answer: 0 },
    { q: x("2H₂ + O₂ → 2H₂O da chap tomonda nechta vodorod atomi bor?", "Дар 2H₂ + O₂ → 2H₂O дар тарафи чап чанд атоми гидроген ҳаст?"), options: [x("4", "4"), x("2", "2"), x("1", "1"), x("6", "6")], answer: 0 },
    { q: x("Massa saqlanish qonunini kim ochgan?", "Қонуни бақои массаро кӣ кашф кардааст?"), options: [x("Lomonosov va Lavuazye", "Ломоносов ва Лавуазе"), x("Nyuton", "Нютон"), x("Mendeleyev", "Менделеев"), x("Om", "Ом")], answer: 0 },
  ],
  conclusion: x("Kimyoviy reaksiyada atomlar yo'qolmaydi va yangidan paydo bo'lmaydi — faqat qayta guruhlanadi. Shuning uchun tenglamada har bir element atomlari soni teng bo'lishi kerak.", "Дар реаксияи кимиёвӣ атомҳо нест намешаванд ва аз нав пайдо намешаванд — танҳо аз нав гурӯҳбандӣ мешаванд. Аз ин рӯ, дар муодила шумораи атомҳои ҳар элемент бояд баробар бошад."),
};

/* ───────────────────────── BIOLOGIYA: hujayra ───────────────────────── */

const cell: LabContent = {
  goal: x("O'simlik va hayvon hujayrasining tuzilishini, organoidlar vazifasini o'rganish va ularni solishtirish.", "Омӯхтани сохти ҳуҷайраи растанӣ ва ҳайвонот, вазифаи органоидҳо ва муқоисаи онҳо."),
  equipment: [x("Virtual mikroskop (3D hujayra modeli)", "Микроскопи виртуалӣ (модели 3D-и ҳуҷайра)"), x("Hujayra turi tanlagichi", "Интихобгари навъи ҳуҷайра")],
  theory: [
    x("Hujayra — tirik organizmning eng kichik tuzilish va faoliyat birligi.", "Ҳуҷайра — хурдтарин воҳиди сохтор ва фаъолияти организми зинда."),
    x("Yadro irsiy axborotni saqlaydi, mitoxondriya energiya (ATF) hosil qiladi.", "Ядро иттилооти ирсиро нигоҳ медорад, митохондрия энергия (АТФ) ҳосил мекунад."),
    x("Faqat o'simlik hujayrasida: hujayra devori (sellyuloza), xloroplastlar va katta markaziy vakuola bor.", "Танҳо дар ҳуҷайраи растанӣ: девори ҳуҷайра (селлюлоза), хлоропластҳо ва вакуолаи калони марказӣ мавҷуданд."),
    x("Fotosintez xloroplastda boradi: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (yorug'lik energiyasi hisobiga).", "Фотосинтез дар хлоропласт мегузарад: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ (аз ҳисоби энергияи рӯшноӣ)."),
  ],
  formulas: ["6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂", "Kattalashtirish = okulyar × obyektiv"],
  steps: [
    x("Hayvon hujayrasini tanlang. Modelni aylantirib, har bir organoidni bosing va tavsifini o'qing.", "Ҳуҷайраи ҳайвонро интихоб кунед. Моделро гардонда, ҳар органоидро пахш кунед ва тавсифашро хонед."),
    x("O'simlik hujayrasiga o'ting. Qaysi yangi organoidlar paydo bo'ldi?", "Ба ҳуҷайраи растанӣ гузаред. Кадом органоидҳои нав пайдо шуданд?"),
    x("Farqlarni jadvalga yozing: devor, xloroplast, vakuola.", "Фарқҳоро ба ҷадвал нависед: девор, хлоропласт, вакуола."),
    x("Topshiriqlarni bajaring va testni yeching.", "Супоришҳоро иҷро кунед ва тестро ҳал кунед."),
  ],
  tasks: [
    { text: x("O'simlik hujayrasida bor, hayvon hujayrasida yo'q organoidlarni sanab bering.", "Органоидҳоеро номбар кунед, ки дар ҳуҷайраи растанӣ ҳастанд, дар ҳайвонот нестанд.") },
    { text: x("Mikroskop okulyari 10×, obyektivi 40×. Umumiy kattalashtirish necha marta?", "Окуляри микроскоп 10×, объективаш 40×. Калонкунии умумӣ чанд маротиба?"), answer: 400, tol: 0 },
    { text: x("Fotosintez tenglamasida 6 molekula CO₂ dan nechta molekula O₂ hosil bo'ladi?", "Дар муодилаи фотосинтез аз 6 молекулаи CO₂ чанд молекула O₂ ҳосил мешавад?"), answer: 6, tol: 0 },
  ],
  examples: [
    {
      title: x("Mikroskop kattalashtirishi", "Калонкунии микроскоп"),
      text: x("Okulyar {o}×, obyektiv {b}×. Hujayraning haqiqiy o'lchami {s} mkm. Ko'rinadigan o'lchamni toping.", "Окуляр {o}×, объектив {b}×. Андозаи ҳақиқии ҳуҷайра {s} мкм. Андозаи намоёнро ёбед."),
      inputs: [
        { id: "o", label: x("Okulyar", "Окуляр"), unit: "×", value: 10, min: 5, max: 20, step: 5 },
        { id: "b", label: x("Obyektiv", "Объектив"), unit: "×", value: 40, min: 4, max: 100, step: 1 },
        { id: "s", label: x("Hujayra", "Ҳуҷайра"), unit: "mkm", value: 20, min: 1, max: 100, step: 1 },
      ],
      solve: (v) => [`K = ${v.o} × ${v.b} = ${v.o * v.b}×`, `${v.s} mkm × ${v.o * v.b} = ${v.s * v.o * v.b} mkm = ${n2((v.s * v.o * v.b) / 1000)} mm`],
    },
  ],
  quiz: [
    { q: x("Qaysi organoid energiya hosil qiladi?", "Кадом органоид энергия ҳосил мекунад?"), options: [x("Mitoxondriya", "Митохондрия"), x("Yadro", "Ядро"), x("Vakuola", "Вакуола"), x("Golji apparati", "Дастгоҳи Голҷи")], answer: 0 },
    { q: x("Fotosintez qayerda boradi?", "Фотосинтез дар куҷо мегузарад?"), options: [x("Xloroplastda", "Дар хлоропласт"), x("Yadroda", "Дар ядро"), x("Lizosomada", "Дар лизосома"), x("Mitoxondriyada", "Дар митохондрия")], answer: 0 },
    { q: x("Hujayra devori qaysi moddadan iborat?", "Девори ҳуҷайра аз кадом модда иборат аст?"), options: [x("Sellyuloza", "Селлюлоза"), x("Oqsil", "Сафеда"), x("Yog'", "Равған"), x("Kraxmal", "Крахмал")], answer: 0 },
    { q: x("Irsiy axborot qayerda saqlanadi?", "Иттилооти ирсӣ дар куҷо нигоҳ дошта мешавад?"), options: [x("Yadroda", "Дар ядро"), x("Vakuolada", "Дар вакуола"), x("Devorda", "Дар девор"), x("Membranada", "Дар мембрана")], answer: 0 },
  ],
  conclusion: x("O'simlik va hayvon hujayralari umumiy tuzilishga ega (membrana, sitoplazma, yadro, mitoxondriya), lekin o'simlik hujayrasida devor, xloroplast va katta vakuola bor — shuning uchun o'simlik fotosintez qiladi.", "Ҳуҷайраҳои растанӣ ва ҳайвонот сохти умумӣ доранд (мембрана, ситоплазма, ядро, митохондрия), аммо дар ҳуҷайраи растанӣ девор, хлоропласт ва вакуолаи калон ҳаст — аз ин рӯ растанӣ фотосинтез мекунад."),
};

/* ───────────────────────── MATEMATIKA: fazoviy jismlar ───────────────────────── */

/** LabsCanvas "solids" bilan bir xil formulalar (a — asos o'lchami, h = a) */
function solidMetrics(k: number, a: number) {
  const r = a / 2, h = a, P = Math.PI;
  if (k === 0) return { V: a ** 3, S: 6 * a * a };
  if (k === 1) { const b = (Math.sqrt(3) / 4) * a * a; return { V: b * h, S: 2 * b + 3 * a * h }; }
  if (k === 2) { const l = Math.sqrt(h * h + r * r); return { V: (a * a * h) / 3, S: a * a + 2 * a * l }; }
  if (k === 3) return { V: P * r * r * h, S: 2 * P * r * (r + h) };
  if (k === 4) { const l = Math.sqrt(r * r + h * h); return { V: (P * r * r * h) / 3, S: P * r * (r + l) }; }
  return { V: (4 / 3) * P * r ** 3, S: 4 * P * r * r };
}

const solids: LabContent = {
  goal: x("Fazoviy jismlarning (kub, prizma, piramida, silindr, konus, shar) hajmi va to'la sirtini hisoblash, o'lcham o'zgarganda ular qanday o'zgarishini aniqlash.", "Ҳисоб кардани ҳаҷм ва сатҳи пурраи ҷисмҳои фазоӣ (куб, призма, пирамида, силиндр, конус, кура) ва муайян кардани тағйири онҳо ҳангоми тағйири андоза."),
  equipment: [x("3D jismlar modeli", "Модели 3D-и ҷисмҳо"), x("O'lcham sozlagichi", "Танзимгари андоза"), x("Karkas ko'rinishi", "Намуди қаркас")],
  theory: [
    x("Hajm — jism egallagan fazo miqdori (sm³). Sirt yuzi — barcha yoqlar yuzlari yig'indisi (sm²).", "Ҳаҷм — миқдори фазое, ки ҷисм ишғол мекунад (см³). Масоҳати сатҳ — ҷамъи масоҳати ҳамаи рӯяҳо (см²)."),
    x("Prizma va silindr hajmi: V = S_asos · h. Piramida va konus hajmi uch marta kichik: V = S_asos · h / 3.", "Ҳаҷми призма ва силиндр: V = S_асос · h. Ҳаҷми пирамида ва конус се маротиба хурдтар: V = S_асос · h / 3."),
    x("Ko'pyoqlar uchun Eyler formulasi: Uchlar − Qirralar + Yoqlar = 2.", "Формулаи Эйлер барои бисёррӯяҳо: Қуллаҳо − Қирраҳо + Рӯяҳо = 2."),
    x("O'lcham k marta oshsa, sirt k² marta, hajm k³ marta oshadi.", "Агар андоза k маротиба зиёд шавад, сатҳ k², ҳаҷм k³ маротиба зиёд мешавад."),
  ],
  formulas: ["Kub: V = a³, S = 6a²", "Silindr: V = πr²h, S = 2πr(r + h)", "Konus: V = πr²h / 3", "Shar: V = 4πr³ / 3, S = 4πr²", "Piramida: V = S·h / 3"],
  steps: [
    x("Kubni tanlang, a = 2 sm. Hajm va sirtni yozing.", "Кубро интихоб кунед, a = 2 см. Ҳаҷм ва сатҳро нависед."),
    x("a ni 1 dan 5 gacha o'zgartirib, har birida o'lchov yozing. Grafikda V(a) egri chiziq ekanini ko'ring.", "a-ро аз 1 то 5 иваз карда, ҳар дафъа ченкуниро сабт кунед. Дар график бинед ки V(a) хати каҷ аст."),
    x("Silindr va konusni bir xil a da solishtiring: hajmlar nisbati qancha?", "Силиндр ва конусро дар a-и якхела муқоиса кунед: нисбати ҳаҷмҳо чанд аст?"),
    x("Karkas ko'rinishida kub, prizma va piramida uchun Eyler formulasini tekshiring.", "Дар намуди қаркас формулаи Эйлерро барои куб, призма ва пирамида санҷед."),
  ],
  tasks: [
    { text: x("Kub qirrasi 3 sm. Hajmi qancha? (sm³)", "Қирраи куб 3 см. Ҳаҷмаш чанд аст? (см³)"), answer: 27, tol: 0, unit: "sm³" },
    { text: x("Silindr: r = 2 sm, h = 5 sm. Hajmini toping (π ≈ 3,14, sm³).", "Силиндр: r = 2 см, h = 5 см. Ҳаҷмашро ёбед (π ≈ 3,14, см³)."), answer: 62.8, tol: 0.2, unit: "sm³" },
    { text: x("Kub qirrasi 2 marta oshirildi. Hajmi necha marta oshadi?", "Қирраи куб 2 маротиба зиёд карда шуд. Ҳаҷмаш чанд маротиба зиёд мешавад?"), answer: 8, tol: 0 },
    { text: x("Bir xil asos va balandlikdagi silindr hajmi konus hajmidan necha marta katta?", "Ҳаҷми силиндр аз ҳаҷми конуси асос ва баландиаш якхела чанд маротиба калон аст?"), answer: 3, tol: 0 },
  ],
  examples: [
    {
      title: x("Silindr va konus", "Силиндр ва конус"),
      text: x("Asos radiusi r = {r} sm, balandligi h = {h} sm.", "Радиуси асос r = {r} см, баландӣ h = {h} см."),
      inputs: [
        { id: "r", label: x("r", "r"), unit: "sm", value: 2, min: 0.5, max: 10, step: 0.5 },
        { id: "h", label: x("h", "h"), unit: "sm", value: 5, min: 0.5, max: 20, step: 0.5 },
      ],
      solve: (v) => {
        const V = Math.PI * v.r * v.r * v.h;
        const l = Math.sqrt(v.r * v.r + v.h * v.h);
        return [
          x("Silindr:", "Силиндр:"),
          `V = πr²h = π·${v.r}²·${v.h} = ${n2(V)} sm³`,
          `S = 2πr(r + h) = 2π·${v.r}·(${v.r} + ${v.h}) = ${n2(2 * Math.PI * v.r * (v.r + v.h))} sm²`,
          x("Konus:", "Конус:"),
          `V = πr²h / 3 = ${n2(V / 3)} sm³`,
          `l = √(r² + h²) = ${n2(l)} sm; S = πr(r + l) = ${n2(Math.PI * v.r * (v.r + l))} sm²`,
        ];
      },
    },
    {
      title: x("Shar", "Кура"),
      text: x("Shar radiusi R = {R} sm.", "Радиуси кура R = {R} см."),
      inputs: [{ id: "R", label: x("R", "R"), unit: "sm", value: 3, min: 0.5, max: 20, step: 0.5 }],
      solve: (v) => [`V = 4πR³ / 3 = 4π·${v.R}³ / 3 = ${n2((4 * Math.PI * v.R ** 3) / 3)} sm³`, `S = 4πR² = ${n2(4 * Math.PI * v.R * v.R)} sm²`],
    },
  ],
  columns: [
    { key: "kind", label: "#" },
    { key: "a", label: "a", unit: "sm" },
    { key: "V", label: "V", unit: "sm³" },
    { key: "S", label: "S", unit: "sm²" },
  ],
  graph: { x: "a", y: "V" },
  measure: (p) => {
    const m = solidMetrics(Math.round(p.kind), p.a);
    return { kind: Math.round(p.kind) + 1, a: p.a, V: Math.round(m.V * 100) / 100, S: Math.round(m.S * 100) / 100 };
  },
  quiz: [
    { q: x("Konus hajmi formulasi:", "Формулаи ҳаҷми конус:"), options: [x("V = πr²h / 3", "V = πr²h / 3"), x("V = πr²h", "V = πr²h"), x("V = 4πr³ / 3", "V = 4πr³ / 3"), x("V = 2πrh", "V = 2πrh")], answer: 0 },
    { q: x("Kubda nechta qirra bor?", "Куб чанд қирра дорад?"), options: [x("12", "12"), x("8", "8"), x("6", "6"), x("10", "10")], answer: 0 },
    { q: x("O'lcham 3 marta oshsa, sirt yuzi…", "Агар андоза 3 маротиба зиёд шавад, масоҳати сатҳ…"), options: [x("9 marta oshadi", "9 маротиба зиёд мешавад"), x("3 marta oshadi", "3 маротиба зиёд мешавад"), x("27 marta oshadi", "27 маротиба зиёд мешавад"), x("6 marta oshadi", "6 маротиба зиёд мешавад")], answer: 0 },
  ],
  conclusion: x("Hajm uzunlikning kubiga, sirt esa kvadratiga proporsional o'sadi. Piramida va konus hajmi bir xil asos va balandlikdagi prizma va silindr hajmining uchdan biriga teng.", "Ҳаҷм ба куби дарозӣ, сатҳ бошад ба квадраташ мутаносиб меафзояд. Ҳаҷми пирамида ва конус ба сеяки ҳаҷми призма ва силиндри асос ва баландиаш якхела баробар аст."),
};

/* ───────────────────────── INFORMATIKA: mantiqiy elementlar ───────────────────────── */

const logic: LabContent = {
  goal: x("Mantiqiy amallar (VA, YOKI, EMAS, XOR) va mantiqiy sxemalar ishini o'rganish, rostlik jadvalini tuzish.", "Омӯзиши амалҳои мантиқӣ (ВА, Ё, НЕ, XOR) ва кори схемаҳои мантиқӣ, тартиб додани ҷадвали ростӣ."),
  equipment: [x("Ikki kirish kaliti (A, B)", "Ду калиди даромад (A, B)"), x("Mantiqiy element tanlagichi", "Интихобгари элементи мантиқӣ"), x("Chiqish lampochkasi", "Лампочкаи баромад")],
  theory: [
    x("Kompyuterda barcha ma'lumot 0 va 1 bilan ifodalanadi. 1 — «rost» (tok bor), 0 — «yolg'on» (tok yo'q).", "Дар компютер ҳамаи маълумот бо 0 ва 1 ифода мешавад. 1 — «рост» (ҷараён ҳаст), 0 — «дурӯғ» (ҷараён нест)."),
    x("VA (AND): ikkala kirish 1 bo'lsagina natija 1. YOKI (OR): kamida bittasi 1 bo'lsa natija 1.", "ВА (AND): танҳо агар ҳарду даромад 1 бошад, натиҷа 1. Ё (OR): агар ақаллан яктоаш 1 бошад, натиҷа 1."),
    x("EMAS (NOT): qiymatni teskarisiga o'zgartiradi. XOR: kirishlar har xil bo'lsa natija 1.", "НЕ (NOT): қиматро ба баръакс иваз мекунад. XOR: агар даромадҳо гуногун бошанд, натиҷа 1."),
  ],
  formulas: ["A ∧ B (VA / ВА)", "A ∨ B (YOKI / Ё)", "¬A (EMAS / НЕ)", "A ⊕ B (XOR)"],
  steps: [
    x("Elementni tanlang (masalan, VA).", "Элементро интихоб кунед (масалан, ВА)."),
    x("A va B kalitlarini bosib, 4 ta holatning har birini sinab ko'ring.", "Калидҳои A ва B-ро пахш карда, ҳар яке аз 4 ҳолатро санҷед."),
    x("Har bir holatda «O'lchovni yozish» ni bosing — rostlik jadvali to'ladi.", "Дар ҳар ҳолат «Сабти ченкунӣ»-ро пахш кунед — ҷадвали ростӣ пур мешавад."),
    x("Boshqa elementlar uchun takrorlang va jadvallarni solishtiring.", "Барои дигар элементҳо такрор кунед ва ҷадвалҳоро муқоиса кунед."),
  ],
  tasks: [
    { text: x("A = 1, B = 0 bo'lganda VA natijasi?", "Ҳангоми A = 1, B = 0 натиҷаи ВА?"), answer: 0, tol: 0 },
    { text: x("A = 1, B = 0 bo'lganda YOKI natijasi?", "Ҳангоми A = 1, B = 0 натиҷаи Ё?"), answer: 1, tol: 0 },
    { text: x("XOR natijasi necha holatda 1 ga teng?", "Натиҷаи XOR дар чанд ҳолат ба 1 баробар аст?"), answer: 2, tol: 0 },
    { text: x("Ikki kirishli element uchun rostlik jadvalida nechta qator bor?", "Дар ҷадвали ростии элементи дударомада чанд сатр ҳаст?"), answer: 4, tol: 0 },
  ],
  examples: [
    {
      title: x("Ikkilik sanoq sistemasi", "Системаи ҳисоби дуӣ"),
      text: x("O'nlik son {n} ni ikkilik sanoq sistemasiga o'tkazing.", "Адади даҳии {n}-ро ба системаи ҳисоби дуӣ гузаронед."),
      inputs: [{ id: "n", label: x("Son", "Адад"), value: 13, min: 1, max: 255, step: 1 }],
      solve: (v) => {
        const out: (string | Tx)[] = [];
        let k = Math.round(v.n);
        while (k > 0) {
          out.push(`${k} : 2 = ${Math.floor(k / 2)} (${k % 2})`);
          k = Math.floor(k / 2);
        }
        out.push(x("Qoldiqlarni pastdan yuqoriga o'qiymiz:", "Бақияҳоро аз поён ба боло мехонем:"), `${Math.round(v.n)}₁₀ = ${Math.round(v.n).toString(2)}₂`);
        return out;
      },
    },
    {
      title: x("Rostlik jadvali qatorlari", "Сатрҳои ҷадвали ростӣ"),
      text: x("{k} ta kirishli mantiqiy ifoda uchun rostlik jadvalida nechta qator bor?", "Барои ифодаи мантиқии {k} даромада дар ҷадвали ростӣ чанд сатр ҳаст?"),
      inputs: [{ id: "k", label: x("Kirishlar", "Даромадҳо"), value: 3, min: 1, max: 8, step: 1 }],
      solve: (v) => [`N = 2^k = 2^${v.k} = ${2 ** v.k}`],
    },
  ],
  columns: [
    { key: "A", label: "A" },
    { key: "B", label: "B" },
    { key: "Y", label: "Y" },
  ],
  quiz: [
    { q: x("1 VA 1 = ?", "1 ВА 1 = ?"), options: [x("1", "1"), x("0", "0"), x("2", "2"), x("11", "11")], answer: 0 },
    { q: x("EMAS 0 = ?", "НЕ 0 = ?"), options: [x("1", "1"), x("0", "0"), x("−1", "−1"), x("aniqlanmagan", "номуайян")], answer: 0 },
    { q: x("0 YOKI 0 = ?", "0 Ё 0 = ?"), options: [x("0", "0"), x("1", "1"), x("2", "2"), x("aniqlanmagan", "номуайян")], answer: 0 },
  ],
  conclusion: x("Mantiqiy elementlar kompyuterning asosiy qurilish g'ishtlari: har qanday hisoblash VA, YOKI, EMAS kabi amallardan tuziladi.", "Элементҳои мантиқӣ хиштҳои асосии сохтмони компютер мебошанд: ҳар гуна ҳисоббарорӣ аз амалҳои ВА, Ё, НЕ тартиб дода мешавад."),
};

/* ───────────────────────── FIZIKA: prujina va Guk qonuni (3D lab) ───────────────────────── */

const spring: LabContent = {
  goal: x("Prujinaning cho'zilishi unga ta'sir etuvchi kuchga bog'liqligini (Guk qonunini) tajribada aniqlash, prujina bikrligini topish va yukli prujina tebranish davrini o'lchash.", "Дар таҷриба муайян кардани вобастагии дарозшавии пружина аз қувваи таъсиркунанда (қонуни Гук), ёфтани сахтии пружина ва чен кардани давраи лаппиши пружинаи бордор."),
  equipment: [x("Shtativ", "Штатив"), x("Prujinalar (k = 10, 20, 40 N/m)", "Пружинаҳо (k = 10, 20, 40 Н/м)"), x("Yuklar to'plami: 50, 100, 100, 200 g", "Маҷмӯи борҳо: 50, 100, 100, 200 г"), x("Chizg'ich (sm)", "Ҷадвал (см)"), x("Dinamometr shkalasi", "Шкалаи динамометр"), x("Sekundomer (davrni o'lchash)", "Секундомер (чен кардани давра)")],
  theory: [
    x("Elastiklik kuchi deformatsiyaga proporsional: F = k·x (Guk qonuni). k — bikrlik, N/m.", "Қувваи чандирӣ ба деформатсия мутаносиб аст: F = k·x (қонуни Гук). k — сахтӣ, Н/м."),
    x("Muvozanatda yukning og'irligi elastiklik kuchiga teng: m·g = k·x, demak x = m·g / k.", "Дар мувозинат вазни бор ба қувваи чандирӣ баробар аст: m·g = k·x, яъне x = m·g / k."),
    x("Prujinali mayatnik davri T = 2π·√(m/k) — amplitudaga bog'liq emas.", "Давраи маятники пружинагӣ T = 2π·√(m/k) — аз амплитуда вобаста нест."),
    x("Havo qarshiligi tebranishlarni so'ndiradi, lekin muvozanat holatini o'zgartirmaydi.", "Муқовимати ҳаво лаппишҳоро суст мекунад, вале ҳолати мувозинатро тағйир намедиҳад."),
  ],
  formulas: ["F = k·x", "P = m·g", "k = m·g / x", "T = 2π·√(m/k)"],
  steps: [
    x("100 g li yukni sichqoncha bilan prujina ilgagiga sudrab olib boring.", "Бори 100 г-ро бо муш ба қалмоқи пружина кашида баред."),
    x("«So'nish» ni 0,5 ga qo'yib, «Boshlash» ni bosing va prujina tinchlanishini kuting.", "«Суст шудан»-ро ба 0,5 гузошта, «Оғоз»-ро пахш кунед ва интизор шавед то пружина ором гирад."),
    x("Chizg'ichdagi cho'zilishni o'qing va «O'lchovni yozish» ni bosing.", "Дарозшавиро аз ҷадвал хонед ва «Сабти ченкунӣ»-ро пахш кунед."),
    x("Yana yuk qo'shib (150, 250, 450 g) o'lchovni takrorlang.", "Бор илова карда (150, 250, 450 г) ченкуниро такрор кунед."),
    x("F(x) grafigidan prujina bikrligini toping.", "Аз графики F(x) сахтии пружинаро ёбед."),
    x("«So'nish» ni 0 ga qo'yib, tebranish davrini o'lchang va formula bilan solishtiring.", "«Суст шудан»-ро ба 0 гузошта, давраи лаппишро чен кунед ва бо формула муқоиса кунед."),
  ],
  tasks: [
    { text: x("k = 20 N/m prujinaga 200 g yuk osildi. Cho'zilish necha sm? (g = 9,81)", "Ба пружинаи k = 20 Н/м бори 200 г овехта шуд. Дарозшавӣ чанд см аст? (g = 9,81)"), answer: 9.81, tol: 0.1, unit: "sm" },
    { text: x("Yuk 0,1 kg, k = 40 N/m. Tebranish davri qancha? (s)", "Бор 0,1 кг, k = 40 Н/м. Давраи лаппиш чанд аст? (с)"), answer: 0.31, tol: 0.01, unit: "s" },
    { text: x("Yuk massasi 4 marta oshirilsa, davr necha marta oshadi?", "Агар массаи бор 4 маротиба зиёд шавад, давра чанд маротиба зиёд мешавад?"), answer: 2, tol: 0 },
  ],
  examples: [
    {
      title: x("Guk qonuni", "Қонуни Гук"),
      text: x("Bikrligi {k} N/m prujinaga {m} g yuk osildi.", "Ба пружинаи сахтиаш {k} Н/м бори {m} г овехта шуд."),
      inputs: [
        { id: "k", label: x("k", "k"), unit: "N/m", value: 20, min: 5, max: 100, step: 5 },
        { id: "m", label: x("m", "m"), unit: "g", value: 150, min: 10, max: 1000, step: 10 },
      ],
      solve: (v) => {
        const m = v.m / 1000;
        const F = m * 9.81;
        return [`F = m·g = ${m} · 9,81 = ${n2(F)} N`, `x = F / k = ${n2(F)} / ${v.k} = ${n3(F / v.k)} m = ${n2((F / v.k) * 100)} sm`, `T = 2π·√(m/k) = ${n2(2 * Math.PI * Math.sqrt(m / v.k))} s`];
      },
    },
  ],
  columns: [
    { key: "m", label: "m", unit: "g" },
    { key: "F", label: "F", unit: "N" },
    { key: "x", label: "x", unit: "sm" },
    { key: "k", label: "k", unit: "N/m" },
  ],
  graph: { x: "x", y: "F" },
  quiz: [
    { q: x("Guk qonuni formulasi:", "Формулаи қонуни Гук:"), options: [x("F = k·x", "F = k·x"), x("F = m·a", "F = m·a"), x("P = U·I", "P = U·I"), x("F = m·g·h", "F = m·g·h")], answer: 0 },
    { q: x("Bikrlik 2 marta oshsa (yuk o'sha), cho'zilish…", "Агар сахтӣ 2 маротиба зиёд шавад (бор ҳамон), дарозшавӣ…"), options: [x("2 marta kamayadi", "2 маротиба кам мешавад"), x("2 marta oshadi", "2 маротиба зиёд мешавад"), x("o'zgarmaydi", "тағйир намеёбад"), x("4 marta kamayadi", "4 маротиба кам мешавад")], answer: 0 },
    { q: x("Prujinali mayatnik davri nimaga bog'liq emas?", "Давраи маятники пружинагӣ ба чӣ вобаста нест?"), options: [x("Amplitudaga", "Ба амплитуда"), x("Massaga", "Ба масса"), x("Bikrlikka", "Ба сахтӣ"), x("Hech biriga", "Ба ҳеҷ кадом")], answer: 0 },
  ],
  conclusion: x("Prujinaning cho'zilishi yuk og'irligiga to'g'ri proporsional (F = k·x): F(x) grafigi koordinata boshidan o'tuvchi to'g'ri chiziq, uning qiyaligi — bikrlik k. Tebranish davri √(m/k) ga proporsional.", "Дарозшавии пружина ба вазни бор мустақиман мутаносиб аст (F = k·x): графики F(x) хатти ростест, ки аз ибтидои координатаҳо мегузарад, моилии он — сахтии k. Давраи лаппиш ба √(m/k) мутаносиб аст."),
};

/* ───────────────────────── KIMYO: titrlash (3D lab) ───────────────────────── */

const titration: LabContent = {
  goal: x("Kislota va ishqorning neytrallanish reaksiyasini xavfsiz virtual tajribada o'rganish: indikator rangi, pH va harorat o'zgarishini kuzatish, ekvivalent nuqtani topish.", "Дар таҷрибаи бехатари виртуалӣ омӯхтани реаксияи нейтрализатсияи кислота ва ишқор: мушоҳидаи тағйири ранги индикатор, pH ва ҳарорат, ёфтани нуқтаи эквивалентӣ."),
  equipment: [x("Byuretka (50 ml) — NaOH eritmasi", "Бюретка (50 мл) — маҳлули NaOH"), x("Konussimon kolba — HCl eritmasi", "Колбаи конусӣ — маҳлули HCl"), x("Indikatorlar: fenolftalein, metilzarg'aldog'i, universal", "Индикаторҳо: фенолфталеин, метилоранж, универсалӣ"), x("pH-metr", "pH-метр"), x("Termometr", "Термометр"), x("Magnit aralashtirgich", "Омехтакунаки магнитӣ")],
  theory: [
    x("Neytrallanish: kislota + asos → tuz + suv. HCl + NaOH → NaCl + H₂O; ionli ko'rinishi: H⁺ + OH⁻ → H₂O.", "Нейтрализатсия: кислота + асос → намак + об. HCl + NaOH → NaCl + H₂O; шакли ионӣ: H⁺ + OH⁻ → H₂O."),
    x("pH = −lg[H⁺]. Kuchli kislota va kuchli ishqor uchun ekvivalent nuqtada pH = 7.", "pH = −lg[H⁺]. Барои кислота ва ишқори қавӣ дар нуқтаи эквивалентӣ pH = 7."),
    x("Ekvivalent nuqta: c(kislota)·V(kislota) = c(ishqor)·V(ishqor).", "Нуқтаи эквивалентӣ: c(кислота)·V(кислота) = c(ишқор)·V(ишқор)."),
    x("Fenolftalein pH 8,2 dan yuqorida pushti; metilzarg'aldog'i pH 3,1 dan past qizil, 4,4 dan yuqori sariq.", "Фенолфталеин дар pH аз 8,2 боло гулобӣ; метилоранж дар pH аз 3,1 паст сурх, аз 4,4 боло зард."),
    x("Reaksiya ekzotermik (≈ 57 kJ/mol): eritma biroz isiydi.", "Реаксия экзотермӣ аст (≈ 57 кҶ/мол): маҳлул каме гарм мешавад."),
    x("Xavfsizlik: haqiqiy kislota va ishqorlar ko'z va terini kuydiradi — bu tajriba faqat virtual; haqiqiy laboratoriyada ko'zoynak va qo'lqop shart.", "Бехатарӣ: кислота ва ишқорҳои воқеӣ чашм ва пӯстро месӯзонанд — ин таҷриба танҳо виртуалӣ аст; дар лабораторияи воқеӣ айнак ва дастпӯшак ҳатмист."),
  ],
  formulas: ["HCl + NaOH → NaCl + H₂O", "pH = −lg[H⁺]", "c₁V₁ = c₂V₂", "Q = n · 57,1 kJ/mol"],
  steps: [
    x("Indikator sifatida fenolftaleinni tanlang. Kolbada 20 ml 0,1 M HCl bor.", "Фенолфталеинро ҳамчун индикатор интихоб кунед. Дар колба 20 мл HCl-и 0,1 М ҳаст."),
    x("«Boshlash» ni bosing — byuretkadan NaOH tomchilab tushadi.", "«Оғоз»-ро пахш кунед — аз бюретка NaOH қатра-қатра мечакад."),
    x("Har 2–5 ml dan keyin «O'lchovni yozish» ni bosing (pH va harorat).", "Пас аз ҳар 2–5 мл «Сабти ченкунӣ»-ро пахш кунед (pH ва ҳарорат)."),
    x("Eritma pushti bo'lganda to'xtating — bu ekvivalent nuqtaga yaqin.", "Вақте ки маҳлул гулобӣ шуд, боздоред — ин ба нуқтаи эквивалентӣ наздик аст."),
    x("pH(V) grafigidagi keskin sakrashni toping va c₁V₁ = c₂V₂ bilan tekshiring.", "Ҷаҳиши якбораи графики pH(V)-ро ёбед ва бо c₁V₁ = c₂V₂ санҷед."),
    x("Indikatorni almashtirib, rang qaysi pH da o'zgarishini solishtiring.", "Индикаторро иваз карда, муқоиса кунед, ки ранг дар кадом pH тағйир меёбад."),
  ],
  tasks: [
    { text: x("20 ml 0,1 M HCl ni neytrallash uchun 0,1 M NaOH dan necha ml kerak?", "Барои нейтрализатсияи 20 мл HCl-и 0,1 М чанд мл NaOH-и 0,1 М лозим аст?"), answer: 20, tol: 0.1, unit: "ml" },
    { text: x("0,01 M HCl eritmasining pH qiymati?", "Қимати pH-и маҳлули HCl-и 0,01 М?"), answer: 2, tol: 0.01 },
    { text: x("25 ml 0,2 M HCl ni 0,1 M NaOH bilan titrlashda ekvivalent hajm (ml)?", "Ҳангоми титронидани 25 мл HCl-и 0,2 М бо NaOH-и 0,1 М ҳаҷми эквивалентӣ (мл)?"), answer: 50, tol: 0.1, unit: "ml" },
  ],
  examples: [
    {
      title: x("pH ni hisoblash", "Ҳисоби pH"),
      text: x("{va} ml {ca} M HCl ga {vb} ml {cb} M NaOH qo'shildi.", "Ба {va} мл HCl-и {ca} М {vb} мл NaOH-и {cb} М илова шуд."),
      inputs: [
        { id: "va", label: x("V(HCl)", "V(HCl)"), unit: "ml", value: 20, min: 5, max: 50, step: 1 },
        { id: "ca", label: x("c(HCl)", "c(HCl)"), unit: "M", value: 0.1, min: 0.01, max: 1, step: 0.01 },
        { id: "vb", label: x("V(NaOH)", "V(NaOH)"), unit: "ml", value: 15, min: 0, max: 60, step: 1 },
        { id: "cb", label: x("c(NaOH)", "c(NaOH)"), unit: "M", value: 0.1, min: 0.01, max: 1, step: 0.01 },
      ],
      solve: (v) => {
        const nA = (v.ca * v.va) / 1000;
        const nB = (v.cb * v.vb) / 1000;
        const V = (v.va + v.vb) / 1000;
        const d = nA - nB;
        const pH = Math.abs(d) < 1e-12 ? 7 : d > 0 ? -Math.log10(d / V) : 14 + Math.log10(-d / V);
        return [
          `n(HCl) = ${v.ca} · ${v.va / 1000} = ${n3(nA * 1000)} mmol`,
          `n(NaOH) = ${v.cb} · ${v.vb / 1000} = ${n3(nB * 1000)} mmol`,
          d > 0 ? x(`Ortiqcha H⁺: ${n3(d * 1000)} mmol, V = ${v.va + v.vb} ml`, `H⁺-и зиёдатӣ: ${n3(d * 1000)} ммол, V = ${v.va + v.vb} мл`) : d < 0 ? x(`Ortiqcha OH⁻: ${n3(-d * 1000)} mmol, V = ${v.va + v.vb} ml`, `OH⁻-и зиёдатӣ: ${n3(-d * 1000)} ммол, V = ${v.va + v.vb} мл`) : x("Ekvivalent nuqta", "Нуқтаи эквивалентӣ"),
          `pH = ${n2(pH)}`,
        ];
      },
    },
  ],
  columns: [
    { key: "V", label: "V(NaOH)", unit: "ml" },
    { key: "pH", label: "pH" },
    { key: "T", label: "t", unit: "°C" },
  ],
  graph: { x: "V", y: "pH" },
  quiz: [
    { q: x("Neytrallanish reaksiyasining ionli tenglamasi:", "Муодилаи ионии реаксияи нейтрализатсия:"), options: [x("H⁺ + OH⁻ → H₂O", "H⁺ + OH⁻ → H₂O"), x("Na⁺ + Cl⁻ → NaCl", "Na⁺ + Cl⁻ → NaCl"), x("2H₂ + O₂ → 2H₂O", "2H₂ + O₂ → 2H₂O"), x("H₂O → H⁺ + OH⁻", "H₂O → H⁺ + OH⁻")], answer: 0 },
    { q: x("Fenolftalein ishqoriy muhitda qanday rangda?", "Фенолфталеин дар муҳити ишқорӣ чӣ ранг дорад?"), options: [x("Pushti (moviy-qizil)", "Гулобӣ"), x("Rangsiz", "Беранг"), x("Sariq", "Зард"), x("Yashil", "Сабз")], answer: 0 },
    { q: x("Ekvivalent nuqtada (HCl + NaOH) pH = ?", "Дар нуқтаи эквивалентӣ (HCl + NaOH) pH = ?"), options: [x("7", "7"), x("1", "1"), x("14", "14"), x("4", "4")], answer: 0 },
  ],
  conclusion: x("Kuchli kislota ishqor bilan titrlanganda pH ekvivalent nuqta atrofida keskin (1–2 tomchida) sakraydi; indikator rangi shu sakrashni ko'rsatadi. Ekvivalent hajm c₁V₁ = c₂V₂ dan topiladi, reaksiya issiqlik chiqaradi.", "Ҳангоми титронидани кислотаи қавӣ бо ишқор pH дар атрофи нуқтаи эквивалентӣ якбора (дар 1–2 қатра) меҷаҳад; ранги индикатор ҳамин ҷаҳишро нишон медиҳад. Ҳаҷми эквивалентӣ аз c₁V₁ = c₂V₂ ёфта мешавад, реаксия гармӣ ҷудо мекунад."),
};

/* ───────────────────────── GEOGRAFIYA: Yerning ichki tuzilishi (3D lab) ───────────────────────── */

const earth: LabContent = {
  goal: x("Yerning ichki qatlamlari — qobiq, mantiya, tashqi va ichki yadro — qalinligi, holati, tarkibi va chuqurlik bo'yicha harorat va bosim o'zgarishini o'rganish.", "Омӯзиши қабатҳои дохилии Замин — пӯст, мантия, ядрои берунӣ ва дохилӣ — ғафсӣ, ҳолат, таркиб ва тағйири ҳарорату фишор аз рӯи чуқурӣ."),
  equipment: [x("Kesimli globus modeli", "Модели глобуси буридашуда"), x("Kesim burchagi boshqaruvi", "Идораи кунҷи буриш"), x("Chuqurlik zondi (harorat va bosim)", "Зонди чуқурӣ (ҳарорат ва фишор)")],
  theory: [
    x("Yer radiusi ≈ 6371 km. Qobiq: materiklarda 30–70 km, okeanlar ostida 5–10 km.", "Радиуси Замин ≈ 6371 км. Пӯст: дар қитъаҳо 30–70 км, дар зери уқёнусҳо 5–10 км."),
    x("Mantiya 2891 km chuqurlikkacha davom etadi — Yer hajmining ~84% i.", "Мантия то чуқурии 2891 км идома дорад — ~84%-и ҳаҷми Замин."),
    x("Tashqi yadro (2891–5150 km) suyuq temir-nikel; undagi oqimlar Yerning magnit maydonini hosil qiladi.", "Ядрои берунӣ (2891–5150 км) оҳану никели моеъ аст; ҷараёнҳои он майдони магнитии Заминро ба вуҷуд меоранд."),
    x("Ichki yadro (5150–6371 km) harorati ~5400 °C bo'lsa ham, ulkan bosim tufayli qattiq.", "Ядрои дохилӣ (5150–6371 км) бо вуҷуди ҳарорати ~5400 °C аз фишори бузург сахт аст."),
    x("Ichki tuzilish zilzila to'lqinlari (seysmik to'lqinlar) yordamida aniqlangan: S-to'lqinlar suyuq tashqi yadrodan o'tmaydi.", "Сохти дохилӣ бо ёрии мавҷҳои заминларза (сейсмикӣ) муайян шудааст: мавҷҳои S аз ядрои моеъи берунӣ намегузаранд."),
  ],
  formulas: ["Qalinlik = pastki chegara − yuqori chegara", "R(Yer) ≈ 6371 km"],
  steps: [
    x("Kesim burchagini 90° ga qo'ying va qatlamlarni ko'ring.", "Кунҷи буришро ба 90° гузоред ва қабатҳоро бинед."),
    x("Har bir qatlamni bosib, chuqurligi, holati va tarkibini o'qing.", "Ҳар қабатро пахш карда, чуқурӣ, ҳолат ва таркиби онро хонед."),
    x("Zondni 0 dan 6371 km gacha suring; har bir qatlamda «O'lchovni yozish» ni bosing.", "Зондро аз 0 то 6371 км ҳаракат диҳед; дар ҳар қабат «Сабти ченкунӣ»-ро пахш кунед."),
    x("Harorat grafigini tahlil qiling: qayerda eng tez ko'tariladi?", "Графики ҳароратро таҳлил кунед: дар куҷо зудтар боло меравад?"),
  ],
  tasks: [
    { text: x("Mantiyaning qalinligi necha km? (35 km dan 2891 km gacha)", "Ғафсии мантия чанд км аст? (аз 35 то 2891 км)"), answer: 2856, tol: 1, unit: "km" },
    { text: x("Tashqi yadroning qalinligi necha km?", "Ғафсии ядрои берунӣ чанд км аст?"), answer: 2259, tol: 1, unit: "km" },
    { text: x("Qaysi qatlam suyuq? Zond bilan tekshiring va nomini yozing.", "Кадом қабат моеъ аст? Бо зонд санҷед ва номашро нависед.") },
  ],
  examples: [
    {
      title: x("Qatlam qalinligi va ulushi", "Ғафсӣ ва ҳиссаи қабат"),
      text: x("Qatlam {a} km dan {b} km chuqurlikkacha.", "Қабат аз чуқурии {a} то {b} км."),
      inputs: [
        { id: "a", label: x("Yuqori chegara", "Сарҳади болоӣ"), unit: "km", value: 35, min: 0, max: 6000, step: 5 },
        { id: "b", label: x("Pastki chegara", "Сарҳади поёнӣ"), unit: "km", value: 2891, min: 10, max: 6371, step: 5 },
      ],
      solve: (v) => {
        const R = 6371;
        const r1 = R - Math.min(v.a, v.b);
        const r2 = R - Math.max(v.a, v.b);
        const share = (r1 ** 3 - r2 ** 3) / R ** 3;
        return [`h = ${Math.max(v.a, v.b)} − ${Math.min(v.a, v.b)} = ${Math.abs(v.b - v.a)} km`, x("Hajm ulushi (shar qatlami):", "Ҳиссаи ҳаҷм (қабати кура):"), `(r₁³ − r₂³) / R³ = (${r1}³ − ${r2}³) / ${R}³ = ${n2(share * 100)} %`];
      },
    },
  ],
  columns: [
    { key: "d", label: "h", unit: "km" },
    { key: "T", label: "t", unit: "°C" },
    { key: "P", label: "p", unit: "GPa" },
  ],
  graph: { x: "d", y: "T" },
  quiz: [
    { q: x("Qaysi qatlam suyuq?", "Кадом қабат моеъ аст?"), options: [x("Tashqi yadro", "Ядрои берунӣ"), x("Ichki yadro", "Ядрои дохилӣ"), x("Mantiya", "Мантия"), x("Qobiq", "Пӯст")], answer: 0 },
    { q: x("Eng qalin qatlam:", "Ғафстарин қабат:"), options: [x("Mantiya", "Мантия"), x("Qobiq", "Пӯст"), x("Ichki yadro", "Ядрои дохилӣ"), x("Tashqi yadro", "Ядрои берунӣ")], answer: 0 },
    { q: x("Ichki yadro nima uchun qattiq?", "Чаро ядрои дохилӣ сахт аст?"), options: [x("Ulkan bosim tufayli", "Аз фишори бузург"), x("Sovuq bo'lgani uchun", "Азбаски хунук аст"), x("Toshdan iborat", "Аз санг иборат аст"), x("Muz bor", "Ях дорад")], answer: 0 },
  ],
  conclusion: x("Yer qatlamli tuzilgan: chuqurlashgan sari harorat va bosim ortadi. Tashqi yadro suyuq, ichki yadro esa yuqori haroratga qaramay ulkan bosim tufayli qattiq.", "Замин сохти қабатӣ дорад: бо чуқур шудан ҳарорат ва фишор меафзояд. Ядрои берунӣ моеъ, ядрои дохилӣ бошад, бо вуҷуди ҳарорати баланд, аз фишори бузург сахт аст."),
};

export const LAB_CONTENT: Record<string, LabContent> = { circuitBuild, ohm, projectile, balance, cell, solids, logic, spring, titration, earth, ...EXTRA_LAB_CONTENT };
