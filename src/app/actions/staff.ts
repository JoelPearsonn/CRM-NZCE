"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/portal-crypto";
import { optionalStr, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { authenticateStaff } from "@/lib/staff-accounts";
import {
  createStaffSessionToken,
  staffSessionCookieOptions,
  workingAsCookieOptions,
  STAFF_COOKIE,
} from "@/lib/staff-auth";
import { getSignedInStaff, staffIsAdmin } from "@/lib/staff-session";
import { WORKING_AS_COOKIE } from "@/lib/working-as";

export type StaffLoginState = { error?: string };
export type StaffPasswordState = { error?: string; saved?: string };

export async function signInStaff(
  _prev: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  const result = await authenticateStaff({
    identifier: str(formData.get("identifier")),
    password: str(formData.get("password")),
  });
  if ("error" in result) return result;
  const token = createStaffSessionToken(result.agent.id);
  if (!token) return { error: "Staff sign-in is not configured on this desk." };
  const store = await cookies();
  store.set(STAFF_COOKIE, token, staffSessionCookieOptions());
  store.set(WORKING_AS_COOKIE, result.agent.id, workingAsCookieOptions());
  redirect("/");
}

export async function signOutStaff() {
  const store = await cookies();
  store.delete(STAFF_COOKIE);
  store.delete(WORKING_AS_COOKIE);
  redirect("/login");
}

export async function setStaffPassword(
  _prev: StaffPasswordState,
  formData: FormData,
): Promise<StaffPasswordState> {
  const admin = await getSignedInStaff();
  if (!admin || !staffIsAdmin(admin)) {
    return { error: "Only an admin can set another person’s password." };
  }
  const agentId = str(formData.get("agentId"));
  const password = str(formData.get("password"));
  const confirm = optionalStr(formData.get("confirm")) ?? "";
  if (!agentId) return { error: "Choose a desk person." };
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (confirm && confirm !== password) return { error: "Those passwords do not match." };
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, email: true },
  });
  if (!agent) return { error: "That person is not on the desk." };
  await prisma.agent.update({
    where: { id: agent.id },
    data: { passwordHash: hashPassword(password) },
  });
  revalidatePath("/agents");
  revalidatePath(`/agents/${agent.id}/edit`);
  return { saved: `Login set for ${agent.name}.` };
}
