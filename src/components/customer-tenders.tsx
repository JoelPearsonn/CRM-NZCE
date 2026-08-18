"use client";

import Link from "next/link";
import type { Lead, TenderResponse } from "@prisma/client";
import { markTenderPreferred } from "@/app/actions/tenders";
import { TenderForm } from "@/components/forms";
import { FuelPill, TenderStatusPill } from "@/components/ui";
import { formatDate, gbp, monthsLabel, pence } from "@/lib/format";

type TenderRow = TenderResponse & { lead: { id: string; title: string } | null };

export function CustomerTenderBook({
  customerId,
  tenders,
  leads,
  presetLeadId,
}: {
  customerId: string;
  tenders: TenderRow[];
  leads: Lead[];
  presetLeadId?: string;
}) {
  const rank: Record<string, number> = { PREFERRED: 0, RECEIVED: 1, DECLINED: 2, EXPIRED: 3 };
  const rows = [...tenders].sort((a, b) => {
    const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    return new Date(b.receivedOn ?? 0).getTime() - new Date(a.receivedOn ?? 0).getTime();
  });
  const preferred = rows.find((tender) => tender.status === "PREFERRED");
  const addOpen = Boolean(presetLeadId) || tenders.length === 0;

  return (
    <div>
      {tenders.length === 0 ? (
        <p className="px-4 pt-4 text-sm text-muted">
          No supplier quotes on this account yet. Log what came back — this is a record, not a
          tender email.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="desk-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th className="col-lesser">Fuel</th>
                <th className="col-extra">Received</th>
                <th className="col-lesser">Standing charge</th>
                <th className="col-extra">Unit rate(s)</th>
                <th className="col-lesser">Length</th>
                <th>Est. annual</th>
                <th>Status</th>
                <th className="col-lesser">Lead</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tender) => (
                <tr
                  key={tender.id}
                  className={tender.status === "PREFERRED" ? "bg-moss-soft/40" : undefined}
                >
                  <td className="font-medium">
                    <Link href={`/tenders/${tender.id}/edit`}>{tender.supplier}</Link>
                    {tender.notes ? (
                      <div className="mt-1 max-w-[14rem] text-[0.7rem] text-muted">{tender.notes}</div>
                    ) : null}
                  </td>
                  <td className="col-lesser">
                    <FuelPill value={tender.fuelType} />
                  </td>
                  <td className="col-extra">{formatDate(tender.receivedOn)}</td>
                  <td className="col-lesser">
                    {tender.standingCharge != null ? `${pence(tender.standingCharge)}/day` : "—"}
                  </td>
                  <td className="col-extra max-w-[12rem] text-[0.75rem]">{tender.unitRates ?? "—"}</td>
                  <td className="col-lesser">{monthsLabel(tender.contractLengthMonths)}</td>
                  <td className="font-medium">{gbp(tender.estimatedAnnualCost)}</td>
                  <td>
                    <TenderStatusPill value={tender.status} />
                  </td>
                  <td className="col-lesser">
                    {tender.lead ? (
                      <Link href={`/leads/${tender.lead.id}`} className="text-[0.75rem]">
                        {tender.lead.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/tenders/${tender.id}/edit`} className="btn btn-ghost text-[0.7rem]">
                        Edit
                      </Link>
                      {tender.status === "PREFERRED" ? null : (
                        <form action={markTenderPreferred}>
                          <input type="hidden" name="id" value={tender.id} />
                          <button className="btn btn-brass text-[0.7rem]">Mark preferred</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preferred ? (
        <p className="border-t border-rule px-4 py-3 text-sm">
          Preferred for this pack: <span className="font-semibold">{preferred.supplier}</span>
          {preferred.estimatedAnnualCost != null
            ? ` · ${gbp(preferred.estimatedAnnualCost)} estimated annual`
            : null}
          {preferred.unitRates ? ` · ${preferred.unitRates}` : null}
        </p>
      ) : null}

      <details className="border-t border-rule" open={addOpen}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Add a tender response
        </summary>
        <TenderForm
          customerId={customerId}
          leads={leads}
          presetLeadId={presetLeadId}
          embedded
        />
      </details>
    </div>
  );
}
