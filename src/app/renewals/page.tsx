import Link from "next/link";
import {
  EmptyState,
  FuelPill,
  LoaPill,
  ObjectionPill,
  PageHeader,
  RenewalCell,
  Section,
} from "@/components/ui";
import { financeTotals } from "@/lib/finance";
import { formatDate, formatMpan, gbp } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";
import { ensureRenewalReminderTasks } from "@/lib/renewal-tasks";

const WINDOWS = [30, 60, 90] as const;

export default async function RenewalsPage({ searchParams }: SearchPageProps) {
  await ensureRenewalReminderTasks();
  const query = await searchParams;
  const raw = Number(typeof query.days === "string" ? query.days : 90);
  const days = WINDOWS.includes(raw as (typeof WINDOWS)[number]) ? raw : 90;

  const horizon = new Date();
  horizon.setHours(12, 0, 0, 0);
  horizon.setDate(horizon.getDate() + days);

  const meters = await prisma.meter.findMany({
    where: { renewalDate: { lte: horizon }, customer: { archivedAt: null } },
    include: {
      customer: { include: { deals: true } },
      salesperson: true,
    },
    orderBy: { renewalDate: "asc" },
  });

  const unsigned = meters.filter((meter) => meter.loaStatus !== "SIGNED" && meter.loaStatus !== "RECEIVED");
  const objected = meters.filter((meter) => meter.objectionStatus === "IN_OBJECTION");

  return (
    <div>
      <PageHeader
        kicker="Renewal ops"
        title={`Renewals in ${days} days`}
        description="Every supply coming off contract in the window, with LOA, objection and the customer’s finance snapshot — not just the desk list."
        actions={
          <div className="flex gap-2">
            {WINDOWS.map((window) => (
              <Link
                key={window}
                href={`/renewals?days=${window}`}
                className={window === days ? "btn btn-primary" : "btn btn-ghost"}
              >
                {window} days
              </Link>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Stat label="Supplies in window" value={String(meters.length)} hint={`Renewing within ${days} days`} />
        <Stat
          label="LOA not signed"
          value={String(unsigned.length)}
          hint="Requested, missing, or expired"
        />
        <Stat
          label="In objection"
          value={String(objected.length)}
          hint="Blocked on the current supplier"
        />
      </div>

      <Section title={`Renewal book · ${meters.length}`}>
        {meters.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Nothing in this window"
              body="When a meter’s renewal date lands inside 30, 60 or 90 days it will show here."
            />
          </div>
        ) : (
          <table className="desk-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Supply</th>
                <th>Fuel</th>
                <th>Supplier</th>
                <th>Renewal</th>
                <th>LOA</th>
                <th>Objection</th>
                <th>Finance</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {meters.map((meter) => {
                const finance = financeTotals(meter.customer.deals);
                return (
                  <tr key={meter.id}>
                    <td>
                      <Link href={`/customers/${meter.customerId}`} className="font-medium">
                        {meter.customer.companyName}
                      </Link>
                      <div className="text-[0.7rem] text-muted">{meter.siteName}</div>
                    </td>
                    <td className="meter-id">
                      {meter.mpan ? formatMpan(meter.mpan) : meter.mprn}
                    </td>
                    <td>
                      <FuelPill value={meter.fuelType} />
                    </td>
                    <td>{meter.supplier ?? "—"}</td>
                    <td>
                      <RenewalCell date={meter.renewalDate} />
                    </td>
                    <td>
                      <LoaPill value={meter.loaStatus} />
                      {meter.loaSignedOn ? (
                        <div className="mt-1 text-[0.7rem] text-muted">
                          {formatDate(meter.loaSignedOn)}
                          {meter.loaSignedBy ? ` · ${meter.loaSignedBy}` : ""}
                        </div>
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
                    <td>
                      <div className="text-sm">
                        Due {gbp(finance.due)} · rem {gbp(finance.remaining)}
                      </div>
                      <div className="text-[0.7rem] text-muted">Paid {gbp(finance.paid)}</div>
                    </td>
                    <td>{meter.salesperson?.name ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>
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
