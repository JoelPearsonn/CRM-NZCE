"use client";

import { useActionState } from "react";
import type { Agent, Deal, Lead, Meter } from "@prisma/client";
import { reconcileDeal, type ActionState } from "@/app/actions/deals";
import { DealForm } from "@/components/forms";
import { DealStatusPill, ErrorBanner, FuelPill, RenewalCell } from "@/components/ui";
import { agentNames, splitLabel } from "@/lib/agents";
import { formatDate, formatDateTime, gbp, gbpExact, toDateInput } from "@/lib/format";
import { dealRemaining } from "@/lib/finance";

const empty: ActionState = {};

export function FinanceSnapshot({
  due,
  paid,
  remaining,
  estimated,
}: {
  due: number;
  paid: number;
  remaining: number;
  estimated: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <Snapshot label="Commission due" value={gbp(due)} hint="Amount still invoiced" />
      <Snapshot label="Actual paid" value={gbp(paid)} hint="Received on the book" />
      <Snapshot
        label="Remaining"
        value={gbp(remaining)}
        hint="Due minus paid"
        tone={remaining > 0 ? "warn" : "ok"}
      />
      <Snapshot label="Estimated" value={gbp(estimated)} hint="Commission on the deals" />
    </div>
  );
}

function Snapshot({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "warn" | "ok";
}) {
  const valueClass =
    tone === "warn" ? "text-warn" : tone === "ok" ? "text-moss" : "text-ink";
  return (
    <div className="card px-4 py-3">
      <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

export function ReconcileDealForm({ deal }: { deal: Deal }) {
  const [state, action, pending] = useActionState(reconcileDeal, empty);
  const remaining = dealRemaining(deal);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={deal.id} />
      <ErrorBanner message={state.error} />
      <div className="grid gap-2 lg:grid-cols-5">
        <label className="field">
          <span>Due date</span>
          <input name="dueDate" type="date" defaultValue={toDateInput(deal.dueDate)} />
        </label>
        <label className="field">
          <span>Amount due</span>
          <input name="amountDue" defaultValue={deal.amountDue ?? ""} />
        </label>
        <label className="field">
          <span>Est. commission</span>
          <input name="estimatedCommission" defaultValue={deal.estimatedCommission ?? ""} />
        </label>
        <label className="field">
          <span>Actual paid</span>
          <input name="actualPaid" defaultValue={deal.actualPaid ?? ""} />
        </label>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-muted uppercase">
              Remaining
            </p>
            <p className={`font-serif text-lg ${remaining > 0 ? "text-warn" : "text-moss"}`}>
              {gbp(remaining)}
            </p>
          </div>
          <button className="btn btn-brass" disabled={pending}>
            {pending ? "Saving…" : "Save finance"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function CustomerFinanceLedger({
  customerId,
  deals,
  meters,
  leads,
  agents,
}: {
  customerId: string;
  deals: (Deal & {
    salesperson: { name: string } | null;
    allocations?: { agent: { name: string } }[];
    reconciliations?: {
      id: string;
      createdAt: Date;
      actualPaidOld: number | null;
      actualPaidNew: number | null;
      amountDueOld: number | null;
      amountDueNew: number | null;
      actor: { name: string } | null;
    }[];
  })[];
  meters: Meter[];
  leads: Lead[];
  agents: Agent[];
}) {
  return (
    <div>
      {deals.length === 0 ? (
        <p className="px-4 pt-4 text-sm text-muted">
          No deals on this customer yet. Record one below — the same row appears on the book-wide
          Contracts page.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="desk-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Fuel</th>
                <th>Status</th>
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
                  <td className="font-medium">{deal.supplier}</td>
                  <td>
                    <FuelPill value={deal.fuelType} />
                  </td>
                  <td>
                    <DealStatusPill value={deal.status} />
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
                    {deal.allocations?.length
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
        </div>
      )}

      {deals.map((deal) => (
        <div key={deal.id} className="border-t border-rule px-4 py-4">
          <p className="mb-2 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
            Reconcile · {deal.supplier}
          </p>
          <ReconcileDealForm deal={deal} />
          {deal.reconciliations?.length ? (
            <ol className="mt-3 space-y-1 text-xs text-muted">
              {deal.reconciliations.map((row) => (
                <li key={row.id}>
                  {formatDateTime(row.createdAt)} · {row.actor?.name ?? "Desk"} · Actual paid{" "}
                  {gbpExact(row.actualPaidOld)} → {gbpExact(row.actualPaidNew)}
                  {row.amountDueOld !== row.amountDueNew
                    ? ` · Due ${gbpExact(row.amountDueOld)} → ${gbpExact(row.amountDueNew)}`
                    : ""}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-xs text-muted">No paid-history yet — each save is logged here.</p>
          )}
        </div>
      ))}

      <details className="border-t border-rule" open>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          Record a deal on this customer
        </summary>
        <DealForm
          customers={[]}
          meters={meters}
          leads={leads}
          agents={agents}
          presetCustomerId={customerId}
          returnTo="customer"
          lockCustomer
          embedded
        />
      </details>
    </div>
  );
}
