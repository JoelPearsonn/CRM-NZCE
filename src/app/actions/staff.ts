"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/portal-crypto";
import { optionalStr, str } from "@/lib/format";
import { DESK_DATABASE_MISSING, isDeskDatabaseConfigured } from "@/lib/desk-database";
import { prisma } from "@/lib/prisma";
import {
  authenticateStaff,
  createStaffPasswordFromToken,
  staffEmailLoginStep,
} from "@/lib/staff-accounts";
import { deskPublicOrigin } from "@/lib/staff-mail";
import { startStaffEmailVerification } from "@/lib/staff-verify";
import {
  createStaffSessionToken,
  isNceWorkEmail,
  staffSessionCookieOptions,
  workingAsCookieOptions,
  STAFF_COOKIE,
  type PublicAgent,
} from "@/lib/staff-auth";
import { getSignedInStaff, staffIsAdmin } from "@/lib/staff-session";
import { WORKING_AS_COOKIE } from "@/lib/working-as";

export type StaffLoginState = {
  error?: string;
  step?: "email" | "check" | "signin";
  email?: string;
};

export type StaffVerifyState = { error?: string };

export type StaffPasswordState = { error?: string; saved?: string };

async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function finishStaffSession(agent: PublicAgent): Promise<never> {
  const token = createStaffSessionToken(agent.email);
  if (!token) {
    redirect("/login?error=config");
  }
  const store = await cookies();
  store.set(STAFF_COOKIE, token, staffSessionCookieOptions());
  store.set(WORKING_AS_COOKIE, agent.id, workingAsCookieOptions());
  redirect("/");
}

export async function continueStaffLogin(
  prev: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  if (!isDeskDatabaseConfigured()) {
    return { error: DESK_DATABASE_MISSING, step: "email" };
  }

  const intent = str(formData.get("intent")) || "email";
  const emailRaw = str(formData.get("email")) || prev.email || "";

  if (intent === "reset") {
    return { step: "email" };
  }

  if (intent === "signin") {
    const result = await authenticateStaff({
      email: emailRaw,
      password: str(formData.get("password")),
    });
    if ("error" in result) {
      const step = await staffEmailLoginStep(emailRaw);
      return {
        error: result.error,
        step: "step" in step ? (step.step === "verify" ? "email" : step.step) : "signin",
        email: "email" in step ? step.email : undefined,
      };
    }
    await finishStaffSession(result.agent);
  }

  const step = await staffEmailLoginStep(emailRaw);
  if ("error" in step) return { error: step.error, step: "email" };
  if (step.step === "signin") return { step: "signin", email: step.email };

  const sent = await startStaffEmailVerification(step.email, {
    publicOrigin: deskPublicOrigin(process.env, await requestOrigin()),
  });
  if ("error" in sent) return { error: sent.error, step: "email", email: step.email };
  return { step: "check", email: sent.email };
}

export async function createVerifiedStaffPassword(
  _prev: StaffVerifyState,
  formData: FormData,
): Promise<StaffVerifyState> {
  if (!isDeskDatabaseConfigured()) {
    return { error: DESK_DATABASE_MISSING };
  }

  const result = await createStaffPasswordFromToken({
    token: str(formData.get("token")),
    password: str(formData.get("password")),
    confirm: str(formData.get("confirm")),
  });
  if ("error" in result) return { error: result.error };
  await finishStaffSession(result.agent);
  return {};
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
  if (!isNceWorkEmail(agent.email)) {
    return { error: "Login is only for an @nzcenergy.co.uk work email. Do not invent an address." };
  }
  await prisma.agent.update({
    where: { id: agent.id },
    data: { passwordHash: hashPassword(password) },
  });
  revalidatePath("/agents");
  revalidatePath(`/agents/${agent.id}/edit`);
  return { saved: `Login set for ${agent.name}.` };
}
