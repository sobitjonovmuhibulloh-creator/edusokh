/**
 * POST /api/bsb-generator
 * Body: { grade, subject, topic, topicKey?, count, lang, type: "BSB" | "CHSB", save? }
 *
 * AI (pullik) faqat o'qituvchi rolidagi foydalanuvchi yoki mahalliy dev rejimida ishlatiladi;
 * boshqa holatlarda savollar bankidan qaytariladi.
 */
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { generateFromBank, generateTest, type GenerateRequest } from "@/lib/ai-test-generator";
import { SUBJECTS, type SubjectCode } from "@/lib/curriculum";
import { isLang } from "@/lib/i18n";
import { hasDatabase, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseBody(body: unknown): GenerateRequest | string {
  const b = body as Record<string, unknown>;
  const grade = Number(b?.grade);
  const count = Number(b?.count ?? 10);
  if (!Number.isInteger(grade) || grade < 1 || grade > 11) return "grade 1..11 bo'lishi kerak";
  if (typeof b.subject !== "string" || !(b.subject in SUBJECTS)) return "subject noma'lum";
  if (typeof b.topic !== "string" || b.topic.trim().length < 2) return "topic kiritilmagan";
  if (!Number.isInteger(count) || count < 1 || count > 30) return "count 1..30 bo'lishi kerak";
  if (!isLang(b.lang)) return "lang uz | tg | ru bo'lishi kerak";
  if (b.type !== "BSB" && b.type !== "CHSB") return "type BSB | CHSB bo'lishi kerak";
  return {
    grade,
    subject: b.subject as SubjectCode,
    topic: b.topic.trim(),
    topicKey: typeof b.topicKey === "string" ? b.topicKey : undefined,
    count,
    lang: b.lang,
    type: b.type,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON noto'g'ri" }, { status: 400 });
  }
  const parsed = parseBody(body);
  if (typeof parsed === "string") return NextResponse.json({ error: parsed }, { status: 400 });

  const user = hasDatabase() ? await getCurrentUser(req).catch(() => null) : null;
  const isTeacher = user?.role === "TEACHER" || user?.role === "ADMIN";
  const allowAI = isTeacher || process.env.NODE_ENV === "development";

  const result = allowAI
    ? await generateTest(parsed)
    : { source: "BANK" as const, questions: generateFromBank(parsed), warning: "AI faqat o'qituvchilar uchun" };

  let testBankId: string | undefined;
  if ((body as { save?: unknown }).save === true && isTeacher && user && result.questions.length > 0) {
    const subject = await prisma.subject.findFirst({ where: { code: parsed.subject, grade: { number: parsed.grade } } });
    const bank = await prisma.testBank.create({
      data: {
        title: `${parsed.topic} — ${parsed.type}`,
        type: parsed.type,
        source: result.source,
        lang: parsed.lang,
        subjectId: subject?.id,
        authorId: user.id,
        questions: result.questions as unknown as Prisma.InputJsonValue,
      },
    });
    testBankId = bank.id;
  }

  return NextResponse.json({ ...result, testBankId });
}
