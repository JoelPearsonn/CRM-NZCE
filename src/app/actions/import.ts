"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import {
  parseCsv,
  rowToRecord,
  validateImportRow,
  type ImportPreviewRow,
} from "@/lib/csv-import";
import { commitImportRows } from "@/lib/csv-import-commit";
import { str } from "@/lib/format";
import { prisma } from "@/lib/prisma";

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

function headerMap(cells: string[]) {
  return cells.map((cell) => cell.replace(/^\uFEFF/, "").trim());
}

async function buildPreview(text: string): Promise<ImportState> {
  const table = parseCsv(text);
  if (table.length < 2) return { error: "The CSV needs a header row and at least one data row." };
  const header = headerMap(table[0]);
  if (!header.includes("companyName") || !header.includes("email")) {
    return { error: "Use the NZCE template — companyName and email columns are required." };
  }

  const rows = table.slice(1).map((cells, index) => validateImportRow(rowToRecord(header, cells), index + 2));

  const emails = rows.map((row) => row.email).filter(Boolean);
  const mpans = rows.map((row) => row.mpan).filter((value): value is string => Boolean(value));
  const mprns = rows.map((row) => row.mprn).filter((value): value is string => Boolean(value));
  const companies = rows.map((row) => row.companyName).filter(Boolean);

  const [customers, meters] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [{ email: { in: emails } }, { companyName: { in: companies } }],
      },
    }),
    prisma.meter.findMany({
      where: {
        OR: [{ mpan: { in: mpans } }, { mprn: { in: mprns } }],
      },
      include: { customer: true },
    }),
  ]);

  let createCustomers = 0;
  let createMeters = 0;
  let updateMeters = 0;
  let blocked = 0;
  const seenNew = new Set<string>();

  for (const row of rows) {
    if (row.errors.length) {
      blocked += 1;
      continue;
    }
    const customer =
      customers.find((item) => item.email.toLowerCase() === row.email) ??
      customers.find((item) => item.companyName.toLowerCase() === row.companyName.toLowerCase());
    const meter = meters.find(
      (item) => (row.mpan && item.mpan === row.mpan) || (row.mprn && item.mprn === row.mprn),
    );

    if (customer) {
      row.customerMatch = customer.companyName;
    } else if (!seenNew.has(row.email)) {
      createCustomers += 1;
      seenNew.add(row.email);
    }

    if (meter) {
      if (customer && meter.customerId !== customer.id) {
        row.errors.push(`MPAN/MPRN already sits on ${meter.customer.companyName} — left untouched.`);
        row.action = "SKIP";
        blocked += 1;
        continue;
      }
      row.meterMatch = meter.mpan || meter.mprn || meter.id;
      row.action = "UPDATE_METER";
      updateMeters += 1;
    } else {
      row.action = customer || seenNew.has(row.email) ? "CREATE_METER" : "CREATE_CUSTOMER";
      createMeters += 1;
    }
  }

  return { preview: { rows, createCustomers, createMeters, updateMeters, blocked } };
}

export async function runImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const intent = str(formData.get("intent")) || "preview";
  const file = formData.get("file");
  const pasted = str(formData.get("csv"));
  const text =
    pasted || (file instanceof File && file.size > 0 ? await file.text() : "");
  if (!text) return { error: "Choose a CSV file." };
  if (text.length > 2 * 1024 * 1024) return { error: "CSV must be under 2MB." };
  const preview = await buildPreview(text);
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
