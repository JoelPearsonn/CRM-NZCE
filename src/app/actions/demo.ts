"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { seedDesk } from "../../../prisma/seed";

export async function loadDemo() {
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
