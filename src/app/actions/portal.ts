"use server";

import { redirect } from "next/navigation";
import { clearPortalCookie, setPortalCookie } from "@/lib/portal-auth";
import { newSessionToken, verifyPassword } from "@/lib/portal-crypto";
import { optionalStr, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type PortalLoginState = { error?: string };

export async function signInPortal(
  _prev: PortalLoginState,
  formData: FormData,
): Promise<PortalLoginState> {
  const result = await authenticatePortal({
    email: str(formData.get("email")),
    password: str(formData.get("password")),
    token: optionalStr(formData.get("token")),
  });
  if ("error" in result) return result;
  redirect("/portal");
}

export async function signOutPortal() {
  await clearPortalCookie();
  redirect("/portal/login");
}

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
