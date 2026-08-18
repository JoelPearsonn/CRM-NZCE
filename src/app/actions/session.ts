"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { WORKING_AS_COOKIE } from "@/lib/working-as";
import { optionalStr } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { planWorkingAsCookie, workingAsCookieOptions } from "@/lib/staff-auth";
import { hasStaffSessionFromCookies } from "@/lib/staff-session";

export async function setWorkingAs(formData: FormData) {
  const agentId = optionalStr(formData.get("agentId"));
  const hasStaffSession = await hasStaffSessionFromCookies();
  const agent = agentId ? await prisma.agent.findUnique({ where: { id: agentId } }) : null;
  const plan = planWorkingAsCookie({
    hasStaffSession,
    agentId,
    agentExists: Boolean(agent),
  });

  if (plan.action === "deny") return;

  const store = await cookies();
  if (plan.action === "clear") {
    store.delete(WORKING_AS_COOKIE);
  } else if (agent) {
    store.set(WORKING_AS_COOKIE, agent.id, workingAsCookieOptions());
  }

  revalidatePath("/", "layout");
}
