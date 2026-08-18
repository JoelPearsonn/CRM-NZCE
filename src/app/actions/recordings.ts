"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { optionalStr, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { staffActionError } from "@/lib/staff-session";
import { storeRecordingFile } from "@/lib/recording-files";

export type ActionState = { error?: string };

export async function addCallRecording(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await staffActionError();
  if (denied) return denied;
  const customerId = str(formData.get("customerId"));
  const note = str(formData.get("note"));
  const authorId = optionalStr(formData.get("authorId"));
  const file = formData.get("file");

  if (!customerId) return { error: "Customer is missing." };
  if (!note) return { error: "Add a short note — who called, and what it covers." };
  if (!(file instanceof File) || file.size <= 0) {
    return { error: "Choose an audio file or a text transcript." };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer not found." };

  let stored;
  try {
    stored = await storeRecordingFile(customerId, file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not store the file." };
  }
  if (!stored) return { error: "Choose an audio file or a text transcript." };

  await prisma.callRecording.create({
    data: {
      customerId,
      authorId,
      note,
      fileName: stored.fileName,
      storedName: stored.storedName,
      mimeType: stored.mimeType,
    },
  });
  await logActivity(
    customerId,
    "RECORDING_ADDED",
    `Recording or transcript stored: ${stored.fileName}.`,
    authorId,
  );
  revalidatePath(`/customers/${customerId}`);
  return {};
}
