import { cookies } from "next/headers";
import { isDeskAdmin } from "@/lib/desk-reminders";
import { prisma } from "@/lib/prisma";
import {
  normalizeStaffEmail,
  publicAgentOf,
  staffHasPassword,
  STAFF_COOKIE,
  STAFF_DENIED,
  verifyStaffSessionToken,
  type PublicAgent,
} from "@/lib/staff-auth";

export async function readStaffSessionFromCookies(env: NodeJS.ProcessEnv = process.env) {
  try {
    const store = await cookies();
    return verifyStaffSessionToken(store.get(STAFF_COOKIE)?.value, Date.now(), env);
  } catch {
    return null;
  }
}

export async function getSignedInStaff(env: NodeJS.ProcessEnv = process.env) {
  const session = await readStaffSessionFromCookies(env);
  if (!session) return null;
  const email = normalizeStaffEmail(session.email);
  if (!email) return null;
  const agent = await prisma.agent.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  });
  if (!agent || !staffHasPassword(agent.email, agent.passwordHash)) return null;
  return publicAgentOf(agent);
}

export async function hasStaffSessionFromCookies(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(await getSignedInStaff(env));
}

export async function staffActionError(): Promise<{ error: string } | null> {
  if (await getSignedInStaff()) return null;
  return { error: STAFF_DENIED.error };
}

export async function requireSignedInStaff(): Promise<PublicAgent | { error: string }> {
  const staff = await getSignedInStaff();
  if (!staff) return { error: STAFF_DENIED.error };
  return staff;
}

export function staffIsAdmin(agent: PublicAgent | null | undefined) {
  return isDeskAdmin(agent);
}
