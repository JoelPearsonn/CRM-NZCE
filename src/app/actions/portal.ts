"use server";

import { redirect } from "next/navigation";
import { authenticatePortal, clearPortalCookie } from "@/lib/portal-auth";
import { optionalStr, str } from "@/lib/format";

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
