import Link from "next/link";
import { GroupedBars, HorizonBars } from "@/components/finance-charts";
import { EmptyState, PageHeader, Section } from "@/components/ui";
import {
  filterDealsByMonth,
  financeTotals,
  groupByAgent,
  groupByCustomer,
  groupByMonth,
  groupByPaymentStage,
  isMonthKey,
  monthKey,
  monthLabel,
  type AnalyticsDeal,
} from "@/lib/finance";
import { labelFor, TPI_PARTNERS } from "@/lib/constants";
import { formatDate, gbp } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

function parseMonth(raw: string | string[] | undefined) {
  const value = typeof raw === "string" ? raw : "";
  if (value === "all") return "";
  if (isMonthKey(value)) return value;
  return monthKey(new Date());
}

export default async function FinancePage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const month = parseMonth(query.month);

  const deals = await prisma.deal.findMany({
    where: { customer: { archivedAt: null }, status: { not: "CANCELLED" } },
    include: {
      customer: true,
      salesperson: true,
      allocations: { include: { agent: true } },
      payments: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const lines: (AnalyticsDeal & { stage?: string; label?: string; tpiPartner?: string })[] =
    deals.flatMap((deal) => {
      const base = {
        id: deal.id,
        customerId: deal.customerId,
        salespersonId: deal.salespersonId,
        customerName: deal.customer.companyName,
        salespersonName: deal.salesperson?.name ?? null,
        supplier: deal.supplier,
        agentIds: deal.allocations.map((row) => row.agentId),
        agentNames: deal.allocations.map((row) => row.agent.name),
        tpiPartner: deal.tpiPartner,
      };
      if (deal.payments.length === 0) {
        return [
          {
            ...base,
            dueDate: deal.dueDate,
            amountDue: deal.amountDue,
            estimatedCommission: deal.estimatedCommission,
            actualPaid: deal.actualPaid,
          },
        ];
      }
      return deal.payments.map((payment) => ({
        ...base,
        id: `${deal.id}:${payment.id}`,
        dueDate: payment.expectedDate,
        amountDue: payment.amountDue,
        estimatedCommission: payment.amountDue,
        actualPaid: payment.actualPaid,
        stage: payment.stage,
        label: payment.stage === "RESIDUAL" ? "Monthly residual" : payment.label,
      }));
    });

  const byMonth = groupByMonth(lines);
  const currentKey = monthKey(new Date());
  const monthOptions = [
    ...byMonth.map((row) => ({ key: row.key, label: row.label })),
    ...(byMonth.some((row) => row.key === currentKey)
      ? []
      : [{ key: currentKey, label: monthLabel(currentKey) }]),
  ].sort((a, b) => a.key.localeCompare(b.key));

  const scopedRows = filterDealsByMonth(lines, month);
  const scopedDeals = scopedRows;
  const totals = financeTotals(scopedRows);
  const scopedByMonth = month ? byMonth.filter((row) => row.key === month) : byMonth;
  const byAgent = groupByAgent(scopedRows);
  const byCustomer = groupByCustomer(scopedRows);
  const byStage = groupByPaymentStage(scopedRows);
  const monthTitle = month ? monthLabel(month) : "All months";

  return (
    <div>
      <PageHeader
        kicker="Monthly report"
        title={month ? `Finance · ${monthTitle}` : "Finance · all months"}
        description="Due and paid by payment stage (On Sign / On Live / EOC), after TPI. Pick a month to see those payouts only. This is a screen — not a PDF."
      />

      <form method="get" className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <label className="field min-w-[12rem] flex-1">
          <span>Month</span>
          <select name="month" defaultValue={month || "all"}>
            <option value="all">All months</option>
            {monthOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-brass w-full sm:w-auto">
          Show this month
        </button>
      </form>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Total label="Due" value={gbp(totals.due)} hint={month ? `Due in ${monthTitle}` : "Amount due on deals"} />
        <Total label="Paid" value={gbp(totals.paid)} hint={month ? `Paid on ${monthTitle} deals` : "Actual received"} />
        <Total
          label="Outstanding"
          value={gbp(totals.remaining)}
          hint="Due minus paid"
          warn={totals.remaining > 0}
        />
        <Total
          label="Estimated"
          value={gbp(totals.estimated)}
          hint={month ? `Estimated in ${monthTitle}` : "Commission on the book"}
        />
      </div>

      {deals.length === 0 ? (
        <EmptyState
          title="No deals to analyse"
          body="Record a deal on a customer and it will land here and on the Contracts page."
          actionHref="/customers"
          actionLabel="Open customers"
          secondaryHref="/contracts/new"
          secondaryLabel="Record deal"
        />
      ) : scopedRows.length === 0 ? (
        <EmptyState
          title={`Nothing due in ${monthTitle}`}
          body="Pick another month, or record a deal with a commission due date in this month."
          actionHref="/finance?month=all"
          actionLabel="Show all months"
        />
      ) : (
        <div className="grid gap-6">
          <Section title={month ? `By payment stage · ${monthTitle}` : "Due / paid by payment stage"}>
            <p className="border-b border-rule px-4 py-2 text-xs text-muted">
              On Sign, On Live and EOC after TPI — not one lump per deal
            </p>
            <HorizonBars rows={byStage} valueKey="due" />
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Due</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Payouts</th>
                </tr>
              </thead>
              <tbody>
                {byStage.map((row) => (
                  <tr key={row.key}>
                    <td className="font-medium">{row.label}</td>
                    <td>{gbp(row.due)}</td>
                    <td>{gbp(row.paid)}</td>
                    <td className={row.remaining > 0 ? "font-semibold text-warn" : "text-moss"}>
                      {gbp(row.remaining)}
                    </td>
                    <td>{row.dealCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title={month ? `Cashflow · ${monthTitle}` : "Cashflow by month"}>
            <p className="border-b border-rule px-4 py-2 text-xs text-muted">
              Payout expected date · amount due versus actual paid · remaining
            </p>
            <GroupedBars
              rows={scopedByMonth}
              left="due"
              right="paid"
              leftLabel="Amount due"
              rightLabel="Actual paid"
            />
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Due</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Deals</th>
                </tr>
              </thead>
              <tbody>
                {scopedByMonth.map((row) => (
                  <tr key={row.key}>
                    <td className="font-medium">
                      {row.key === "none" ? (
                        row.label
                      ) : (
                        <Link href={`/finance?month=${row.key}`} className="font-medium">
                          {row.label}
                        </Link>
                      )}
                    </td>
                    <td>{gbp(row.due)}</td>
                    <td>{gbp(row.paid)}</td>
                    <td className={row.remaining > 0 ? "font-semibold text-warn" : "text-moss"}>
                      {gbp(row.remaining)}
                    </td>
                    <td>{row.dealCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title={month ? `Profit · ${monthTitle}` : "Profit — estimated vs paid"}>
              <p className="border-b border-rule px-4 py-2 text-xs text-muted">
                Variance is estimated commission minus actual paid
              </p>
              <GroupedBars
                rows={scopedByMonth}
                left="estimated"
                right="paid"
                leftLabel="Estimated"
                rightLabel="Actual paid"
              />
              <table className="desk-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Estimated</th>
                    <th>Paid</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedByMonth.map((row) => (
                    <tr key={row.key}>
                      <td className="font-medium">{row.label}</td>
                      <td>{gbp(row.estimated)}</td>
                      <td>{gbp(row.paid)}</td>
                      <td className={row.variance > 0 ? "text-warn" : "text-moss"}>
                        {gbp(row.variance)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-semibold">{month ? monthTitle : "Book"}</td>
                    <td className="font-semibold">{gbp(totals.estimated)}</td>
                    <td className="font-semibold">{gbp(totals.paid)}</td>
                    <td className={`font-semibold ${totals.variance > 0 ? "text-warn" : "text-moss"}`}>
                      {gbp(totals.variance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            <Section title="By salesperson">
              <p className="border-b border-rule px-4 py-2 text-xs text-muted">
                Two agents on a deal split estimated and actual 50/50. Book totals stay whole.
              </p>
              <HorizonBars rows={byAgent} valueKey="due" />
              <table className="desk-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Due</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th className="col-extra">Estimated</th>
                    <th className="col-lesser">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {byAgent.map((row) => (
                    <tr key={row.key}>
                      <td>
                        {row.key === "unassigned" ? (
                          row.label
                        ) : (
                          <Link href={`/agents/${row.key}/edit`} className="font-medium">
                            {row.label}
                          </Link>
                        )}
                      </td>
                      <td>{gbp(row.due)}</td>
                      <td>{gbp(row.paid)}</td>
                      <td className={row.remaining > 0 ? "text-warn" : "text-moss"}>
                        {gbp(row.remaining)}
                      </td>
                      <td className="col-extra">{gbp(row.estimated)}</td>
                      <td className="col-lesser">{gbp(row.variance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>

          <Section title="Top customers">
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Due</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th className="col-extra">Estimated</th>
                  <th className="col-lesser">Variance</th>
                  <th className="col-lesser">Deals</th>
                </tr>
              </thead>
              <tbody>
                {byCustomer.map((row) => (
                  <tr key={row.customerId}>
                    <td>
                      <Link href={`/customers/${row.customerId}`} className="font-medium">
                        {row.label}
                      </Link>
                    </td>
                    <td>{gbp(row.due)}</td>
                    <td>{gbp(row.paid)}</td>
                    <td className={row.remaining > 0 ? "font-semibold text-warn" : "text-moss"}>
                      {gbp(row.remaining)}
                    </td>
                    <td className="col-extra">{gbp(row.estimated)}</td>
                    <td className="col-lesser">{gbp(row.variance)}</td>
                    <td className="col-lesser">{row.dealCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title={month ? `Payouts due · ${monthTitle}` : "Payout book"}>
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="col-extra">Supplier</th>
                  <th>Stage</th>
                  <th>Expected</th>
                  <th>Amount due</th>
                  <th className="col-lesser">Paid</th>
                  <th>Remaining</th>
                  <th className="col-lesser">TPI</th>
                  <th className="col-lesser">Sales</th>
                </tr>
              </thead>
              <tbody>
                {scopedDeals.map((deal) => {
                  const remaining = Math.max(0, (deal.amountDue ?? 0) - (deal.actualPaid ?? 0));
                  const contractId = deal.id.split(":")[0];
                  return (
                    <tr key={deal.id}>
                      <td>
                        <Link href={`/customers/${deal.customerId}`} className="font-medium">
                          {deal.customerName}
                        </Link>
                        <div>
                          <Link href={`/contracts/${contractId}`} className="text-[0.7rem] text-muted">
                            Deal record
                          </Link>
                        </div>
                      </td>
                      <td className="col-extra">{deal.supplier}</td>
                      <td>{deal.label ?? "Deal"}</td>
                      <td>{formatDate(deal.dueDate)}</td>
                      <td>{gbp(deal.amountDue)}</td>
                      <td className="col-lesser">{gbp(deal.actualPaid)}</td>
                      <td className={remaining > 0 ? "font-semibold text-warn" : "text-moss"}>
                        {gbp(remaining)}
                      </td>
                      <td className="col-lesser">
                        {deal.tpiPartner ? labelFor(TPI_PARTNERS, deal.tpiPartner) : "None / direct"}
                      </td>
                      <td className="col-lesser">
                        {deal.agentNames.length ? deal.agentNames.join(" · ") : (deal.salespersonName ?? "—")}
                        {deal.agentIds.length === 2 ? (
                          <div className="text-[0.7rem] text-muted">50/50</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        </div>
      )}
    </div>
  );
}

function Total({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className="card px-4 py-4">
      <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${warn ? "text-warn" : "text-ink"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
