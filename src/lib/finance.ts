export type FinanceDeal = {
  amountDue?: number | null;
  estimatedCommission?: number | null;
  actualPaid?: number | null;
};

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
