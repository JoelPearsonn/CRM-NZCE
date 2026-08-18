"use client";

import { useState } from "react";
import { gbp } from "@/lib/format";
import type { Bucket } from "@/lib/finance";

export function GroupedBars({
  rows,
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  rows: Bucket[];
  left: "due" | "estimated";
  right: "paid";
  leftLabel: string;
  rightLabel: string;
}) {
  const max = Math.max(
    1,
    ...rows.map((row) => Math.max(row[left], row[right], row.remaining)),
  );
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  return (
    <>
      <div className="hidden px-4 py-4 md:block">
        <div className="mb-3 flex gap-4 text-[0.7rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-brass" /> {leftLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-moss" /> {rightLabel}
          </span>
        </div>
        <div className="overflow-x-auto" data-testid="cashflow-chart">
          <div
            className="flex h-56 items-end gap-3 pb-1"
            style={{ minWidth: `${Math.max(rows.length, 1) * 3.4}rem` }}
          >
            {rows.map((row) => (
              <div
                key={row.key}
                className="relative flex min-w-0 flex-1 flex-col items-center gap-2"
                data-testid="cashflow-month"
                data-month={row.key}
                onMouseEnter={() => setHoverKey(row.key)}
                onMouseLeave={() => setHoverKey(null)}
                onFocus={() => setHoverKey(row.key)}
                onBlur={() => setHoverKey(null)}
                tabIndex={0}
              >
                <div className="flex h-44 w-full items-end justify-center gap-1">
                  <Bar value={row[left]} max={max} tone="brass" label={gbp(row[left])} />
                  <Bar value={row[right]} max={max} tone="moss" label={gbp(row[right])} />
                </div>
                <p className="text-center text-[0.7rem] font-medium text-ink">{row.label}</p>
                {hoverKey === row.key ? (
                  <CashflowTooltip row={row} leftLabel={leftLabel} rightLabel={rightLabel} />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      <ul className="space-y-2 p-4 md:hidden">
        {rows.map((row) => (
          <li key={row.key} className="rounded-sm border border-rule bg-paper px-3 py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="font-medium">{row.label}</span>
              <span className="text-[0.7rem] text-muted">
                {leftLabel} {gbp(row[left])} · {rightLabel} {gbp(row[right])}
              </span>
            </div>
            <MonthBreakdown row={row} />
            <div className="mt-2 space-y-1">
              <div className="h-2 bg-[#ebe4d4]">
                <div className="h-2 bg-brass" style={{ width: `${(row[left] / max) * 100}%` }} />
              </div>
              <div className="h-2 bg-[#ebe4d4]">
                <div className="h-2 bg-moss" style={{ width: `${(row[right] / max) * 100}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function CashflowTooltip({
  row,
  leftLabel,
  rightLabel,
}: {
  row: Bucket;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div
      className="cashflow-tooltip pointer-events-none absolute bottom-[calc(100%-0.25rem)] z-20 w-52 rounded-sm border border-rule bg-navy px-3 py-2 text-left text-[0.7rem] text-gold-soft shadow-lg"
      data-testid="cashflow-tooltip"
      role="tooltip"
    >
      <p className="font-semibold text-gold">{row.label}</p>
      <p className="mt-1 text-[#f7f6f1]">Cashflow {gbp(row.due)}</p>
      <p>
        {leftLabel} {gbp(row.due === undefined ? 0 : row.due)}
      </p>
      <p>
        {rightLabel} {gbp(row.paid)}
      </p>
      <p>Remaining {gbp(row.remaining)}</p>
      <MonthBreakdown row={row} tone="dark" />
    </div>
  );
}

function MonthBreakdown({ row, tone }: { row: Bucket; tone?: "dark" }) {
  const lines = [
    row.residualDue > 0.004 ? `Residual due ${gbp(row.residualDue)}` : null,
    row.splitDue > 0.004 ? `Split due ${gbp(row.splitDue)}` : null,
    row.residualPaid > 0.004 ? `Residual paid ${gbp(row.residualPaid)}` : null,
    row.splitPaid > 0.004 ? `Split paid ${gbp(row.splitPaid)}` : null,
    row.estimated > 0.004 ? `Estimated ${gbp(row.estimated)}` : null,
  ].filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <ul className={`mt-1 space-y-0.5 ${tone === "dark" ? "text-gold-soft" : "text-muted"}`}>
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function Bar({
  value,
  max,
  tone,
  label,
}: {
  value: number;
  max: number;
  tone: "brass" | "moss";
  label: string;
}) {
  const height = Math.max(value > 0 ? 8 : 2, Math.round((value / max) * 160));
  return (
    <div className="flex w-7 flex-col items-center justify-end">
      <span className="mb-1 text-[0.62rem] text-muted">{value > 0 ? label : ""}</span>
      <div
        className={tone === "brass" ? "w-full bg-brass" : "w-full bg-moss"}
        style={{ height }}
        title={label}
      />
    </div>
  );
}

export function HorizonBars({
  rows,
  valueKey,
}: {
  rows: Bucket[];
  valueKey: "due" | "paid" | "estimated" | "remaining";
}) {
  const max = Math.max(1, ...rows.map((row) => row[valueKey]));
  return (
    <div className="space-y-2.5 p-4">
      {rows.map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium">{row.label}</span>
            <span className="text-muted">{gbp(row[valueKey])}</span>
          </div>
          <div className="h-1.5 bg-[#ebe4d4]">
            <div
              className="h-1.5 bg-brass"
              style={{ width: `${(row[valueKey] / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
