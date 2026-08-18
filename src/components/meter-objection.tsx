"use client";

import { useActionState } from "react";
import type { Meter } from "@prisma/client";
import { saveMeterObjection, type ActionState } from "@/app/actions/meters";
import { ErrorBanner } from "@/components/ui";
import { OBJECTION_STATUSES } from "@/lib/constants";
import { formatMpan, toDateInput } from "@/lib/format";

const empty: ActionState = {};

export function MeterObjectionForm({ meter }: { meter: Meter }) {
  const [state, action, pending] = useActionState(saveMeterObjection, empty);
  const supply = meter.mpan ? `MPAN ${formatMpan(meter.mpan)}` : `MPRN ${meter.mprn}`;

  return (
    <form action={action} className="grid gap-3 border-t border-rule px-4 py-4">
      <input type="hidden" name="id" value={meter.id} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {meter.siteName ?? "Site"} · {supply}
        </p>
        <p className="text-[0.7rem] text-muted">{meter.supplier ?? "No supplier"}</p>
      </div>
      <ErrorBanner message={state.error} />
      <div className="grid gap-3 md:grid-cols-4">
        <label className="field">
          <span>Status</span>
          <select name="objectionStatus" defaultValue={meter.objectionStatus}>
            {OBJECTION_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Raised</span>
          <input name="objectionRaisedOn" type="date" defaultValue={toDateInput(meter.objectionRaisedOn)} />
        </label>
        <label className="field">
          <span>Cleared</span>
          <input name="objectionClearedOn" type="date" defaultValue={toDateInput(meter.objectionClearedOn)} />
        </label>
        <div className="flex items-end">
          <button className="btn btn-brass w-full" disabled={pending}>
            {pending ? "Saving…" : "Save objection"}
          </button>
        </div>
      </div>
      <label className="field">
        <span>Reason / note</span>
        <input
          name="objectionNote"
          defaultValue={meter.objectionNote ?? ""}
          placeholder="Debt on account, contracted, errant…"
        />
      </label>
    </form>
  );
}
