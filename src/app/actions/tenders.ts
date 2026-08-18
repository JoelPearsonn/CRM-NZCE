"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { optionalStr, parseDate, parseIntField, parseMoney, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { staffActionError } from "@/lib/staff-session";

export type ActionState = { error?: string };

export async function saveTenderResponse(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await staffActionError();
  if (denied) return denied;
  const id = optionalStr(formData.get("id"));
  const customerId = str(formData.get("customerId"));
  const supplier = str(formData.get("supplier"));
  const fuelType = str(formData.get("fuelType"));

  if (!customerId) return { error: "Customer is required." };
  if (!supplier) return { error: "Supplier is required." };
  if (!fuelType) return { error: "Choose a fuel type." };

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer not found." };

  const status = str(formData.get("status")) || "RECEIVED";
  const data = {
    customerId,
    leadId: optionalStr(formData.get("leadId")),
    supplier,
    fuelType,
    receivedOn: parseDate(formData.get("receivedOn")) ?? new Date(),
    standingCharge: parseMoney(formData.get("standingCharge")),
    unitRates: optionalStr(formData.get("unitRates")),
    contractLengthMonths: parseIntField(formData.get("contractLengthMonths")),
    estimatedAnnualCost: parseMoney(formData.get("estimatedAnnualCost")),
    status,
    notes: optionalStr(formData.get("notes")),
  };

  if (id) {
    const existing = await prisma.tenderResponse.findUnique({ where: { id } });
    if (!existing) return { error: "Tender response not found." };
    await prisma.tenderResponse.update({ where: { id }, data });
    if (status === "PREFERRED") {
      await clearOtherPreferred(customerId, fuelType, id);
    }
    await logActivity(
      customerId,
      "TENDER_UPDATED",
      `${supplier} tender updated for ${customer.companyName}.`,
    );
    revalidateTender(customerId, data.leadId);
    redirect(`/customers/${customerId}#tenders`);
  }

  const created = await prisma.tenderResponse.create({ data });
  if (status === "PREFERRED") {
    await clearOtherPreferred(customerId, fuelType, created.id);
  }
  await logActivity(
    customerId,
    "TENDER_RECORDED",
    `${supplier} tender received for ${customer.companyName}.`,
  );
  revalidateTender(customerId, data.leadId);
  redirect(`/customers/${customerId}#tenders`);
}

export async function markTenderPreferred(formData: FormData) {
  if (await staffActionError()) return;
  const id = str(formData.get("id"));
  if (!id) return;

  const tender = await prisma.tenderResponse.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!tender) return;

  await prisma.tenderResponse.update({
    where: { id },
    data: { status: "PREFERRED" },
  });
  await clearOtherPreferred(tender.customerId, tender.fuelType, id);
  await logActivity(
    tender.customerId,
    "TENDER_PREFERRED",
    `${tender.supplier} marked preferred for ${tender.customer.companyName}.`,
  );
  revalidateTender(tender.customerId, tender.leadId);
}

async function clearOtherPreferred(customerId: string, fuelType: string, keepId: string) {
  await prisma.tenderResponse.updateMany({
    where: {
      customerId,
      fuelType,
      status: "PREFERRED",
      id: { not: keepId },
    },
    data: { status: "RECEIVED" },
  });
}

function revalidateTender(customerId: string, leadId?: string | null) {
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/leads");
  revalidatePath("/renewals");
  if (leadId) revalidatePath(`/leads/${leadId}`);
}
