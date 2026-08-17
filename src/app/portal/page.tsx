import { redirect } from "next/navigation";
import { signOutPortal } from "@/app/actions/portal";
import { FuelPill, PageHeader } from "@/components/ui";
import { DEAL_STATUSES, labelFor } from "@/lib/constants";
import { formatDate, formatMpan, kwh } from "@/lib/format";
import { getPortalAccount } from "@/lib/portal-auth";
import { loadPortalBook } from "@/lib/portal-book";

export default async function PortalHomePage() {
  const account = await getPortalAccount();
  if (!account) redirect("/portal/login");
  const book = await loadPortalBook(account.customerId);
  if (!book) redirect("/portal/login");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6" data-testid="portal-home">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-rule pb-4">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">
            Customer portal
          </p>
          <p className="mt-1 font-serif text-2xl text-ink">Your NZCE energy book</p>
        </div>
        <form action={signOutPortal}>
          <button className="btn btn-ghost" type="submit">
            Sign out
          </button>
        </form>
      </header>

      <PageHeader
        kicker={book.customer.city ?? "Your sites"}
        title={book.customer.companyName}
        description={[
          book.customer.tradingName ? `Trading as ${book.customer.tradingName}` : null,
          `Signed in as ${book.customer.contactName}`,
          book.customer.email,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <section className="card mb-5 overflow-x-auto" data-testid="portal-contracts">
        <div className="border-b border-rule bg-[#f6f1e6] px-4 py-2">
          <h2 className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">
            Contracts
          </h2>
        </div>
        {book.contracts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No live contracts on this book yet.</p>
        ) : (
          <table className="desk-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Fuel</th>
                <th>Site</th>
                <th>MPAN / MPRN</th>
                <th>Start</th>
                <th>End</th>
                <th>Renewal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {book.contracts.map((deal) => (
                <tr key={deal.id}>
                  <td className="font-medium">{deal.supplier}</td>
                  <td>
                    <FuelPill value={deal.fuelType} />
                  </td>
                  <td>{deal.siteName ?? "—"}</td>
                  <td className="meter-id">
                    {deal.mpan ? `E ${formatMpan(deal.mpan)}` : deal.mprn ? `G ${deal.mprn}` : "—"}
                  </td>
                  <td>{formatDate(deal.contractStart)}</td>
                  <td>{formatDate(deal.contractEnd)}</td>
                  <td>{formatDate(deal.renewalDate)}</td>
                  <td>{labelFor(DEAL_STATUSES, deal.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card mb-5 overflow-x-auto" data-testid="portal-meters">
        <div className="border-b border-rule bg-[#f6f1e6] px-4 py-2">
          <h2 className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">
            Meters
          </h2>
        </div>
        {book.meters.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No meters on this book yet.</p>
        ) : (
          <table className="desk-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Fuel</th>
                <th>MPAN / MPRN</th>
                <th>Supplier</th>
                <th>EAC / AQ</th>
                <th>Renewal</th>
              </tr>
            </thead>
            <tbody>
              {book.meters.map((meter) => (
                <tr key={meter.id}>
                  <td className="font-medium">{meter.siteName ?? "—"}</td>
                  <td>
                    <FuelPill value={meter.fuelType} />
                  </td>
                  <td className="meter-id">
                    {meter.mpan ? `E ${meter.mpanLabel}` : meter.mprn ? `G ${meter.mprn}` : "—"}
                  </td>
                  <td>{meter.supplier ?? "—"}</td>
                  <td>
                    {meter.electricEac
                      ? kwh(meter.electricEac)
                      : meter.gasAq
                        ? kwh(meter.gasAq)
                        : "—"}
                  </td>
                  <td>{formatDate(meter.renewalDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-x-auto" data-testid="portal-renewals">
        <div className="border-b border-rule bg-[#f6f1e6] px-4 py-2">
          <h2 className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">
            Renewals
          </h2>
        </div>
        {book.renewals.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No renewal dates on the book.</p>
        ) : (
          <table className="desk-table">
            <thead>
              <tr>
                <th>When</th>
                <th>What</th>
                <th>Site</th>
                <th>Supplier</th>
                <th>Supply</th>
              </tr>
            </thead>
            <tbody>
              {book.renewals.map((row) => (
                <tr key={row.id}>
                  <td className="font-medium">{formatDate(row.renewalDate)}</td>
                  <td>{row.kind === "contract" ? "Contract" : "Meter"}</td>
                  <td>{row.siteName ?? "—"}</td>
                  <td>{row.supplier ?? "—"}</td>
                  <td className="meter-id">
                    {row.mpan ? `E ${formatMpan(row.mpan)}` : row.mprn ? `G ${row.mprn}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
