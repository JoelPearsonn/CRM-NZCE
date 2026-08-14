"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { optionalStr, parseDate, parseIntField, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string };

export async function saveMeter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = optionalStr(formData.get("id"));
  const customerId = str(formData.get("customerId"));
  const fuelType = str(formData.get("fuelType"));
  const mpan = optionalStr(formData.get("mpan"))?.replace(/\s/g, "") ?? null;
  const mprn = optionalStr(formData.get("mprn"))?.replace(/\s/g, "") ?? null;

  if (!customerId) return { error: "Customer is required." };
  if (!fuelType) return { error: "Choose electric, gas, or dual fuel." };
  if (!mpan && !mprn) return { error: "Enter an MPAN and/or MPRN." };
  if ((fuelType === "ELECTRIC" || fuelType === "DUAL") && !mpan) {
    return { error: "Electric and dual-fuel meters need an MPAN." };
  }
  if ((fuelType === "GAS" || fuelType === "DUAL") && !mprn) {
    return { error: "Gas and dual-fuel meters need an MPRN." };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer not found." };

  const data = {
    customerId,
    siteName: optionalStr(formData.get("siteName")),
    siteAddress: optionalStr(formData.get("siteAddress")),
    fuelType,
    mpan,
    mprn,
    electricEac: parseIntField(formData.get("electricEac")),
    gasAq: parseIntField(formData.get("gasAq")),
    supplier: optionalStr(formData.get("supplier")),
    contractStart: parseDate(formData.get("contractStart")),
    contractEnd: parseDate(formData.get("contractEnd")),
    meterType: optionalStr(formData.get("meterType")),
    settlement: optionalStr(formData.get("settlement")),
    currentRates: optionalStr(formData.get("currentRates")),
    renewalDate: parseDate(formData.get("renewalDate")),
    loaStatus: str(formData.get("loaStatus")) || "NOT_REQUESTED",
    ...objectionFields(formData),
    salespersonId: optionalStr(formData.get("salespersonId")),
  };

  const label = mpan ? `MPAN ${mpan}` : `MPRN ${mprn}`;

  if (id) {
    const existing = await prisma.meter.findUnique({ where: { id } });
    if (!existing) return { error: "Meter not found." };
    await prisma.meter.update({ where: { id }, data });
    await logActivity(customerId, "METER_UPDATED", `Meter updated: ${label}.`);
    revalidatePath("/");
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    redirect(`/customers/${customerId}`);
  }

  await prisma.meter.create({ data });
  await logActivity(customerId, "METER_ADDED", `Meter added: ${label}.`);
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}`);
}

function objectionFields(formData: FormData) {
  const objectionStatus = str(formData.get("objectionStatus")) || "NONE";
  let objectionRaisedOn = parseDate(formData.get("objectionRaisedOn"));
  let objectionClearedOn = parseDate(formData.get("objectionClearedOn"));
  if (objectionStatus === "IN_OBJECTION" && !objectionRaisedOn) {
    objectionRaisedOn = new Date();
  }
  if (objectionStatus === "CLEARED" && !objectionClearedOn) {
    objectionClearedOn = new Date();
  }
  if (objectionStatus === "NONE") {
    objectionRaisedOn = null;
    objectionClearedOn = null;
  }
  return {
    objectionStatus,
    objectionNote: optionalStr(formData.get("objectionNote")),
    objectionRaisedOn,
    objectionClearedOn,
  };
}

export async function saveMeterObjection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData.get("id"));
  if (!id) return { error: "Meter is missing." };
  const meter = await prisma.meter.findUnique({ where: { id } });
  if (!meter) return { error: "Meter not found." };

  const fields = objectionFields(formData);
  await prisma.meter.update({ where: { id }, data: fields });
  const label = meter.mpan ? `MPAN ${meter.mpan}` : `MPRN ${meter.mprn}`;
  const status =
    fields.objectionStatus === "IN_OBJECTION"
      ? "in objection"
      : fields.objectionStatus === "CLEARED"
        ? "cleared"
        : "none";
  await logActivity(meter.customerId, "METER_UPDATED", `Objection on ${label} set to ${status}.`);
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath(`/customers/${meter.customerId}`);
  return {};
}
