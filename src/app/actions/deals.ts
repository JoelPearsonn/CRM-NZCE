"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { optionalStr, parseDate, parseMoney, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string };

export async function saveDeal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = optionalStr(formData.get("id"));
  const customerId = str(formData.get("customerId"));
  const supplier = str(formData.get("supplier"));
  const fuelType = str(formData.get("fuelType"));

  if (!customerId) return { error: "Choose a customer." };
  if (!supplier) return { error: "Supplier is required." };
  if (!fuelType) return { error: "Choose a fuel type." };

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer not found." };

  const data = {
    customerId,
    meterId: optionalStr(formData.get("meterId")),
    leadId: optionalStr(formData.get("leadId")),
    salespersonId: optionalStr(formData.get("salespersonId")),
    supplier,
    fuelType,
    contractStart: parseDate(formData.get("contractStart")),
    contractEnd: parseDate(formData.get("contractEnd")),
    renewalDate: parseDate(formData.get("renewalDate")),
    status: str(formData.get("status")) || "LIVE",
    dueDate: parseDate(formData.get("dueDate")),
    amountDue: parseMoney(formData.get("amountDue")),
    estimatedCommission: parseMoney(formData.get("estimatedCommission")),
    actualPaid: parseMoney(formData.get("actualPaid")),
    notes: optionalStr(formData.get("notes")),
  };

  if (id) {
    const existing = await prisma.deal.findUnique({ where: { id } });
    if (!existing) return { error: "Contract not found." };
    await prisma.deal.update({ where: { id }, data });
    await logActivity(
      customerId,
      "DEAL_UPDATED",
      `${supplier} contract updated for ${customer.companyName}.`,
    );
    revalidatePath("/");
    revalidatePath("/contracts");
    revalidatePath(`/customers/${customerId}`);
    redirect(`/contracts/${id}`);
  }

  const deal = await prisma.deal.create({ data });
  await logActivity(
    customerId,
    "DEAL_RECORDED",
    `${supplier} contract recorded for ${customer.companyName}.`,
  );
  revalidatePath("/");
  revalidatePath("/contracts");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/contracts/${deal.id}`);
}
