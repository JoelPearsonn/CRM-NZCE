import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerFinanceLedger, FinanceSnapshot } from "@/components/customer-finance";
import { CustomerTenderBook } from "@/components/customer-tenders";
import { EmailForm, NoteForm, TaskForm } from "@/components/desk-forms";
import { MeterLoaForm } from "@/components/meter-loa";
import { MeterObjectionForm } from "@/components/meter-objection";
import { TenderCompare } from "@/components/tender-compare";
import {
  EmptyState,
  FuelPill,
  LoaPill,
  ObjectionPill,
  PageHeader,
  RenewalCell,
  Section,
  StagePill,
} from "@/components/ui";
import { archiveCustomer } from "@/app/actions/customers";
import { toggleTask } from "@/app/actions/desk";
import { CALL_NOTE_KINDS, isTenderLeadStage, labelFor } from "@/lib/constants";
import { financeTotals } from "@/lib/finance";
import { formatDate, formatDateTime, formatMpan, kwh } from "@/lib/format";
import { groupMetersBySite } from "@/lib/sites";
import type { IdPageProps, SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";
import { getWorkingAsId } from "@/lib/working-as";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: IdPageProps & SearchPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const presetLeadId = typeof query.leadId === "string" ? query.leadId : undefined;
  const [customer, agents, workingAsId] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        meters: { include: { salesperson: true }, orderBy: [{ siteName: "asc" }, { fuelType: "asc" }] },
        deals: {
          include: {
            salesperson: true,
            allocations: { include: { agent: true } },
            reconciliations: { include: { actor: true }, orderBy: { createdAt: "desc" } },
          },
          orderBy: { renewalDate: "asc" },
        },
        leads: { include: { allocations: { include: { agent: true } } }, orderBy: { updatedAt: "desc" } },
        tenderResponses: { include: { lead: true }, orderBy: { receivedOn: "desc" } },
        notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
        emails: { orderBy: { loggedAt: "desc" } },
        tasks: { include: { assignee: true }, orderBy: [{ status: "asc" }, { dueDate: "asc" }] },
        activities: { include: { actor: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
    getWorkingAsId(),
  ]);

  if (!customer) notFound();

  const finance = financeTotals(customer.deals);

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
            <Link href={`/customers/${customer.id}/print`} className="btn btn-ghost">
              Print summary
            </Link>
            <form action={archiveCustomer}>
              <input type="hidden" name="id" value={customer.id} />
              <button className="btn btn-ghost">
                {customer.archivedAt ? "Restore to book" : "Archive"}
              </button>
            </form>
          </>
        }
      />
      {customer.archivedAt ? (
        <p className="mb-4 border border-warn/40 bg-warn-soft px-3 py-2 text-sm">
          This record is archived. It is hidden from the default book — not deleted. Restore to put
          it back on the lists.
        </p>
      ) : null}

      <div className="mb-6">
        <FinanceSnapshot
          due={finance.due}
          paid={finance.paid}
          remaining={finance.remaining}
          estimated={finance.estimated}
        />
      </div>

      <div className="mb-6 grid gap-6">
        <Section
          title={`Sites · ${groupMetersBySite(customer.meters).length} · ${customer.meters.length} meters`}
          action={
            <Link href={`/customers/${customer.id}/meters/new`} className="btn btn-brass">
              Add meter
            </Link>
          }
        >
          {customer.meters.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No sites on this account"
                body="Add the first meter and give it a site name and address. Multi-site customers keep each building separate."
                actionHref={`/customers/${customer.id}/meters/new`}
                actionLabel="Add first meter"
              />
            </div>
          ) : (
            groupMetersBySite(customer.meters).map((site) => (
              <div key={site.name} className="border-b border-rule last:border-b-0">
                <div className="bg-[#f6f1e6] px-4 py-3">
                  <p className="font-serif text-lg text-ink">{site.name}</p>
                  <p className="text-sm text-muted">{site.address ?? "No site address yet"}</p>
                </div>
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Fuel</th>
                  <th>MPAN / MPRN</th>
                  <th>EAC / AQ</th>
                  <th>Supplier</th>
                  <th>HH/NHH</th>
                  <th>Rates</th>
                  <th>Renewal</th>
                  <th>LOA</th>
                  <th>Objection</th>
                  <th>Sales</th>
                </tr>
              </thead>
              <tbody>
                {site.meters.map((meter) => (
                  <tr key={meter.id}>
                    <td>
                      <Link href={`/meters/${meter.id}/edit`} className="font-medium">
                        <FuelPill value={meter.fuelType} />
                      </Link>
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
                      {meter.loaSignedOn || meter.loaSignedBy ? (
                        <div className="mt-1 text-[0.7rem] text-muted">
                          {meter.loaSignedOn ? formatDate(meter.loaSignedOn) : "Signed"}
                          {meter.loaSignedBy ? ` · ${meter.loaSignedBy}` : ""}
                        </div>
                      ) : null}
                      {meter.loaFileName ? (
                        <a href={`/api/loa/${meter.id}`} className="mt-1 block text-[0.7rem] font-semibold text-brass-dark">
                          {meter.loaFileName}
                        </a>
                      ) : null}
                    </td>
                    <td>
                      <ObjectionPill value={meter.objectionStatus} />
                      {meter.objectionNote ? (
                        <div className="mt-1 max-w-[12rem] text-[0.7rem] text-muted">
                          {meter.objectionNote}
                        </div>
                      ) : null}
                    </td>
                    <td>{meter.salesperson?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>
            ))
          )}
          {customer.meters.length > 0 ? (
            <>
              <div className="border-t border-rule">
                <p className="px-4 pt-3 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
                  Signed LOA
                </p>
                <p className="px-4 pt-1 text-xs text-muted">
                  Mark signed and store the copy. This does not generate an LOA or send it to DocuSign.
                </p>
                {customer.meters.map((meter) => (
                  <MeterLoaForm key={meter.id} meter={meter} />
                ))}
              </div>
              <div className="border-t border-rule">
                <p className="px-4 pt-3 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
                  Set or clear objection
                </p>
                {customer.meters.map((meter) => (
                  <MeterObjectionForm key={meter.id} meter={meter} />
                ))}
              </div>
            </>
          ) : null}
        </Section>

        <Section
          id="tenders"
          title={`Tender responses · ${customer.tenderResponses.length}`}
        >
          <CustomerTenderBook
            customerId={customer.id}
            tenders={customer.tenderResponses}
            leads={customer.leads}
            presetLeadId={presetLeadId}
          />
          <TenderCompare tenders={customer.tenderResponses} />
        </Section>

        <Section title="Finance tracker">
          <CustomerFinanceLedger
            customerId={customer.id}
            deals={customer.deals}
            meters={customer.meters}
            leads={customer.leads}
            agents={agents}
          />
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
                  <div className="flex items-center gap-2">
                    {isTenderLeadStage(lead.stage) ? (
                      <Link
                        href={`/customers/${customer.id}?leadId=${lead.id}#tenders`}
                        className="btn btn-brass text-[0.7rem]"
                      >
                        Add response
                      </Link>
                    ) : null}
                    <StagePill value={lead.stage} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="grid gap-6 xl:grid-cols-2">
          <Section title="Call notes">
            <NoteForm customerId={customer.id} agents={agents} workingAsId={workingAsId} />
            {customer.notes.length === 0 ? (
              <p className="p-4 text-sm text-muted">No call notes yet.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {customer.notes.map((note) => (
                  <li key={note.id} className="px-4 py-3">
                    <p className="text-[0.68rem] font-semibold tracking-[0.08em] text-muted uppercase">
                      {labelFor(CALL_NOTE_KINDS, note.kind)}
                    </p>
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
            <TaskForm customerId={customer.id} agents={agents} workingAsId={workingAsId} />
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
