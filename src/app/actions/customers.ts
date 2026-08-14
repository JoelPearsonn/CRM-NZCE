"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { isEmail, optionalStr, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string };

export async function saveCustomer(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = optionalStr(formData.get("id"));
  const companyName = str(formData.get("companyName"));
  const contactName = str(formData.get("contactName"));
  const email = str(formData.get("email"));

  if (!companyName) return { error: "Company name is required." };
  if (!contactName) return { error: "A named contact is required." };
  if (!email) return { error: "Email is required." };
  if (!isEmail(email)) return { error: "Enter a valid email address." };

  const data = {
    companyName,
    tradingName: optionalStr(formData.get("tradingName")),
    contactName,
    email,
    phone: optionalStr(formData.get("phone")),
    addressLine1: optionalStr(formData.get("addressLine1")),
    city: optionalStr(formData.get("city")),
    postcode: optionalStr(formData.get("postcode"))?.toUpperCase() ?? null,
    industry: optionalStr(formData.get("industry")),
  };

  if (id) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) return { error: "Customer not found." };
    await prisma.customer.update({ where: { id }, data });
    await logActivity(id, "CUSTOMER_UPDATED", `Customer record updated for ${companyName}.`);
    revalidatePath("/");
    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);
    redirect(`/customers/${id}`);
  }

  const customer = await prisma.customer.create({ data });
  await logActivity(customer.id, "CUSTOMER_CREATED", `Customer ${companyName} added to the desk.`);
  revalidatePath("/");
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}`);
}
