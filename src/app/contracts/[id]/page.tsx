import Link from "next/link";
import { notFound } from "next/navigation";
import { ReconcileDealForm } from "@/components/customer-finance";
import { DealStatusPill, FuelPill, PageHeader, RenewalCell } from "@/components/ui";
import { labelFor, TPI_PARTNERS } from "@/lib/constants";
import { contractMonths, netCommission } from "@/lib/finance";
import { formatDate, formatDateTime, formatMpan, gbpExact, monthsLabel } from "@/lib/format";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function DealDetailPage({ params }: IdPageProps) {
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      customer: true,
      meter: true,
      lead: true,
      salesperson: true,
      allocations: { include: { agent: true } },
      payments: { orderBy: { sortOrder: "asc" } },
      reconciliations: { include: { actor: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!deal) notFound();

  const rows = [
    ["Supplier", deal.supplier],
    ["Fuel", null],
    ["Status", null],
    [
      "Sales agents",
      deal.allocations.length
        ? `${deal.allocations.map((row) => row.agent.name).join(" · ")}${
            deal.allocations.length === 2 ? " · 50/50" : ""
          }`
        : (deal.salesperson?.name ?? "—"),
    ],
    ["Contract start (CSD)", formatDate(deal.contractStart)],
    ["Contract end (CED)", formatDate(deal.contractEnd)],
    ["Length", monthsLabel(contractMonths(deal.contractStart, deal.contractEnd))],
    ["Payout", deal.payoutType === "RESIDUAL" ? "Monthly residual" : "Split"],
    ["TPI", `${labelFor(TPI_PARTNERS, deal.tpiPartner)}${deal.tpiPercent ? ` · ${deal.tpiPercent}%` : ""}`],
    ["Full deal value", gbpExact(deal.estimatedCommission)],
    ["Net commission", gbpExact(netCommission(deal.estimatedCommission, deal.tpiPercent))],
    ["Amount due", gbpExact(deal.amountDue)],
    ["Actual paid", gbpExact(deal.actualPaid)],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Contract"
        title={`${deal.supplier} · ${deal.customer.companyName}`}
        description={deal.notes ?? "Sold contract with renewal and commission."}
        actions={
          <>
            <Link href={`/customers/${deal.customerId}`} className="btn btn-ghost">
              Customer
            </Link>
            <Link href={`/contracts/${deal.id}/edit`} className="btn btn-primary">
              Edit contract
            </Link>
          </>
        }
      />

      <div className="card divide-y divide-rule">
        {rows.map(([label]) => (
          <div key={label} className="kv-row">
            <div className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
              {label}
            </div>
            <div>
              {label === "Fuel" ? (
                <FuelPill value={deal.fuelType} />
              ) : label === "Status" ? (
                <DealStatusPill value={deal.status} />
              ) : (
                rows.find((row) => row[0] === label)?.[1]
              )}
            </div>
          </div>
        ))}
        <div className="kv-row">
          <div className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
            Renewal
          </div>
          <RenewalCell date={deal.renewalDate} />
        </div>
        {deal.meter ? (
          <div className="kv-row">
            <div className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
              Meter
            </div>
            <div className="meter-id">
              {deal.meter.mpan ? formatMpan(deal.meter.mpan) : deal.meter.mprn}
            </div>
          </div>
        ) : null}
        {deal.lead ? (
          <div className="kv-row">
            <div className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
              Lead
            </div>
            <Link href={`/leads/${deal.lead.id}`}>{deal.lead.title}</Link>
          </div>
        ) : null}
      </div>

      {deal.payments.length ? (
        <div className="card mt-6 overflow-x-auto">
          <p className="border-b border-rule px-4 py-3 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
            {deal.payoutType === "RESIDUAL" ? "Monthly residual schedule" : "Split payouts"}
          </p>
          <table className="desk-table">
            <thead>
              <tr>
                <th>Payment</th>
                <th>%</th>
                <th>Expected</th>
                <th>Due</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {deal.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-medium">{payment.label}</td>
                  <td>{payment.percent}%</td>
                  <td>{formatDate(payment.expectedDate)}</td>
                  <td>{gbpExact(payment.amountDue)}</td>
                  <td>{gbpExact(payment.actualPaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="card mt-6 p-4">
        <p className="mb-3 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
          Reconcile finance
        </p>
        <ReconcileDealForm deal={deal} />
        {deal.reconciliations.length ? (
          <ol className="mt-4 space-y-1 text-xs text-muted">
            {deal.reconciliations.map((row) => (
              <li key={row.id}>
                {formatDateTime(row.createdAt)} · {row.actor?.name ?? "Desk"} · Actual paid{" "}
                {gbpExact(row.actualPaidOld)} → {gbpExact(row.actualPaidNew)}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
