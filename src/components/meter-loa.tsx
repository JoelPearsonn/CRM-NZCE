"use client";

import { useActionState } from "react";
import type { Meter } from "@prisma/client";
import { saveMeterLoa, type ActionState } from "@/app/actions/meters";
import { ErrorBanner } from "@/components/ui";
import { LOA_STATUSES } from "@/lib/constants";
import { formatMpan, toDateInput } from "@/lib/format";

const empty: ActionState = {};

export function MeterLoaForm({ meter }: { meter: Meter }) {
  const [state, action, pending] = useActionState(saveMeterLoa, empty);
  const supply = meter.mpan ? `MPAN ${formatMpan(meter.mpan)}` : `MPRN ${meter.mprn}`;

  return (
    <form action={action} encType="multipart/form-data" className="grid gap-3 border-t border-rule px-4 py-4">
      <input type="hidden" name="id" value={meter.id} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          {meter.siteName ?? "Site"} · {supply}
        </p>
        {meter.loaFileName ? (
          <a href={`/api/loa/${meter.id}`} className="text-[0.7rem] font-semibold text-brass-dark">
            View {meter.loaFileName}
          </a>
        ) : (
          <p className="text-[0.7rem] text-muted">No copy stored</p>
        )}
      </div>
      <ErrorBanner message={state.error} />
      <div className="grid gap-3 md:grid-cols-4">
        <label className="field">
          <span>Status</span>
          <select name="loaStatus" defaultValue={meter.loaStatus}>
            {LOA_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Signed on</span>
          <input name="loaSignedOn" type="date" defaultValue={toDateInput(meter.loaSignedOn)} />
        </label>
        <label className="field">
          <span>Who signed</span>
          <input
            name="loaSignedBy"
            defaultValue={meter.loaSignedBy ?? ""}
            placeholder="Claire Debenham"
          />
        </label>
        <label className="field">
          <span>Upload copy</span>
          <input name="loaFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt" />
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn btn-ghost" name="markSigned" value="1" disabled={pending}>
          {pending ? "Saving…" : "Mark signed"}
        </button>
        <button className="btn btn-brass" disabled={pending}>
          {pending ? "Saving…" : "Save LOA"}
        </button>
      </div>
    </form>
  );
}
