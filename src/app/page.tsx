import Link from "next/link";
import { DeskLink } from "@/components/desk-link";
import { StartBook } from "@/components/start-book";
import {
  EmptyState,
  FuelPill,
  ObjectionPill,
  PageHeader,
  RenewalCell,
  Section,
  StagePill,
} from "@/components/ui";
import { QuarterlyMarketReminder } from "@/components/desk-reminder";
import { isClosedLeadStage, LEAD_STAGES } from "@/lib/constants";
import { ensureQuarterlyMarketReminder } from "@/lib/desk-reminders";
import { countLeadsByColumn } from "@/lib/lead-card";
import { resolveLeadBoardStage } from "@/lib/lead-board";
import { formatDate, formatMpan, gbp } from "@/lib/format";
import { DatabaseSetup } from "@/components/database-setup";
import { scheduleLeadBoardStageSync, scheduleRenewalReminderSync } from "@/lib/desk-after";
import { isDeskDatabaseConfigured } from "@/lib/desk-database";
import { prisma } from "@/lib/prisma";
import { getWorkingAsAdmin } from "@/lib/working-as";

export default async function DashboardPage() {
  if (!isDeskDatabaseConfigured()) {
    return <DatabaseSetup />;
  }

  let liveCustomers: number;
  try {
    liveCustomers = await prisma.customer.count({ where: { archivedAt: null } });
  } catch {
    return <DatabaseSetup />;
  }
  if (liveCustomers === 0) {
    return <StartBook />;
  }

  scheduleRenewalReminderSync();
  scheduleLeadBoardStageSync();
  const admin = await getWorkingAsAdmin();
  const quarterlyReminder = admin ? await ensureQuarterlyMarketReminder() : null;
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);

  const [renewals, objections, leadRows, deals, customerCount, meterCount] =
    await Promise.all([
    prisma.meter.findMany({
      where: { renewalDate: { lte: horizon }, customer: { archivedAt: null } },
      include: { customer: true, salesperson: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.meter.findMany({
      where: { objectionStatus: "IN_OBJECTION", customer: { archivedAt: null } },
      include: { customer: true, salesperson: true },
      orderBy: { objectionRaisedOn: "asc" },
    }),
    prisma.lead.findMany({
      where: { customer: { archivedAt: null } },
      select: { stage: true, notes: true },
    }),
    prisma.deal.findMany({
      where: { customer: { archivedAt: null }, status: { not: "CANCELLED" } },
    }),
    prisma.customer.count({ where: { archivedAt: null } }),
    prisma.meter.count({ where: { customer: { archivedAt: null } } }),
  ]);

  const leadCounts = countLeadsByColumn(leadRows);
  const openLeadCount = leadRows.filter(
    (lead) => !isClosedLeadStage(resolveLeadBoardStage(lead)),
  ).length;
  const estimated = deals.reduce((sum, deal) => sum + (deal.estimatedCommission ?? 0), 0);
  const paid = deals.reduce((sum, deal) => sum + (deal.actualPaid ?? 0), 0);
  const due = deals.reduce((sum, deal) => sum + (deal.amountDue ?? 0), 0);
  const maxLead = Math.max(1, ...LEAD_STAGES.map((stage) => leadCounts[stage.value] ?? 0));

  return (
    <div>
      <PageHeader
        kicker="Today on the desk"
        title="Renewals, pipeline, commission"
        description="What is coming off contract, which supplies are in objection, where the book sits, and what finance is still owed."
      />

      {quarterlyReminder ? <QuarterlyMarketReminder reminder={quarterlyReminder} /> : null}

      <div className="mb-6 grid gap-3 md:grid-cols-5">
        <Stat label="Customers" value={String(customerCount)} hint={`${meterCount} meters on supply`} />
        <Stat label="Open leads" value={String(openLeadCount)} hint="Not won or lost" />
        <Stat label="Commission due" value={gbp(due)} hint={`${gbp(estimated)} estimated`} />
        <Stat label="Paid" value={gbp(paid)} hint={`${gbp(estimated - paid)} still expected`} />
        <Stat
          label="In objection"
          value={String(objections.length)}
          hint={objections.length === 1 ? "Supply blocked on switch" : "Supplies blocked on switch"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section
          title="Renewals in the next 90 days"
          action={
            <div className="flex gap-3">
              <Link href="/renewals/calendar" className="text-xs font-semibold text-brass-dark">
                Month diary
              </Link>
              <Link href="/renewals" className="text-xs font-semibold text-brass-dark">
                Renewal ops
              </Link>
            </div>
          }
        >
          {renewals.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No meters renewing in 90 days"
                body="When contract end dates land inside the window they will show here."
                actionHref="/customers"
                actionLabel="Open customers"
              />
            </div>
          ) : (
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Supply</th>
                  <th className="col-lesser">Fuel</th>
                  <th className="col-extra">Supplier</th>
                  <th>Renewal</th>
                  <th className="col-lesser">Sales</th>
                </tr>
              </thead>
              <tbody>
                {renewals.map((meter) => (
                  <tr key={meter.id}>
                    <td>
                      <DeskLink href={`/customers/${meter.customerId}`} className="font-medium">
                        {meter.customer.companyName}
                      </DeskLink>
                      <div className="text-[0.7rem] text-muted">{meter.siteName}</div>
                    </td>
                    <td className="meter-id">
                      {meter.mpan ? formatMpan(meter.mpan) : meter.mprn}
                    </td>
                    <td className="col-lesser">
                      <FuelPill value={meter.fuelType} />
                    </td>
                    <td className="col-extra">{meter.supplier ?? "—"}</td>
                    <td>
                      <RenewalCell date={meter.renewalDate} />
                    </td>
                    <td className="col-lesser">{meter.salesperson?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Open leads by stage">
          <div className="space-y-3 p-4">
            {LEAD_STAGES.map((stage) => {
              const count = leadCounts[stage.value] ?? 0;
              return (
                <div key={stage.value}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <StagePill value={stage.value} />
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                  <div className="h-1.5 bg-[#ebe4d4]">
                    <div
                      className="h-1.5 bg-brass"
                      style={{ width: `${(count / maxLead) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <Link href="/leads" className="btn btn-ghost mt-2 w-full">
              Open pipeline
            </Link>
          </div>
        </Section>
      </div>

      <div className="mt-6">
        <Section title={`Meters in objection · ${objections.length}`}>
          {objections.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No supplies in objection"
                body="When a current supplier objects, it will show here and on the customer meter."
                actionHref="/customers"
                actionLabel="Open customers"
              />
            </div>
          ) : (
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Supply</th>
                  <th className="col-lesser">Fuel</th>
                  <th className="col-extra">Supplier</th>
                  <th>Status</th>
                  <th className="col-lesser">Raised</th>
                  <th className="col-extra">Reason</th>
                  <th className="col-lesser">Sales</th>
                </tr>
              </thead>
              <tbody>
                {objections.map((meter) => (
                  <tr key={meter.id}>
                    <td>
                      <DeskLink href={`/customers/${meter.customerId}`} className="font-medium">
                        {meter.customer.companyName}
                      </DeskLink>
                      <div className="text-[0.7rem] text-muted">{meter.siteName}</div>
                    </td>
                    <td className="meter-id">
                      {meter.mpan ? formatMpan(meter.mpan) : meter.mprn}
                    </td>
                    <td className="col-lesser">
                      <FuelPill value={meter.fuelType} />
                    </td>
                    <td className="col-extra">{meter.supplier ?? "—"}</td>
                    <td>
                      <ObjectionPill value={meter.objectionStatus} />
                    </td>
                    <td className="col-lesser">{formatDate(meter.objectionRaisedOn)}</td>
                    <td className="col-extra max-w-[16rem] text-[0.75rem]">{meter.objectionNote ?? "—"}</td>
                    <td className="col-lesser">{meter.salesperson?.name ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card px-4 py-4">
      <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className="mt-1 font-serif text-2xl text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
