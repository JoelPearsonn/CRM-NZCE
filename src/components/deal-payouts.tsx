"use client";

import { useMemo, useState } from "react";
import type { Deal, DealPayment } from "@prisma/client";
import { Field } from "@/components/ui";
import {
  PAYMENT_STAGES,
  PAYOUT_PRESETS,
  PAYOUT_TYPES,
  TPI_PARTNERS,
  tpiPercentFor,
} from "@/lib/constants";
import { contractMonths, netCommission, residualDates, splitByPercent } from "@/lib/finance";
import { gbpExact, monthsLabel, toDateInput } from "@/lib/format";

type DealWithPayments = Deal & { payments?: DealPayment[] };

function presetFromPayments(payments: DealPayment[]) {
  const percents = payments.map((row) => row.percent);
  if (percents.length === 2 && percents[0] === 40 && percents[1] === 60) return "40_60";
  if (percents.length === 3 && percents[0] === 40 && percents[1] === 40 && percents[2] === 20) {
    return "40_40_20";
  }
  return payments.length ? "CUSTOM" : "40_40_20";
}

function rowsForPreset(
  preset: string,
  deal?: DealWithPayments,
): { stage: string; label: string; percent: number; date: string; paid: string }[] {
  const existing = [...(deal?.payments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  if (preset === "CUSTOM" && existing.length) {
    return existing.map((row) => ({
      stage: row.stage,
      label: row.label,
      percent: row.percent,
      date: toDateInput(row.expectedDate),
      paid: row.actualPaid ? String(row.actualPaid) : "",
    }));
  }
  const percents =
    PAYOUT_PRESETS.find((item) => item.value === preset)?.percents ?? [40, 40, 20];
  const stages = percents.length === 2 ? ["ON_SIGN", "ON_LIVE"] : ["ON_SIGN", "ON_LIVE", "EOC"];
  return percents.map((percent, index) => {
    const prior = existing[index];
    const stage = prior?.stage ?? stages[index] ?? "ON_SIGN";
    const label = PAYMENT_STAGES.find((item) => item.value === stage)?.label ?? `Payment ${index + 1}`;
    const fallbackDate =
      stage === "EOC"
        ? toDateInput(deal?.contractEnd)
        : stage === "ON_LIVE"
          ? toDateInput(deal?.contractStart)
          : toDateInput(deal?.dueDate ?? deal?.contractStart);
    return {
      stage,
      label: prior?.label ?? label,
      percent,
      date: toDateInput(prior?.expectedDate) || fallbackDate,
      paid: prior?.actualPaid ? String(prior.actualPaid) : "",
    };
  });
}

export function ContractDateFields({ deal }: { deal?: Deal }) {
  const [start, setStart] = useState(toDateInput(deal?.contractStart));
  const [end, setEnd] = useState(toDateInput(deal?.contractEnd));
  const months = contractMonths(start ? new Date(`${start}T12:00:00.000Z`) : null, end ? new Date(`${end}T12:00:00.000Z`) : null);

  return (
    <>
      <Field label="Contract start (CSD)" name="contractStart">
        <input
          id="contractStart"
          name="contractStart"
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
      </Field>
      <Field label="Contract end (CED)" name="contractEnd">
        <input
          id="contractEnd"
          name="contractEnd"
          type="date"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
        />
      </Field>
      <div className="field">
        <span className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
          Length
        </span>
        <p className="border border-transparent py-2 text-sm">
          {months == null ? "Taken from CSD and CED" : monthsLabel(months)}
        </p>
      </div>
    </>
  );
}

export function DealPayoutFields({ deal }: { deal?: DealWithPayments }) {
  const [tpi, setTpi] = useState(deal?.tpiPartner ?? "NONE");
  const [tpiPercent, setTpiPercent] = useState(String(deal?.tpiPercent ?? tpiPercentFor(deal?.tpiPartner)));
  const [gross, setGross] = useState(deal?.estimatedCommission != null ? String(deal.estimatedCommission) : "");
  const [payoutType, setPayoutType] = useState(deal?.payoutType === "RESIDUAL" ? "RESIDUAL" : "SPLIT");
  const [monthly, setMonthly] = useState(deal?.residualMonthly != null ? String(deal.residualMonthly) : "");
  const [preset, setPreset] = useState(presetFromPayments(deal?.payments ?? []));
  const [rows, setRows] = useState(() => rowsForPreset(presetFromPayments(deal?.payments ?? []), deal));

  const net = netCommission(Number(gross) || 0, Number(tpiPercent) || 0);
  const amounts = useMemo(
    () => splitByPercent(net, rows.map((row) => Number(row.percent) || 0)),
    [net, rows],
  );

  function changeTpi(value: string) {
    setTpi(value);
    setTpiPercent(String(tpiPercentFor(value)));
  }

  function changePreset(value: string) {
    setPreset(value);
    setRows(rowsForPreset(value, deal));
  }

  function patch(index: number, next: Partial<(typeof rows)[number]>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...next } : row)));
  }

  return (
    <div className="md:col-span-2 grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="TPI partner" name="tpiPartner" hint="Deducted from the full deal value before payouts.">
          <select
            id="tpiPartner"
            name="tpiPartner"
            value={tpi}
            onChange={(event) => changeTpi(event.target.value)}
          >
            {TPI_PARTNERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
                {item.percent ? ` · ${item.percent}%` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="TPI deduction %" name="tpiPercent">
          <input
            id="tpiPercent"
            name="tpiPercent"
            value={tpiPercent}
            onChange={(event) => setTpiPercent(event.target.value)}
          />
        </Field>
        <Field label="Full deal value (£)" name="estimatedCommission" hint="Gross commission before TPI.">
          <input
            id="estimatedCommission"
            name="estimatedCommission"
            value={gross}
            onChange={(event) => setGross(event.target.value)}
          />
        </Field>
      </div>
      <p className="text-sm text-muted">
        Net commission after TPI: <span className="font-semibold text-ink">{gbpExact(net)}</span>
        {Number(tpiPercent) > 0 ? ` · ${tpiPercent}% to the TPI` : " · none / direct"}
      </p>

      <Field label="Payout type" name="payoutType">
        <select
          id="payoutType"
          name="payoutType"
          value={payoutType}
          onChange={(event) => setPayoutType(event.target.value)}
        >
          {PAYOUT_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>

      {payoutType === "RESIDUAL" ? (
        <ResidualPreview deal={deal} net={net} monthly={monthly} onMonthly={setMonthly} />
      ) : null}

      {payoutType === "SPLIT" ? (
        <>
          <Field label="Payout split" name="payoutPreset">
            <select
              id="payoutPreset"
              name="payoutPreset"
              value={preset}
              onChange={(event) => changePreset(event.target.value)}
            >
              {PAYOUT_PRESETS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <input type="hidden" name="paymentCount" value={rows.length} />

          <div className="overflow-x-auto">
            <table className="desk-table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>%</th>
                  <th>Expected</th>
                  <th>Amount due</th>
                  <th>Actual paid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.stage}-${index}`}>
                    <td>
                      <select
                        name={`paymentStage_${index}`}
                        value={row.stage}
                        onChange={(event) => {
                          const stage = event.target.value;
                          const label =
                            PAYMENT_STAGES.find((item) => item.value === stage)?.label ?? row.label;
                          patch(index, { stage, label });
                        }}
                      >
                        {PAYMENT_STAGES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <input type="hidden" name={`paymentLabel_${index}`} value={row.label} />
                    </td>
                    <td>
                      <input
                        name={`paymentPercent_${index}`}
                        value={row.percent}
                        onChange={(event) => patch(index, { percent: Number(event.target.value) || 0 })}
                        className="w-20"
                        disabled={preset !== "CUSTOM"}
                      />
                      {preset !== "CUSTOM" ? (
                        <input type="hidden" name={`paymentPercent_${index}`} value={row.percent} />
                      ) : null}
                    </td>
                    <td>
                      <input
                        name={`paymentDate_${index}`}
                        type="date"
                        value={row.date}
                        onChange={(event) => patch(index, { date: event.target.value })}
                      />
                    </td>
                    <td className="font-medium">{gbpExact(amounts[index] ?? 0)}</td>
                    <td>
                      <input
                        name={`paymentPaid_${index}`}
                        value={row.paid}
                        onChange={(event) => patch(index, { paid: event.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ResidualPreview({
  deal,
  net,
  monthly,
  onMonthly,
}: {
  deal?: DealWithPayments;
  net: number;
  monthly: string;
  onMonthly: (value: string) => void;
}) {
  const dates =
    deal?.contractStart && deal?.contractEnd
      ? residualDates(deal.contractStart, deal.contractEnd)
      : [];
  const typed = Number(monthly);
  const perMonth =
    typed > 0 ? typed : dates.length ? Math.round((net / dates.length) * 100) / 100 : 0;

  return (
    <div className="grid gap-3">
      <Field
        label="£ / month (optional)"
        name="residualMonthly"
        hint="Leave blank to split net commission evenly across the months from CSD (live) to CED."
      >
        <input
          id="residualMonthly"
          name="residualMonthly"
          value={monthly}
          onChange={(event) => onMonthly(event.target.value)}
        />
      </Field>
      <p className="text-sm text-muted">
        {dates.length
          ? `${dates.length} monthly residuals · ${gbpExact(perMonth)} each · first ${
              dates[0] ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(dates[0]) : "—"
            } · last ${
              dates[dates.length - 1]
                ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(
                    dates[dates.length - 1] as Date,
                  )
                : "—"
            }`
          : "Set CSD (live date) and CED above. The schedule is built when you save."}
      </p>
    </div>
  );
}
