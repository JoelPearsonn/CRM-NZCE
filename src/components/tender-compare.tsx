"use client";

import type { TenderResponse } from "@prisma/client";
import { markTenderPreferred } from "@/app/actions/tenders";
import { FuelPill, TenderStatusPill } from "@/components/ui";
import { FUEL_TYPES } from "@/lib/constants";
import { formatDate, gbp, monthsLabel, pence } from "@/lib/format";

type Row = TenderResponse & { lead: { id: string; title: string } | null };

export function TenderCompare({ tenders }: { tenders: Row[] }) {
  const fuels = FUEL_TYPES.map((fuel) => ({
    ...fuel,
    quotes: tenders.filter((tender) => tender.fuelType === fuel.value),
  })).filter((group) => group.quotes.length > 0);

  if (fuels.length === 0) return null;

  return (
    <div className="border-t border-rule">
      <p className="px-4 pt-3 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
        Compare quotes
      </p>
      <p className="px-4 pb-2 text-xs text-muted">
        Side by side for the same fuel. Mark preferred when Claire (or the buyer) picks one.
      </p>
      {fuels.map((group) => (
        <div key={group.value} className="border-t border-rule px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <FuelPill value={group.value} />
            <span className="text-sm text-muted">{group.quotes.length} quotes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="desk-table min-w-[40rem]">
              <thead>
                <tr>
                  <th className="w-40"> </th>
                  {group.quotes.map((quote) => (
                    <th key={quote.id} className={quote.status === "PREFERRED" ? "bg-moss-soft" : undefined}>
                      {quote.supplier}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <CompareRow label="Received" quotes={group.quotes} value={(q) => formatDate(q.receivedOn)} />
                <CompareRow
                  label="Standing charge"
                  quotes={group.quotes}
                  value={(q) => (q.standingCharge != null ? `${pence(q.standingCharge)}/day` : "—")}
                />
                <CompareRow label="Unit rate(s)" quotes={group.quotes} value={(q) => q.unitRates ?? "—"} />
                <CompareRow
                  label="Length"
                  quotes={group.quotes}
                  value={(q) => monthsLabel(q.contractLengthMonths)}
                />
                <CompareRow
                  label="Est. annual"
                  quotes={group.quotes}
                  value={(q) => gbp(q.estimatedAnnualCost)}
                  strong
                />
                <tr>
                  <td className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
                    Status
                  </td>
                  {group.quotes.map((quote) => (
                    <td key={quote.id} className={quote.status === "PREFERRED" ? "bg-moss-soft/50" : undefined}>
                      <TenderStatusPill value={quote.status} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
                    Pick
                  </td>
                  {group.quotes.map((quote) => (
                    <td key={quote.id} className={quote.status === "PREFERRED" ? "bg-moss-soft/50" : undefined}>
                      {quote.status === "PREFERRED" ? (
                        <span className="text-xs font-semibold text-moss">Preferred</span>
                      ) : (
                        <form action={markTenderPreferred}>
                          <input type="hidden" name="id" value={quote.id} />
                          <button className="btn btn-brass text-[0.7rem]">Mark preferred</button>
                        </form>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          {group.quotes.some((quote) => quote.notes) ? (
            <ul className="mt-3 space-y-1 text-[0.75rem] text-muted">
              {group.quotes.map((quote) =>
                quote.notes ? (
                  <li key={quote.id}>
                    <span className="font-medium text-ink">{quote.supplier}:</span> {quote.notes}
                  </li>
                ) : null,
              )}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CompareRow({
  label,
  quotes,
  value,
  strong,
}: {
  label: string;
  quotes: Row[];
  value: (quote: Row) => string;
  strong?: boolean;
}) {
  return (
    <tr>
      <td className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">{label}</td>
      {quotes.map((quote) => (
        <td
          key={quote.id}
          className={`${quote.status === "PREFERRED" ? "bg-moss-soft/50" : ""} ${strong ? "font-semibold" : ""}`}
        >
          {value(quote)}
        </td>
      ))}
    </tr>
  );
}
