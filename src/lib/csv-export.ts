import {
  customerArchiveWhere,
  customerMatchesFilters,
  leadMatchesSearch,
  meterMatchesFilters,
  type BookFilters,
  type LeadFilters,
} from "@/lib/book-filters";
import { CSV_DEAL_HEADERS, CSV_IMPORT_HEADERS, CSV_LEAD_HEADERS } from "@/lib/constants";
import { toDateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export function csvCell(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replaceAll('"', '""')}"`;
  return raw;
}

export function toCsv(headers: readonly string[], rows: Array<Array<string | number | null | undefined>>) {
  return `${headers.join(",")}\n${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function csvResponse(filename: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function meterRow(customer: {
  companyName: string;
  tradingName: string | null;
  contactName: string;
  email: string;
  phone: string | null;
  industry: string | null;
  addressLine1: string | null;
  city: string | null;
  postcode: string | null;
}, meter?: {
  siteName: string | null;
  siteAddress: string | null;
  fuelType: string;
  mpan: string | null;
  mprn: string | null;
  electricEac: number | null;
  gasAq: number | null;
  supplier: string | null;
  settlement: string | null;
  loaStatus: string;
  salesperson?: { email: string } | null;
  contractStart?: Date | null;
  contractEnd?: Date | null;
  renewalDate?: Date | null;
  currentRates?: string | null;
  meterType?: string | null;
  objectionStatus?: string | null;
  objectionNote?: string | null;
}) {
  return [
    customer.companyName,
    customer.tradingName,
    customer.contactName,
    customer.email,
    customer.phone,
    customer.industry,
    customer.addressLine1,
    customer.city,
    customer.postcode,
    meter?.siteName ?? "",
    meter?.siteAddress ?? "",
    meter?.fuelType ?? "",
    meter?.mpan ?? "",
    meter?.mprn ?? "",
    meter?.electricEac ?? "",
    meter?.gasAq ?? "",
    meter?.supplier ?? "",
    meter?.settlement ?? "",
    meter?.loaStatus ?? "",
    meter?.salesperson?.email ?? "",
    toDateInput(meter?.contractStart ?? null),
    toDateInput(meter?.contractEnd ?? null),
    toDateInput(meter?.renewalDate ?? null),
    meter?.currentRates ?? "",
    meter?.meterType ?? "",
    meter?.objectionStatus ?? "",
    meter?.objectionNote ?? "",
  ];
}

const emptyBook: BookFilters = {
  renewal: "",
  loa: "",
  objection: "",
  salesperson: "",
  showArchived: false,
};

export async function exportCustomersCsv(filters: BookFilters = emptyBook) {
  const customers = await prisma.customer.findMany({
    where: customerArchiveWhere(filters.showArchived),
    include: { meters: { include: { salesperson: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { companyName: "asc" },
  });
  const rows = customers
    .filter((customer) => customerMatchesFilters(customer, filters))
    .map((customer) => {
      const meter =
        customer.meters.find((item) => meterMatchesFilters(item, filters)) ?? customer.meters[0];
      return meterRow(customer, meter);
    });
  return csvResponse("nzce-customers.csv", toCsv(CSV_IMPORT_HEADERS, rows));
}

export async function exportMetersCsv(filters: BookFilters = emptyBook) {
  const meters = await prisma.meter.findMany({
    where: { customer: customerArchiveWhere(filters.showArchived) },
    include: { customer: true, salesperson: true },
    orderBy: [{ customer: { companyName: "asc" } }, { siteName: "asc" }],
  });
  const rows = meters
    .filter((meter) => meterMatchesFilters(meter, filters))
    .map((meter) => meterRow(meter.customer, meter));
  return csvResponse("nzce-meters.csv", toCsv(CSV_IMPORT_HEADERS, rows));
}

export async function exportDealsCsv() {
  const deals = await prisma.deal.findMany({
    where: { customer: { archivedAt: null } },
    include: {
      customer: true,
      meter: true,
      salesperson: true,
      allocations: { include: { agent: true } },
      payments: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { dueDate: "asc" },
  });
  const rows = deals.map((deal) => [
    deal.customer.companyName,
    deal.customer.email,
    deal.supplier,
    deal.fuelType,
    deal.status,
    deal.meter?.siteName ?? "",
    deal.meter?.mpan ?? "",
    deal.meter?.mprn ?? "",
    toDateInput(deal.contractStart),
    toDateInput(deal.contractEnd),
    toDateInput(deal.renewalDate),
    toDateInput(deal.dueDate),
    deal.amountDue,
    deal.estimatedCommission,
    deal.actualPaid,
    deal.salesperson?.email ?? "",
    deal.allocations.map((row) => row.agent.email).join(";"),
    deal.tpiPartner,
    deal.tpiPercent,
    deal.payoutType,
    deal.payoutType === "RESIDUAL"
      ? ""
      : deal.payments.length === 2
        ? deal.payments.map((row) => row.percent).join("/")
        : deal.payments.length
          ? deal.payments.map((row) => row.percent).join("/")
          : "40/40/20",
    deal.residualMonthly ?? "",
  ]);
  return csvResponse("nzce-deals.csv", toCsv(CSV_DEAL_HEADERS, rows));
}

export async function exportLeadsCsv(filters: LeadFilters = { stage: "", agent: "", q: "" }) {
  const leads = await prisma.lead.findMany({
    where: {
      customer: { archivedAt: null },
      ...(filters.stage ? { stage: filters.stage } : {}),
    },
    include: {
      customer: { include: { meters: { select: { mpan: true, mprn: true, siteName: true } } } },
      allocations: { include: { agent: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const rows = leads
    .filter((lead) => {
      if (filters.agent && !lead.allocations.some((row) => row.agentId === filters.agent)) return false;
      return leadMatchesSearch(lead, filters.q);
    })
    .map((lead) => [
      lead.customer.companyName,
      lead.customer.email,
      lead.title,
      lead.stage,
      lead.source,
      lead.outcomeReason,
      lead.allocations.map((row) => row.agent.email).join(";"),
      lead.notes,
    ]);
  return csvResponse("nzce-leads.csv", toCsv(CSV_LEAD_HEADERS, rows));
}
