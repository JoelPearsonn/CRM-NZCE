"use client";

import { useActionState } from "react";
import { sendLoaAction, syncLoaAction, type LoaActionState } from "@/app/actions/loa";
import { ErrorBanner } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

const empty: LoaActionState = {};

export type LoaEnvelopeSummary = {
  id: string;
  envelopeId: string | null;
  sigLink: string | null;
  status: string;
  channel: string;
  sentAt: Date | string | null;
  completedAt: Date | string | null;
  pdfFileName: string | null;
};

export function SendLoaPanel({
  customerId,
  leadId,
  companyName,
  meterCount,
  configured,
  latest,
}: {
  customerId: string;
  leadId?: string;
  companyName: string;
  meterCount: number;
  configured: boolean;
  latest?: LoaEnvelopeSummary | null;
}) {
  const [state, action, pending] = useActionState(sendLoaAction, empty);
  const channel = state.channel ?? latest?.channel;
  const sent = Boolean(state.envelopeRecordId || latest);
  const downloadId = state.envelopeRecordId ?? latest?.id;
  const sigLink = state.sigLink ?? latest?.sigLink;

  return (
    <section id="loa" className="card p-5" data-testid="send-loa">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Send LOA</h2>
          <p className="mt-1 text-sm text-muted">
            Auto-fills {companyName} and {meterCount} {meterCount === 1 ? "supply" : "supplies"} onto the
            NZCE Letter of Authority. Signature and date tabs sit with the customer.
          </p>
        </div>
        {configured ? (
          <span className="pill bg-moss-soft text-moss normal-case tracking-normal">DocuSign ready</span>
        ) : (
          <span className="pill bg-warn-soft text-warn normal-case tracking-normal">
            DocuSign not connected — download to send
          </span>
        )}
      </div>
      <ErrorBanner message={state.error} />
      {meterCount === 0 ? (
        <p className="text-sm text-muted">Add a meter before you send an LOA.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/loa/preview/${customerId}`}
              className="btn btn-ghost"
              target="_blank"
              rel="noopener noreferrer"
            >
              Preview filled LOA
            </a>
            <a
              href={`/api/loa/pdf/${customerId}`}
              className="btn btn-ghost"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF
            </a>
            <form action={action}>
              <input type="hidden" name="customerId" value={customerId} />
              {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
              <button className="btn btn-primary" disabled={pending}>
                {pending ? "Sending…" : configured ? "Send via DocuSign" : "Send LOA"}
              </button>
            </form>
            {configured && latest?.envelopeId ? (
              <form action={syncLoaAction}>
                <input type="hidden" name="customerId" value={customerId} />
                <button className="btn btn-ghost">Check DocuSign</button>
              </form>
            ) : null}
          </div>
          {sent ? (
            <div className="mt-4 border border-rule bg-paper-2 px-3 py-2 text-sm" data-testid="loa-send-result">
              {channel === "DOCUSIGN" ? (
                <p>
                  LOA sent. Envelope {state.envelopeId ?? latest?.envelopeId}. Supplies marked
                  requested.
                </p>
              ) : (
                <p>
                  DocuSign not connected — download to send. The filled PDF is ready and supplies are
                  marked requested. This was not emailed.
                </p>
              )}
              <p className="mt-1 text-xs text-muted">
                {latest?.sentAt ? `Sent ${formatDateTime(latest.sentAt)}` : "Just sent"}
                {latest?.status ? ` · ${latest.status}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[0.75rem] font-semibold">
                {downloadId ? (
                  <a
                    href={`/api/loa/envelope/${downloadId}`}
                    className="text-brass-dark"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      window.open(`/api/loa/envelope/${downloadId}`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Open filled PDF
                  </a>
                ) : null}
                {sigLink ? (
                  <a href={sigLink} className="text-brass-dark" target="_blank" rel="noreferrer">
                    Sig link
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export function LeadLoaActions({
  customerId,
  leadId,
  latest,
}: {
  customerId: string;
  leadId: string;
  latest?: Pick<LoaEnvelopeSummary, "sigLink" | "status" | "channel"> | null;
}) {
  const [state, action, pending] = useActionState(sendLoaAction, empty);
  return (
    <div className="mt-2 text-[0.7rem]" data-testid="lead-loa-actions">
      <a href={`/customers/${customerId}#loa`} className="font-semibold text-brass-dark">
        Preview LOA
      </a>
      <span className="text-muted"> · </span>
      <form action={action} className="inline">
        <input type="hidden" name="customerId" value={customerId} />
        <input type="hidden" name="leadId" value={leadId} />
        <button type="submit" className="font-semibold text-brass-dark underline-offset-2 hover:underline" disabled={pending}>
          {pending ? "Sending…" : "Send LOA"}
        </button>
      </form>
      {state.error ? <p className="mt-1 text-danger">{state.error}</p> : null}
      {state.channel === "DOWNLOAD" || (!state.channel && latest?.channel === "DOWNLOAD") ? (
        <p className="mt-1 text-muted">DocuSign not connected — download to send</p>
      ) : null}
      {(state.sigLink || latest?.sigLink) ? (
        <p className="mt-1">
          <a href={state.sigLink || latest?.sigLink || "#"} className="text-brass-dark" target="_blank" rel="noreferrer">
            Sig link
          </a>
        </p>
      ) : null}
    </div>
  );
}
