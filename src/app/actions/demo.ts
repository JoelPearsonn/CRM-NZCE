"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { staffActionError } from "@/lib/staff-session";
import { seedDesk } from "../../../prisma/seed";

export async function loadDemo() {
  if (await staffActionError()) redirect("/login");
  await seedDesk();
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/leads");
  revalidatePath("/contracts");
  revalidatePath("/finance");
  revalidatePath("/renewals");
  revalidatePath("/tasks");
  revalidatePath("/agents");
  redirect("/");
}
