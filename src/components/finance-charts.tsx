"use client";

import { gbp } from "@/lib/format";
import { cashflowBarCaption, type Bucket } from "@/lib/finance";

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

  return (
    <>
      <div className="cashflow-chart-panel">
        <div className="mb-3 flex gap-4 text-[0.7rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-brass" /> {leftLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 bg-moss" /> {rightLabel}
          </span>
        </div>
        <div className="cashflow-chart" data-testid="cashflow-chart">
          <div className="cashflow-chart-track">
            {rows.map((row) => {
              const caption = cashflowBarCaption(row, left);
              return (
                <div
                  key={row.key}
                  className="cashflow-month"
                  data-testid="cashflow-month"
                  data-month={row.key}
                  tabIndex={0}
                >
                  <div className="cashflow-bar-lift">
                    <div className="cashflow-bar-pair">
                      <Bar value={row[left]} max={max} tone="brass" />
                      <Bar value={row[right]} max={max} tone="moss" />
                    </div>
                  </div>
                  <div className="cashflow-bar-caption" data-testid="cashflow-bar-caption">
                    <div className="cashflow-bar-caption-text">
                      <p className="cashflow-bar-caption-month">{caption.month}</p>
                      <p className="cashflow-bar-caption-value">{caption.value}</p>
                      {caption.parts.length ? (
                        <p className="cashflow-bar-caption-parts">{caption.parts.join(" · ")}</p>
                      ) : null}
                    </div>
                  </div>
                  <p className="cashflow-month-label">{row.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ul className="cashflow-chart-list space-y-2 p-4">
        {rows.map((row) => {
          const caption = cashflowBarCaption(row, left);
          return (
            <li key={row.key} className="rounded-sm border border-rule bg-paper px-3 py-2.5">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="font-medium">{caption.month}</span>
                <span className="text-[0.7rem] text-muted">
                  {leftLabel} {caption.value} · {rightLabel} {gbp(row.paid)}
                </span>
              </div>
              {caption.parts.length ? (
                <p className="mb-2 text-[0.7rem] text-muted">{caption.parts.join(" · ")}</p>
              ) : null}
              <div className="space-y-1">
                <div className="h-2 bg-[#ebe4d4]">
                  <div className="h-2 bg-brass" style={{ width: `${(row[left] / max) * 100}%` }} />
                </div>
                <div className="h-2 bg-[#ebe4d4]">
                  <div className="h-2 bg-moss" style={{ width: `${(row[right] / max) * 100}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Bar({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone: "brass" | "moss";
}) {
  const height = Math.max(value > 0 ? 10 : 3, Math.round((value / max) * 148));
  return <div className={`cashflow-bar-rect is-${tone}`} style={{ height }} />;
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
