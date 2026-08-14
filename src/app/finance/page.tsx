import Link from "next/link";
import { GroupedBars, HorizonBars } from "@/components/finance-charts";
import { EmptyState, PageHeader, Section } from "@/components/ui";
import {
  financeTotals,
  groupByAgent,
  groupByCustomer,
  groupByMonth,
  type AnalyticsDeal,
} from "@/lib/finance";
import { formatDate, gbp } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function FinancePage() {
  const deals = await prisma.deal.findMany({
    where: { customer: { archivedAt: null } },
    include: { customer: true, salesperson: true, allocations: { include: { agent: true } } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });

  const rows: AnalyticsDeal[] = deals.map((deal) => ({
    id: deal.id,
    customerId: deal.customerId,
    dueDate: deal.dueDate,
    salespersonId: deal.salespersonId,
    customerName: deal.customer.companyName,
    salespersonName: deal.salesperson?.name ?? null,
    supplier: deal.supplier,
    agentIds: deal.allocations.map((row) => row.agentId),
    agentNames: deal.allocations.map((row) => row.agent.name),
    amountDue: deal.amountDue,
    estimatedCommission: deal.estimatedCommission,
    actualPaid: deal.actualPaid,
  }));

  const totals = financeTotals(rows);
  const byMonth = groupByMonth(rows);
  const byAgent = groupByAgent(rows);
  const byCustomer = groupByCustomer(rows);

  return (
    <div>
      <PageHeader
        kicker="Analytics"
        title="Finance"
        description="Cashflow and profit on the sold book. These are the same deal records as each customer finance tracker — not a second set of numbers."
      />

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Total label="Due" value={gbp(totals.due)} hint="Amount due on deals" />
        <Total label="Paid" value={gbp(totals.paid)} hint="Actual received" />
        <Total
          label="Outstanding"
          value={gbp(totals.remaining)}
          hint="Due minus paid"
          warn={totals.remaining > 0}
        />
        <Total label="Estimated" value={gbp(totals.estimated)} hint="Commission on the book" />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No deals to analyse"
          body="Record a deal on a customer and it will land here and on the Contracts page."
          actionHref="/customers"
          actionLabel="Open customers"
          secondaryHref="/contracts/new"
          secondaryLabel="Record deal"
        />
      ) : (
        <div className="grid gap-6">
          <Section title="Cashflow by month">
            <p className="border-b border-rule px-4 py-2 text-xs text-muted">
              Commission due date · amount due versus actual paid · remaining
            </p>
            <GroupedBars
              rows={byMonth}
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
                {byMonth.map((row) => (
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

          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Profit — estimated vs paid">
              <p className="border-b border-rule px-4 py-2 text-xs text-muted">
                Variance is estimated commission minus actual paid
              </p>
              <GroupedBars
                rows={byMonth}
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
                  {byMonth.map((row) => (
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
                    <td className="font-semibold">Book</td>
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

          <Section title="Deal book">
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="col-extra">Supplier</th>
                  <th>Due date</th>
                  <th>Amount due</th>
                  <th className="col-lesser">Paid</th>
                  <th>Remaining</th>
                  <th className="col-lesser">Estimated</th>
                  <th className="col-lesser">Sales</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const remaining = Math.max(0, (deal.amountDue ?? 0) - (deal.actualPaid ?? 0));
                  return (
                    <tr key={deal.id}>
                      <td>
                        <Link href={`/customers/${deal.customerId}`} className="font-medium">
                          {deal.customer.companyName}
                        </Link>
                        <div>
                          <Link href={`/contracts/${deal.id}`} className="text-[0.7rem] text-muted">
                            Deal record
                          </Link>
                        </div>
                      </td>
                      <td className="col-extra">{deal.supplier}</td>
                      <td>{formatDate(deal.dueDate)}</td>
                      <td>{gbp(deal.amountDue)}</td>
                      <td className="col-lesser">{gbp(deal.actualPaid)}</td>
                      <td className={remaining > 0 ? "font-semibold text-warn" : "text-moss"}>
                        {gbp(remaining)}
                      </td>
                      <td className="col-lesser">{gbp(deal.estimatedCommission)}</td>
                      <td className="col-lesser">
                        {deal.allocations.length
                          ? deal.allocations.map((row) => row.agent.name).join(" · ")
                          : (deal.salesperson?.name ?? "—")}
                        {deal.allocations.length === 2 ? (
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
