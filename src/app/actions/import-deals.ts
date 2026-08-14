"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { parseDealCsv, rowToRecord, validateDealRow, type DealPreviewRow } from "@/lib/csv-deals";
import { parseCsvDate, parseCsvMoney } from "@/lib/csv-dates";
import { liveDealOnSupply } from "@/lib/deals";
import { optionalStr, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type DealImportState = {
  error?: string;
  preview?: {
    rows: DealPreviewRow[];
    createCustomers: number;
    createMeters: number;
    createDeals: number;
    updateDeals: number;
    blocked: number;
  };
  committed?: {
    createCustomers: number;
    createMeters: number;
    createDeals: number;
    updateDeals: number;
  };
};

function headerMap(cells: string[]) {
  return cells.map((cell) => cell.replace(/^\uFEFF/, "").trim());
}

function emailsFrom(value: string) {
  return value
    .split(/[;,]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function buildPreview(text: string): Promise<DealImportState> {
  const table = parseDealCsv(text);
  if (table.length < 2) return { error: "The CSV needs a header row and at least one data row." };
  const header = headerMap(table[0]);
  if (!header.includes("companyName") || !header.includes("supplier")) {
    return { error: "Use the deals export columns — companyName and supplier are required." };
  }

  const rows = table.slice(1).map((cells, index) => validateDealRow(rowToRecord(header, cells), index + 2));
  const emails = rows.map((row) => row.email).filter(Boolean);
  const companies = rows.map((row) => row.companyName).filter(Boolean);
  const mpans = rows.map((row) => row.mpan).filter((value): value is string => Boolean(value));
  const mprns = rows.map((row) => row.mprn).filter((value): value is string => Boolean(value));

  const [customers, meters, deals] = await Promise.all([
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
    prisma.deal.findMany({
      include: { customer: true, meter: true },
    }),
  ]);

  let createCustomers = 0;
  let createMeters = 0;
  let createDeals = 0;
  let updateDeals = 0;
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
    const start = parseCsvDate(row.values.contractStart);

    if (customer) {
      row.customerMatch = customer.companyName;
    } else if (!seenNew.has(row.email)) {
      createCustomers += 1;
      seenNew.add(row.email);
    }

    if (meter && customer && meter.customerId !== customer.id) {
      row.errors.push(`MPAN/MPRN already sits on ${meter.customer.companyName} — left untouched.`);
      row.action = "SKIP";
      blocked += 1;
      continue;
    }

    if ((row.mpan || row.mprn) && !meter) {
      createMeters += 1;
    }

    const deal = deals.find((item) => {
      if (customer && item.customerId !== customer.id) return false;
      if (!customer && item.customer.email.toLowerCase() !== row.email) return false;
      if (meter && item.meterId && item.meterId !== meter.id) return false;
      if (item.supplier.toLowerCase() !== row.supplier.toLowerCase()) return false;
      if (start && item.contractStart && toDay(item.contractStart) !== toDay(start)) return false;
      return true;
    });

    if (deal) {
      row.dealMatch = `${deal.supplier} · ${deal.customer.companyName}`;
      row.action = "UPDATE_DEAL";
      updateDeals += 1;
    } else {
      row.action = "CREATE_DEAL";
      createDeals += 1;
    }
  }

  return { preview: { rows, createCustomers, createMeters, createDeals, updateDeals, blocked } };
}

function toDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function runDealImport(
  _prev: DealImportState,
  formData: FormData,
): Promise<DealImportState> {
  const intent = str(formData.get("intent")) || "preview";
  const file = formData.get("file");
  const pasted = str(formData.get("csv"));
  const text = pasted || (file instanceof File && file.size > 0 ? await file.text() : "");
  if (!text) return { error: "Choose a CSV file." };
  if (text.length > 2 * 1024 * 1024) return { error: "CSV must be under 2MB." };
  const preview = await buildPreview(text);
  if (preview.error || !preview.preview) return preview;
  if (intent !== "commit") return preview;

  let createCustomers = 0;
  let createMeters = 0;
  let createDeals = 0;
  let updateDeals = 0;

  for (const row of preview.preview.rows) {
    if (row.errors.length || row.action === "SKIP") continue;
    const values = row.values;

    let customer = await prisma.customer.findFirst({
      where: {
        OR: [{ email: row.email }, { companyName: { equals: row.companyName } }],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          companyName: row.companyName,
          contactName: row.companyName,
          email: row.email,
        },
      });
      createCustomers += 1;
      await logActivity(customer.id, "CUSTOMER_CREATED", `Customer ${customer.companyName} imported from deals CSV.`);
    }

    let meter =
      row.mpan || row.mprn
        ? await prisma.meter.findFirst({
            where: {
              OR: [
                row.mpan ? { mpan: row.mpan } : undefined,
                row.mprn ? { mprn: row.mprn } : undefined,
              ].filter(Boolean) as { mpan?: string; mprn?: string }[],
            },
          })
        : null;

    if (meter && meter.customerId !== customer.id) continue;

    if (!meter && (row.mpan || row.mprn)) {
      meter = await prisma.meter.create({
        data: {
          customerId: customer.id,
          siteName: row.siteName || row.companyName,
          fuelType: row.fuelType,
          mpan: row.mpan,
          mprn: row.mprn,
        },
      });
      createMeters += 1;
      await logActivity(customer.id, "METER_ADDED", `Meter imported with deal: ${row.mpan || row.mprn}.`);
    }

    const salesperson = optionalStr(values.salespersonEmail)
      ? await prisma.agent.findFirst({ where: { email: values.salespersonEmail } })
      : null;
    const agentEmails = emailsFrom(values.agentEmails ?? "");
    const agents = agentEmails.length
      ? await prisma.agent.findMany({ where: { email: { in: agentEmails } } })
      : [];
    const agentIds = [...new Set(agents.map((agent) => agent.id))];
    if (salesperson && !agentIds.includes(salesperson.id)) agentIds.unshift(salesperson.id);

    const start = parseCsvDate(values.contractStart);
    let existing = await prisma.deal.findFirst({
      where: {
        customerId: customer.id,
        supplier: row.supplier,
        ...(meter ? { meterId: meter.id } : {}),
        ...(start ? { contractStart: start } : {}),
      },
    });

    if (!existing && meter && row.status === "LIVE") {
      const live = await liveDealOnSupply({ meterId: meter.id, status: "LIVE" });
      if (live && live.customerId === customer.id && live.supplier.toLowerCase() === row.supplier.toLowerCase()) {
        existing = live;
      } else if (live && live.supplier.toLowerCase() !== row.supplier.toLowerCase()) {
        continue;
      }
    }

    const payload = {
      customerId: customer.id,
      meterId: meter?.id ?? existing?.meterId ?? null,
      salespersonId: salesperson?.id ?? existing?.salespersonId ?? agentIds[0] ?? null,
      supplier: row.supplier,
      fuelType: row.fuelType,
      status: row.status,
      contractStart: start ?? existing?.contractStart ?? null,
      contractEnd: parseCsvDate(values.contractEnd) ?? existing?.contractEnd ?? null,
      renewalDate: parseCsvDate(values.renewalDate) ?? existing?.renewalDate ?? null,
      dueDate: parseCsvDate(values.dueDate) ?? existing?.dueDate ?? null,
      amountDue: parseCsvMoney(values.amountDue) ?? existing?.amountDue ?? null,
      estimatedCommission: parseCsvMoney(values.estimatedCommission) ?? existing?.estimatedCommission ?? null,
      actualPaid: parseCsvMoney(values.actualPaid) ?? existing?.actualPaid ?? null,
    };

    if (existing) {
      await prisma.deal.update({
        where: { id: existing.id },
        data: {
          ...payload,
          allocations: agentIds.length
            ? {
                deleteMany: {},
                create: agentIds.map((agentId) => ({ agentId })),
              }
            : undefined,
        },
      });
      updateDeals += 1;
      await logActivity(customer.id, "DEAL_UPDATED", `${row.supplier} contract updated from deals CSV.`);
    } else {
      if (meter && row.status === "LIVE") {
        const clash = await liveDealOnSupply({ meterId: meter.id, status: "LIVE" });
        if (clash) continue;
      }
      await prisma.deal.create({
        data: {
          ...payload,
          allocations: {
            create: agentIds.map((agentId) => ({ agentId })),
          },
        },
      });
      createDeals += 1;
      await logActivity(customer.id, "DEAL_RECORDED", `${row.supplier} contract imported from deals CSV.`);
    }
  }

  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/contracts");
  revalidatePath("/finance");
  revalidatePath("/renewals");
  return {
    preview: preview.preview,
    committed: { createCustomers, createMeters, createDeals, updateDeals },
  };
}
