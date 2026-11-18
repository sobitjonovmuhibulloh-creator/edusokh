import { PrismaClient } from "@prisma/client";

// Next.js dev rejimida hot-reload har safar yangi ulanish ochmasligi uchun bitta nusxa
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const hasDatabase = (): boolean => Boolean(process.env.DATABASE_URL);
