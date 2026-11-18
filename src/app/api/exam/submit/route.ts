/**
 * POST /api/exam/submit  (o'quvchi)
 * Body: { pin, answers: { [questionId]: optionId }, tabSwitches? }
 * Baholash faqat serverda: to'g'ri javoblar hech qachon brauzerga yuborilmaydi.
 */
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { gradeAnswers, markFromPercent, type TestQuestion } from "@/lib/anti-cheat";
import { AuthError, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const GRACE_MS = 60_000; // tarmoq kechikishi uchun 1 daqiqa

export async function POST(req: Request) {
  try {
    const student = await requireRole(req, ["STUDENT"]);
    const b = (await req.json()) as { pin?: unknown; answers?: unknown; tabSwitches?: unknown };
    const pin = String(b.pin ?? "").trim().toUpperCase();
    const session = await prisma.examSession.findUnique({ where: { pin }, include: { testBank: true } });
    if (!session) return NextResponse.json({ error: "PIN topilmadi" }, { status: 404 });

    const result = await prisma.examResult.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
    });
    if (!result || result.status !== "IN_PROGRESS" || !result.startedAt)
      return NextResponse.json({ error: "Faol urinish yo'q" }, { status: 409 });

    const questions = session.testBank.questions as unknown as TestQuestion[];
    const validIds = new Set(questions.map((q) => q.id));
    const answers: Record<string, string> = {};
    if (b.answers && typeof b.answers === "object") {
      for (const [qid, oid] of Object.entries(b.answers as Record<string, unknown>)) {
        if (validIds.has(qid) && typeof oid === "string") answers[qid] = oid;
      }
    }

    const deadline = result.startedAt.getTime() + session.durationMin * 60_000;
    const late = Date.now() > deadline + GRACE_MS;
    const { score, max } = gradeAnswers(questions, answers);
    const updated = await prisma.examResult.update({
      where: { id: result.id },
      data: {
        answers: answers as Prisma.InputJsonValue,
        status: late ? "EXPIRED" : "SUBMITTED",
        submittedAt: new Date(),
        score,
        maxScore: max,
        tabSwitches: Math.max(0, Math.floor(Number(b.tabSwitches) || 0)),
      },
    });
    const pct = max ? Math.round((score / max) * 100) : 0;
    return NextResponse.json({ status: updated.status, score, max, percent: pct, mark: markFromPercent(pct) });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
