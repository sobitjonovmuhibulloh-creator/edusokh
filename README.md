# EduSokh

So'x tumani va Farg'ona viloyati maktablari uchun uch tilli (o'zbek / tojik / rus) ta'lim platformasi.
Next.js 14 (App Router), Tailwind CSS, Three.js, Prisma (PostgreSQL / Supabase), Framer Motion, Claude API.

## Ishga tushirish

```bash
npm install
cp .env.example .env        # DATABASE_URL va (ixtiyoriy) ANTHROPIC_API_KEY ni to'ldiring
npm run dev                 # http://localhost:3000 → /simulator
```

Simulyator (`/simulator`) ma'lumotlar bazasisiz ishlaydi. To'liq server rejimi uchun:

```bash
npm run db:push             # jadvallarni yaratish
npm run db:seed             # 1–11-sinflar, fanlar, laboratoriyalar, namunaviy darslar, demo 9-B sinfi
```

Namuna slaydlar (24 ta PDF/PPTX, o'zbek va tojik) — `npm run slides:demo`, keyin `/simulator?tab=decks`.

Darsliklar katalogi (sinf → fan → darslik → bob → mavzu): `npm run catalog:build`. Mundarija qo'shish tartibi va holati — `docs/katalog-hisobot.md`:

```bash
npm run catalog:toc-pages -- kimyo_7_uzb            # boshi/oxiri betlari varag'i: .cache/toc/<id>/sheet.jpg
npm run catalog:toc-parse -- kimyo_7_uzb            # matn qatlamidan qoralama: scripts/toc/<id>.draft.json
# qoralamani tekshirib, scripts/toc/<id>.json ga o'zgartiring, keyin:
npm run catalog:build
```

## Tuzilma

| Fayl | Vazifasi |
|---|---|
| `prisma/schema.prisma` | User, Grade, Classroom, Subject, Lesson, SlideDeck, LabModel, Textbook, TestBank, ExamSession, ExamResult |
| `src/lib/i18n.ts` | UZ / TG / RU lug'ati va ko'p tilli maydonlar uchun yordamchilar |
| `src/lib/curriculum.ts` | 1–11-sinf fanlari, 10–11-sinf yo'nalishlari, namunaviy darslar, zaxira savollar banki |
| `src/lib/lesson-template.ts` | 45 daqiqalik reja (5+12+13+10+5), metodlar, slayd generatori |
| `src/lib/anti-cheat.ts` | Urug'li Fisher–Yates: har o'quvchiga noyob savol va variant tartibi, baholash, PIN |
| `src/lib/ai-test-generator.ts` | Claude (`claude-opus-5-5`) orqali BSB/CHSB savollari, bo'lmasa savollar banki |
| `src/lib/book-scraper.ts` | Darslik PDF'larini yig'ish (robots.txt, pauza, takrorsiz), `npm run books:sync` |
| `src/app/api/bsb-generator` | Test yaratish API |
| `src/app/api/distribute-test` | POST — sinfga tarqatish va PIN; GET — o'quvchi varianti (javobsiz) |
| `src/app/api/exam/submit` | Javoblarni serverda baholash |
| `src/components/3D/LabsCanvas.tsx` | 18 ta 3D laboratoriya (fizika, kimyo, biologiya, geometriya, astronomiya, boshqalar) |
| `src/components/Slides/SlidePlayer.tsx` | Slayd pleyer: klaviatura, swipe, to'liq ekran, video va 3D slaydlar |
| `src/components/Labs/LabCenter.tsx` | "3D laboratoriya": sinf → fan → mavzu → laboratoriya → "Laboratoriyani boshlash", qidiruv, holat filtri, qamrov, admin formasi, `?topic=<id>` havolasi |
| `src/components/Labs/LabRunner.tsx` | Laboratoriya shabloni (13 bo'lim): maqsad, jihozlar, nazariya, yo'riqnoma, tajriba, topshiriqlar, interaktiv misollar, o'lchovlar va grafik, test, hisobot; to'liq ekran, proyektor rejimi, topshiriq berish |
| `src/components/Labs/CircuitBuilder.tsx` | Sudrab yig'iladigan elektr zanjiri: 3D (Three.js) va 2D sxema, kalit, ampermetr, voltmetr, qisqa tutashuv |
| `src/components/Labs/Widgets.tsx` | Kimyoviy tenglamani tenglashtirish, mantiqiy elementlar |
| `src/lib/labs/` | `catalog.ts` (mavzular va holatlar), `content.ts` (to'liq laboratoriyalar mazmuni), `circuit-solver.ts` (tugun potensiallari usuli), `types.ts`, `ui-text.ts` |
| `src/app/api/labs/catalog` | Administrator qo'shgan mavzular (`data/lab-catalog.json`) |
| `src/components/Slides/SlideLibrary.tsx` | "Slaydlar va taqdimotlar": sinf/fan/til/qidiruv filtrlari, PDF ko'rish, PPTX matnini ko'rish, yuklab olish, yuklash formasi |
| `src/lib/slide-library.ts`, `src/lib/slide-store.ts` | Slayd turlari va matnlar; fayllarni `data/slides/` ga saqlash, PDF/PPTX ichki tekshiruvi |
| `src/app/api/slides` | GET ro'yxat, POST yuklash (PDF/PPTX, 50 MB), DELETE; `/api/slides/<id>` — fayl, `?download=1`, `?preview=1` |
| `src/app/api/lessons/video` | O'qituvchi mavzuga qo'shgan YouTube videolari (`data/topic-videos.json`) |
| `src/app/simulator/page.tsx` | Jonli simulyator: o'qituvchi → PIN → o'quvchi imtihoni → natijalar |

## Production'dan oldin qilinishi SHART

1. **Avtorizatsiya.** `src/lib/auth.ts` hozircha faqat `DEMO_AUTH=true` da `x-demo-user` sarlavhasiga ishonadi — bu xavfsiz emas. Supabase Auth yoki NextAuth ulang va production'da `DEMO_AUTH=false` qiling.
2. **Darslik manbalari.** `book-scraper.ts` dagi `SOURCES` namuna. Rasmiy portal manzilini va ommaviy yuklab olishga ruxsatni tekshirib, keyin yoqing.
3. **Fanlar ro'yxati.** `curriculum.ts` dagi taqsimot taxminiy — vazirlikning amaldagi o'quv rejasi bilan solishtiring.
4. **Tarjimalar.** Tojikcha va ruscha matnlarni ona tilida so'zlashuvchi o'qituvchi tekshirsin.
5. **AI savollari.** Claude yaratgan savollar o'qituvchi tasdiqlagandan keyingina ishlatilishi kerak. `/api/bsb-generator` da so'rovlar soniga cheklov (rate limit) yo'q — ommaga ochishdan oldin qo'shing.
6. **Kitob o'quvchi.** Simulyator PDF'ni brauzerning o'z ko'ruvchisida ochadi; Supabase Storage'ga o'tkazilsa, `storageUrl` imzolangan havola bo'lishi kerak.
7. **Laboratoriya katalogi.** `src/lib/labs/catalog.ts` dagi mavzular sinf/fan bo'yicha taxminiy — amaldagi darsliklar bilan solishtirib, kerak bo'lsa ko'chiring. `/api/labs/catalog` ga yozish ham faqat `DEMO_AUTH=true`/dev rejimida ochiq.
8. **Slayd yuklash.** `/api/slides` va `/api/lessons/video` ga yozish hozircha faqat `DEMO_AUTH=true` yoki dev rejimida ochiq; avtorizatsiya ulanganda `requireRole(req, ["TEACHER", "ADMIN"])` qo'ying. Fayllar `data/slides/` da — bulutga joylashda Supabase Storage'ga o'tkazing (`slide-store.ts`). Production'da yuklangan fayllarni antivirus bilan ham tekshiring.
