"use server";

import { revalidatePath } from "next/cache";
import { isDocusignConfigured } from "@/lib/docusign";
import { sendCustomerLoa, syncOpenLoaEnvelopes, type SendLoaResult } from "@/lib/loa-send";
import { optionalStr, str } from "@/lib/format";
import { storeLoaFile } from "@/lib/loa-files";
import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { staffActionError } from "@/lib/staff-session";

export type ActionState = { error?: string; saved?: string };
export type LoaActionState = SendLoaResult;

export async function uploadCustomerLoa(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await staffActionError();
  if (denied) return denied;
  const customerId = str(formData.get("customerId"));
  if (!customerId) return { error: "Customer is missing." };
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer not found." };

  const file = formData.get("loaFile");
  if (!(file instanceof File) || file.size <= 0) {
    return { error: "Choose an LOA file to store." };
  }

  let stored;
  try {
    stored = await storeLoaFile(customerId, file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not store the LOA file." };
  }
  if (!stored) return { error: "Choose an LOA file to store." };

  await prisma.loaDocument.create({
    data: {
      customerId,
      fileName: stored.loaFileName,
      storedName: stored.loaStoredName,
      mimeType: file.type || null,
      source: "UPLOAD",
      note: optionalStr(formData.get("note")),
    },
  });
  await logActivity(customerId, "LOA_UPLOADED", `LOA copy stored: ${stored.loaFileName}.`);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/customers");
  return { saved: stored.loaFileName };
}

export async function sendLoaAction(
  _prev: LoaActionState,
  formData: FormData,
): Promise<LoaActionState> {
  const denied = await staffActionError();
  if (denied) return denied;
  const customerId = str(formData.get("customerId"));
  const leadId = optionalStr(formData.get("leadId"));
  if (!customerId) return { error: "Customer is missing." };
  const result = await sendCustomerLoa({ customerId, leadId });
  if (!result.error) {
    revalidatePath("/");
    revalidatePath("/customers");
    revalidatePath("/leads");
    revalidatePath(`/customers/${customerId}`);
    if (leadId) revalidatePath(`/leads/${leadId}`);
  }
  return { ...result, connected: result.connected ?? isDocusignConfigured() };
}

export async function syncLoaAction(formData: FormData) {
  if (await staffActionError()) return;
  const customerId = optionalStr(formData.get("customerId"));
  await syncOpenLoaEnvelopes();
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/leads");
  }
}
