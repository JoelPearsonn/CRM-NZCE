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
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card px-6 py-10 text-center">
      <p className="font-serif text-xl text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-primary mt-5">
          {actionLabel}
        </Link>
      ) : null}
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
  children,
  hint,
}: {
  label: string;
  name?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
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
  const tones: Record<string, string> = {
    NEW: "bg-[#e7e4dc] text-ink",
    CONTACTED: "bg-[#d9e4ef] text-[#1e3a54]",
    LOA_REQUESTED: "bg-warn-soft text-warn",
    TENDERING: "bg-[#f3e2c8] text-[#7a4b10]",
    QUOTED: "bg-[#dce8f5] text-[#204060]",
    SOLD: "bg-moss-soft text-moss",
    LOST: "bg-danger-soft text-danger",
  };
  return <span className={`pill ${tones[value] ?? "bg-[#e7e4dc] text-ink"}`}>{labelFor(LEAD_STAGES, value)}</span>;
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

export function Section({
  title,
  action,
  children,
  id,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-rule px-4 py-3">
        <h2 className="section-title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
