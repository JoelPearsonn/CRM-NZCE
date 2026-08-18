"use client";

import { useActionState } from "react";
import { uploadCustomerLoa, type ActionState } from "@/app/actions/loa";
import { LoaOpenLink } from "@/components/loa-open-link";
import { ErrorBanner } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { CustomerLoaItem } from "@/lib/customer-loa";

const empty: ActionState = {};

export function CustomerLoaPanel({
  customerId,
  items,
}: {
  customerId: string;
  items: CustomerLoaItem[];
}) {
  const [state, action, pending] = useActionState(uploadCustomerLoa, empty);

  return (
    <section id="signed-loa" className="border-t border-rule" data-testid="customer-loa">
      <div className="px-4 pt-3">
        <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">
          Letters of Authority
        </p>
        <p className="pt-1 text-xs text-muted">
          One LOA list on this customer. Upload a copy, save, then upload another — both stay stored.
          Older per-meter files still appear here.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">No LOA copies stored yet.</p>
      ) : (
        <ul className="divide-y divide-rule" data-testid="customer-loa-list">
          {items.map((item) => (
            <li key={item.key} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
              <div>
                <LoaOpenLink href={item.href} className="font-medium text-brass-dark">
                  {item.fileName}
                </LoaOpenLink>
                <p className="text-[0.7rem] text-muted">
                  {item.sourceLabel}
                  {item.createdAt ? ` · ${formatDateTime(item.createdAt)}` : ""}
                </p>
              </div>
              <LoaOpenLink href={item.href} className="text-[0.7rem] font-semibold text-brass-dark">
                Open in new tab
              </LoaOpenLink>
            </li>
          ))}
        </ul>
      )}

      <form action={action} encType="multipart/form-data" className="grid gap-3 px-4 py-4">
        <input type="hidden" name="customerId" value={customerId} />
        <ErrorBanner message={state.error} />
        {state.saved ? (
          <p className="text-sm text-moss" data-testid="customer-loa-saved">
            Stored {state.saved}. Upload another to keep both.
          </p>
        ) : null}
        <label className="field">
          <span>Upload LOA</span>
          <input name="loaFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt" required />
        </label>
        <label className="field">
          <span>Note (optional)</span>
          <input name="note" placeholder="Signed copy, 2026 renewal, second site…" />
        </label>
        <div className="flex justify-end">
          <button className="btn btn-brass" disabled={pending}>
            {pending ? "Saving…" : "Save LOA"}
          </button>
        </div>
      </form>
    </section>
  );
}
