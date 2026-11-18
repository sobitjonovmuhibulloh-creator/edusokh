/** components/Labs/pro/labs-extra.ts dagi laboratoriyalar mazmuni */
import type { LabContent, Tx } from "./types";

const x = (uz: string, tg: string, ru?: string): Tx => ({ uz, tg, ...(ru ? { ru } : {}) });

const electromagnet: LabContent = {
  goal: x("Magnit maydon tok kuchi, o'ramlar soni va o'zakka qanday bog'liqligini aniqlash.", "Муайян кардани вобастагии майдони магнитӣ аз қувваи ҷараён, шумораи печҳо ва мағзӣ."),
  equipment: [x("G'altak (50, 100, 200 o'ram)", "Ғалтак (50, 100, 200 печ)"), x("Temir o'zak", "Мағзии оҳанӣ"), x("Tok manbai", "Манбаи ҷараён"), x("Kompas va skrepkalar", "Қутбнамо ва скрепкаҳо")],
  theory: [x("Tok o'tayotgan g'altak magnit maydon hosil qiladi. Uning yo'nalishi tok yo'nalishiga bog'liq.", "Ғалтаки ҷараёндор майдони магнитӣ ҳосил мекунад. Самти он ба самти ҷараён вобаста аст."), x("Temir o'zak maydonni ko'p marta kuchaytiradi, ammo ma'lum qiymatda to'yinadi. Modelda soddalashtirilgan: effektiv μ ≈ 100, to'yinish 1,5 T.", "Мағзии оҳанӣ майдонро чандин маротиба пурзӯр мекунад, вале дар қимати муайян сер мешавад. Дар модел содда карда шудааст: μ-и эффективӣ ≈ 100, сершавӣ 1,5 Т.")],
  formulas: ["B₀ = μ₀ · (N / L) · I", "B ≈ μ · B₀"],
  steps: [x("O'zakli holatda tokni 0 dan 5 A gacha oshiring.", "Дар ҳолати мағзидор ҷараёнро аз 0 то 5 А зиёд кунед."), x("O'ramlar sonini o'zgartiring va skrepkalar sonini yozing.", "Шумораи печҳоро иваз карда, шумораи скрепкаҳоро нависед."), x("O'zakni olib tashlang va maydonni solishtiring.", "Мағзиро бардоред ва майдонро муқоиса кунед."), x("Tok yo'nalishini o'zgartirib, kompasni kuzating.", "Самти ҷараёнро иваз карда, қутбнаморо мушоҳида кунед.")],
  tasks: [{ text: x("N = 100, L = 0,1 m, I = 2 A bo'lsa, o'zaksiz maydon necha mT? (μ₀ = 4π·10⁻⁷)", "Агар N = 100, L = 0,1 м, I = 2 А бошад, майдон бе мағзӣ чанд мТ аст? (μ₀ = 4π·10⁻⁷)"), answer: 2.51, tol: 0.05, unit: "mT" }],
  examples: [],
  columns: [{ key: "I", label: "I", unit: "A" }, { key: "N", label: "N" }, { key: "B", label: "B", unit: "mT" }, { key: "clips", label: "n" }],
  graph: { x: "I", y: "B" },
  quiz: [
    { q: x("Tok yo'nalishi o'zgarsa nima bo'ladi?", "Агар самти ҷараён иваз шавад, чӣ мешавад?"), options: [x("Qutblar almashadi", "Қутбҳо иваз мешаванд"), x("Maydon yo'qoladi", "Майдон нест мешавад"), x("Hech narsa o'zgarmaydi", "Ҳеҷ чиз тағйир намеёбад")], answer: 0 },
    { q: x("Elektromagnitni qanday kuchaytirish mumkin?", "Электромагнитро чӣ тавр пурзӯр кардан мумкин аст?"), options: [x("Tokni kamaytirib", "Ҷараёнро кам карда"), x("O'ramlar sonini oshirib", "Шумораи печҳоро зиёд карда"), x("O'zakni olib tashlab", "Мағзиро бардошта")], answer: 1 },
  ],
  conclusion: x("Maydon tok va o'ramlar soniga to'g'ri proporsional, temir o'zak uni keskin kuchaytiradi, tok yo'nalishi esa qutblarni belgilaydi.", "Майдон ба ҷараён ва шумораи печҳо мутаносиби мустақим аст, мағзии оҳанӣ онро сахт пурзӯр мекунад, самти ҷараён бошад, қутбҳоро муайян менамояд."),
};

const refraction: LabContent = {
  goal: x("Snell qonunini tekshirish va to'la ichki qaytishni kuzatish.", "Санҷидани қонуни Снеллиус ва мушоҳидаи инъикоси пурраи дохилӣ."),
  equipment: [x("Lazer", "Лазер"), x("Yarim silindrli blok", "Блоки нимсилиндрӣ"), x("Burchak o'lchagich disk", "Диски кунҷсанҷ")],
  theory: [x("Yorug'lik bir muhitdan ikkinchisiga o'tganda yo'nalishini o'zgartiradi. Burchaklar chegaraga o'tkazilgan normaldan o'lchanadi.", "Рӯшноӣ ҳангоми гузаштан аз як муҳит ба дигар самташро иваз мекунад. Кунҷҳо аз нормали сарҳад чен карда мешаванд."), x("Zichroq muhitdan chiqayotganda burchak chegaraviy qiymatdan oshsa, nur to'liq qaytadi.", "Ҳангоми баромадан аз муҳити зичтар, агар кунҷ аз қимати ҳудудӣ гузарад, нур пурра бармегардад.")],
  formulas: ["n₁ · sin α = n₂ · sin β", "sin α₀ = n₂ / n₁"],
  steps: [x("Havodan moddaga rejimida burchakni 10° dan 80° gacha o'zgartiring.", "Дар реҷаи аз ҳаво ба модда кунҷро аз 10° то 80° иваз кунед."), x("Har bir burchakda β ni yozing va n ni hisoblang.", "Барои ҳар кунҷ β-ро нависед ва n-ро ҳисоб кунед."), x("Moddadan havoga rejimiga o'ting va to'la qaytish boshlanadigan burchakni toping.", "Ба реҷаи аз модда ба ҳаво гузаред ва кунҷи оғози инъикоси пурраро ёбед.")],
  tasks: [{ text: x("Shisha (n = 1,5) uchun chegaraviy burchak necha gradus?", "Барои шиша (n = 1,5) кунҷи ҳудудӣ чанд дараҷа аст?"), answer: 41.8, tol: 0.3, unit: "°" }],
  examples: [],
  columns: [{ key: "a", label: "α", unit: "°" }, { key: "b", label: "β", unit: "°" }, { key: "n", label: "n" }, { key: "R", label: "R", unit: "%" }],
  graph: { x: "a", y: "b" },
  quiz: [
    { q: x("Nur havodan shishaga o'tganda qayerga buriladi?", "Нур ҳангоми гузаштан аз ҳаво ба шиша ба куҷо хам мешавад?"), options: [x("Normalga yaqinlashadi", "Ба нормал наздик мешавад"), x("Normaldan uzoqlashadi", "Аз нормал дур мешавад"), x("Burilmaydi", "Хам намешавад")], answer: 0 },
    { q: x("To'la ichki qaytish qachon yuz beradi?", "Инъикоси пурраи дохилӣ кай рух медиҳад?"), options: [x("Havodan suvga o'tganda", "Ҳангоми гузаштан аз ҳаво ба об"), x("Zich muhitdan chiqishda, katta burchakda", "Ҳангоми баромадан аз муҳити зич, дар кунҷи калон")], answer: 1 },
  ],
  conclusion: x("Sinish burchagi Snell qonuniga bo'ysunadi; zichroq muhitdan chiqishda chegaraviy burchakdan keyin nur to'liq qaytadi.", "Кунҷи шикаст ба қонуни Снеллиус итоат мекунад; ҳангоми баромадан аз муҳити зичтар пас аз кунҷи ҳудудӣ нур пурра бармегардад."),
};

const incline: LabContent = {
  goal: x("Qiya tekislikdagi jismga ta'sir etuvchi kuchlarni tahlil qilish.", "Таҳлили қувваҳои ба ҷисми болои ҳамвории моил таъсиркунанда."),
  equipment: [x("Burchagi o'zgaradigan taxta", "Тахтаи кунҷаш тағйирёбанда"), x("Jism", "Ҷисм")],
  theory: [x("Og'irlik kuchi tekislik bo'ylab mg·sinα va unga tik mg·cosα tashkil etuvchilarga ajraladi.", "Қувваи вазнинӣ ба ташкилкунандаҳои mg·sinα дар тӯли ҳамворӣ ва mg·cosα ба он амудӣ ҷудо мешавад."), x("Jism tg α > μ bo'lganda sirpana boshlaydi.", "Ҷисм ҳангоми tg α > μ ба лағжидан сар мекунад.")],
  formulas: ["N = m·g·cos α", "F = μ·N", "a = g·(sin α − μ·cos α)"],
  steps: [x("Burchak va μ ni tanlang.", "Кунҷ ва μ-ро интихоб кунед."), x("«Boshlash» ni bosib, harakatni kuzating.", "«Оғоз»-ро пахш карда, ҳаракатро мушоҳида кунед."), x("Massani o'zgartiring va tezlanish o'zgarmasligiga ishonch hosil qiling.", "Массаро иваз карда, бовар ҳосил кунед, ки шитоб тағйир намеёбад.")],
  tasks: [{ text: x("α = 30°, μ = 0,3 bo'lsa, tezlanish necha m/s²? (g = 9,81)", "Агар α = 30°, μ = 0,3 бошад, шитоб чанд м/с² аст? (g = 9,81)"), answer: 2.36, tol: 0.05, unit: "m/s²" }],
  examples: [],
  columns: [{ key: "angle", label: "α", unit: "°" }, { key: "m", label: "m", unit: "kg" }, { key: "mu", label: "μ" }, { key: "a", label: "a", unit: "m/s²" }, { key: "F", label: "F", unit: "N" }],
  graph: { x: "angle", y: "a" },
  quiz: [{ q: x("Tezlanish massaga bog'liqmi?", "Оё шитоб ба масса вобаста аст?"), options: [x("Yo'q", "Не"), x("Ha, to'g'ri proporsional", "Ҳа, мутаносиби мустақим")], answer: 0 }],
  conclusion: x("Tezlanish massaga bog'liq emas, u faqat burchak va ishqalanish koeffitsiyenti bilan aniqlanadi.", "Шитоб ба масса вобаста нест, он танҳо бо кунҷ ва зариби соиш муайян мешавад."),
};

const glassware: LabContent = {
  goal: x("Laboratoriya jihozlari vazifasini o'rganish va suvni xavfsiz qizdirishni kuzatish.", "Омӯзиши вазифаи асбобҳои лаборатория ва мушоҳидаи гарм кардани бехатари об."),
  equipment: [x("Kimyoviy stakan, kolbalar, probirkalar", "Стакани кимиёвӣ, колбаҳо, пробиркаҳо"), x("Spirt lampasi, tagkursi, to'r", "Чароғи спиртӣ, сепоя, тӯр"), x("Termometr", "Ҳароратсанҷ")],
  theory: [x("Har bir idishning o'z vazifasi bor: aniq o'lchov uchun o'lchov silindri, qizdirish uchun stakan yoki kolba ishlatiladi.", "Ҳар зарф вазифаи худро дорад: барои ченкунии дақиқ силиндри ченкунӣ, барои гарм кардан стакан ё колба истифода мешавад."), x("Issiqlik miqdori massa va harorat o'zgarishiga bog'liq. Simulyatsiyada vaqt 30 marta tezlashtirilgan.", "Миқдори гармӣ ба масса ва тағйири ҳарорат вобаста аст. Дар симулятсия вақт 30 маротиба тезонида шудааст.")],
  formulas: ["Q = c · m · ΔT", "c(suv) = 4180 J/(kg·°C)"],
  steps: [x("Har bir jihozni bosib, vazifasini o'qing.", "Ҳар асбобро пахш карда, вазифаашро хонед."), x("Suv hajmini tanlang va «Boshlash» ni bosing.", "Ҳаҷми обро интихоб карда, «Оғоз»-ро пахш кунед."), x("Harorat o'zgarishini kuzating, hajmni o'zgartirib taqqoslang.", "Тағйири ҳароратро мушоҳида кунед, ҳаҷмро иваз карда муқоиса намоед.")],
  tasks: [{ text: x("100 ml suvni 20 °C dan 100 °C gacha isitish uchun necha kJ kerak?", "Барои гарм кардани 100 мл об аз 20 °C то 100 °C чанд кҶ лозим аст?"), answer: 33.4, tol: 0.5, unit: "kJ" }],
  examples: [],
  columns: [{ key: "t", label: "t", unit: "s" }, { key: "T", label: "T", unit: "°C" }, { key: "ml", label: "V", unit: "ml" }, { key: "Q", label: "Q", unit: "kJ" }],
  graph: { x: "t", y: "T" },
  quiz: [
    { q: x("Spirt lampasi qanday o'chiriladi?", "Чароғи спиртӣ чӣ тавр хомӯш карда мешавад?"), options: [x("Puflab", "Бо пуф"), x("Qopqoq yopib", "Бо сарпӯш")], answer: 1 },
    { q: x("Aniq hajm o'lchash uchun qaysi idish mos?", "Барои ченкунии дақиқи ҳаҷм кадом зарф мувофиқ аст?"), options: [x("Kimyoviy stakan", "Стакани кимиёвӣ"), x("O'lchov silindri", "Силиндри ченкунӣ")], answer: 1 },
  ],
  conclusion: x("To'g'ri tanlangan jihoz va xavfsizlik qoidalari tajribani aniq va bexatar qiladi; ko'p suvni isitish uchun ko'proq issiqlik va vaqt kerak.", "Асбоби дуруст интихобшуда ва қоидаҳои бехатарӣ таҷрибаро дақиқ ва бехатар мекунанд; барои гарм кардани оби бисёр гармӣ ва вақти бештар лозим аст."),
};

const vsepr: LabContent = {
  goal: x("Molekula shakli elektron juftlarining joylashuviga bog'liqligini tushunish.", "Фаҳмидани вобастагии шакли молекула аз ҷойгиршавии ҷуфтҳои электронӣ."),
  equipment: [x("3D molekula modellari", "Моделҳои 3D-и молекулаҳо")],
  theory: [x("Markaziy atom atrofidagi elektron juftlari o'zaro itarilib, bir-biridan iloji boricha uzoq joylashadi.", "Ҷуфтҳои электронии атрофи атоми марказӣ якдигарро тела дода, то ҳадди имкон дур ҷойгир мешаванд."), x("Erkin juftlar bog'lovchi juftlardan ko'proq joy egallaydi, shuning uchun NH₃ va H₂O da burchak 109,5° dan kichik.", "Ҷуфтҳои озод нисбат ба ҷуфтҳои бандсоз ҷойи бештар мегиранд, бинобар ин дар NH₃ ва H₂O кунҷ аз 109,5° хурдтар аст.")],
  formulas: ["CH₄ 109,5°", "NH₃ 107°", "H₂O 104,5°"],
  steps: [x("Molekulani tanlang va sichqoncha bilan aylantiring.", "Молекуларо интихоб карда, бо муш гардонед."), x("Bog' burchagi va erkin juftlar sonini yozing.", "Кунҷи банд ва шумораи ҷуфтҳои озодро нависед."), x("CH₄, NH₃ va H₂O ni solishtiring.", "CH₄, NH₃ ва H₂O-ро муқоиса кунед.")],
  tasks: [],
  examples: [],
  quiz: [
    { q: x("CH₄ molekulasining shakli qanday?", "Шакли молекулаи CH₄ чӣ гуна аст?"), options: [x("Tetraedr", "Тетраэдр"), x("Yassi kvadrat", "Квадрати ҳамвор"), x("Chiziqli", "Хаттӣ")], answer: 0 },
    { q: x("H₂O da burchak nega 109,5° dan kichik?", "Чаро дар H₂O кунҷ аз 109,5° хурдтар аст?"), options: [x("Ikkita erkin juft itaradi", "Ду ҷуфти озод тела медиҳанд"), x("Vodorod og'ir", "Ҳидроген вазнин аст")], answer: 0 },
  ],
  conclusion: x("Molekula shakli bog'lovchi va erkin elektron juftlari soni bilan aniqlanadi.", "Шакли молекула бо шумораи ҷуфтҳои электронии бандсоз ва озод муайян мешавад."),
};

const organs: LabContent = {
  goal: x("Inson a'zolarining joylashuvi va tizimlarini o'rganish.", "Омӯзиши ҷойгиршавии узвҳои инсон ва низомҳои онҳо."),
  equipment: [x("3D anatomik model", "Модели анатомии 3D")],
  theory: [x("A'zolar birgalikda ishlaydigan tizimlarni tashkil qiladi: nafas olish, qon aylanish, hazm qilish, ayirish va nerv tizimi.", "Узвҳо низомҳои якҷоя коркунанда месозанд: нафаскашӣ, гардиши хун, ҳозима, ихроҷ ва асаб."), x("Ko'rsatkichlar kattalar uchun o'rtacha: bir urishda taxminan 70 ml qon, bir nafasda taxminan 500 ml havo.", "Нишондиҳандаҳо барои калонсолон миёна мебошанд: дар як зарба тақрибан 70 мл хун, дар як нафас тақрибан 500 мл ҳаво.")],
  formulas: ["Q = puls × 70 ml", "VE = nafas soni × 500 ml"],
  steps: [x("Tana shaffofligini o'zgartiring va a'zolarni bosib o'rganing.", "Шаффофии баданро иваз карда, узвҳоро пахш карда омӯзед."), x("Har bir tizimni alohida ko'ring.", "Ҳар низомро алоҳида бинед."), x("Puls va nafas sonini oshirib, ko'rsatkichlarni yozing.", "Набз ва шумораи нафасро зиёд карда, нишондиҳандаҳоро нависед.")],
  tasks: [{ text: x("Puls 80 bo'lsa, yurak bir minutda necha litr qon haydaydi (70 ml)?", "Агар набз 80 бошад, дил дар як дақиқа чанд литр хун меронад (70 мл)?"), answer: 5.6, tol: 0.05, unit: "l" }],
  examples: [],
  columns: [{ key: "bpm", label: "Puls", unit: "/min" }, { key: "Q", label: "Q", unit: "l/min" }, { key: "br", label: "f", unit: "/min" }, { key: "VE", label: "VE", unit: "l/min" }],
  graph: { x: "bpm", y: "Q" },
  quiz: [
    { q: x("Gaz almashinuvi qayerda bo'ladi?", "Табодули газ дар куҷо мешавад?"), options: [x("Alveolalarda", "Дар алвеолаҳо"), x("Oshqozonda", "Дар меъда"), x("Buyrakda", "Дар гурда")], answer: 0 },
    { q: x("Qonni filtrlaydigan a'zo qaysi?", "Кадом узв хунро полоиш мекунад?"), options: [x("O'pka", "Шуш"), x("Buyrak", "Гурда")], answer: 1 },
  ],
  conclusion: x("Tana a'zolari tizimlar sifatida birgalikda ishlaydi, jismoniy zo'riqishda yurak va nafas ko'rsatkichlari ortadi.", "Узвҳои бадан ҳамчун низомҳо якҷоя кор мекунанд, ҳангоми сарбории ҷисмонӣ нишондиҳандаҳои дил ва нафас меафзоянд."),
};

export const EXTRA_LAB_CONTENT: Record<string, LabContent> = { electromagnet, refraction, incline, glassware, vsepr, organs };
