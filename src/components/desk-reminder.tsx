import { completeDeskReminder } from "@/app/actions/desk";
import { CopyNoteButton } from "@/components/copy-note-button";
import {
  QUARTERLY_MARKET_UPDATE_NOTE,
  QUARTERLY_MARKET_UPDATE_NOTE_TITLE,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";

const copyText = `${QUARTERLY_MARKET_UPDATE_NOTE_TITLE}\n\n${QUARTERLY_MARKET_UPDATE_NOTE}`;

export function QuarterlyMarketReminder({
  reminder,
}: {
  reminder: { id: string; title: string; dueDate: Date };
}) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const overdue = reminder.dueDate < today;

  return (
    <section data-testid="admin-quarterly-reminder" className="card mb-6 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
      </div>

      <details open className="mt-4 border-t border-rule pt-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Open the note to copy
        </summary>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-ink">{QUARTERLY_MARKET_UPDATE_NOTE_TITLE}</h3>
          <CopyNoteButton text={copyText} />
        </div>
        <pre
          data-testid="quarterly-market-note"
          className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-ink"
        >
          {QUARTERLY_MARKET_UPDATE_NOTE}
        </pre>
      </details>
    </section>
  );
}
