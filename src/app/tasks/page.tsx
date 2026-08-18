import Link from "next/link";
import { toggleTask } from "@/app/actions/desk";
import { QuarterlyMarketReminder } from "@/components/desk-reminder";
import { EmptyState, PageHeader, Section } from "@/components/ui";
import { ensureQuarterlyMarketReminder } from "@/lib/desk-reminders";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ensureRenewalReminderTasks } from "@/lib/renewal-tasks";
import { getWorkingAsAdmin } from "@/lib/working-as";

export default async function TasksInboxPage() {
  await ensureRenewalReminderTasks();
  const admin = await getWorkingAsAdmin();
  const quarterlyReminder = admin ? await ensureQuarterlyMarketReminder() : null;
  const tasks = await prisma.task.findMany({
    where: { customer: { archivedAt: null } },
    include: { customer: true, assignee: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const open = tasks.filter((task) => task.status !== "DONE");
  const overdue = open.filter((task) => task.dueDate && task.dueDate < today);

  return (
    <div>
      <PageHeader
        kicker="Follow-ups"
        title="Tasks inbox"
        description="Every chase across the book. Overdue rows are marked so they don’t sit on a customer record unseen."
      />

      {quarterlyReminder ? <QuarterlyMarketReminder reminder={quarterlyReminder} /> : null}

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Stat label="Open" value={String(open.length)} hint="Still to do" />
        <Stat label="Overdue" value={String(overdue.length)} hint="Past due date" warn={overdue.length > 0} />
        <Stat label="Done" value={String(tasks.length - open.length)} hint="Closed on the desk" />
      </div>

      <Section title={`Inbox · ${tasks.length}`}>
        {tasks.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Nothing to chase"
              body="Add a follow-up on a customer record and it will land here."
              actionHref="/customers"
              actionLabel="Open customers"
            />
          </div>
        ) : (
          <table className="desk-table">
            <thead>
              <tr>
                <th>Follow-up</th>
                <th>Customer</th>
                <th className="col-extra">Assignee</th>
                <th>Due</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const isOverdue =
                  task.status !== "DONE" && Boolean(task.dueDate && task.dueDate < today);
                return (
                  <tr key={task.id} className={isOverdue ? "bg-danger-soft/40" : undefined}>
                    <td className={task.status === "DONE" ? "text-muted line-through" : "font-medium"}>
                      {task.title}
                    </td>
                    <td>
                      <Link href={`/customers/${task.customerId}`}>{task.customer.companyName}</Link>
                    </td>
                    <td className="col-extra">{task.assignee?.name ?? "Unassigned"}</td>
                    <td className={isOverdue ? "font-semibold text-danger" : undefined}>
                      {formatDate(task.dueDate)}
                      {isOverdue ? <div className="text-[0.7rem]">Overdue</div> : null}
                    </td>
                    <td>{task.status === "DONE" ? "Done" : "Open"}</td>
                    <td>
                      <form action={toggleTask}>
                        <input type="hidden" name="id" value={task.id} />
                        <button className="btn btn-ghost text-[0.7rem]">
                          {task.status === "DONE" ? "Reopen" : "Mark done"}
                        </button>
                      </form>
                    </td>
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

function Stat({
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
    <div className="card px-4 py-4">
      <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className={`mt-1 font-serif text-2xl ${warn ? "text-danger" : "text-ink"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
