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
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    redirect(returnToCustomer(formData, customerId, id));
  }

  const deal = await prisma.deal.create({ data });
  await logActivity(
    customerId,
    "DEAL_RECORDED",
    `${supplier} contract recorded for ${customer.companyName}.`,
  );
  revalidatePath("/");
  revalidatePath("/contracts");
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(returnToCustomer(formData, customerId, deal.id));
}

function returnToCustomer(formData: FormData, customerId: string, dealId: string) {
  return str(formData.get("returnTo")) === "customer"
    ? `/customers/${customerId}`
    : `/contracts/${dealId}`;
}

export async function reconcileDeal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData.get("id"));
  if (!id) return { error: "Deal is missing." };

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!deal) return { error: "Contract not found." };

  const actualPaid = parseMoney(formData.get("actualPaid"));
  const amountDue = parseMoney(formData.get("amountDue"));
  const estimatedCommission = parseMoney(formData.get("estimatedCommission"));
  const dueDate = parseDate(formData.get("dueDate"));

  await prisma.deal.update({
    where: { id },
    data: {
      dueDate,
      amountDue,
      estimatedCommission,
      actualPaid,
    },
  });
  await logActivity(
    deal.customerId,
    "FINANCE_RECONCILED",
    `Finance reconciled on ${deal.supplier} for ${deal.customer.companyName}: due ${amountDue ?? 0}, paid ${actualPaid ?? 0}.`,
  );
  revalidatePath("/");
  revalidatePath("/contracts");
  revalidatePath("/customers");
  revalidatePath(`/customers/${deal.customerId}`);
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/renewals");
  revalidatePath("/finance");
  return {};
}
