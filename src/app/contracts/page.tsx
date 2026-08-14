import Link from "next/link";
import { DealStatusPill, EmptyState, FuelPill, PageHeader, RenewalCell } from "@/components/ui";
import { dealRemaining } from "@/lib/finance";
import { formatDate, gbp } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ContractsPage() {
  const deals = await prisma.deal.findMany({
    include: { customer: true, salesperson: true, meter: true, allocations: { include: { agent: true } } },
    orderBy: [{ dueDate: "asc" }, { renewalDate: "asc" }],
  });

  return (
    <div>
      <PageHeader
        kicker="Sold book"
        title="Contracts"
        description="Book-wide view of the same deal records that live on each customer. Edit finance on the customer record or here."
        actions={
          <Link href="/contracts/new" className="btn btn-primary">
            Record deal
          </Link>
        }
      />
      {deals.length === 0 ? (
        <EmptyState
          title="No contracts recorded"
          body="When a lead is sold, record the deal here so finance and renewal dates stay visible."
          actionHref="/contracts/new"
          actionLabel="Record deal"
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="desk-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Supplier</th>
                <th>Fuel</th>
                <th>Status</th>
                <th>Term</th>
                <th>Renewal</th>
                <th>Due date</th>
                <th>Amount due</th>
                <th>Est. commission</th>
                <th>Actual paid</th>
                <th>Remaining</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
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
                  <td>{deal.supplier}</td>
                  <td>
                    <FuelPill value={deal.fuelType} />
                  </td>
                  <td>
                    <DealStatusPill value={deal.status} />
                  </td>
                  <td className="text-[0.75rem]">
                    {formatDate(deal.contractStart)} – {formatDate(deal.contractEnd)}
                  </td>
                  <td>
                    <RenewalCell date={deal.renewalDate} />
                  </td>
                  <td>{formatDate(deal.dueDate)}</td>
                  <td>{gbp(deal.amountDue)}</td>
                  <td>{gbp(deal.estimatedCommission)}</td>
                  <td>{gbp(deal.actualPaid)}</td>
                  <td className={dealRemaining(deal) > 0 ? "font-semibold text-warn" : "text-moss"}>
                    {gbp(dealRemaining(deal))}
                  </td>
                  <td>
                    {deal.allocations.length
                      ? deal.allocations.map((row) => row.agent.name).join(" · ")
                      : (deal.salesperson?.name ?? "—")}
                    {deal.allocations.length === 2 ? (
                      <div className="text-[0.7rem] text-muted">50/50</div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
