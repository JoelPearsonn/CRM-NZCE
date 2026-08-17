"use client";

import { useActionState } from "react";
import type { Agent, Deal, DealPayment, Lead, Meter } from "@prisma/client";
import { reconcileDeal, type ActionState } from "@/app/actions/deals";
import { DealForm } from "@/components/forms";
import { DealStatusPill, ErrorBanner, FuelPill, RenewalCell } from "@/components/ui";
import { agentNames, splitLabel } from "@/lib/agents";
import { labelFor, TPI_PARTNERS } from "@/lib/constants";
import { contractMonths, dealRemaining, netCommission } from "@/lib/finance";
import { formatDate, formatDateTime, gbp, gbpExact, monthsLabel, toDateInput } from "@/lib/format";

const empty: ActionState = {};

type DealRow = Deal & {
  salesperson: { name: string } | null;
  allocations?: { agent: { name: string } }[];
  payments?: DealPayment[];
  reconciliations?: {
    id: string;
    createdAt: Date;
    actualPaidOld: number | null;
    actualPaidNew: number | null;
    amountDueOld: number | null;
    amountDueNew: number | null;
    actor: { name: string } | null;
  }[];
};

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
      <Snapshot label="Commission due" value={gbp(due)} hint="Net payouts still invoiced" />
      <Snapshot label="Actual paid" value={gbp(paid)} hint="Received on the book" />
      <Snapshot
        label="Remaining"
        value={gbp(remaining)}
        hint="Due minus paid"
        tone={remaining > 0 ? "warn" : "ok"}
      />
      <Snapshot label="Gross book" value={gbp(estimated)} hint="Full deal value before TPI" />
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

export function ReconcileDealForm({ deal }: { deal: Deal & { payments?: DealPayment[] } }) {
  const [state, action, pending] = useActionState(reconcileDeal, empty);
  const remaining = dealRemaining(deal);
  const payments = [...(deal.payments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={deal.id} />
      <ErrorBanner message={state.error} />
      {payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="desk-table">
            <thead>
              <tr>
                <th>{deal.payoutType === "RESIDUAL" ? "Month" : "Payment"}</th>
                {deal.payoutType === "RESIDUAL" ? null : <th>%</th>}
                <th>Due date</th>
                <th>Amount due</th>
                {deal.payoutType === "RESIDUAL" ? <th>Actual paid</th> : null}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={payment.id}>
                  <td className="font-medium">
                    {deal.payoutType === "RESIDUAL" ? payment.label : `Payment ${index + 1}`}
                  </td>
                  {deal.payoutType === "RESIDUAL" ? null : <td>{payment.percent}%</td>}
                  <td>
                    <input
                      name={`paymentDate_${payment.id}`}
                      type="date"
                      defaultValue={toDateInput(payment.expectedDate)}
                    />
                  </td>
                  {deal.payoutType === "RESIDUAL" ? (
                    <td>{gbpExact(payment.amountDue)}</td>
                  ) : (
                    <td>
                      <input
                        name={`paymentAmount_${payment.id}`}
                        defaultValue={payment.amountDue ?? ""}
                      />
                    </td>
                  )}
                  {deal.payoutType === "RESIDUAL" ? (
                    <td>
                      <input
                        name={`paymentPaid_${payment.id}`}
                        defaultValue={payment.actualPaid || ""}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {deal.payoutType === "RESIDUAL" ? null : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="field">
                <span>Actual commission</span>
                <input name="actualPaid" defaultValue={deal.actualPaid ?? ""} />
              </label>
              <label className="field">
                <span>Actual payment date</span>
                <input name="actualPaidDate" type="date" defaultValue={toDateInput(deal.actualPaidDate)} />
              </label>
            </div>
          )}
        </div>
      ) : (
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
            <span>Actual commission</span>
            <input name="actualPaid" defaultValue={deal.actualPaid ?? ""} />
          </label>
          <label className="field">
            <span>Actual payment date</span>
            <input name="actualPaidDate" type="date" defaultValue={toDateInput(deal.actualPaidDate)} />
          </label>
        </div>
      )}
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
  deals: DealRow[];
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
        <div className="space-y-4 p-4">
          {deals.map((deal) => {
            const net =
              deal.payoutType === "RESIDUAL"
                ? netCommission(deal.estimatedCommission, deal.tpiPercent)
                : (deal.estimatedCommission ?? 0);
            const months = contractMonths(deal.contractStart, deal.contractEnd);
            const payments = [...(deal.payments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <article key={deal.id} className="border border-rule bg-paper">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rule bg-[#f6f1e6] px-4 py-3">
                  <div>
                    <p className="font-medium">
                      {deal.supplier} · <FuelPill value={deal.fuelType} />{" "}
                      <DealStatusPill value={deal.status} />{" "}
                      <span className="pill bg-[#e7e4dc] text-ink">
                        {deal.payoutType === "RESIDUAL" ? "Monthly residual" : "Split"}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      CSD {formatDate(deal.contractStart)} · CED {formatDate(deal.contractEnd)}
                      {months != null ? ` · ${monthsLabel(months)}` : ""}
                    </p>
                  </div>
                  <RenewalCell date={deal.renewalDate} />
                </div>
                <div className="grid gap-3 px-4 py-3 sm:grid-cols-4">
                  <Fact label="TPI" value={labelFor(TPI_PARTNERS, deal.tpiPartner)} hint={deal.tpiPercent ? `${deal.tpiPercent}% deduction` : "None / direct"} />
                  <Fact label="Gross" value={gbpExact(deal.estimatedCommission)} hint="Full deal value" />
                  <Fact label="Net" value={gbpExact(net)} hint="After TPI" />
                  <Fact
                    label="Remaining"
                    value={gbpExact(dealRemaining(deal))}
                    hint="Net due minus paid"
                    warn={dealRemaining(deal) > 0}
                  />
                </div>
                {deal.payoutType === "RESIDUAL" ? null : (
                  <p className="px-4 pb-2 text-sm text-muted">
                    Actual commission {gbpExact(deal.actualPaid)}
                    {deal.actualPaidDate ? ` · ${formatDate(deal.actualPaidDate)}` : ""}
                  </p>
                )}
                {payments.length ? (
                  <table className="desk-table">
                    <thead>
                      <tr>
                        <th>{deal.payoutType === "RESIDUAL" ? "Month" : "Payment"}</th>
                        {deal.payoutType === "RESIDUAL" ? null : <th>%</th>}
                        <th>Due date</th>
                        <th>Amount due</th>
                        {deal.payoutType === "RESIDUAL" ? <th>Actual paid</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment, index) => (
                        <tr key={payment.id}>
                          <td className="font-medium">
                            {deal.payoutType === "RESIDUAL" ? payment.label : `Payment ${index + 1}`}
                          </td>
                          {deal.payoutType === "RESIDUAL" ? null : <td>{payment.percent}%</td>}
                          <td>{formatDate(payment.expectedDate)}</td>
                          <td>{gbpExact(payment.amountDue)}</td>
                          {deal.payoutType === "RESIDUAL" ? <td>{gbpExact(payment.actualPaid)}</td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                <p className="px-4 py-2 text-[0.7rem] text-muted">
                  Sales:{" "}
                  {deal.allocations?.length
                    ? `${agentNames(deal.allocations.map((row) => row.agent))}${
                        splitLabel(deal.allocations.length)
                          ? ` · ${splitLabel(deal.allocations.length)}`
                          : ""
                      }`
                    : (deal.salesperson?.name ?? "—")}
                </p>
              </article>
            );
          })}
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

function Fact({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-muted uppercase">{label}</p>
      <p className={`font-serif text-xl ${warn ? "text-warn" : "text-ink"}`}>{value}</p>
      <p className="text-[0.7rem] text-muted">{hint}</p>
    </div>
  );
}
