import { cookies } from "next/headers";
import type { PrismaClient } from "@prisma/client";
import { PORTAL_COOKIE } from "@/lib/portal-constants";
import { prisma } from "@/lib/prisma";

export { PORTAL_COOKIE } from "@/lib/portal-constants";
export { hashPassword, newSessionToken, verifyPassword } from "@/lib/portal-crypto";

export async function getPortalAccount(db: PrismaClient = prisma) {
  try {
    const store = await cookies();
    const token = store.get(PORTAL_COOKIE)?.value;
    if (!token) return null;
    return db.customerAccount.findFirst({
      where: {
        sessionToken: token,
        customer: { archivedAt: null },
      },
      include: { customer: true },
    });
  } catch {
    return null;
  }
}

export async function setPortalCookie(sessionToken: string) {
  const store = await cookies();
  store.set(PORTAL_COOKIE, sessionToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearPortalCookie() {
  const store = await cookies();
  store.delete(PORTAL_COOKIE);
}
