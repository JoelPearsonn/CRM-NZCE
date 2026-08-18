import { ownerFirstNames } from "@/lib/lead-card";

export function LeadCardFacts({
  companyName,
  contactName,
  jobTitle,
  phone,
  email,
  loaSent,
  loaReceived,
  owners,
}: {
  companyName: string;
  contactName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  loaSent: boolean;
  loaReceived: boolean;
  owners: string[];
}) {
  const ownerLabel = ownerFirstNames(owners).join(" · ") || "Unassigned";

  return (
    <div className="grid gap-0.5" data-testid="lead-card-facts">
      <p className="font-medium leading-tight" data-testid="lead-company">
        {companyName}
      </p>
      {contactName ? (
        <p className="text-xs text-ink" data-testid="lead-contact">
          {contactName}
        </p>
      ) : null}
      {jobTitle ? (
        <p className="text-xs text-muted" data-testid="lead-job-title">
          {jobTitle}
        </p>
      ) : null}
      {phone ? (
        <p className="text-xs text-muted" data-testid="lead-phone">
          {phone}
        </p>
      ) : null}
      {email ? (
        <p className="break-all text-xs text-muted" data-testid="lead-email">
          {email}
        </p>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-1">
        {loaSent ? (
          <span
            className="pill bg-warn-soft text-warn normal-case tracking-normal"
            data-testid="loa-sent"
          >
            LOA sent
          </span>
        ) : null}
        {loaReceived ? (
          <span
            className="pill bg-moss-soft text-moss normal-case tracking-normal"
            data-testid="loa-received"
          >
            LOA received
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-ink" data-testid="lead-owner">
        {ownerLabel}
      </p>
    </div>
  );
}
