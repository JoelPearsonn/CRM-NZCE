"use client";

import { useEffect, useMemo, useState } from "react";
import type { Deal, DealPayment } from "@prisma/client";
import { Field } from "@/components/ui";
import {
  PAYMENT_STAGES,
  PAYOUT_PRESETS,
  PAYOUT_TYPES,
  TPI_PARTNERS,
  tpiPercentFor,
} from "@/lib/constants";
import { contractMonths, liveDealPreview } from "@/lib/finance";
import { formatDate, gbpExact, monthsLabel, parseMoney, toDateInput } from "@/lib/format";

type DealWithPayments = Deal & { payments?: DealPayment[] };

function presetFromPayments(payments: DealPayment[]) {
  const percents = payments.map((row) => row.percent);
  if (percents[0] === 0 && percents[1] === 80 && percents[2] === 20) return "0_80_20";
  if (percents[0] === 80 && percents[1] === 0 && percents[2] === 20) return "80_0_20";
  if (percents[0] === 40 && percents[1] === 40 && percents[2] === 20) return "40_40_20";
  if (
    (percents.length === 2 && percents[0] === 40 && percents[1] === 60) ||
    (percents[0] === 40 && percents[1] === 60 && (percents[2] ?? 0) === 0)
  ) {
    return "40_60";
  }
  return payments.length ? "CUSTOM" : "40_40_20";
}

function rowsForPreset(
  preset: string,
  deal?: DealWithPayments,
  start = "",
  end = "",
): { stage: string; label: string; percent: number; date: string; amount: string }[] {
  const existing = [...(deal?.payments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  if (preset === "CUSTOM" && existing.length) {
    const rows = existing.map((row, index) => ({
      stage: row.stage,
      label: row.label || `Payment ${index + 1}`,
      percent: row.percent,
      date: toDateInput(row.expectedDate),
      amount: row.amountDue != null ? String(row.amountDue) : "",
    }));
    while (rows.length < 3) {
      const index = rows.length;
      const stage = PAYMENT_STAGES[index]?.value ?? "EOC";
      rows.push({
        stage,
        label: `Payment ${index + 1} · ${PAYMENT_STAGES[index]?.label ?? stage}`,
        percent: 0,
        date: "",
        amount: "",
      });
    }
    return rows.slice(0, 3);
  }
  const percents =
    PAYOUT_PRESETS.find((item) => item.value === preset)?.percents ?? [40, 40, 20];
  const stages = ["ON_SIGN", "ON_LIVE", "EOC"];
  return percents.map((percent, index) => {
    const prior = existing[index];
    const stage = stages[index] ?? "ON_SIGN";
    const label = `Payment ${index + 1} · ${PAYMENT_STAGES.find((item) => item.value === stage)?.label ?? `Payment ${index + 1}`}`;
    const fallbackDate =
      percent <= 0
        ? ""
        : stage === "EOC"
          ? end || toDateInput(deal?.contractEnd)
          : start || toDateInput(deal?.contractStart);
    return {
      stage,
      label: prior?.label ?? label,
      percent,
      date: toDateInput(prior?.expectedDate) || fallbackDate,
      amount: prior?.amountDue != null ? String(prior.amountDue) : "",
    };
  });
}

export function ContractDateFields({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
}) {
  const months = contractMonths(
    start ? new Date(`${start}T12:00:00.000Z`) : null,
    end ? new Date(`${end}T12:00:00.000Z`) : null,
  );

  return (
    <>
      <Field label="Contract start (CSD)" name="contractStart">
        <input
          id="contractStart"
          name="contractStart"
          type="date"
          value={start}
          onChange={(event) => onStart(event.target.value)}
        />
      </Field>
      <Field label="Contract end (CED)" name="contractEnd">
        <input
          id="contractEnd"
          name="contractEnd"
          type="date"
          value={end}
          onChange={(event) => onEnd(event.target.value)}
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

export function DealPayoutFields({
  deal,
  contractStart,
  contractEnd,
}: {
  deal?: DealWithPayments;
  contractStart: string;
  contractEnd: string;
}) {
  const [tpi, setTpi] = useState(deal?.tpiPartner ?? "NONE");
  const [tpiPercent, setTpiPercent] = useState(String(deal?.tpiPercent ?? tpiPercentFor(deal?.tpiPartner)));
  const [gross, setGross] = useState(deal?.estimatedCommission != null ? String(deal.estimatedCommission) : "");
  const [payoutType, setPayoutType] = useState(deal?.payoutType === "RESIDUAL" ? "RESIDUAL" : "SPLIT");
  const [monthly, setMonthly] = useState(deal?.residualMonthly != null ? String(deal.residualMonthly) : "");
  const [preset, setPreset] = useState(presetFromPayments(deal?.payments ?? []));
  const [rows, setRows] = useState(() =>
    rowsForPreset(presetFromPayments(deal?.payments ?? []), deal, contractStart, contractEnd),
  );
  const [actualPaid, setActualPaid] = useState(deal?.actualPaid != null ? String(deal.actualPaid) : "");
  const [actualPaidDate, setActualPaidDate] = useState(toDateInput(deal?.actualPaidDate));

  const preview = useMemo(
    () =>
      liveDealPreview({
        gross,
        tpiPercent,
        payoutType,
        percents: rows.map((row) => Number(row.percent) || 0),
        amounts: rows.map((row) => parseMoney(row.amount)),
        dates: rows.map((row) => row.date || null),
        residualMonthly: monthly,
        start: contractStart,
        end: contractEnd,
      }),
    [gross, tpiPercent, payoutType, rows, monthly, contractStart, contractEnd],
  );

  useEffect(() => {
    setRows((current) =>
      current.map((row) => {
        if (row.percent <= 0 || row.date) return row;
        if (row.stage === "EOC") return contractEnd ? { ...row, date: contractEnd } : row;
        return contractStart ? { ...row, date: contractStart } : row;
      }),
    );
  }, [contractStart, contractEnd]);

  function changeTpi(value: string) {
    setTpi(value);
    setTpiPercent(String(tpiPercentFor(value)));
  }

  function changePreset(value: string) {
    setPreset(value);
    setRows(rowsForPreset(value, deal, contractStart, contractEnd));
  }

  function patch(index: number, next: Partial<(typeof rows)[number]>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...next } : row)));
  }

  const tpiLabel = TPI_PARTNERS.find((item) => item.value === tpi)?.label ?? "TPI";

  return (
    <div className="md:col-span-2 grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="TPI partner" name="tpiPartner" hint="Recorded on the deal. Full deal value is already net of TPI.">
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
        <Field label="Full deal value (£)" name="estimatedCommission" hint="Already net of TPI. Payment 1 / 2 / 3 split this pot. Commas and £ are fine.">
          <input
            id="estimatedCommission"
            name="estimatedCommission"
            value={gross}
            onChange={(event) => setGross(event.target.value)}
            inputMode="decimal"
            placeholder="6,800"
          />
        </Field>
      </div>

      <div
        data-testid="deal-calculator"
        className="grid gap-2 rounded-sm border border-rule bg-card px-4 py-3 text-sm"
      >
        <p className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
          Live calculator
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-muted">Full deal value</span>
          <span>{gbpExact(preview.gross)}</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-muted">
            TPI{preview.tpiPercent ? ` · ${tpiLabel} ${preview.tpiPercent}%` : " · none / direct"}
          </span>
          <span>{payoutType === "RESIDUAL" && preview.tpiAmount ? `−${gbpExact(preview.tpiAmount)}` : "already in FDV"}</span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-rule pt-2">
          <span className="font-medium">Net commission</span>
          <span className="font-semibold text-ink" data-testid="net-commission">
            {gbpExact(preview.net)}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-medium">Amount due</span>
          <span className="font-semibold text-ink" data-testid="amount-due">
            {gbpExact(preview.totalDue)}
          </span>
        </div>
      </div>

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
        <ResidualPreview
          monthly={monthly}
          onMonthly={setMonthly}
          legs={preview.legs}
          totalDue={preview.totalDue}
          hasDates={Boolean(contractStart && contractEnd)}
        />
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
                          const label = `Payment ${index + 1} · ${
                            PAYMENT_STAGES.find((item) => item.value === stage)?.label ?? row.label
                          }`;
                          patch(index, { stage, label });
                        }}
                      >
                        {PAYMENT_STAGES.map((item) => (
                          <option key={item.value} value={item.value}>
                            Payment {index + 1} · {item.label}
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
                    <td>
                      <input
                        name={`paymentAmount_${index}`}
                        value={row.amount}
                        onChange={(event) => patch(index, { amount: event.target.value })}
                        inputMode="decimal"
                        placeholder={
                          preview.legs[index]?.amountDue != null
                            ? String(preview.legs[index]?.amountDue)
                            : ""
                        }
                        data-testid={`split-due-${index}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Actual commission"
              name="actualPaid"
              hint="One received amount for the whole deal — not per payment."
            >
              <input
                id="actualPaid"
                name="actualPaid"
                value={actualPaid}
                onChange={(event) => setActualPaid(event.target.value)}
                inputMode="decimal"
              />
            </Field>
            <Field label="Actual payment date" name="actualPaidDate">
              <input
                id="actualPaidDate"
                name="actualPaidDate"
                type="date"
                value={actualPaidDate}
                onChange={(event) => setActualPaidDate(event.target.value)}
              />
            </Field>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ResidualPreview({
  monthly,
  onMonthly,
  legs,
  totalDue,
  hasDates,
}: {
  monthly: string;
  onMonthly: (value: string) => void;
  legs: { label: string; amountDue: number; expectedDate: Date | null }[];
  totalDue: number;
  hasDates: boolean;
}) {
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
          inputMode="decimal"
          placeholder="Leave blank to split net evenly"
        />
      </Field>
      {hasDates && legs.length ? (
        <div className="overflow-x-auto">
          <table className="desk-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Due date</th>
                <th>Amount due</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, index) => (
                <tr key={`${leg.label}-${index}`}>
                  <td>{leg.label}</td>
                  <td>{formatDate(leg.expectedDate)}</td>
                  <td className="font-medium">{gbpExact(leg.amountDue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm">
            {legs.length} monthly residuals · total amount due{" "}
            <span className="font-semibold">{gbpExact(totalDue)}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Set CSD (live date) and CED above. Each month’s amount due appears here as you type — you do
          not need to save first.
        </p>
      )}
    </div>
  );
}
