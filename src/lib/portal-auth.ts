import { cookies } from "next/headers";
import type { PrismaClient } from "@prisma/client";
import { PORTAL_COOKIE } from "@/lib/portal-constants";
import { newSessionToken, verifyPassword } from "@/lib/portal-crypto";
import { prisma } from "@/lib/prisma";

export { PORTAL_COOKIE } from "@/lib/portal-constants";
export { hashPassword, newSessionToken, verifyPassword } from "@/lib/portal-crypto";

export async function authenticatePortal(input: {
  email?: string;
  password?: string;
  token?: string | null;
}) {
  const token = input.token?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";

  const account = token
    ? await prisma.customerAccount.findFirst({
        where: { magicToken: token, customer: { archivedAt: null } },
      })
    : email
      ? await prisma.customerAccount.findFirst({
          where: { email, customer: { archivedAt: null } },
        })
      : null;

  if (!account) return { error: "No portal login for that email." };
  if (!token && !verifyPassword(password, account.passwordHash)) {
    return { error: "Email or password is not right." };
  }

  const sessionToken = newSessionToken();
  const signedIn = await prisma.customerAccount.update({
    where: { id: account.id },
    data: { sessionToken, lastLoginAt: new Date() },
    include: { customer: true },
  });
  await setPortalCookie(sessionToken);
  return { ok: true as const, account: signedIn };
}

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
