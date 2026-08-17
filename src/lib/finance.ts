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

export function splitByPercent(net: number, percents: number[]) {
  const amounts = percents.map((percent, index) =>
    index === percents.length - 1 ? 0 : roundPence((net * percent) / 100),
  );
  const used = amounts.slice(0, -1).reduce((sum, value) => sum + value, 0);
  if (amounts.length) amounts[amounts.length - 1] = roundPence(net - used);
  return amounts;
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
  const unpaid = payments.filter((row) => (row.amountDue ?? 0) - (row.actualPaid ?? 0) > 0.004);
  const dueDate =
    unpaid.find((row) => row.expectedDate)?.expectedDate ??
    payments.find((row) => row.expectedDate)?.expectedDate ??
    null;
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
  const order = ["ON_SIGN", "ON_LIVE", "EOC"];
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
  return { key, label, due: 0, paid: 0, estimated: 0, remaining: 0, variance: 0, dealCount: 0 };
}

function addDeal(bucket: Bucket, deal: FinanceDeal) {
  bucket.due += deal.amountDue ?? 0;
  bucket.paid += deal.actualPaid ?? 0;
  bucket.estimated += deal.estimatedCommission ?? 0;
  bucket.remaining = Math.max(0, bucket.due - bucket.paid);
  bucket.variance = bucket.estimated - bucket.paid;
  bucket.dealCount += 1;
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
