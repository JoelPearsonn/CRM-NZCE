import Link from "next/link";
import { EmptyState, LoaPill, ObjectionPill, PageHeader, RenewalCell, StagePill } from "@/components/ui";
import { LOA_STATUSES, OBJECTION_STATUSES } from "@/lib/constants";
import { financeTotals } from "@/lib/finance";
import { formatDate, gbp } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";
import { siteCount } from "@/lib/sites";
import { getWorkingAsId } from "@/lib/working-as";

export default async function CustomersPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const renewal = typeof query.renewal === "string" ? query.renewal : "";
  const loa = typeof query.loa === "string" ? query.loa : "";
  const objection = typeof query.objection === "string" ? query.objection : "";
  const salesperson = typeof query.salesperson === "string" ? query.salesperson : "";
  const workingAsId = await getWorkingAsId();

  const [customers, agents] = await Promise.all([
    prisma.customer.findMany({
      include: {
        meters: { include: { salesperson: true }, orderBy: { renewalDate: "asc" } },
        leads: { orderBy: { updatedAt: "desc" }, take: 1 },
        deals: true,
      },
      orderBy: { companyName: "asc" },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  const now = new Date();
  const filtered = customers.filter((customer) => {
    if (renewal) {
      const days = Number(renewal);
      const horizon = new Date(now);
      horizon.setDate(horizon.getDate() + days);
      const hit = customer.meters.some(
        (meter) => meter.renewalDate && meter.renewalDate <= horizon,
      );
      if (!hit) return false;
    }
    if (loa === "unsigned") {
      if (
        !customer.meters.some(
          (meter) => meter.loaStatus !== "SIGNED" && meter.loaStatus !== "RECEIVED",
        )
      ) {
        return false;
      }
    } else if (loa && !customer.meters.some((meter) => meter.loaStatus === loa)) {
      return false;
    }
    if (objection && !customer.meters.some((meter) => meter.objectionStatus === objection)) {
      return false;
    }
    if (salesperson && !customer.meters.some((meter) => meter.salespersonId === salesperson)) {
      return false;
    }
    return true;
  });

  const views = [
    { href: "/customers", label: "All" },
    { href: "/customers?renewal=30", label: "Renewing 30d" },
    { href: "/customers?renewal=90", label: "Renewing 90d" },
    { href: "/customers?loa=unsigned", label: "LOA not signed" },
    { href: "/customers?objection=IN_OBJECTION", label: "In objection" },
    ...(workingAsId
      ? [{ href: `/customers?salesperson=${workingAsId}`, label: "My book" }]
      : []),
  ];

  return (
    <div>
      <PageHeader
        kicker="Book"
        title="Customers"
        description="Businesses on the NZCE desk. Filter the book, or import a CSV. Finance lives on each record."
        actions={
          <>
            <Link href="/import" className="btn btn-ghost">
              Import CSV
            </Link>
            <Link href="/customers/new" className="btn btn-primary">
              Add customer
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {views.map((view) => {
          const params = new URLSearchParams();
          if (renewal) params.set("renewal", renewal);
          if (loa) params.set("loa", loa);
          if (objection) params.set("objection", objection);
          if (salesperson) params.set("salesperson", salesperson);
          const current = params.toString() ? `/customers?${params}` : "/customers";
          const active = view.href === current;
          return (
            <Link
              key={view.href}
              href={view.href}
              className={`btn text-[0.75rem] ${active ? "btn-brass" : "btn-ghost"}`}
            >
              {view.label}
            </Link>
          );
        })}
      </div>

      <form className="card mb-4 grid gap-3 p-4 md:grid-cols-5" method="get">
        <label className="field">
          <span>Renewal window</span>
          <select name="renewal" defaultValue={renewal}>
            <option value="">Any</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
        <label className="field">
          <span>LOA</span>
          <select name="loa" defaultValue={loa}>
            <option value="">Any</option>
            <option value="unsigned">Not signed / received</option>
            {LOA_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Objection</span>
          <select name="objection" defaultValue={objection}>
            <option value="">Any</option>
            {OBJECTION_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Salesperson</span>
          <select name="salesperson" defaultValue={salesperson}>
            <option value="">Any</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn btn-brass w-full">Apply filters</button>
        </div>
      </form>

      {customers.length === 0 ? (
        <EmptyState
          title="Start the book"
          body="Add the first customer by hand, or download the CSV template and import meters in one pass. Nothing here depends on the demo seed."
          actionHref="/customers/new"
          actionLabel="Add first customer"
          secondaryHref="/import"
          secondaryLabel="Import CSV"
        >
          <p className="mt-4 text-xs text-muted">
            <a href="/api/import/template" className="font-semibold text-brass-dark">
              Download the template
            </a>{" "}
            · then add a meter on the customer so renewals have a home.
          </p>
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No customers in this view"
          body="Clear the filters or pick another saved view."
          actionHref="/customers"
          actionLabel="Show all"
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="desk-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Sites</th>
                <th>Next renewal</th>
                <th>LOA / objection</th>
                <th>Latest lead</th>
                <th>Due</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const nextRenewal = customer.meters.find((meter) => meter.renewalDate)?.renewalDate;
                const lead = customer.leads[0];
                const finance = financeTotals(customer.deals);
                const flagged = customer.meters.find((meter) => meter.objectionStatus === "IN_OBJECTION");
                const loa = customer.meters.find((meter) => meter.loaStatus === "SIGNED") ?? customer.meters[0];
                const sites = siteCount(customer.meters);
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
                    <td>
                      {customer.meters.length} meters
                      <div className="text-[0.7rem] text-muted">
                        {sites} site{sites === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td>
                      <RenewalCell date={nextRenewal} />
                    </td>
                    <td>
                      {loa ? <LoaPill value={loa.loaStatus} /> : <span className="text-muted">—</span>}
                      {flagged ? (
                        <div className="mt-1">
                          <ObjectionPill value={flagged.objectionStatus} />
                        </div>
                      ) : null}
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
