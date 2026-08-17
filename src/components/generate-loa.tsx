import { tpiLoaTemplateLabel, type TpiLoaKind } from "@/lib/tpi-loa";

function GenerateForm({
  customerId,
  leadId,
  kind,
  label,
  primary,
}: {
  customerId: string;
  leadId?: string;
  kind: TpiLoaKind;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={`/api/loa/tpi/${customerId}`} method="post">
      <input type="hidden" name="kind" value={kind} />
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
      <button className={primary ? "btn btn-primary" : "btn btn-ghost"} type="submit">
        {label}
      </button>
    </form>
  );
}

export function GenerateLoaButton({
  customerId,
  leadId,
  kind,
  className = "btn btn-primary",
}: {
  customerId: string;
  leadId?: string;
  kind: TpiLoaKind | null;
  className?: string;
}) {
  if (!kind) {
    return (
      <a href="#generate-loa" className={className}>
        Generate LOA
      </a>
    );
  }
  return (
    <form action={`/api/loa/tpi/${customerId}`} method="post">
      <input type="hidden" name="kind" value={kind} />
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
      <button className={className} type="submit">
        Generate LOA
      </button>
    </form>
  );
}

export function GenerateLoaPanel({
  customerId,
  leadId,
  companyName,
  suggestedKind,
}: {
  customerId: string;
  leadId?: string;
  companyName: string;
  suggestedKind: TpiLoaKind | null;
}) {
  const previewHref = (kind: TpiLoaKind) =>
    `/api/loa/tpi/${customerId}?kind=${kind}${leadId ? `&leadId=${leadId}` : ""}`;

  return (
    <section id="generate-loa" className="card p-5" data-testid="generate-loa">
      <div className="mb-3">
        <h2 className="section-title">Generate LOA</h2>
        <p className="mt-1 text-sm text-muted">
          Fills IE LOA (Infinite) or SOFT_LOA (Joose / Joose+UCR) from {companyName} — company,
          contact and address. Download the PDF. DocuSign is not required.
        </p>
      </div>
      {suggestedKind ? (
        <>
          <p className="mb-3 text-sm">
            Using {tpiLoaTemplateLabel(suggestedKind)} from this account’s TPI.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={previewHref(suggestedKind)}
              className="btn btn-ghost"
              target="_blank"
              rel="noreferrer"
            >
              Preview {tpiLoaTemplateLabel(suggestedKind)}
            </a>
            <GenerateForm
              customerId={customerId}
              leadId={leadId}
              kind={suggestedKind}
              label={`Generate ${tpiLoaTemplateLabel(suggestedKind)}`}
              primary
            />
          </div>
          <p className="mt-3 text-xs text-muted">Need the other letter?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestedKind !== "IE" ? (
              <GenerateForm
                customerId={customerId}
                leadId={leadId}
                kind="IE"
                label="Generate IE LOA (Infinite)"
              />
            ) : (
              <GenerateForm
                customerId={customerId}
                leadId={leadId}
                kind="JOOSE"
                label="Generate SOFT_LOA (Joose / Joose+UCR)"
              />
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm">No TPI on this account yet — choose the letter.</p>
          <div className="flex flex-wrap gap-2">
            <a href={previewHref("IE")} className="btn btn-ghost" target="_blank" rel="noreferrer">
              Preview IE LOA (Infinite)
            </a>
            <GenerateForm
              customerId={customerId}
              leadId={leadId}
              kind="IE"
              label="Generate IE LOA (Infinite)"
              primary
            />
            <a href={previewHref("JOOSE")} className="btn btn-ghost" target="_blank" rel="noreferrer">
              Preview SOFT_LOA (Joose / Joose+UCR)
            </a>
            <GenerateForm
              customerId={customerId}
              leadId={leadId}
              kind="JOOSE"
              label="Generate SOFT_LOA (Joose / Joose+UCR)"
              primary
            />
          </div>
        </>
      )}
    </section>
  );
}
