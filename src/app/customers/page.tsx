import Link from "next/link";
import { EmptyState, PageHeader, RenewalCell, StagePill } from "@/components/ui";
import { financeTotals } from "@/lib/finance";
import { formatDate, gbp } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      meters: { orderBy: { renewalDate: "asc" } },
      leads: { orderBy: { updatedAt: "desc" }, take: 1 },
      deals: true,
    },
    orderBy: { companyName: "asc" },
  });

  return (
    <div>
      <PageHeader
        kicker="Book"
        title="Customers"
        description="Businesses on the NZCE desk. Finance lives on the customer — due, paid and remaining sit on each record."
        actions={
          <Link href="/customers/new" className="btn btn-primary">
            Add customer
          </Link>
        }
      />
      {customers.length === 0 ? (
        <EmptyState
          title="No customers yet"
          body="Add the first business and you can hang meters, leads and contracts off it."
          actionHref="/customers/new"
          actionLabel="Add customer"
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="desk-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Meters</th>
                <th>Next renewal</th>
                <th>Latest lead</th>
                <th>Due</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
                const nextRenewal = customer.meters.find((meter) => meter.renewalDate)?.renewalDate;
                const lead = customer.leads[0];
                const finance = financeTotals(customer.deals);
                return (
                  <tr key={customer.id}>
                    <td>
                      <Link href={`/customers/${customer.id}`} className="font-medium">
                        {customer.companyName}
                      </Link>
                      <div className="text-[0.7rem] text-muted">
                        {[customer.city, customer.postcode].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td>
                      <div>{customer.contactName}</div>
                      <div className="text-[0.7rem] text-muted">{customer.email}</div>
                    </td>
                    <td>{customer.meters.length}</td>
                    <td>
                      <RenewalCell date={nextRenewal} />
                    </td>
                    <td>{lead ? <StagePill value={lead.stage} /> : <span className="text-muted">—</span>}</td>
                    <td>{gbp(finance.due)}</td>
                    <td>{gbp(finance.paid)}</td>
                    <td className={finance.remaining > 0 ? "font-semibold text-warn" : "text-moss"}>
                      {gbp(finance.remaining)}
                    </td>
                    <td>{formatDate(customer.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
