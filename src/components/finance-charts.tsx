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

  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex gap-4 text-[0.7rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 bg-brass" /> {leftLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 bg-moss" /> {rightLabel}
        </span>
      </div>
      <div className="flex h-52 items-end gap-5">
        {rows.map((row) => (
          <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-44 w-full items-end justify-center gap-1">
              <Bar value={row[left]} max={max} tone="brass" label={gbp(row[left])} />
              <Bar value={row[right]} max={max} tone="moss" label={gbp(row[right])} />
            </div>
            <p className="text-center text-[0.7rem] font-medium text-ink">{row.label}</p>
          </div>
        ))}
      </div>
    </div>
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
