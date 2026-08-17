"use server";

import { revalidatePath } from "next/cache";
import { isDocusignConfigured } from "@/lib/docusign";
import { sendCustomerLoa, syncOpenLoaEnvelopes, type SendLoaResult } from "@/lib/loa-send";
import { optionalStr, str } from "@/lib/format";

export type LoaActionState = SendLoaResult;

export async function sendLoaAction(
  _prev: LoaActionState,
  formData: FormData,
): Promise<LoaActionState> {
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
  const customerId = optionalStr(formData.get("customerId"));
  await syncOpenLoaEnvelopes();
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/leads");
  }
}
