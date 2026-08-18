import Link from "next/link";
import { DealStatusPill, EmptyState, FuelPill, PageHeader, RenewalCell, SortLink } from "@/components/ui";
import { dealRemaining } from "@/lib/finance";
import { formatDate, gbp } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";
import { sortDir, sortHref } from "@/lib/sort";

export default async function ContractsPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const sort = query.sort === "remaining" ? "remaining" : "due";
  const dir = sortDir(typeof query.dir === "string" ? query.dir : "");
  const deals = await prisma.deal.findMany({
    where: { customer: { archivedAt: null } },
    include: { customer: true, salesperson: true, meter: true, allocations: { include: { agent: true } } },
    orderBy: [{ dueDate: "asc" }, { renewalDate: "asc" }],
  });
  const sorted = [...deals].sort((a, b) => {
    let cmp = 0;
    if (sort === "due") {
      const left = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const right = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
      cmp = left - right;
    } else {
      cmp = dealRemaining(a) - dealRemaining(b);
    }
    return dir === "desc" ? -cmp : cmp;
  });
  const listParams = new URLSearchParams();

  return (
    <div>
      <PageHeader
        kicker="Sold book"
        title="Contracts"
        description="Book-wide view of the same deal records that live on each customer. Edit finance on the customer record or here."
        actions={
          <>
            <a href="/api/export/deals" className="btn btn-ghost">
              Export deals
            </a>
            <Link href="/import#deals" className="btn btn-ghost">
              Import deals
            </Link>
            <Link href="/contracts/new" className="btn btn-primary">
              Record deal
            </Link>
          </>
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
                <th className="col-extra">Supplier</th>
                <th className="col-lesser">Fuel</th>
                <th>Status</th>
                <th className="col-lesser">Term</th>
                <th>Renewal</th>
                <th>
                  <SortLink
                    href={sortHref("/contracts", listParams, "due", sort, dir)}
                    active={sort === "due"}
                    dir={dir}
                  >
                    Due date
                  </SortLink>
                </th>
                <th>Amount due</th>
                <th className="col-lesser">Est. commission</th>
                <th className="col-extra">Actual paid</th>
                <th>
                  <SortLink
                    href={sortHref("/contracts", listParams, "remaining", sort, dir)}
                    active={sort === "remaining"}
                    dir={dir}
                  >
                    Remaining
                  </SortLink>
                </th>
                <th className="col-lesser">Sales</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((deal) => (
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
                  <td className="col-lesser">
                    <FuelPill value={deal.fuelType} />
                  </td>
                  <td>
                    <DealStatusPill value={deal.status} />
                  </td>
                  <td className="col-lesser text-[0.75rem]">
                    {formatDate(deal.contractStart)} – {formatDate(deal.contractEnd)}
                  </td>
                  <td>
                    <RenewalCell date={deal.renewalDate} />
                  </td>
                  <td>{formatDate(deal.dueDate)}</td>
                  <td>{gbp(deal.amountDue)}</td>
                  <td className="col-lesser">{gbp(deal.estimatedCommission)}</td>
                  <td className="col-extra">{gbp(deal.actualPaid)}</td>
                  <td className={dealRemaining(deal) > 0 ? "font-semibold text-warn" : "text-moss"}>
                    {gbp(dealRemaining(deal))}
                  </td>
                  <td className="col-lesser">
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
