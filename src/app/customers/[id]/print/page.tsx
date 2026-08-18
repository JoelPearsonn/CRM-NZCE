import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import {
  DealStatusPill,
  FuelPill,
  LoaPill,
  ObjectionPill,
  PageHeader,
  RenewalCell,
  TenderStatusPill,
} from "@/components/ui";
import { agentNames, splitLabel } from "@/lib/agents";
import { financeTotals } from "@/lib/finance";
import { formatDate, formatMpan, gbp, kwh } from "@/lib/format";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";
import { groupMetersBySite } from "@/lib/sites";

export default async function CustomerPrintPage({ params }: IdPageProps) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      meters: { include: { salesperson: true }, orderBy: [{ siteName: "asc" }, { fuelType: "asc" }] },
      deals: {
        include: { salesperson: true, allocations: { include: { agent: true } } },
        orderBy: { renewalDate: "asc" },
      },
      tenderResponses: { orderBy: { receivedOn: "desc" } },
    },
  });
  if (!customer) notFound();

  const finance = financeTotals(customer.deals);
  const printed = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <PageHeader
        kicker="Customer summary"
        title={customer.companyName}
        description={[
          customer.tradingName ? `Trading as ${customer.tradingName}` : null,
          customer.contactName,
          customer.email,
          customer.phone,
          [customer.addressLine1, customer.city, customer.postcode].filter(Boolean).join(", "),
          `Printed ${printed}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="no-print flex gap-2">
            <Link href={`/customers/${customer.id}`} className="btn btn-ghost">
              Back to record
            </Link>
            <PrintButton />
          </div>
        }
      />

      <p className="mb-6 text-sm text-muted">
        HTML print only — this is not a generated PDF. Use the browser print dialog.
      </p>

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <PrintStat label="Due" value={gbp(finance.due)} />
        <PrintStat label="Paid" value={gbp(finance.paid)} />
        <PrintStat label="Remaining" value={gbp(finance.remaining)} />
        <PrintStat label="Estimated" value={gbp(finance.estimated)} />
      </div>

      <section className="card mb-6 overflow-hidden">
        <h2 className="section-title border-b border-rule px-4 py-3">
          Sites and meters · {groupMetersBySite(customer.meters).length} sites
        </h2>
        {customer.meters.length === 0 ? (
          <p className="p-4 text-sm text-muted">No meters on this account.</p>
        ) : (
          groupMetersBySite(customer.meters).map((site) => (
            <div key={site.name} className="border-b border-rule last:border-b-0">
              <div className="bg-[#f6f1e6] px-4 py-2">
                <p className="font-serif text-lg">{site.name}</p>
                <p className="text-sm text-muted">{site.address ?? "No site address"}</p>
              </div>
              <table className="desk-table">
                <thead>
                  <tr>
                    <th>Fuel</th>
                    <th>MPAN / MPRN</th>
                    <th>EAC / AQ</th>
                    <th>Supplier</th>
                    <th>Renewal</th>
                    <th>LOA</th>
                    <th>Objection</th>
                  </tr>
                </thead>
                <tbody>
                  {site.meters.map((meter) => (
                    <tr key={meter.id}>
                      <td>
                        <FuelPill value={meter.fuelType} />
                      </td>
                      <td className="meter-id">
                        {meter.mpan ? <div>E {formatMpan(meter.mpan)}</div> : null}
                        {meter.mprn ? <div>G {meter.mprn}</div> : null}
                      </td>
                      <td>
                        {meter.electricEac != null ? <div>EAC {kwh(meter.electricEac)}</div> : null}
                        {meter.gasAq != null ? <div>AQ {kwh(meter.gasAq)}</div> : null}
                      </td>
                      <td>{meter.supplier ?? "—"}</td>
                      <td>
                        <RenewalCell date={meter.renewalDate} />
                      </td>
                      <td>
                        <LoaPill value={meter.loaStatus} />
                        {meter.loaSignedBy ? (
                          <div className="mt-1 text-[0.7rem] text-muted">{meter.loaSignedBy}</div>
                        ) : null}
                      </td>
                      <td>
                        <ObjectionPill value={meter.objectionStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </section>

      <section className="card mb-6 overflow-hidden">
        <h2 className="section-title border-b border-rule px-4 py-3">
          Tender responses · {customer.tenderResponses.length}
        </h2>
        {customer.tenderResponses.length === 0 ? (
          <p className="p-4 text-sm text-muted">No tender responses logged.</p>
        ) : (
          <table className="desk-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Fuel</th>
                <th>Received</th>
                <th>Term</th>
                <th>Est. annual</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customer.tenderResponses.map((tender) => (
                <tr key={tender.id}>
                  <td className="font-medium">{tender.supplier}</td>
                  <td>
                    <FuelPill value={tender.fuelType} />
                  </td>
                  <td>{formatDate(tender.receivedOn)}</td>
                  <td>{tender.contractLengthMonths ? `${tender.contractLengthMonths}m` : "—"}</td>
                  <td>{gbp(tender.estimatedAnnualCost)}</td>
                  <td>
                    <TenderStatusPill value={tender.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card overflow-hidden">
        <h2 className="section-title border-b border-rule px-4 py-3">Finance</h2>
        {customer.deals.length === 0 ? (
          <p className="p-4 text-sm text-muted">No deals on this customer.</p>
        ) : (
          <table className="desk-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Status</th>
                <th>CSD</th>
                <th>CED</th>
                <th>Due</th>
                <th>Paid</th>
                <th>Gross</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {customer.deals.map((deal) => (
                <tr key={deal.id}>
                  <td className="font-medium">{deal.supplier}</td>
                  <td>
                    <DealStatusPill value={deal.status} />
                  </td>
                  <td>{formatDate(deal.contractStart)}</td>
                  <td>{formatDate(deal.contractEnd)}</td>
                  <td>{gbp(deal.amountDue)}</td>
                  <td>{gbp(deal.actualPaid)}</td>
                  <td>{gbp(deal.estimatedCommission)}</td>
                  <td>
                    {deal.allocations.length
                      ? `${agentNames(deal.allocations.map((row) => row.agent))}${
                          splitLabel(deal.allocations.length)
                            ? ` · ${splitLabel(deal.allocations.length)}`
                            : ""
                        }`
                      : (deal.salesperson?.name ?? "—")}
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

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </div>
  );
}
