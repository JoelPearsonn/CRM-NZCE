import { completeDeskReminder } from "@/app/actions/desk";
import { formatDate } from "@/lib/format";

export function QuarterlyMarketReminder({
  reminder,
}: {
  reminder: { id: string; title: string; dueDate: Date };
}) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const overdue = reminder.dueDate < today;

  return (
    <section
      data-testid="admin-quarterly-reminder"
      className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted uppercase">
          Desk reminder · admin only
        </p>
        <p className="mt-1 font-serif text-xl text-ink">{reminder.title}</p>
        <p className={`mt-1 text-sm ${overdue ? "font-semibold text-danger" : "text-muted"}`}>
          Due {formatDate(reminder.dueDate)}
          {overdue ? " · overdue" : ""} · Reminder only — nothing is emailed.
        </p>
      </div>
      <form action={completeDeskReminder}>
        <input type="hidden" name="id" value={reminder.id} />
        <button className="btn btn-brass w-full sm:w-auto" type="submit">
          Mark done — next quarter
        </button>
      </form>
    </section>
  );
}
