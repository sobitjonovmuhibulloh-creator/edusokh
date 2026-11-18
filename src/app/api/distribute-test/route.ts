/**
 * POST /api/distribute-test  (o'qituvchi)
 *   Body: { classroomId, testBankId } yoki { classroomId, title, type, lang, questions }
 *         + ixtiyoriy { durationMin, shuffleQuestions, shuffleOptions }
 *   Har bir o'quvchiga noyob aralashtirilgan variant yaratadi va sinf PIN-kodini qaytaradi.
 *
 * GET /api/distribute-test?pin=SOX-9B-2026-K7Q  (o'quvchi)
 *   O'quvchining o'z variantini to'g'ri javoblarsiz qaytaradi va urinishni boshlaydi.
 */
import { NextResponse } from "next/server";
import { Prisma, type TestBank } from "@prisma/client";
import {
  answerKeyLetters,
  distributeVariants,
  makeClassPin,
  studentView,
  type AttemptLayout,
  type TestQuestion,
} from "@/lib/anti-cheat";
import { AuthError, requireRole } from "@/lib/auth";
import { isLang } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const fail = (e: unknown) => {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
};

function validQuestions(v: unknown): v is TestQuestion[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((q) => {
      const x = q as TestQuestion;
      return (
        typeof x?.id === "string" &&
        typeof x.text === "string" &&
        Array.isArray(x.options) &&
        x.options.length >= 2 &&
        x.options.some((o) => o.id === x.correctOptionId)
      );
    })
  );
}

export async function POST(req: Request) {
  try {
    const teacher = await requireRole(req, ["TEACHER", "ADMIN"]);
    const b = (await req.json()) as Record<string, unknown>;

    const classroom = await prisma.classroom.findUnique({
      where: { id: String(b.classroomId ?? "") },
      include: { students: { where: { role: "STUDENT" }, orderBy: { fullName: "asc" } } },
    });
    if (!classroom) return NextResponse.json({ error: "Sinf topilmadi" }, { status: 404 });
    if (teacher.role !== "ADMIN" && classroom.teacherId !== teacher.id)
      return NextResponse.json({ error: "Bu sinf sizga biriktirilmagan" }, { status: 403 });
    if (classroom.students.length === 0) return NextResponse.json({ error: "Sinfda o'quvchi yo'q" }, { status: 400 });

    let testBank: TestBank | null;
    if (typeof b.testBankId === "string") {
      testBank = await prisma.testBank.findUnique({ where: { id: b.testBankId } });
      if (!testBank) return NextResponse.json({ error: "Test topilmadi" }, { status: 404 });
    } else {
      if (!validQuestions(b.questions)) return NextResponse.json({ error: "questions noto'g'ri" }, { status: 400 });
      const type = ["BSB", "CHSB", "NAZORAT", "CUSTOM"].includes(String(b.type)) ? (b.type as "BSB") : "CUSTOM";
      testBank = await prisma.testBank.create({
        data: {
          title: typeof b.title === "string" ? b.title : "Test",
          type,
          source: "MANUAL",
          lang: isLang(b.lang) ? b.lang : "uz",
          authorId: teacher.id,
          questions: b.questions as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const questions = testBank.questions as unknown as TestQuestion[];
    const durationMin = Math.min(180, Math.max(5, Number(b.durationMin ?? 45) || 45));
    const shuffleQuestions = b.shuffleQuestions !== false;
    const shuffleOptions = b.shuffleOptions !== false;
    const layouts = distributeVariants(classroom.students, questions, { shuffleQuestions, shuffleOptions });

    // PIN to'qnashuvi juda kam ehtimol, lekin unique cheklovi bo'yicha qayta urinib ko'ramiz
    for (let attempt = 0; attempt < 5; attempt++) {
      const pin = makeClassPin(classroom.name);
      try {
        const session = await prisma.examSession.create({
          data: {
            pin,
            testBankId: testBank.id,
            classroomId: classroom.id,
            durationMin,
            shuffleQuestions,
            shuffleOptions,
            // Sessiya oynasi: imtihon davomiyligi + 1 soat kech qolganlar uchun
            closesAt: new Date(Date.now() + (durationMin + 60) * 60_000),
            results: {
              create: classroom.students.map((s) => {
                const l = layouts.get(s.id) as AttemptLayout;
                return {
                  studentId: s.id,
                  seed: l.seed,
                  questionOrder: l.questionOrder,
                  optionOrders: l.optionOrders as Prisma.InputJsonValue,
                };
              }),
            },
          },
        });
        return NextResponse.json({
          sessionId: session.id,
          pin: session.pin,
          closesAt: session.closesAt,
          variants: classroom.students.map((s) => {
            const l = layouts.get(s.id) as AttemptLayout;
            return { studentId: s.id, name: s.fullName, answerKey: answerKeyLetters(questions, l) };
          }),
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }
    }
    return NextResponse.json({ error: "PIN yaratib bo'lmadi" }, { status: 500 });
  } catch (e) {
    return fail(e);
  }
}

export async function GET(req: Request) {
  try {
    const student = await requireRole(req, ["STUDENT"]);
    const pin = new URL(req.url).searchParams.get("pin")?.trim().toUpperCase() ?? "";
    const session = await prisma.examSession.findUnique({ where: { pin }, include: { testBank: true } });
    if (!session || session.status !== "ACTIVE" || session.closesAt < new Date())
      return NextResponse.json({ error: "PIN topilmadi yoki imtihon yopilgan" }, { status: 404 });

    let result = await prisma.examResult.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
    });
    if (!result) return NextResponse.json({ error: "Bu imtihon sizning sinfingiz uchun emas" }, { status: 403 });
    if (result.status === "PENDING") {
      result = await prisma.examResult.update({
        where: { id: result.id },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
    }

    const questions = session.testBank.questions as unknown as TestQuestion[];
    const layout: AttemptLayout = {
      seed: result.seed,
      questionOrder: result.questionOrder,
      optionOrders: result.optionOrders as unknown as Record<string, string[]>,
    };
    const startedAt = result.startedAt ?? new Date();
    return NextResponse.json({
      title: session.testBank.title,
      status: result.status,
      deadline: new Date(startedAt.getTime() + session.durationMin * 60_000),
      questions: studentView(questions, layout),
      answers: result.answers,
    });
  } catch (e) {
    return fail(e);
  }
}
