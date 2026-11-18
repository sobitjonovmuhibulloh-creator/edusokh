/**
 * `npm run db:seed` — sinflar, fanlar, laboratoriyalar, namunaviy darslar va demo sinf.
 * Qayta ishga tushirsa ham takroriy yozuv yaratmaydi (upsert).
 */
import { PrismaClient, type LabCategory, type Prisma } from "@prisma/client";
import { DEMO_LESSONS, GRADES, SUBJECTS } from "../src/lib/curriculum";
import { buildLessonPlan, buildSlides } from "../src/lib/lesson-template";

const prisma = new PrismaClient();

const LAB_MODELS: { key: string; category: LabCategory; uz: string; tg: string; ru: string }[] = [
  { key: "induction", category: "PHYSICS", uz: "Elektromagnit induksiya", tg: "Индуксияи электромагнитӣ", ru: "Электромагнитная индукция" },
  { key: "circuit", category: "PHYSICS", uz: "Elektr zanjiri", tg: "Занҷири барқӣ", ru: "Электрическая цепь" },
  { key: "lens", category: "PHYSICS", uz: "Linza", tg: "Линза", ru: "Линза" },
  { key: "projectile", category: "PHYSICS", uz: "Otilgan jism", tg: "Ҷисми партофташуда", ru: "Брошенное тело" },
  { key: "atom", category: "CHEMISTRY", uz: "Atom", tg: "Атом", ru: "Атом" },
  { key: "molecule", category: "CHEMISTRY", uz: "Molekulalar", tg: "Молекулаҳо", ru: "Молекулы" },
  { key: "reaction", category: "CHEMISTRY", uz: "Kimyoviy reaksiya", tg: "Реаксияи кимиёвӣ", ru: "Химическая реакция" },
  { key: "cell", category: "BIOLOGY", uz: "Hujayra", tg: "Ҳуҷайра", ru: "Клетка" },
  { key: "skeleton", category: "BIOLOGY", uz: "Skelet", tg: "Скелет", ru: "Скелет" },
  { key: "heart", category: "BIOLOGY", uz: "Yurak", tg: "Дил", ru: "Сердце" },
  { key: "solids", category: "GEOMETRY", uz: "Fazoviy jismlar", tg: "Ҷисмҳои фазоӣ", ru: "Пространственные тела" },
  { key: "section", category: "GEOMETRY", uz: "Kub kesimi", tg: "Буриши куб", ru: "Сечение куба" },
  { key: "solar", category: "ASTRONOMY", uz: "Quyosh tizimi", tg: "Системаи офтобӣ", ru: "Солнечная система" },
  { key: "seasons", category: "ASTRONOMY", uz: "Yil fasllari", tg: "Фаслҳои сол", ru: "Времена года" },
  { key: "earth-layers", category: "GEOGRAPHY", uz: "Yer qatlamlari", tg: "Қабатҳои Замин", ru: "Слои Земли" },
  { key: "robot", category: "OTHER", uz: "Robot qo'li", tg: "Дасти робот", ru: "Робот-манипулятор" },
  { key: "monument", category: "OTHER", uz: "Minora", tg: "Манора", ru: "Минарет" },
  { key: "vocab", category: "OTHER", uz: "3D lug'at", tg: "Луғати 3D", ru: "3D-словарь" },
];

const json = (v: unknown) => v as Prisma.InputJsonValue;

async function main() {
  for (const g of GRADES) {
    const grade = await prisma.grade.upsert({ where: { number: g.number }, update: { stage: g.stage }, create: { number: g.number, stage: g.stage } });
    for (const code of g.subjects) {
      await prisma.subject.upsert({
        where: { code_gradeId: { code, gradeId: grade.id } },
        update: { name: json(SUBJECTS[code]) },
        create: { code, gradeId: grade.id, name: json(SUBJECTS[code]) },
      });
    }
  }

  for (const lab of LAB_MODELS) {
    const title = json({ uz: lab.uz, tg: lab.tg, ru: lab.ru });
    await prisma.labModel.upsert({ where: { key: lab.key }, update: { title, category: lab.category }, create: { key: lab.key, category: lab.category, title } });
  }

  for (const l of DEMO_LESSONS) {
    const subject = await prisma.subject.findFirst({ where: { code: l.subject, grade: { number: l.grade } } });
    if (!subject) continue;
    const exists = await prisma.lesson.findFirst({ where: { subjectId: subject.id, title: { equals: json(l.title) } } });
    if (exists) continue;
    await prisma.lesson.create({
      data: {
        subjectId: subject.id,
        title: json(l.title),
        objectives: json(l.goal),
        stages: json(buildLessonPlan(l)),
        official: true,
        needsReview: true,
        labs: l.labKey ? { connect: { key: l.labKey } } : undefined,
        slideDeck: { create: { slides: json(buildSlides(l)) } },
      },
    });
  }

  // Demo sinf: o'qituvchi va 6 o'quvchi (DEMO_AUTH=true bo'lganda "x-demo-user: teacher-demo")
  const grade9 = await prisma.grade.findUniqueOrThrow({ where: { number: 9 } });
  const teacher = await prisma.user.upsert({ where: { login: "teacher-demo" }, update: {}, create: { login: "teacher-demo", fullName: "Demo O'qituvchi", role: "TEACHER" } });
  const classroom =
    (await prisma.classroom.findFirst({ where: { name: "9-B", gradeId: grade9.id } })) ??
    (await prisma.classroom.create({ data: { name: "9-B", gradeId: grade9.id, teacherId: teacher.id } }));
  const names = ["Aliyev Vali", "Karimova Dilnoza", "Rahimov Jasur", "Sodiqova Madina", "Nazarov Bobur", "Ergasheva Zarina"];
  for (const [i, fullName] of names.entries()) {
    const login = `SX-9B-${String(i + 1).padStart(3, "0")}`;
    await prisma.user.upsert({ where: { login }, update: { classroomId: classroom.id }, create: { login, fullName, role: "STUDENT", classroomId: classroom.id } });
  }
  console.log("Seed tayyor: 11 sinf, fanlar, laboratoriyalar, namunaviy darslar, demo 9-B sinfi.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
