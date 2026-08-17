"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { isClosedLeadStage } from "@/lib/constants";
import { parseCsv, rowToRecord, validateLeadRow, type LeadPreviewRow } from "@/lib/csv-leads";
import { optionalStr, str } from "@/lib/format";
import { withMondayGroupNote } from "@/lib/lead-board";
import { prisma } from "@/lib/prisma";

export type LeadImportState = {
  error?: string;
  preview?: {
    rows: LeadPreviewRow[];
    createCustomers: number;
    createLeads: number;
    updateLeads: number;
    blocked: number;
  };
  committed?: {
    createCustomers: number;
    createLeads: number;
    updateLeads: number;
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

async function buildPreview(text: string): Promise<LeadImportState> {
  const table = parseCsv(text);
  if (table.length < 2) return { error: "The CSV needs a header row and at least one data row." };
  const header = headerMap(table[0]);
  if (!header.includes("companyName") || !header.includes("title")) {
    return { error: "Use the leads export columns — companyName and title are required." };
  }

  const rows = table.slice(1).map((cells, index) => validateLeadRow(rowToRecord(header, cells), index + 2));
  const emails = rows.map((row) => row.email).filter(Boolean);
  const companies = rows.map((row) => row.companyName).filter(Boolean);

  const [customers, leads] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [{ email: { in: emails } }, { companyName: { in: companies } }],
      },
    }),
    prisma.lead.findMany({ include: { customer: true } }),
  ]);

  let createCustomers = 0;
  let createLeads = 0;
  let updateLeads = 0;
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

    if (customer) {
      row.customerMatch = customer.companyName;
    } else if (!seenNew.has(row.email)) {
      createCustomers += 1;
      seenNew.add(row.email);
    }

    const lead = leads.find((item) => {
      if (customer && item.customerId !== customer.id) return false;
      if (!customer && item.customer.email.toLowerCase() !== row.email) return false;
      return item.title.toLowerCase() === row.title.toLowerCase();
    });

    if (lead) {
      row.leadMatch = lead.title;
      row.action = "UPDATE_LEAD";
      updateLeads += 1;
    } else {
      row.action = "CREATE_LEAD";
      createLeads += 1;
    }
  }

  return { preview: { rows, createCustomers, createLeads, updateLeads, blocked } };
}

export async function runLeadImport(
  _prev: LeadImportState,
  formData: FormData,
): Promise<LeadImportState> {
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
  let createLeads = 0;
  let updateLeads = 0;

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
      await logActivity(customer.id, "CUSTOMER_CREATED", `Customer ${customer.companyName} imported from leads CSV.`);
    }

    const agentEmails = emailsFrom(values.agentEmails ?? "");
    const agents = agentEmails.length
      ? await prisma.agent.findMany({ where: { email: { in: agentEmails } } })
      : [];
    const agentIds = [...new Set(agents.map((agent) => agent.id))];

    const existing = await prisma.lead.findFirst({
      where: { customerId: customer.id, title: row.title },
    });

    const payload = {
      customerId: customer.id,
      title: row.title,
      stage: row.stage,
      source: optionalStr(values.source),
      notes: withMondayGroupNote(optionalStr(values.notes), row.stage),
      outcomeReason: isClosedLeadStage(row.stage) ? optionalStr(values.outcomeReason) : null,
    };

    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          ...payload,
          allocations: agentIds.length
            ? { deleteMany: {}, create: agentIds.map((agentId) => ({ agentId })) }
            : undefined,
        },
      });
      updateLeads += 1;
      await logActivity(customer.id, "LEAD_UPDATED", `Lead updated from CSV: ${row.title}.`);
    } else {
      await prisma.lead.create({
        data: {
          ...payload,
          allocations: { create: agentIds.map((agentId) => ({ agentId })) },
        },
      });
      createLeads += 1;
      await logActivity(customer.id, "LEAD_CREATED", `Lead imported: ${row.title}.`);
    }
  }

  revalidatePath("/");
  revalidatePath("/customers");
  revalidatePath("/leads");
  return {
    preview: preview.preview,
    committed: { createCustomers, createLeads, updateLeads },
  };
}
