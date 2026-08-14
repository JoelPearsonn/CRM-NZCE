"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import {
  parseCsv,
  rowToRecord,
  validateImportRow,
  type ImportPreviewRow,
} from "@/lib/csv-import";
import { optionalStr, parseIntField, str } from "@/lib/format";
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

  let createCustomers = 0;
  let createMeters = 0;
  let updateMeters = 0;

  for (const row of preview.preview.rows) {
    if (row.errors.length || row.action === "SKIP") continue;
    const values = row.values;

    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: row.email },
          { companyName: { equals: row.companyName } },
        ],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyName: row.companyName,
          tradingName: optionalStr(values.tradingName),
          contactName: row.contactName,
          email: row.email,
          phone: optionalStr(values.phone),
          industry: optionalStr(values.industry),
          addressLine1: optionalStr(values.addressLine1),
          city: optionalStr(values.city),
          postcode: optionalStr(values.postcode),
        },
      });
      createCustomers += 1;
      await logActivity(customer.id, "CUSTOMER_CREATED", `Customer ${customer.companyName} imported from CSV.`);
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          contactName: row.contactName || customer.contactName,
          phone: optionalStr(values.phone) ?? customer.phone,
          industry: optionalStr(values.industry) ?? customer.industry,
          addressLine1: optionalStr(values.addressLine1) ?? customer.addressLine1,
          city: optionalStr(values.city) ?? customer.city,
          postcode: optionalStr(values.postcode) ?? customer.postcode,
          tradingName: optionalStr(values.tradingName) ?? customer.tradingName,
        },
      });
    }

    const salesperson = optionalStr(values.salespersonEmail)
      ? await prisma.agent.findFirst({ where: { email: values.salespersonEmail } })
      : null;

    const existing = await prisma.meter.findFirst({
      where: {
        OR: [
          row.mpan ? { mpan: row.mpan } : undefined,
          row.mprn ? { mprn: row.mprn } : undefined,
        ].filter(Boolean) as { mpan?: string; mprn?: string }[],
      },
    });

    if (existing && existing.customerId !== customer.id) continue;

    const meterData = {
      customerId: customer.id,
      siteName: row.siteName,
      siteAddress: optionalStr(values.siteAddress),
      fuelType: row.fuelType,
      mpan: row.mpan,
      mprn: row.mprn,
      electricEac: parseIntField(values.electricEac),
      gasAq: parseIntField(values.gasAq),
      supplier: optionalStr(values.supplier),
      settlement: optionalStr(values.settlement),
      loaStatus: optionalStr(values.loaStatus)?.toUpperCase() || "NOT_REQUESTED",
      salespersonId: salesperson?.id ?? existing?.salespersonId ?? null,
    };

    if (existing) {
      await prisma.meter.update({
        where: { id: existing.id },
        data: meterData,
      });
      updateMeters += 1;
      await logActivity(customer.id, "METER_UPDATED", `Meter updated from CSV: ${row.mpan || row.mprn}.`);
    } else {
      await prisma.meter.create({ data: meterData });
      createMeters += 1;
      await logActivity(customer.id, "METER_ADDED", `Meter imported: ${row.mpan || row.mprn}.`);
    }
  }

  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/renewals");
  return {
    preview: preview.preview,
    committed: { createCustomers, createMeters, updateMeters },
  };
}
