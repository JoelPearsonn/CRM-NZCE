import { gbp, parseMoney } from "@/lib/format";

export type FinanceDeal = {
  amountDue?: number | null;
  estimatedCommission?: number | null;
  actualPaid?: number | null;
};

export type PaymentLike = {
  stage: string;
  label: string;
  percent: number;
  expectedDate?: Date | null;
  amountDue?: number | null;
  actualPaid?: number | null;
};

export function roundPence(value: number) {
  return Math.round(value * 100) / 100;
}

export function netCommission(
  gross: number | null | undefined,
  tpiPercent: number | null | undefined,
) {
  const rate = Math.min(100, Math.max(0, tpiPercent ?? 0));
  return roundPence((gross ?? 0) * (1 - rate / 100));
}

export type LivePayoutLeg = {
  label: string;
  percent: number;
  amountDue: number;
  expectedDate: Date | null;
};

export type LiveDealPreview = {
  gross: number;
  tpiPercent: number;
  tpiAmount: number;
  net: number;
  totalDue: number;
  legs: LivePayoutLeg[];
};

function parseLiveDate(value: string | Date | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function residualMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Live form preview — same net / split / residual math as save, including UK money text. */
export function liveDealPreview(input: {
  gross: string | number | null | undefined;
  tpiPercent: string | number | null | undefined;
  payoutType?: string | null;
  percents?: number[];
  amounts?: (number | string | null | undefined)[];
  dates?: (Date | string | null | undefined)[];
  residualMonthly?: string | number | null;
  start?: string | Date | null;
  end?: string | Date | null;
}): LiveDealPreview {
  const gross = typeof input.gross === "number" ? input.gross : (parseMoney(input.gross ?? null) ?? 0);
  const tpiPercent =
    typeof input.tpiPercent === "number" ? input.tpiPercent : (parseMoney(input.tpiPercent ?? null) ?? 0);
  const residualNet = netCommission(gross, tpiPercent);
  const splitNet = gross;
  const isResidual = (input.payoutType ?? "SPLIT") === "RESIDUAL";
  const net = isResidual ? residualNet : splitNet;
  const tpiAmount = isResidual ? roundPence(Math.max(0, gross - residualNet)) : 0;

  if (isResidual) {
    const start = parseLiveDate(input.start);
    const end = parseLiveDate(input.end);
    if (!start || !end) {
      return { gross, tpiPercent, tpiAmount, net, totalDue: 0, legs: [] };
    }
    const monthly =
      typeof input.residualMonthly === "number"
        ? input.residualMonthly
        : parseMoney(input.residualMonthly ?? null);
    const dates = residualDates(start, end);
    const amounts =
      monthly != null && monthly > 0
        ? dates.map(() => monthly)
        : splitByPercent(
            net,
            dates.map(() => 100 / Math.max(1, dates.length)),
          );
    const legs = dates.map((date, index) => ({
      label: residualMonthLabel(date),
      percent: monthly != null && monthly > 0 ? 0 : roundPence(100 / Math.max(1, dates.length)),
      amountDue: amounts[index] ?? 0,
      expectedDate: date,
    }));
    return {
      gross,
      tpiPercent,
      tpiAmount,
      net,
      totalDue: roundPence(legs.reduce((sum, leg) => sum + leg.amountDue, 0)),
      legs,
    };
  }

  const percents = [...(input.percents?.length ? input.percents : [40, 40, 20])].slice(0, 3);
  while (percents.length < 3) percents.push(0);
  const derived = splitByPercent(net, percents);
  const labels = ["On Sign", "On Live", "EOC"];
  const legs = percents.map((percent, index) => {
    const override = input.amounts?.[index];
    const parsed =
      typeof override === "number" ? override : override != null && String(override).trim() ? parseMoney(override) : null;
    return {
      label: `Payment ${index + 1} · ${labels[index] ?? `Payment ${index + 1}`}`,
      percent,
      amountDue: parsed != null ? parsed : (derived[index] ?? 0),
      expectedDate: parseLiveDate(input.dates?.[index] ?? null),
    };
  });
  return {
    gross,
    tpiPercent,
    tpiAmount,
    net,
    totalDue: roundPence(legs.reduce((sum, leg) => sum + leg.amountDue, 0)),
    legs,
  };
}

export function splitByPercent(net: number, percents: number[]) {
  const amounts = percents.map((percent, index) =>
    index === percents.length - 1 ? 0 : roundPence((net * percent) / 100),
  );
  const used = amounts.slice(0, -1).reduce((sum, value) => sum + value, 0);
  if (amounts.length) amounts[amounts.length - 1] = roundPence(net - used);
  return amounts;
}

export function residualDates(live: Date, ced: Date) {
  const count = Math.max(1, contractMonths(live, ced) ?? 1);
  const dates: Date[] = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(live.getUTCFullYear(), live.getUTCMonth() + index, live.getUTCDate(), 12));
    if (date > ced && index > 0) break;
    dates.push(date);
  }
  return dates;
}

export function contractMonths(start: Date | null | undefined, end: Date | null | undefined) {
  if (!start || !end) return null;
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (endUtc <= startUtc) return 0;
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) -
    (end.getUTCDate() < start.getUTCDate() ? 1 : 0);
  return Math.max(0, months);
}

export function rollupPayments(payments: PaymentLike[]) {
  const due = roundPence(payments.reduce((sum, row) => sum + (row.amountDue ?? 0), 0));
  const paid = roundPence(payments.reduce((sum, row) => sum + (row.actualPaid ?? 0), 0));
  const unpaid = payments.filter(
    (row) => (row.amountDue ?? 0) > 0.004 && (row.amountDue ?? 0) - (row.actualPaid ?? 0) > 0.004,
  );
  const dueDate =
    unpaid
      .filter((row) => row.expectedDate)
      .slice()
      .sort(
        (left, right) =>
          (left.expectedDate as Date).getTime() - (right.expectedDate as Date).getTime(),
      )[0]?.expectedDate ?? null;
  return { amountDue: due, actualPaid: paid, dueDate };
}

export function groupByPaymentStage(deals: (FinanceDeal & { stage?: string; label?: string })[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const deal of deals) {
    const key = deal.stage ?? "OTHER";
    const label = deal.label ?? key;
    const bucket = map.get(key) ?? emptyBucket(key, label);
    addDeal(bucket, deal);
    map.set(key, bucket);
  }
  const order = ["ON_SIGN", "ON_LIVE", "EOC", "RESIDUAL", "RECEIVED"];
  return [...map.values()].sort((a, b) => {
    const left = order.indexOf(a.key);
    const right = order.indexOf(b.key);
    return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
  });
}

export type AnalyticsDeal = FinanceDeal & {
  id: string;
  customerId: string;
  dueDate: Date | null;
  salespersonId: string | null;
  customerName: string;
  salespersonName: string | null;
  supplier: string;
  agentIds: string[];
  agentNames: string[];
  stage?: string;
  label?: string;
  tpiPartner?: string;
};

export type Bucket = {
  key: string;
  label: string;
  due: number;
  paid: number;
  estimated: number;
  remaining: number;
  variance: number;
  dealCount: number;
  residualDue: number;
  splitDue: number;
  residualPaid: number;
  splitPaid: number;
};

export function dealRemaining(deal: FinanceDeal) {
  return Math.max(0, (deal.amountDue ?? 0) - (deal.actualPaid ?? 0));
}

export function splitAmounts(deal: FinanceDeal, agentCount: number): FinanceDeal {
  const share = Math.max(1, agentCount);
  return {
    amountDue: (deal.amountDue ?? 0) / share,
    actualPaid: (deal.actualPaid ?? 0) / share,
    estimatedCommission: (deal.estimatedCommission ?? 0) / share,
  };
}

export function financeTotals(deals: FinanceDeal[]) {
  const due = deals.reduce((sum, deal) => sum + (deal.amountDue ?? 0), 0);
  const paid = deals.reduce((sum, deal) => sum + (deal.actualPaid ?? 0), 0);
  const estimated = deals.reduce((sum, deal) => sum + (deal.estimatedCommission ?? 0), 0);
  return {
    due,
    paid,
    estimated,
    remaining: Math.max(0, due - paid),
    variance: estimated - paid,
  };
}

function emptyBucket(key: string, label: string): Bucket {
  return {
    key,
    label,
    due: 0,
    paid: 0,
    estimated: 0,
    remaining: 0,
    variance: 0,
    dealCount: 0,
    residualDue: 0,
    splitDue: 0,
    residualPaid: 0,
    splitPaid: 0,
  };
}

function addDeal(bucket: Bucket, deal: FinanceDeal & { stage?: string }) {
  bucket.due += deal.amountDue ?? 0;
  bucket.paid += deal.actualPaid ?? 0;
  bucket.estimated += deal.estimatedCommission ?? 0;
  bucket.remaining = Math.max(0, bucket.due - bucket.paid);
  bucket.variance = bucket.estimated - bucket.paid;
  bucket.dealCount += 1;
  if (deal.stage === "RESIDUAL") {
    bucket.residualDue += deal.amountDue ?? 0;
    bucket.residualPaid += deal.actualPaid ?? 0;
  } else {
    bucket.splitDue += deal.amountDue ?? 0;
    bucket.splitPaid += deal.actualPaid ?? 0;
  }
}

export function fillMonthSpan(rows: Bucket[]): Bucket[] {
  const months = rows.filter((row) => isMonthKey(row.key)).sort((a, b) => a.key.localeCompare(b.key));
  const extras = rows.filter((row) => !isMonthKey(row.key));
  if (months.length === 0) return extras;
  const byKey = new Map(months.map((row) => [row.key, row]));
  const filled: Bucket[] = [];
  let [year, month] = months[0].key.split("-").map(Number);
  const [endYear, endMonth] = months[months.length - 1].key.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    filled.push(byKey.get(key) ?? emptyBucket(key, monthLabel(key)));
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return [...filled, ...extras];
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isMonthKey(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function filterDealsByMonth<T extends { dueDate: Date | null }>(deals: T[], month: string) {
  if (!month) return deals;
  return deals.filter((deal) => deal.dueDate && monthKey(deal.dueDate) === month);
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/** Figures that sit above a hovered month bar — only values already on the bucket. */
export function cashflowBarCaption(
  row: Bucket,
  valueKey: "due" | "estimated" | "paid" | "remaining" = "due",
) {
  const parts: string[] = [];
  if (row.paid > 0.004 && valueKey !== "paid") parts.push(`Paid ${gbp(row.paid)}`);
  if (row.remaining > 0.004) parts.push(`Remaining ${gbp(row.remaining)}`);
  if (row.residualDue > 0.004) parts.push(`Residual ${gbp(row.residualDue)}`);
  if (row.splitDue > 0.004 && row.residualDue > 0.004) parts.push(`Split ${gbp(row.splitDue)}`);
  return {
    month: row.label,
    value: gbp(row[valueKey]),
    parts,
  };
}

export function groupByMonth(deals: AnalyticsDeal[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const deal of deals) {
    const key = deal.dueDate ? monthKey(deal.dueDate) : "none";
    const label = deal.dueDate ? monthLabel(key) : "No due date";
    const bucket = map.get(key) ?? emptyBucket(key, label);
    addDeal(bucket, deal);
    map.set(key, bucket);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function groupByAgent(deals: AnalyticsDeal[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const deal of deals) {
    const agents =
      deal.agentIds.length > 0
        ? deal.agentIds.map((id, index) => ({
            id,
            name: deal.agentNames[index] ?? "Agent",
          }))
        : deal.salespersonId
          ? [{ id: deal.salespersonId, name: deal.salespersonName ?? "Agent" }]
          : [{ id: "unassigned", name: "Unassigned" }];
    const slice = splitAmounts(deal, agents.length);
    for (const agent of agents) {
      const bucket = map.get(agent.id) ?? emptyBucket(agent.id, agent.name);
      addDeal(bucket, slice);
      map.set(agent.id, bucket);
    }
  }
  return [...map.values()].sort((a, b) => b.due - a.due || b.estimated - a.estimated);
}

export function groupByCustomer(deals: AnalyticsDeal[]): (Bucket & { customerId: string })[] {
  const map = new Map<string, Bucket & { customerId: string }>();
  for (const deal of deals) {
    const existing = map.get(deal.customerId) ?? {
      ...emptyBucket(deal.customerId, deal.customerName),
      customerId: deal.customerId,
    };
    addDeal(existing, deal);
    map.set(deal.customerId, existing);
  }
  return [...map.values()].sort((a, b) => b.due - a.due || b.estimated - a.estimated);
}
