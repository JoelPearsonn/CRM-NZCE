"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { WORKING_AS_COOKIE } from "@/lib/working-as";
import { optionalStr } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function setWorkingAs(formData: FormData) {
  const agentId = optionalStr(formData.get("agentId"));
  const store = await cookies();

  if (!agentId) {
    store.delete(WORKING_AS_COOKIE);
  } else {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) return;
    store.set(WORKING_AS_COOKIE, agent.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  revalidatePath("/", "layout");
}
