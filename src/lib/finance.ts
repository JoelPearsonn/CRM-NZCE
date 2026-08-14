export type FinanceDeal = {
  amountDue?: number | null;
  estimatedCommission?: number | null;
  actualPaid?: number | null;
};

export function dealRemaining(deal: FinanceDeal) {
  return Math.max(0, (deal.amountDue ?? 0) - (deal.actualPaid ?? 0));
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
  };
}
