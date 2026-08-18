"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { commitImportRows } from "@/lib/csv-import-commit";
import type { ImportPreviewRow } from "@/lib/csv-import";
import { previewMeterImport } from "@/lib/csv-import-preview";
import { str } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { staffActionError } from "@/lib/staff-session";

export type ImportState = {
  error?: string;
  preview?: {
    rows: ImportPreviewRow[];
    createCustomers: number;
    createMeters: number;
    updateMeters: number;
    blocked: number;
  };
  committed?: {
    createCustomers: number;
    createMeters: number;
    updateMeters: number;
  };
};

export async function runImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const denied = await staffActionError();
  if (denied) return denied;
  const intent = str(formData.get("intent")) || "preview";
  const file = formData.get("file");
  const pasted = str(formData.get("csv"));
  const text =
    pasted || (file instanceof File && file.size > 0 ? await file.text() : "");
  if (!text) return { error: "Choose a CSV file." };
  if (text.length > 2 * 1024 * 1024) return { error: "CSV must be under 2MB." };
  const preview = await previewMeterImport(prisma, text);
  if (preview.error || !preview.preview) return preview;
  if (intent !== "commit") return preview;

  const committed = await commitImportRows(prisma, preview.preview.rows, logActivity);

  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/renewals");
  return {
    preview: preview.preview,
    committed,
  };
}
