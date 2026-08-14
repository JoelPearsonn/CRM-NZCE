"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { labelFor, LOA_STATUSES, OBJECTION_STATUSES } from "@/lib/constants";
import { optionalStr, parseDate, parseIntField, str } from "@/lib/format";
import { removeLoaFile, storeLoaFile } from "@/lib/loa-files";
import { prisma } from "@/lib/prisma";
import { ensureRenewalReminderTasks } from "@/lib/renewal-tasks";
import { findSupplyClash } from "@/lib/supply";

export type DuplicateMeter = {
  id: string;
  customerId: string;
  companyName: string;
  siteName: string | null;
  mpan: string | null;
  mprn: string | null;
  match: "mpan" | "mprn";
};

export type MeterDraft = {
  siteName: string;
  siteAddress: string;
  fuelType: string;
  mpan: string;
  mprn: string;
  electricEac: string;
  gasAq: string;
  supplier: string;
  meterType: string;
  settlement: string;
  loaStatus: string;
  loaSignedOn: string;
  loaSignedBy: string;
  objectionStatus: string;
  objectionRaisedOn: string;
  objectionClearedOn: string;
  objectionNote: string;
  contractStart: string;
  contractEnd: string;
  renewalDate: string;
  salespersonId: string;
  currentRates: string;
};

export type ActionState = {
  error?: string;
  duplicate?: DuplicateMeter;
  draft?: MeterDraft;
};

function draftFrom(formData: FormData): MeterDraft {
  return {
    siteName: str(formData.get("siteName")),
    siteAddress: str(formData.get("siteAddress")),
    fuelType: str(formData.get("fuelType")),
    mpan: str(formData.get("mpan")),
    mprn: str(formData.get("mprn")),
    electricEac: str(formData.get("electricEac")),
    gasAq: str(formData.get("gasAq")),
    supplier: str(formData.get("supplier")),
    meterType: str(formData.get("meterType")),
    settlement: str(formData.get("settlement")),
    loaStatus: str(formData.get("loaStatus")),
    loaSignedOn: str(formData.get("loaSignedOn")),
    loaSignedBy: str(formData.get("loaSignedBy")),
    objectionStatus: str(formData.get("objectionStatus")),
    objectionRaisedOn: str(formData.get("objectionRaisedOn")),
    objectionClearedOn: str(formData.get("objectionClearedOn")),
    objectionNote: str(formData.get("objectionNote")),
    contractStart: str(formData.get("contractStart")),
    contractEnd: str(formData.get("contractEnd")),
    renewalDate: str(formData.get("renewalDate")),
    salespersonId: str(formData.get("salespersonId")),
    currentRates: str(formData.get("currentRates")),
  };
}

export async function saveMeter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = optionalStr(formData.get("id"));
  const customerId = str(formData.get("customerId"));
  const fuelType = str(formData.get("fuelType"));
  const mpan = optionalStr(formData.get("mpan"))?.replace(/\s/g, "") ?? null;
  const mprn = optionalStr(formData.get("mprn"))?.replace(/\s/g, "") ?? null;
  const draft = draftFrom(formData);

  if (!customerId) return { error: "Customer is required.", draft };
  if (!str(formData.get("siteName"))) return { error: "Give the meter a site name.", draft };
  if (!fuelType) return { error: "Choose electric, gas, or dual fuel.", draft };
  if (!mpan && !mprn) return { error: "Enter an MPAN and/or MPRN.", draft };
  if ((fuelType === "ELECTRIC" || fuelType === "DUAL") && !mpan) {
    return { error: "Electric and dual-fuel meters need an MPAN.", draft };
  }
  if ((fuelType === "GAS" || fuelType === "DUAL") && !mprn) {
    return { error: "Gas and dual-fuel meters need an MPRN.", draft };
  }

  const clash = await findSupplyClash(prisma, mpan, mprn, id);
  if (clash) {
    const match = mpan && clash.mpan === mpan ? "mpan" : "mprn";
    return {
      draft,
      duplicate: {
        id: clash.id,
        customerId: clash.customerId,
        companyName: clash.customer.companyName,
        siteName: clash.siteName,
        mpan: clash.mpan,
        mprn: clash.mprn,
        match,
      },
    };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer not found.", draft };

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
    ...loaSignFields(formData),
    ...objectionFields(formData),
    salespersonId: optionalStr(formData.get("salespersonId")),
  };

  const label = mpan ? `MPAN ${mpan}` : `MPRN ${mprn}`;

  if (id) {
    const existing = await prisma.meter.findUnique({ where: { id } });
    if (!existing) return { error: "Meter not found.", draft };
    let fileFields = {};
    try {
      fileFields = await loaFileFields(formData, id, existing.loaStoredName);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not store the LOA file." };
    }
    await prisma.meter.update({ where: { id }, data: { ...data, ...fileFields } });
    await logMeterChanges(customerId, label, existing, { ...data, ...fileFields });
    await ensureRenewalReminderTasks();
    revalidatePath("/");
    revalidatePath("/customers");
    revalidatePath("/renewals");
    revalidatePath("/tasks");
    revalidatePath(`/customers/${customerId}`);
    redirect(`/customers/${customerId}`);
  }

  let fileFields = {};
  try {
    fileFields = await loaFileFields(formData, customerId, null);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not store the LOA file." };
  }
  await prisma.meter.create({ data: { ...data, ...fileFields } });
  await logActivity(customerId, "METER_ADDED", `Meter added: ${label}.`);
  await ensureRenewalReminderTasks();
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/tasks");
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
  if (meter.objectionStatus !== fields.objectionStatus) {
    await logActivity(
      meter.customerId,
      "OBJECTION_CHANGED",
      `Objection on ${label} set to ${labelFor(OBJECTION_STATUSES, fields.objectionStatus)}.`,
    );
  } else {
    await logActivity(meter.customerId, "OBJECTION_CHANGED", `Objection note updated on ${label}.`);
  }
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/renewals");
  revalidatePath(`/customers/${meter.customerId}`);
  return {};
}

export async function saveMeterLoa(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData.get("id"));
  if (!id) return { error: "Meter is missing." };
  const meter = await prisma.meter.findUnique({ where: { id } });
  if (!meter) return { error: "Meter not found." };

  const markSigned = str(formData.get("markSigned")) === "1";
  let loaStatus = str(formData.get("loaStatus")) || meter.loaStatus;
  const signed = loaSignFields(formData);
  if (markSigned) {
    loaStatus = "SIGNED";
    if (!signed.loaSignedOn) signed.loaSignedOn = new Date();
  }
  if (loaStatus === "SIGNED" && !signed.loaSignedOn) {
    signed.loaSignedOn = new Date();
  }

  let fileFields = {};
  try {
    fileFields = await loaFileFields(formData, meter.id, meter.loaStoredName);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not store the LOA file." };
  }

  await prisma.meter.update({
    where: { id },
    data: { loaStatus, ...signed, ...fileFields },
  });

  const label = meter.mpan ? `MPAN ${meter.mpan}` : `MPRN ${meter.mprn}`;
  const next = { loaStatus, ...signed, ...fileFields };
  await logLoaChange(meter.customerId, label, meter, next);
  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/renewals");
  revalidatePath(`/customers/${meter.customerId}`);
  return {};
}

function loaSignFields(formData: FormData) {
  return {
    loaSignedOn: parseDate(formData.get("loaSignedOn")),
    loaSignedBy: optionalStr(formData.get("loaSignedBy")),
  };
}

async function loaFileFields(formData: FormData, meterId: string, previousStored: string | null) {
  const file = formData.get("loaFile");
  if (!(file instanceof File) || file.size <= 0) return {};
  const stored = await storeLoaFile(meterId, file);
  if (!stored) return {};
  if (previousStored) await removeLoaFile(previousStored);
  return stored;
}

async function logMeterChanges(
  customerId: string,
  label: string,
  before: { loaStatus: string; objectionStatus: string },
  after: { loaStatus: string; objectionStatus: string },
) {
  if (before.loaStatus !== after.loaStatus) {
    await logLoaChange(customerId, label, before, after);
  }
  if (before.objectionStatus !== after.objectionStatus) {
    await logActivity(
      customerId,
      "OBJECTION_CHANGED",
      `Objection on ${label} set to ${labelFor(OBJECTION_STATUSES, after.objectionStatus)}.`,
    );
  }
  if (before.loaStatus === after.loaStatus && before.objectionStatus === after.objectionStatus) {
    await logActivity(customerId, "METER_UPDATED", `Meter updated: ${label}.`);
  }
}

async function logLoaChange(
  customerId: string,
  label: string,
  before: { loaStatus: string; loaSignedBy?: string | null },
  after: { loaStatus: string; loaSignedBy?: string | null; loaFileName?: string | null },
) {
  const who = after.loaSignedBy ? ` Signed by ${after.loaSignedBy}.` : "";
  const file = after.loaFileName ? ` Copy stored: ${after.loaFileName}.` : "";
  await logActivity(
    customerId,
    "LOA_STATUS_CHANGED",
    `LOA on ${label} set to ${labelFor(LOA_STATUSES, after.loaStatus)}.${who}${file}`,
  );
  void before;
}
