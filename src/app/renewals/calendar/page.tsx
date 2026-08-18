import Link from "next/link";
import { EmptyState, FuelPill, ObjectionPill, PageHeader } from "@/components/ui";
import { formatDate, formatMpan } from "@/lib/format";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1, 12));
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month + delta, 1, 12));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function monthParam(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function parseMonth(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default async function RenewalCalendarPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const { year, month } = parseMonth(typeof query.month === "string" ? query.month : undefined);
  const start = monthStart(year, month);
  const end = monthStart(year, month + 1);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const title = start.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  const meters = await prisma.meter.findMany({
    where: {
      customer: { archivedAt: null },
      renewalDate: { gte: start, lt: end },
    },
    include: { customer: true, salesperson: true },
    orderBy: { renewalDate: "asc" },
  });

  const overdue = await prisma.meter.findMany({
    where: {
      customer: { archivedAt: null },
      renewalDate: { lt: start },
    },
    include: { customer: true },
    orderBy: { renewalDate: "asc" },
  });

  const byDay = new Map<string, typeof meters>();
  for (const meter of meters) {
    if (!meter.renewalDate) continue;
    const key = meter.renewalDate.toISOString().slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(meter);
    byDay.set(key, list);
  }

  const leadBlanks = (start.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<{ date: Date | null; key: string }> = [];
  for (let i = 0; i < leadBlanks; i += 1) cells.push({ date: null, key: `pad-${i}` });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, month, day, 12));
    cells.push({ date, key: date.toISOString().slice(0, 10) });
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        kicker="Renewal diary"
        title={title}
        description="Every supply coming off contract this month. Same book as the 30 / 60 / 90 list — a wall calendar, not a PDF."
        actions={
          <>
            <Link href={`/renewals/calendar?month=${monthParam(prev.year, prev.month)}`} className="btn btn-ghost">
              Previous
            </Link>
            <Link href="/renewals/calendar" className="btn btn-ghost">
              This month
            </Link>
            <Link href={`/renewals/calendar?month=${monthParam(next.year, next.month)}`} className="btn btn-ghost">
              Next
            </Link>
            <Link href="/renewals" className="btn btn-brass">
              30 / 60 / 90 list
            </Link>
          </>
        }
      />

      {overdue.length > 0 ? (
        <p className="mb-4 border border-warn/40 bg-warn-soft px-3 py-2 text-sm">
          {overdue.length} {overdue.length === 1 ? "supply" : "supplies"} already past renewal before{" "}
          {title}.{" "}
          <Link href="/renewals?days=30" className="font-semibold text-brass-dark">
            Open the list
          </Link>
        </p>
      ) : null}

      {meters.length === 0 ? (
        <EmptyState
          title={`No renewals in ${title}`}
          body="When a meter has a renewal date in this month it lands on the day."
          actionHref="/renewals"
          actionLabel="Open the 90-day list"
        />
      ) : null}

      <div className="calendar-grid card overflow-hidden">
        {WEEKDAYS.map((day) => (
          <div key={day} className="calendar-head">
            {day}
          </div>
        ))}
        {cells.map((cell) => {
          const items = cell.date ? byDay.get(cell.key) ?? [] : [];
          const isToday = cell.key === todayKey;
          return (
            <div
              key={cell.key}
              className={`calendar-cell ${cell.date ? "" : "calendar-cell-empty"} ${isToday ? "calendar-cell-today" : ""}`}
            >
              {cell.date ? (
                <>
                  <p className="calendar-day">{cell.date.getUTCDate()}</p>
                  <ul className="mt-1 grid gap-1">
                    {items.map((meter) => (
                      <li key={meter.id}>
                        <Link href={`/customers/${meter.customerId}`} className="calendar-item">
                          <span className="font-medium">{meter.customer.companyName}</span>
                          <span className="block text-[0.65rem] text-muted">
                            {meter.siteName ?? "Site"} · {meter.mpan ? formatMpan(meter.mpan) : meter.mprn}
                          </span>
                          <span className="mt-0.5 flex flex-wrap gap-1">
                            <FuelPill value={meter.fuelType} />
                            {meter.objectionStatus === "IN_OBJECTION" ? (
                              <ObjectionPill value={meter.objectionStatus} />
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      {meters.length > 0 ? (
        <p className="mt-3 text-xs text-muted">
          {meters.length} {meters.length === 1 ? "supply" : "supplies"} in {title}. Dates as stored on the
          meter · {formatDate(start)} to {formatDate(new Date(end.getTime() - 86_400_000))}.
        </p>
      ) : null}
    </div>
  );
}
