import Link from "next/link";
import { notFound } from "next/navigation";
import { DealStatusPill, FuelPill, PageHeader, RenewalCell } from "@/components/ui";
import { formatDate, formatMpan, gbpExact } from "@/lib/format";
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
    ["Contract start", formatDate(deal.contractStart)],
    ["Contract end", formatDate(deal.contractEnd)],
    ["Commission due", formatDate(deal.dueDate)],
    ["Amount due", gbpExact(deal.amountDue)],
    ["Estimated commission", gbpExact(deal.estimatedCommission)],
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
          <div key={label} className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-3 text-sm">
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
        <div className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-3 text-sm">
          <div className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
            Renewal
          </div>
          <RenewalCell date={deal.renewalDate} />
        </div>
        {deal.meter ? (
          <div className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-3 text-sm">
            <div className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
              Meter
            </div>
            <div className="meter-id">
              {deal.meter.mpan ? formatMpan(deal.meter.mpan) : deal.meter.mprn}
            </div>
          </div>
        ) : null}
        {deal.lead ? (
          <div className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-3 text-sm">
            <div className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
              Lead
            </div>
            <Link href={`/leads/${deal.lead.id}`}>{deal.lead.title}</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
