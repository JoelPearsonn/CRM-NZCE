import { cookies } from "next/headers";
import { isDeskAdmin } from "@/lib/desk-reminders";
import { prisma } from "@/lib/prisma";

export const WORKING_AS_COOKIE = "nzce_working_as";

export async function getWorkingAsId() {
  try {
    const store = await cookies();
    return store.get(WORKING_AS_COOKIE)?.value || null;
  } catch {
    return null;
  }
}

export async function getWorkingAsAgent() {
  const id = await getWorkingAsId();
  if (!id) return null;
  return prisma.agent.findUnique({ where: { id } });
}

export async function getWorkingAsAdmin() {
  const agent = await getWorkingAsAgent();
  return isDeskAdmin(agent) ? agent : null;
}
