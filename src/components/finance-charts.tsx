"use client";

import { useState } from "react";
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
            className="flex items-end gap-2 pb-1"
            style={{ minWidth: `${Math.max(rows.length, 1) * 3.6}rem` }}
          >
            {rows.map((row) => {
              const active = hoverKey === row.key;
              const caption = cashflowBarCaption(row, left);
              return (
                <div
                  key={row.key}
                  className={`flex min-w-0 flex-1 flex-col items-center ${active ? "z-10" : ""}`}
                  data-testid="cashflow-month"
                  data-month={row.key}
                  data-active={active ? "true" : "false"}
                  onMouseEnter={() => setHoverKey(row.key)}
                  onMouseLeave={() => setHoverKey(null)}
                  onFocus={() => setHoverKey(row.key)}
                  onBlur={() => setHoverKey(null)}
                  tabIndex={0}
                >
                  <div
                    className="cashflow-bar-caption flex w-full items-end justify-center"
                    data-testid="cashflow-bar-caption"
                    aria-hidden={!active}
                  >
                    {active ? (
                      <div className="w-full text-center leading-tight">
                        <p className="text-[0.68rem] font-semibold text-ink">{caption.month}</p>
                        <p className="text-[0.78rem] font-semibold text-navy">{caption.value}</p>
                        {caption.parts.length ? (
                          <p className="mt-0.5 text-[0.62rem] text-muted">{caption.parts.join(" · ")}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className={`cashflow-bar-lift ${active ? "is-lifted" : ""}`}>
                    <div className="flex h-40 w-full items-end justify-center gap-1">
                      <Bar value={row[left]} max={max} tone="brass" />
                      <Bar value={row[right]} max={max} tone="moss" />
                    </div>
                  </div>
                  <p className="mt-2 text-center text-[0.7rem] font-medium text-ink">{row.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ul className="space-y-2 p-4 md:hidden">
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
  const height = Math.max(value > 0 ? 8 : 2, Math.round((value / max) * 148));
  return (
    <div
      className={tone === "brass" ? "w-7 bg-brass" : "w-7 bg-moss"}
      style={{ height }}
    />
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
