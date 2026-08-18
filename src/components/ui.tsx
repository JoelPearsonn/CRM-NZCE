import Link from "next/link";
import {
  DEAL_STATUSES,
  FUEL_TYPES,
  LEAD_STAGES,
  LOA_STATUSES,
  OBJECTION_STATUSES,
  TENDER_STATUSES,
  labelFor,
} from "@/lib/constants";
import { daysUntil, formatDate, renewalTone } from "@/lib/format";
import { resolveLeadBoardStage } from "@/lib/lead-board";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker ? (
          <p className="mb-1 text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">
            {kicker}
          </p>
        ) : null}
        <h1 className="font-serif text-3xl leading-none tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
  children,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="font-serif text-xl text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {actionHref && actionLabel ? (
        <div className="empty-actions mt-5 flex flex-wrap justify-center gap-2">
          <Link href={actionHref} className="btn btn-primary">
            {actionLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="btn btn-ghost">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </div>
  );
}

export function Field({
  label,
  name,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  name?: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor ?? name}>{label}</label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function FuelPill({ value }: { value: string }) {
  const tone =
    value === "GAS"
      ? "bg-[#efe4d2] text-[#6b4a18]"
      : value === "DUAL"
        ? "bg-[#e4e0f0] text-[#3d3560]"
        : "bg-moss-soft text-moss";
  return <span className={`pill ${tone}`}>{labelFor(FUEL_TYPES, value)}</span>;
}

export function StagePill({ value }: { value: string }) {
  const stage = resolveLeadBoardStage({ stage: value });
  const tones: Record<string, string> = {
    "Potential Lead Joel": "bg-[#e7e4dc] text-ink",
    "Potential Lead Pauly": "bg-[#d9e4ef] text-[#1e3a54]",
    "Steve Madden Leads": "bg-[#e4e0f0] text-[#3d3560]",
    "Potential Lead Rory": "bg-[#dce8f5] text-[#204060]",
    "Hot lead Joel": "bg-warn-soft text-warn",
    "Harry Accuradata Leads": "bg-[#efe4d2] text-[#6b4a18]",
    "Hot Leads Rory": "bg-[#f3e2c8] text-[#7a4b10]",
    "Sent For Tender": "bg-[#f3e2c8] text-[#7a4b10]",
    "Tender Received": "bg-[#dce8f5] text-[#204060]",
    "Set Up Call Completed": "bg-[#d7e8de] text-moss",
    "Proposal Sent": "bg-[#e4e0f0] text-[#3d3560]",
    Won: "bg-moss-soft text-moss",
    Lost: "bg-danger-soft text-danger",
    "Follow up at a Later Date": "bg-[#e7e4dc] text-ink",
    "Rory Follow up": "bg-[#d9e4ef] text-[#1e3a54]",
    "Joel Follow Up": "bg-[#efe4d2] text-[#6b4a18]",
  };
  return (
    <span
      className={`pill normal-case tracking-normal whitespace-normal leading-tight ${tones[stage] ?? "bg-[#e7e4dc] text-ink"}`}
    >
      {labelFor(LEAD_STAGES, stage)}
    </span>
  );
}

export function LoaPill({ value }: { value: string }) {
  const tones: Record<string, string> = {
    NOT_REQUESTED: "bg-[#e7e4dc] text-ink",
    REQUESTED: "bg-warn-soft text-warn",
    RECEIVED: "bg-moss-soft text-moss",
    SIGNED: "bg-moss-soft text-moss",
    EXPIRED: "bg-danger-soft text-danger",
  };
  return <span className={`pill ${tones[value] ?? "bg-[#e7e4dc] text-ink"}`}>{labelFor(LOA_STATUSES, value)}</span>;
}

export function ObjectionPill({ value }: { value: string }) {
  const tones: Record<string, string> = {
    NONE: "bg-[#e7e4dc] text-muted",
    IN_OBJECTION: "bg-danger-soft text-danger",
    CLEARED: "bg-moss-soft text-moss",
  };
  return (
    <span className={`pill ${tones[value] ?? "bg-[#e7e4dc] text-ink"}`}>
      {labelFor(OBJECTION_STATUSES, value)}
    </span>
  );
}

export function TenderStatusPill({ value }: { value: string }) {
  const tones: Record<string, string> = {
    RECEIVED: "bg-[#dce8f5] text-[#204060]",
    DECLINED: "bg-danger-soft text-danger",
    PREFERRED: "bg-moss-soft text-moss",
    EXPIRED: "bg-[#e7e4dc] text-muted",
  };
  return (
    <span className={`pill ${tones[value] ?? "bg-[#e7e4dc] text-ink"}`}>
      {labelFor(TENDER_STATUSES, value)}
    </span>
  );
}

export function DealStatusPill({ value }: { value: string }) {
  const tones: Record<string, string> = {
    LIVE: "bg-moss-soft text-moss",
    PENDING: "bg-warn-soft text-warn",
    EXPIRED: "bg-[#e7e4dc] text-muted",
    CANCELLED: "bg-danger-soft text-danger",
  };
  return <span className={`pill ${tones[value] ?? "bg-[#e7e4dc] text-ink"}`}>{labelFor(DEAL_STATUSES, value)}</span>;
}

export function RenewalCell({ date }: { date: Date | null | undefined }) {
  const tone = renewalTone(date);
  const days = daysUntil(date);
  const color =
    tone === "overdue"
      ? "text-danger"
      : tone === "urgent"
        ? "text-danger"
        : tone === "soon"
          ? "text-warn"
          : "text-ink";
  return (
    <div>
      <div className={`font-medium ${color}`}>{formatDate(date)}</div>
      {days != null ? (
        <div className="text-[0.7rem] text-muted">
          {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `${days}d`}
        </div>
      ) : null}
    </div>
  );
}

export function SortLink({
  href,
  active,
  dir,
  children,
}: {
  href: string;
  active: boolean;
  dir: "asc" | "desc";
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={active ? "text-ink" : undefined}>
      {children}
      {active ? <span className="text-brass-dark"> {dir === "asc" ? "↑" : "↓"}</span> : null}
    </Link>
  );
}

export function Section({
  title,
  action,
  children,
  id,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`card overflow-x-auto ${className ?? ""}`.trim()}>
      <div className="section-head">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
