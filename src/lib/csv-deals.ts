import { CSV_DEAL_HEADERS, DEAL_STATUSES, FUEL_TYPES, labelFor, TPI_PARTNERS } from "@/lib/constants";
import { parseCsvDate, parseCsvMoney } from "@/lib/csv-dates";
import { csvLine, parseCsv, rowToRecord } from "@/lib/csv-import";
import { buildImportedFinance, payoutLabel } from "@/lib/deal-payouts";
import { isEmail } from "@/lib/format";

export type DealImportAction = "CREATE_DEAL" | "UPDATE_DEAL" | "SKIP";

export type DealPreviewRow = {
  line: number;
  companyName: string;
  email: string;
  supplier: string;
  fuelType: string;
  status: string;
  siteName: string;
  mpan: string | null;
  mprn: string | null;
  action: DealImportAction;
  customerMatch: string | null;
  dealMatch: string | null;
  errors: string[];
  values: Record<string, string>;
  tpiLabel?: string;
  payoutLabel?: string;
  net?: number;
  amountDue?: number;
};

const FUELS = new Set<string>(FUEL_TYPES.map((item) => item.value));
const STATUSES = new Set<string>(DEAL_STATUSES.map((item) => item.value));

export function dealsCsvTemplate() {
  return `${csvLine(CSV_DEAL_HEADERS)}\n${csvLine([
    "Example Bakery Ltd",
    "samira@example-bakery.co.uk",
    "Octopus Energy",
    "ELECTRIC",
    "LIVE",
    "Stokes Croft",
    "1234567890123",
    "",
    "2026-04-01",
    "2027-03-31",
    "2027-03-31",
    "2026-05-15",
    "1800",
    "1800",
    "0",
    "tom.brennan@nzce.co.uk",
    "tom.brennan@nzce.co.uk",
    "NONE",
    "0",
    "SPLIT",
    "40/40/20",
    "",
  ])}\n`;
}

export function validateDealRow(values: Record<string, string>, line: number): DealPreviewRow {
  const errors: string[] = [];
  const companyName = values.companyName ?? "";
  const email = (values.email ?? "").toLowerCase();
  const supplier = values.supplier ?? "";
  const fuelType = (values.fuelType ?? "ELECTRIC").toUpperCase();
  const status = (values.status ?? "LIVE").toUpperCase();
  const mpan = (values.mpan ?? "").replace(/\D/g, "") || null;
  const mprn = (values.mprn ?? "").replace(/\D/g, "") || null;
  const siteName = values.siteName ?? "";

  if (!companyName) errors.push("Company name is required.");
  if (!email || !isEmail(email)) errors.push("A valid email is required to match the customer.");
  if (!supplier) errors.push("Supplier is required.");
  if (!FUELS.has(fuelType)) errors.push("Fuel must be ELECTRIC, GAS or DUAL.");
  if (!STATUSES.has(status)) errors.push("Status must be LIVE, PENDING, EXPIRED or CANCELLED.");
  if (values.contractStart && !parseCsvDate(values.contractStart)) {
    errors.push("Contract start should be YYYY-MM-DD.");
  }
  if (values.contractEnd && !parseCsvDate(values.contractEnd)) {
    errors.push("Contract end should be YYYY-MM-DD.");
  }
  if (values.renewalDate && !parseCsvDate(values.renewalDate)) {
    errors.push("Renewal date should be YYYY-MM-DD.");
  }
  if (values.dueDate && !parseCsvDate(values.dueDate)) {
    errors.push("Due date should be YYYY-MM-DD.");
  }
  if (values.amountDue && parseCsvMoney(values.amountDue) == null) {
    errors.push("Amount due is not a number.");
  }
  if (values.estimatedCommission && parseCsvMoney(values.estimatedCommission) == null) {
    errors.push("Estimated commission is not a number.");
  }
  if (values.actualPaid && parseCsvMoney(values.actualPaid) == null) {
    errors.push("Actual paid is not a number.");
  }
  if (values.residualMonthly && parseCsvMoney(values.residualMonthly) == null) {
    errors.push("Residual £/month is not a number.");
  }

  const finance = importedDealFinance(values);
  if (finance.error) errors.push(finance.error);

  return {
    line,
    companyName,
    email,
    supplier,
    fuelType,
    status,
    siteName,
    mpan,
    mprn,
    action: errors.length ? "SKIP" : "CREATE_DEAL",
    customerMatch: null,
    dealMatch: null,
    errors,
    values: { ...values, email, fuelType, status, mpan: mpan ?? "", mprn: mprn ?? "" },
    ...financePreviewFields(finance),
  };
}

export type ExistingDealFinance = {
  estimatedCommission: number | null;
  tpiPartner: string;
  tpiPercent: number | null;
  payoutType: string;
  residualMonthly: number | null;
  contractStart: Date | null;
  contractEnd: Date | null;
  dueDate: Date | null;
  actualPaid: number | null;
  payments: { stage: string; percent: number; expectedDate: Date | null; actualPaid: number | null }[];
};

export function importedDealGross(
  values: Record<string, string>,
  existing?: Pick<ExistingDealFinance, "estimatedCommission">,
) {
  return (
    parseCsvMoney(values.estimatedCommission) ??
    parseCsvMoney(values.amountDue) ??
    existing?.estimatedCommission ??
    null
  );
}

export function importedDealFinance(values: Record<string, string>, existing?: ExistingDealFinance) {
  return buildImportedFinance({
    estimatedCommission: importedDealGross(values, existing),
    tpiPartner: values.tpiPartner || existing?.tpiPartner || "NONE",
    tpiPercent: values.tpiPercent?.trim()
      ? parseCsvMoney(values.tpiPercent)
      : (existing?.tpiPercent ?? null),
    payoutType: values.payoutType || existing?.payoutType,
    payoutSplit:
      values.payoutSplit ||
      (existing?.payoutType !== "RESIDUAL" && existing?.payments?.length
        ? existing.payments.map((row) => row.percent).join("/")
        : undefined),
    residualMonthly: parseCsvMoney(values.residualMonthly) ?? existing?.residualMonthly ?? null,
    contractStart: parseCsvDate(values.contractStart) ?? existing?.contractStart ?? null,
    contractEnd: parseCsvDate(values.contractEnd) ?? existing?.contractEnd ?? null,
    dueDate: parseCsvDate(values.dueDate) ?? existing?.dueDate ?? null,
    actualPaid: parseCsvMoney(values.actualPaid) ?? existing?.actualPaid ?? null,
    existingPayments: existing?.payments,
  });
}

function financePreviewFields(finance: ReturnType<typeof buildImportedFinance>) {
  return {
    tpiLabel: `${labelFor(TPI_PARTNERS, finance.tpiPartner)}${finance.tpiPercent ? ` · ${finance.tpiPercent}%` : ""}`,
    payoutLabel: payoutLabel(finance.payoutType, finance.percents, finance.payments.length),
    net: finance.net,
    amountDue: finance.rollup.amountDue,
  };
}

export function applyExistingDealToPreview(row: DealPreviewRow, existing: ExistingDealFinance) {
  const finance = importedDealFinance(row.values, existing);
  if (finance.error) {
    row.errors.push(finance.error);
    row.action = "SKIP";
  }
  Object.assign(row, financePreviewFields(finance));
}

export function parseDealCsv(text: string) {
  return parseCsv(text);
}

export { rowToRecord };
