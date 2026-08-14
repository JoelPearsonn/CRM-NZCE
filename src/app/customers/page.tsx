import Link from "next/link";
import { LoadDemoButton } from "@/components/load-demo-button";
import { EmptyState, LoaPill, ObjectionPill, PageHeader, RenewalCell, SortLink, StagePill } from "@/components/ui";
import {
  bookFilterParams,
  customerArchiveWhere,
  customerMatchesFilters,
  exportHref,
  parseBookFilters,
} from "@/lib/book-filters";
import { CALL_NOTE_KINDS, LOA_STATUSES, OBJECTION_STATUSES, labelFor } from "@/lib/constants";
import { financeTotals } from "@/lib/finance";
import { formatDate, gbp } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";
import { siteCount } from "@/lib/sites";
import { sortDir, sortHref } from "@/lib/sort";
import { getWorkingAsId } from "@/lib/working-as";

export default async function CustomersPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const filters = parseBookFilters(query);
  const { renewal, loa, objection, salesperson, showArchived } = filters;
  const sort = query.sort === "renewal" || query.sort === "remaining" ? query.sort : "company";
  const dir = sortDir(typeof query.dir === "string" ? query.dir : "");
  const workingAsId = await getWorkingAsId();

  const [customers, agents, archivedCount] = await Promise.all([
    prisma.customer.findMany({
      where: customerArchiveWhere(showArchived),
      include: {
        meters: { include: { salesperson: true }, orderBy: { renewalDate: "asc" } },
        leads: { orderBy: { updatedAt: "desc" }, take: 1 },
        deals: true,
        notes: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { companyName: "asc" },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.count({ where: { archivedAt: { not: null } } }),
  ]);

  const filtered = customers.filter((customer) => customerMatchesFilters(customer, filters));

  filtered.sort((a, b) => {
    let cmp = 0;
    if (sort === "company") cmp = a.companyName.localeCompare(b.companyName);
    if (sort === "renewal") {
      const left = a.meters.find((meter) => meter.renewalDate)?.renewalDate?.getTime() ?? Number.POSITIVE_INFINITY;
      const right = b.meters.find((meter) => meter.renewalDate)?.renewalDate?.getTime() ?? Number.POSITIVE_INFINITY;
      cmp = left - right;
    }
    if (sort === "remaining") cmp = financeTotals(a.deals).remaining - financeTotals(b.deals).remaining;
    return dir === "desc" ? -cmp : cmp;
  });

  const listParams = bookFilterParams(filters);
  const filteredExport = Boolean(renewal || loa || objection || salesperson || showArchived);

  const views = [
    { href: "/customers", label: "All" },
    { href: "/customers?renewal=30", label: "Renewing 30d" },
    { href: "/customers?renewal=90", label: "Renewing 90d" },
    { href: "/customers?loa=unsigned", label: "LOA not signed" },
    { href: "/customers?objection=IN_OBJECTION", label: "In objection" },
    ...(workingAsId
      ? [{ href: `/customers?salesperson=${workingAsId}`, label: "My book" }]
      : []),
    { href: "/customers?archived=1", label: `Archived${archivedCount ? ` · ${archivedCount}` : ""}` },
  ];

  return (
    <div>
      <PageHeader
        kicker="Book"
        title="Customers"
        description="Businesses on the NZCE desk. Filter the book, or import a CSV. Finance lives on each record."
        actions={
          <>
            <a href={exportHref("/api/export/customers", listParams)} className="btn btn-ghost">
              {filteredExport ? "Export this view" : "Export customers"}
            </a>
            <a href={exportHref("/api/export/meters", listParams)} className="btn btn-ghost">
              {filteredExport ? "Export these meters" : "Export meters"}
            </a>
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
          if (showArchived) params.set("archived", "1");
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
          {showArchived ? <input type="hidden" name="archived" value="1" /> : null}
          <button type="submit" className="btn btn-brass w-full">
            Apply filters
          </button>
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
          <div className="mt-4 flex flex-col items-center gap-3">
            <LoadDemoButton className="btn btn-brass" />
            <p className="text-xs text-muted">
              <a href="/api/import/template" className="font-semibold text-brass-dark">
                Download the template
              </a>{" "}
              · then add a meter on the customer so renewals have a home. Demo is optional.
            </p>
          </div>
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
                <th>
                  <SortLink
                    href={sortHref("/customers", listParams, "company", sort, dir)}
                    active={sort === "company"}
                    dir={dir}
                  >
                    Company
                  </SortLink>
                </th>
                <th className="col-extra">Contact</th>
                <th className="col-lesser">Sites</th>
                <th>
                  <SortLink
                    href={sortHref("/customers", listParams, "renewal", sort, dir)}
                    active={sort === "renewal"}
                    dir={dir}
                  >
                    Next renewal
                  </SortLink>
                </th>
                <th>LOA / objection</th>
                <th className="col-lesser">Latest lead</th>
                <th>Due</th>
                <th className="col-extra">Paid</th>
                <th>
                  <SortLink
                    href={sortHref("/customers", listParams, "remaining", sort, dir)}
                    active={sort === "remaining"}
                    dir={dir}
                  >
                    Remaining
                  </SortLink>
                </th>
                <th className="col-lesser">Last contact</th>
                <th className="col-lesser">Added</th>
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
                      {customer.archivedAt ? (
                        <div className="text-[0.7rem] text-warn">Archived</div>
                      ) : null}
                      <div className="text-[0.7rem] text-muted">
                        {[customer.city, customer.postcode].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="col-extra">
                      <div>{customer.contactName}</div>
                      <div className="text-[0.7rem] text-muted">{customer.email}</div>
                    </td>
                    <td className="col-lesser">
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
                    <td className="col-lesser">{lead ? <StagePill value={lead.stage} /> : <span className="text-muted">—</span>}</td>
                    <td>{gbp(finance.due)}</td>
                    <td className="col-extra">{gbp(finance.paid)}</td>
                    <td className={finance.remaining > 0 ? "font-semibold text-warn" : "text-moss"}>
                      {gbp(finance.remaining)}
                    </td>
                    <td className="col-lesser">
                      {customer.notes[0] ? (
                        <>
                          {formatDate(customer.notes[0].createdAt)}
                          <div className="text-[0.7rem] text-muted">
                            {labelFor(CALL_NOTE_KINDS, customer.notes[0].kind)}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="col-lesser">{formatDate(customer.createdAt)}</td>
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
