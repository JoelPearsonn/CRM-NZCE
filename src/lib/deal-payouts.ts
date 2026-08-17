import { PAYMENT_STAGES, TPI_PARTNERS, tpiPercentFor } from "@/lib/constants";
import {
  netCommission,
  residualDates,
  rollupPayments,
  splitByPercent,
  type PaymentLike,
} from "@/lib/finance";
import { parseDate, parseMoney } from "@/lib/format";

export const SPLIT_STAGES = ["ON_SIGN", "ON_LIVE", "EOC"] as const;

export type BuiltPayment = PaymentLike & {
  stage: string;
  label: string;
  percent: number;
  expectedDate: Date | null;
  amountDue: number;
  actualPaid: number;
  sortOrder: number;
  amountOverride?: number | null;
};

export function normalizeSplitPercents(raw: number[]) {
  const parts = raw.slice(0, 3);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function stageLabel(stage: string, fallback: string) {
  return PAYMENT_STAGES.find((item) => item.value === stage)?.label ?? fallback;
}

export function parseTpiPartner(raw: string | null | undefined) {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!value || value === "none" || value === "direct" || value === "none / direct" || value === "none/direct") {
    return "NONE";
  }
  if (value === "joose_ucr" || value === "joose + ucr" || value === "joose+ucr") return "JOOSE_UCR";
  if (value === "joose") return "JOOSE";
  if (value === "infinite" || value === "infinite_20" || value === "infinite energy 20%") return "INFINITE";
  const known = TPI_PARTNERS.find(
    (item) => item.value.toLowerCase() === value || item.label.toLowerCase() === value,
  );
  return known?.value ?? "NONE";
}

export function parsePayoutType(raw: string | null | undefined) {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "residual" || value === "monthly" || value === "monthly residual") return "RESIDUAL";
  return "SPLIT";
}

export function parsePayoutPercents(raw: string | null | undefined) {
  const value = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!value) return [40, 40, 20];
  const parts = value.split(/[/_]+/).map((part) => Number(part));
  if (
    (parts.length === 2 || parts.length === 3) &&
    parts.every((part) => Number.isFinite(part) && part >= 0)
  ) {
    const total = parts.reduce((sum, part) => sum + part, 0);
    if (Math.abs(total - 100) <= 0.5) return normalizeSplitPercents(parts);
  }
  return [40, 40, 20];
}

export function resolveTpi(partner: string, rawPercent: number | null) {
  const known = parseTpiPartner(partner);
  const percent = rawPercent == null ? tpiPercentFor(known) : Math.min(100, Math.max(0, rawPercent));
  return { tpiPartner: known, tpiPercent: percent };
}

export function applyResidual(
  gross: number | null,
  tpiPercent: number,
  live: Date,
  ced: Date,
  monthlyOverride: number | null,
  existing: { expectedDate: Date | null; actualPaid: number | null }[] = [],
): { net: number; payments: BuiltPayment[]; rollup: ReturnType<typeof rollupPayments> } {
  const net = netCommission(gross, tpiPercent);
  const dates = residualDates(live, ced);
  const amounts =
    monthlyOverride != null && monthlyOverride > 0
      ? dates.map(() => monthlyOverride)
      : splitByPercent(
          net,
          dates.map(() => 100 / dates.length),
        );
  const paidByMonth = new Map(
    existing
      .filter((row) => row.expectedDate)
      .map((row) => [monthKey(row.expectedDate as Date), row.actualPaid ?? 0]),
  );
  const payments = dates.map((date, index) => ({
    stage: "RESIDUAL",
    label: residualLabel(date),
    percent: monthlyOverride != null && monthlyOverride > 0 ? 0 : roundShare(dates.length),
    expectedDate: date,
    amountDue: amounts[index] ?? 0,
    actualPaid: paidByMonth.get(monthKey(date)) ?? 0,
    sortOrder: index,
  }));
  return { net, payments, rollup: rollupPayments(payments) };
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function residualLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function roundShare(count: number) {
  return Math.round((100 / Math.max(1, count)) * 100) / 100;
}

export function parseDealPayments(formData: FormData): { error?: string; payments: BuiltPayment[] } {
  if (String(formData.get("payoutType") ?? "SPLIT") === "RESIDUAL") {
    return { payments: [] };
  }
  const count = 3;
  const drafts: BuiltPayment[] = [];

  for (let index = 0; index < count; index += 1) {
    const stage = String(formData.get(`paymentStage_${index}`) ?? "").trim() || SPLIT_STAGES[index] || "ON_SIGN";
    const label =
      String(formData.get(`paymentLabel_${index}`) ?? "").trim() ||
      `Payment ${index + 1} · ${stageLabel(stage, `Payment ${index + 1}`)}`;
    const percent = Number(String(formData.get(`paymentPercent_${index}`) ?? "").replace(/%/g, ""));
    if (!Number.isFinite(percent) || percent < 0) {
      return { error: "Each payout needs a % of net commission.", payments: [] };
    }
    drafts.push({
      stage,
      label,
      percent,
      expectedDate: parseDate(formData.get(`paymentDate_${index}`)),
      amountDue: 0,
      actualPaid: 0,
      sortOrder: index,
      amountOverride: parseMoney(formData.get(`paymentAmount_${index}`)),
    });
  }

  const total = drafts.reduce((sum, row) => sum + row.percent, 0);
  if (Math.abs(total - 100) > 0.5) {
    return { error: "Payout percentages must add up to 100%.", payments: [] };
  }

  return { payments: drafts };
}

export function applyPayouts(
  gross: number | null,
  tpiPercent: number,
  drafts: BuiltPayment[],
): { net: number; payments: BuiltPayment[]; rollup: ReturnType<typeof rollupPayments> } {
  const net = netCommission(gross, tpiPercent);
  const amounts = splitByPercent(
    net,
    drafts.map((row) => row.percent),
  );
  const payments = drafts.map((row, index) => ({
    ...row,
    amountDue: row.amountOverride != null ? row.amountOverride : (amounts[index] ?? 0),
    actualPaid: 0,
    sortOrder: index,
  }));
  return { net, payments, rollup: rollupPayments(payments) };
}

export function splitPaymentLabel(index: number, stage: string) {
  return `Payment ${index + 1} · ${stageLabel(stage, `Payment ${index + 1}`)}`;
}

function splitDrafts(
  percents: number[],
  dates: { sign: Date | null; live: Date | null; eoc: Date | null },
  explicitDates?: (Date | null | undefined)[],
): BuiltPayment[] {
  const parts = normalizeSplitPercents(percents);
  return parts.map((percent, index) => {
    const stage = SPLIT_STAGES[index] ?? "ON_SIGN";
    const derived =
      percent <= 0 ? null : stage === "EOC" ? dates.eoc : stage === "ON_LIVE" ? dates.live : dates.sign;
    const explicit = explicitDates?.[index];
    return {
      stage,
      label: splitPaymentLabel(index, stage),
      percent,
      expectedDate: explicit !== undefined ? explicit : derived,
      amountDue: 0,
      actualPaid: 0,
      sortOrder: index,
    };
  });
}

function applyLumpPaid(payments: BuiltPayment[], lump: number | null) {
  if (lump == null || lump <= 0) return payments;
  if (payments.some((row) => (row.actualPaid ?? 0) > 0.004)) return payments;
  let remaining = lump;
  return payments.map((row) => {
    const take = Math.min(row.amountDue, remaining);
    remaining = Math.round((remaining - take) * 100) / 100;
    return { ...row, actualPaid: take };
  });
}

export function payoutLabel(payoutType: string, percents: number[], monthCount: number) {
  if (payoutType === "RESIDUAL") {
    return monthCount ? `Monthly residual · ${monthCount} months` : "Monthly residual";
  }
  const shown = [...percents];
  while (shown.length > 2 && shown[shown.length - 1] === 0) shown.pop();
  return shown.join(" / ");
}

export function buildImportedFinance(input: {
  estimatedCommission: number | null;
  tpiPartner: string;
  tpiPercent: number | null;
  payoutType?: string | null;
  payoutSplit?: string | null;
  residualMonthly?: number | null;
  contractStart: Date | null;
  contractEnd: Date | null;
  dueDate?: Date | null;
  actualPaid?: number | null;
  actualPaidDate?: Date | null;
  expectedDates?: (Date | null | undefined)[];
  amounts?: (number | null | undefined)[];
  payment1Fixed?: number | null;
  existingPayments?: { stage: string; expectedDate: Date | null; actualPaid: number | null }[];
}): {
  error?: string;
  tpiPartner: string;
  tpiPercent: number;
  payoutType: "SPLIT" | "RESIDUAL";
  residualMonthly: number | null;
  percents: number[];
  net: number;
  payments: BuiltPayment[];
  rollup: ReturnType<typeof rollupPayments> & { actualPaidDate: Date | null };
  actualPaidDate: Date | null;
} {
  const tpi = resolveTpi(input.tpiPartner, input.tpiPercent);
  const residualMonthly = input.residualMonthly != null && input.residualMonthly > 0 ? input.residualMonthly : null;
  const payoutType: "SPLIT" | "RESIDUAL" =
    residualMonthly != null || parsePayoutType(input.payoutType) === "RESIDUAL" ? "RESIDUAL" : "SPLIT";
  const start = input.contractStart;
  const end = input.contractEnd;
  if (start && end && end < start) {
    return {
      error: "Contract end (CED) must be on or after contract start (CSD).",
      tpiPartner: tpi.tpiPartner,
      tpiPercent: tpi.tpiPercent,
      payoutType,
      residualMonthly,
      percents: [],
      net: netCommission(input.estimatedCommission, tpi.tpiPercent),
      payments: [],
      rollup: { amountDue: 0, actualPaid: 0, dueDate: null, actualPaidDate: input.actualPaidDate ?? null },
      actualPaidDate: input.actualPaidDate ?? null,
    };
  }
  if (payoutType === "RESIDUAL") {
    if (!start || !end) {
      return {
        error: "Monthly residual needs a live date (CSD) and CED.",
        tpiPartner: tpi.tpiPartner,
        tpiPercent: tpi.tpiPercent,
        payoutType,
        residualMonthly,
        percents: [],
        net: netCommission(input.estimatedCommission, tpi.tpiPercent),
        payments: [],
        rollup: { amountDue: 0, actualPaid: 0, dueDate: null, actualPaidDate: input.actualPaidDate ?? null },
        actualPaidDate: input.actualPaidDate ?? null,
      };
    }
    const built = applyResidual(
      input.estimatedCommission,
      tpi.tpiPercent,
      start,
      end,
      residualMonthly,
      input.existingPayments ?? [],
    );
    const payments = applyLumpPaid(built.payments, input.actualPaid ?? null);
    const rollup = rollupPayments(payments);
    return {
      tpiPartner: tpi.tpiPartner,
      tpiPercent: tpi.tpiPercent,
      payoutType,
      residualMonthly,
      percents: [],
      net: built.net,
      payments,
      rollup: { ...rollup, actualPaidDate: input.actualPaidDate ?? null },
      actualPaidDate: input.actualPaidDate ?? null,
    };
  }

  const percents = parsePayoutPercents(input.payoutSplit);
  const drafts = splitDrafts(
    percents,
    {
      sign: input.dueDate ?? start,
      live: start,
      eoc: end,
    },
    input.expectedDates,
  );
  drafts.forEach((draft, index) => {
    const amount = input.amounts?.[index];
    if (amount != null) draft.amountOverride = amount;
  });
  if (input.payment1Fixed != null && drafts[0]) {
    drafts[0].amountOverride = input.payment1Fixed;
  }
  const built = applyPayouts(input.estimatedCommission, tpi.tpiPercent, drafts);
  const payments = built.payments.map((row) => ({ ...row, actualPaid: 0 }));
  const rollup = rollupPayments(payments);
  return {
    tpiPartner: tpi.tpiPartner,
    tpiPercent: tpi.tpiPercent,
    payoutType,
    residualMonthly,
    percents,
    net: built.net,
    payments,
    rollup: {
      ...rollup,
      actualPaid: input.actualPaid ?? 0,
      actualPaidDate: input.actualPaidDate ?? null,
    },
    actualPaidDate: input.actualPaidDate ?? null,
  };
}
