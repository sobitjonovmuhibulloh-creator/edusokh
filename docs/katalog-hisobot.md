# EduSokh: katalog holati bo'yicha hisobot

Sana: 2026-10-29. Tekshiruv loyihaning o'zidagi ma'lumotlar va rasmiy portalga yuborilgan HEAD so'rovlari asosida (fayllar yuklanmagan).
Har bir darslikning holati: [`darsliklar-holati.csv`](darsliklar-holati.csv).

## 1. Hozir saytda nima bor

| Qatlam | Hozirgi holat |
|---|---|
| Darsliklar ro'yxati | 540 ta PDF havola: o'zbek 203, tojik 149, rus 188. Hammasi `old.eduportal.uz` dan ("Amaldagi darsliklar" bo'limi). 1 tasi portalda yo'q (404): `8/algebra_8_afidum_uzb.pdf` |
| Darslik ma'lumotlari | Faqat nom, sinf, fan, til, havola. **Nashr yili, nashriyot, ISBN saqlanmagan** |
| Boblar va mavzular | **Faqat 1 juft darslik**: 8-sinf fizika (o'zbek + tojik), 5 bob, 60 mavzu, PDF'dan qo'lda tekshirib kiritilgan. Qolgan 350 ta o'zbek/tojik darslik — bob/mavzu ma'lumoti yo'q |
| Mavzu materiallari | 8-sinf fizika: nazariya (slaydlar matni), 3 ta test savoli, uyga vazifa, darslik beti — 60 mavzuda. Video — 0 |
| Slaydlar kutubxonasi | 24 ta namuna PDF/PPTX (loyihaning o'z darslaridan yaratilgan), mavzuga ID bilan bog'lanmagan |
| Videolar | 0 (`data/topic-videos.json` bo'sh) |
| 3D laboratoriya katalogi | 72 ta mavzu (15 to'liq, 28 model, 29 rejada). **Bu mavzular darsliklardan olinmagan** — taxminiy ro'yxat, darslik boblariga bog'lanmagan |
| O'quv rejasi (`curriculum.ts`) | Sinf-fan ro'yxati taxminiy va darsliklar bilan mos emas (2-bo'limga qarang) |

## 2. Yetishmayotgan va nomuvofiq joylar

**a) O'quv rejasida bor, lekin o'zbek/tojik darsligi topilmagan (19 juft):**
5, 6-sinf tabiiy fanlar; 6, 9, 10, 11-sinf jismoniy tarbiya; 7–11-sinf rus tili; 8, 9-sinf ingliz tili; 10, 11-sinf algebra va geometriya; 10-sinf iqtisod; 11-sinf geografiya.
Ehtimol, sabablari: 10–11-sinfda "Matematika" bitta darslik (alohida algebra/geometriya emas); 5–6-sinfda tabiiy fanlar o'rniga biologiya/fizika darsliklari; rus tili va jismoniy tarbiya darsliklari portalda boshqa nom bilan. **Tekshirish kerak.**

**b) Darslik bor, lekin `curriculum.ts` dagi sinf ro'yxatida yo'q (44 juft):**
fransuz va nemis tili (1–11), o'zbek tili (tojik maktablari uchun, 2–9), tojik tili (5–11), 5–6-sinf biologiya, 6-sinf fizika, 7-sinf musiqa va tasviriy san'at, 8–9-sinf chizmachilik va iqtisod, 10-sinf tarbiya, 10–11-sinf matematika.
→ Sinf-fan ro'yxati darsliklardan hosil qilinishi kerak, qo'lda yozilgan ro'yxatdan emas.

**c) Faqat bitta tilda darslik:** 38 juft faqat o'zbekcha (asosan xorijiy tillar, ona tili 5–11), 15 juft faqat tojikcha (o'zbek tili tojik maktablari uchun, tojik tili). Bu kutilgan holat — ular alohida fan.

**d) Nashr dolzarbligi — muhim:** portaldagi 351 ta fayl 2016–2020 yillarda yuklangan (2016: 18, 2017: 87, 2018: 99, 2019: 108, 2020: 39). Yangi avlod darsliklari 2022–2024 yillarda bosqichma-bosqich joriy qilingan (3, 6, 7, 10-sinflar — 2022; 4, 5, 8, 9, 11 — 2023–2024). Demak, portal "amaldagi" deb atasa ham, **ko'p darsliklar eski nashr bo'lishi mumkin**. Har bir darslikning nashr yilini PDF'ning titul/imprint betidan o'qib tekshirish kerak.
Yangi nashrlar uchinchi tomon saytlarida (infoedu.uz, oliygoh.uz) uchraydi, lekin ular rasmiy emas va qayta foydalanish shartlari aniq emas — ulardan avtomatik yig'ish tavsiya etilmaydi.

## 3. Darslik tarkibini qanday olish mumkin

* Portal `Accept-Ranges: bytes` ni qo'llaydi → butun kitobni (jami ~6 GB) yuklamasdan, faqat titul va mundarija betlarini (boshidagi va oxiridagi 3–5 bet) olish mumkin.
* Tekshirilgan 7 ta PDF'dan 6 tasi **skanerlangan** (matn qatlami yo'q), 1 tasida (9-sinf geometriya, tojik) matn bor. Shuning uchun mundarijani o'qish uchun rasmni o'qish kerak:
  1. **Claude API orqali** (`scripts/build-lessons.ts --toc-only` tayyor): 351 kitob, taxminan bir kunda; `ANTHROPIC_API_KEY` kerak.
  2. **Qo'lda, shu suhbatlarda**: bet rasmlarini men o'qib yozaman — bepul, lekin bir sessiyada ~15–30 kitob.
* Mualliflik huquqi: portal darsliklarni bepul yuklab olish uchun ochiq qo'ygan, lekin qayta tarqatish shartlari e'lon qilinmagan. Shuning uchun sayt PDF'ni o'zida nusxa qilib tarqatmaydi — rasmiy havola orqali ko'rsatadi (hozirgi `/api/books/file` keshi faqat shu maktab serveri uchun). Bob/mavzu nomlari va bet raqamlarini katalogga yozish — faktlar ro'yxati, matnning o'zini ko'chirish emas.

## 4. Taklif qilinayotgan tuzilma

`Sinf → Fan → Darslik (til, nashr yili, manba, tekshirilgan/yo'q) → Bob → Mavzu → Materiallar`

Har bir mavzuda 9 xil material uchun joy: nazariya, slaydlar, video, misollar, laboratoriya/interaktiv mashq, mustaqil topshiriqlar, test, xulosa, manbalar. Har bir mavzuning holat belgilari: katalogga kiritilgan, manba tekshirilgan, nazariya, slayd, video, laboratoriya, test — har biri "tayyor / yo'q".

## 5. Bosqichlar

1. **Ma'lumotlar tuzilmasi va karkas** — 351 darslikning hammasi katalogga "boblar: ma'lumot kerak" holatida; 8-sinf fizika to'liq ko'chiriladi; mavjud slayd, video, laboratoriyalar mavzu ID'si bilan bog'lanadi (faqat aniq mos kelganlari).
2. **Mundarija yig'ish quroli** — har kitobdan titul va mundarija betlarini qisman yuklab, rasmga aylantiradi; matnli PDF'larda avtomatik o'qiydi.
3. **Mundarijalarni to'ldirish** — API orqali yoki qo'lda, sinflar bo'yicha.
4. **Katalog sahifasi** — sinf → fan → darslik → bob → mavzu → barcha materiallar bir joyda; til, holat va qidiruv filtrlari.
5. **Boshqaruv paneli** — holatlar jadvali va qo'shish formalari (darslik, bob, mavzu, slayd, video, laboratoriya).

## 6. Bajarilganlar

### 2026-10-29 — 1–2-bosqichlar, 7-sinf

* **Tuzilma** (`src/lib/catalog/types.ts`): Sinf → Fan → Darslik → Bob → Mavzu → Materiallar; har bir mavzuda 7 ta holat belgisi.
* **Katalog yig'uvchi** (`npm run catalog:build` → `public/catalog/`): 537 ta darslik (rus tilidagilar ham), shundan **28 tasining mundarijasi tekshirilgan — 1400 ta mavzu**, 508 tasi "ma'lumot kerak", 1 tasi manbada yo'q. Bu jadval (`darsliklar-holati.csv`) har yig'ishda yangilanadi.
* **Bog'langan materiallar:** 8-sinf fizika darslari (nazariya, test) — 120 mavzu; slaydlar — 12; 3D laboratoriyalar — 76 (faqat aniq mos kelganlari, `scripts/toc/lab-links.json`). Videolar — 0.
* **Mundarija vositalari:** `npm run catalog:toc-pages` (betlarni qisman yuklab rasm qiladi), `npm run catalog:toc-parse` (matn qatlamidan qoralama tuzadi, eski o'zbek/tojik shriftlarini o'giradi, PDF bet siljishini o'lchaydi).
* **Muhim topilmalar:**
  * Darsliklarning ko'pchiligida matn qatlami bor (7-sinfda 39 tadan 34 tasida) — rasmdan o'qish faqat qolganlari uchun kerak.
  * Tojik darsliklari kamida 3 xil eski shriftda: harflar moslik jadvali bilan o'giriladi, lekin bitta belgi turli shriftlarda turli harf bo'lishi mumkin — har bir kitob qo'lda tekshiriladi.
  * Ba'zi PDF'larda betlar tushib qolgan (masalan, 7-sinf fizika o'zbekcha: PDF 5-bet = kitobning 12-beti) — bunday kitoblarda bet havolasi "noma'lum" qoldirildi, noto'g'ri betga yuborilmaydi.
  * Titul betlarida "matn va illustratsiyalarni nashriyot hamda muallif roziligisiz ko'chirib bosish taqiqlanadi" deb yozilgan — katalogga faqat bob/mavzu nomlari va bet raqamlari yoziladi.
  * Tekshirilgan 7-sinf darsliklari 2015–2019 yil nashrlari.

### Navbatdagi: 7-sinfda qo'lda o'qiladiganlar (13 ta)

| Kitob | Sabab |
|---|---|
| geometriya_7_uzb | mundarija matni buzilgan ("To4g4ri", bet raqamlari dars raqamiga yopishgan) |
| zoologiya_7_tojik, informatika_7_tojik | aralash eski shrift — rasm bilan solishtirish kerak |
| adabiyot_7_tojik, ingliz_tili_7_uzb | mundarija tekshirilgan betlarda topilmadi |
| texnologiya_7_uzb | mundarijada nuqtali chiziq yo'q (soatlar bilan jadval) |
| fransuz_tili_7_uzb, ingliz_tili_metodika_7_uzb | qisman ajraldi, qo'lda tozalash kerak |
| musiqa_7_uzb, nemis_tili_7_uzb, nemis_tili_metodika_7_uzb, tasviriy_sanat_7_uzb, algebra_afidum_7_uzb | skanerlangan, matn qatlami yo'q — rasmdan o'qiladi |

### 2026-10-29 — realistik 3D laboratoriyalar (1-namuna bosqichi)

* `src/components/Labs/pro/engine.tsx` — umumiy muhit: oq-ko'k laboratoriya xonasi, stol, soyalar (telefonda o'chiriladi), tanlash, stol ustida sudrash, Boshlash/To'xtatish/Qayta boshlash/Natija, bosqichlar yon paneli; WebGL bo'lmasa hisob-kitob va natijalar ishlayveradi.
* `src/components/Labs/pro/labs.ts` — 5 ta laboratoriya: prujina (Guk qonuni, tebranish), titrlash (pH, indikator, harorat), hujayra (kesim, "toping"), Yer qatlamlari (kesim, zond), 3D geometriya.
* Darslik mavzulariga bog'landi: fizika 7 (uz §24, tg §24) → prujina; kimyo 7 (uz/tg §40, §44) → titrlash.
* Brauzer sinovi: 15/15 (yukni sichqoncha bilan osish, x = mg/k, T = 2π√(m/k), pH > 7 ekvivalentdan keyin, qatlam aniqlash, hajm hisobi).
* Qolgan: menyuni qayta tuzish (Bosh sahifa, Darsliklar, Slaydlar, Videodarslar, 3D laboratoriya, Testlar, O'qituvchi paneli); optika, issiqlik, astronomiya (Oy fazalari), informatika (algoritmlar, tarmoqlar) uchun pro laboratoriyalar; laboratoriya tanlovini darslik → bob → mavzu orqali qilish.

### 2026-10-29 — EduSokh Games, mavzu sahifasi, tashqi manbalar

* **O'yinlar** (`src/components/Games/`, menyuda «O'yinlar»): Arqon tortish, Baraban (savol yoki o'quvchi), Juftini top, Guruhlash, Jeopardy, To'g'ri/Noto'g'ri, Biletlar, Xotira, PIN viktorina (`/api/games/live`, server xotirasida — qayta ishga tushsa o'chadi). Savollar mavzuning haqiqiy materiallaridan: dars testi, laboratoriya testi, EduSokh to'plami (`src/lib/games/sets.ts`), o'qituvchi to'plami (`/api/games/sets`, `data/game-sets.json`).
* **Mavzu sahifasi** (Katalog): «Dars rejimi» (mavzu → nazariya → video/slayd → laboratoriya → o'yin → test), video qo'shish (`/api/lessons/video`, `topicId`), laboratoriya bo'lmasa — o'rniga o'yin / video / slayd taklifi, tayyor deb ko'rsatilmaydi.
* **Tashqi manbalar:** arxiv.uz robots.txt'da ClaudeBot taqiqlangan va `use=reference` — shuning uchun sayt arxiv.uz'dan hech narsa yig'maydi: o'qituvchi uchun qidiruv sahifasi ochiladi, topilgan material faqat havola sifatida biriktiriladi (`/api/materials/links`, `data/material-links.json`, faqat https).
* **To'liq namuna mavzu:** 8-sinf fizika §17 «Zanjirning bir qismi uchun Om qonuni» (uz va tg). Brauzer sinovi: 33/33.
* **Qilinmagan:** DarslikPro, EduBaza, EduGames saytlari tahlil qilinmadi; mavzu sahifasidagi «Misollar» va «Xulosa» bo'limlari faqat to'liq laboratoriyali mavzularda (laboratoriya ichida) bor; PIN viktorina hozircha bitta server xotirasida.
