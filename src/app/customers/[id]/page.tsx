import Link from "next/link";
import { notFound } from "next/navigation";
import { EmailForm, NoteForm, TaskForm } from "@/components/desk-forms";
import {
  DealStatusPill,
  EmptyState,
  FuelPill,
  LoaPill,
  PageHeader,
  RenewalCell,
  Section,
  StagePill,
} from "@/components/ui";
import { toggleTask } from "@/app/actions/desk";
import { formatDate, formatDateTime, formatMpan, gbp, kwh } from "@/lib/format";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function CustomerDetailPage({ params }: IdPageProps) {
  const { id } = await params;
  const [customer, agents] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        meters: { include: { salesperson: true }, orderBy: [{ siteName: "asc" }, { fuelType: "asc" }] },
        deals: { include: { salesperson: true }, orderBy: { renewalDate: "asc" } },
        leads: { include: { allocations: { include: { agent: true } } }, orderBy: { updatedAt: "desc" } },
        notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
        emails: { orderBy: { loggedAt: "desc" } },
        tasks: { include: { assignee: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
        activities: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        kicker={customer.industry ?? "Customer"}
        title={customer.companyName}
        description={[
          customer.tradingName ? `Trading as ${customer.tradingName}` : null,
          customer.contactName,
          customer.email,
          customer.phone,
          [customer.addressLine1, customer.city, customer.postcode].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <Link href={`/customers/${customer.id}/edit`} className="btn btn-ghost">
              Edit customer
            </Link>
            <Link href={`/leads/new?customerId=${customer.id}`} className="btn btn-ghost">
              Open lead
            </Link>
            <Link href={`/contracts/new?customerId=${customer.id}`} className="btn btn-primary">
              Record deal
            </Link>
          </>
        }
      />

      <div className="mb-6 grid gap-6">
        <Section
          title={`Meters · ${customer.meters.length}`}
          action={
            <Link href={`/customers/${customer.id}/meters/new`} className="btn btn-brass">
              Add meter
            </Link>
          }
        >
          {customer.meters.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No meters on this account"
                body="Add an MPAN or MPRN so renewals and tenders have somewhere to sit."
                actionHref={`/customers/${customer.id}/meters/new`}
                actionLabel="Add meter"
              />
            </div>
          ) : (
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Fuel</th>
                  <th>MPAN / MPRN</th>
                  <th>EAC / AQ</th>
                  <th>Supplier</th>
                  <th>HH/NHH</th>
                  <th>Rates</th>
                  <th>Renewal</th>
                  <th>LOA</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {customer.meters.map((meter) => (
                  <tr key={meter.id}>
                    <td>
                      <Link href={`/meters/${meter.id}/edit`} className="font-medium">
                        {meter.siteName ?? "Site"}
                      </Link>
                    </td>
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
                      {meter.electricEac == null && meter.gasAq == null ? "—" : null}
                    </td>
                    <td>{meter.supplier ?? "—"}</td>
                    <td>{meter.settlement ?? "—"}</td>
                    <td className="max-w-[12rem] text-[0.75rem]">{meter.currentRates ?? "—"}</td>
                    <td>
                      <RenewalCell date={meter.renewalDate} />
                    </td>
                    <td>
                      <LoaPill value={meter.loaStatus} />
                    </td>
                    <td>{meter.salesperson?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section
            title="Contracts"
            action={
              <Link href={`/contracts/new?customerId=${customer.id}`} className="text-xs font-semibold text-brass-dark">
                Record deal
              </Link>
            }
          >
            {customer.deals.length === 0 ? (
              <p className="p-4 text-sm text-muted">No sold contracts recorded yet.</p>
            ) : (
              <table className="desk-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Renewal</th>
                    <th>Due</th>
                    <th>Est / paid</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.deals.map((deal) => (
                    <tr key={deal.id}>
                      <td>
                        <Link href={`/contracts/${deal.id}`} className="font-medium">
                          {deal.supplier}
                        </Link>
                      </td>
                      <td>
                        <DealStatusPill value={deal.status} />
                      </td>
                      <td>
                        <RenewalCell date={deal.renewalDate} />
                      </td>
                      <td>
                        <div>{formatDate(deal.dueDate)}</div>
                        <div className="text-[0.7rem] text-muted">{gbp(deal.amountDue)}</div>
                      </td>
                      <td>
                        {gbp(deal.estimatedCommission)} / {gbp(deal.actualPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Leads">
            {customer.leads.length === 0 ? (
              <p className="p-4 text-sm text-muted">No live sales process on this account.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {customer.leads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <Link href={`/leads/${lead.id}`} className="font-medium">
                        {lead.title}
                      </Link>
                      <div className="text-[0.7rem] text-muted">
                        {lead.allocations.map((allocation) => allocation.agent.name).join(", ") || "Unallocated"}
                      </div>
                    </div>
                    <StagePill value={lead.stage} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Call notes">
            <NoteForm customerId={customer.id} agents={agents} />
            {customer.notes.length === 0 ? (
              <p className="p-4 text-sm text-muted">No call notes yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {customer.notes.map((note) => (
                  <li key={note.id} className="px-4 py-3">
                    <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                    <p className="mt-1 text-[0.7rem] text-muted">
                      {note.author?.name ?? "Desk"} · {formatDateTime(note.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Tasks / follow-ups">
            <TaskForm customerId={customer.id} agents={agents} />
            {customer.tasks.length === 0 ? (
              <p className="p-4 text-sm text-muted">Nothing to chase.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {customer.tasks.map((task) => (
                  <li key={task.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <p className={task.status === "DONE" ? "text-sm text-muted line-through" : "text-sm"}>
                        {task.title}
                      </p>
                      <p className="text-[0.7rem] text-muted">
                        {task.assignee?.name ?? "Unassigned"} · due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <button className="btn btn-ghost text-[0.7rem]">
                        {task.status === "DONE" ? "Reopen" : "Done"}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Emails (log only)">
            <EmailForm customerId={customer.id} />
            {customer.emails.length === 0 ? (
              <p className="p-4 text-sm text-muted">No emails logged. This is a manual log, not live Gmail.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {customer.emails.map((email) => (
                  <li key={email.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{email.subject}</p>
                    <p className="text-[0.7rem] text-muted">
                      {email.fromAddr} → {email.toAddr} · {formatDateTime(email.loggedAt)}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{email.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Activity">
            {customer.activities.length === 0 ? (
              <p className="p-4 text-sm text-muted">Activity will land here as the desk works the account.</p>
            ) : (
              <ol className="divide-y divide-rule">
                {customer.activities.map((activity) => (
                  <li key={activity.id} className="px-4 py-3">
                    <p className="text-sm">{activity.summary}</p>
                    <p className="text-[0.7rem] text-muted">
                      {activity.actor?.name ?? "Desk"} · {formatDateTime(activity.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
