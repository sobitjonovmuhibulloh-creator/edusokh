/**
 * Rolga asoslangan kirish nazorati (RBAC).
 *
 * HOZIRCHA haqiqiy avtorizatsiya ulanmagan. DEMO_AUTH=true bo'lganda foydalanuvchi
 * "x-demo-user" sarlavhasidagi login orqali aniqlanadi — bu faqat mahalliy sinov uchun,
 * chunki sarlavhani har kim yozib yuborishi mumkin. DEMO_AUTH o'chiq bo'lsa, barcha
 * himoyalangan API'lar 401 qaytaradi. Production'dan oldin getCurrentUser() ni
 * Supabase Auth yoki NextAuth sessiyasi bilan almashtiring.
 */
import type { Role, User } from "@prisma/client";
import { prisma } from "./prisma";

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

export async function getCurrentUser(req: Request): Promise<User | null> {
  if (process.env.DEMO_AUTH !== "true") return null;
  const login = req.headers.get("x-demo-user");
  if (!login) return null;
  return prisma.user.findUnique({ where: { login } });
}

export async function requireRole(req: Request, roles: Role[]): Promise<User> {
  const user = await getCurrentUser(req);
  if (!user) throw new AuthError(401, "Avtorizatsiya talab qilinadi");
  if (!roles.includes(user.role)) throw new AuthError(403, "Bu amal uchun ruxsat yo'q");
  return user;
}
