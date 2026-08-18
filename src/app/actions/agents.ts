"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isEmail, optionalStr, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { staffActionError } from "@/lib/staff-session";

export type ActionState = { error?: string };

export async function saveAgent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await staffActionError();
  if (denied) return denied;
  const id = optionalStr(formData.get("id"));
  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const role = str(formData.get("role")) || "Sales";

  if (!name) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };
  if (!isEmail(email)) return { error: "Enter a valid email address." };

  const existingEmail = await prisma.agent.findUnique({ where: { email } });
  if (existingEmail && existingEmail.id !== id) {
    return { error: "That email is already on the desk." };
  }

  if (id) {
    const existing = await prisma.agent.findUnique({ where: { id } });
    if (!existing) return { error: "Agent not found." };
    await prisma.agent.update({ where: { id }, data: { name, email, role } });
    revalidatePath("/agents");
    revalidatePath("/leads");
    redirect("/agents");
  }

  await prisma.agent.create({ data: { name, email, role } });
  revalidatePath("/agents");
  redirect("/agents");
}
