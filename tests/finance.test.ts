import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyResidual,
  buildImportedFinance,
  parsePayoutPercents,
  parseTpiPartner,
} from "../src/lib/deal-payouts";
import {
  contractMonths,
  filterDealsByMonth,
  groupByAgent,
  groupByPaymentStage,
  liveDealPreview,
  monthKey,
  netCommission,
  residualDates,
  splitAmounts,
  splitByPercent,
} from "../src/lib/finance";
import { isDeskAdmin, nextQuarterDue, rollQuarterDue } from "../src/lib/desk-reminders";
import { parseMoney } from "../src/lib/format";

test("50/50 split math: two agents take half each", () => {
  const slice = splitAmounts(
    { amountDue: 6800, actualPaid: 2000, estimatedCommission: 6800 },
    2,
  );
  assert.equal(slice.amountDue, 3400);
  assert.equal(slice.actualPaid, 1000);
  assert.equal(slice.estimatedCommission, 3400);
});

test("50/50 split math: groupByAgent buckets match the split", () => {
  const buckets = groupByAgent([
    {
      id: "deal-1",
      customerId: "harbour",
      dueDate: null,
      salespersonId: null,
      customerName: "Harbour View Hotels Ltd",
      salespersonName: null,
      supplier: "EDF Energy",
      agentIds: ["priya", "helen"],
      agentNames: ["Priya Shah", "Helen Crowe"],
      amountDue: 6800,
      actualPaid: 2000,
      estimatedCommission: 6800,
    },
  ]);
  assert.equal(buckets.length, 2);
  for (const bucket of buckets) {
    assert.equal(bucket.due, 3400);
    assert.equal(bucket.paid, 1000);
    assert.equal(bucket.estimated, 3400);
    assert.equal(bucket.remaining, 2400);
  }
});

test("monthly finance only includes deals due in that month", () => {
  const august = new Date(Date.UTC(2026, 7, 14));
  const september = new Date(Date.UTC(2026, 8, 13));
  const deals = [
    {
      dueDate: august,
      amountDue: 2100,
      actualPaid: 0,
      estimatedCommission: 2100,
    },
    {
      dueDate: september,
      amountDue: 6800,
      actualPaid: 2000,
      estimatedCommission: 6800,
    },
    {
      dueDate: null,
      amountDue: 400,
      actualPaid: 0,
      estimatedCommission: 400,
    },
  ];
  const month = filterDealsByMonth(deals, monthKey(august));
  assert.equal(month.length, 1);
  assert.equal(month[0]?.amountDue, 2100);
  assert.equal(filterDealsByMonth(deals, "").length, 3);
});

test("TPI deduction: Infinite 20% leaves 80% net", () => {
  assert.equal(netCommission(6800, 20), 5440);
  assert.equal(netCommission(9100, 15), 7735);
  assert.equal(netCommission(4200, 0), 4200);
});

test("40/40/20 payouts use net and put remainder on EOC", () => {
  const [sign, live, eoc] = splitByPercent(5440, [40, 40, 20]);
  assert.equal(sign, 2176);
  assert.equal(live, 2176);
  assert.equal(eoc, 1088);
  assert.equal(sign + live + eoc, 5440);
});

test("40/60 two-payment split", () => {
  const [sign, live] = splitByPercent(7735, [40, 60]);
  assert.equal(sign, 3094);
  assert.equal(live, 4641);
  assert.equal(sign + live, 7735);
});

test("contract length comes from CSD and CED, not a months field", () => {
  const start = new Date(Date.UTC(2024, 7, 1));
  const end = new Date(Date.UTC(2026, 7, 1));
  assert.equal(contractMonths(start, end), 24);
  assert.equal(contractMonths(start, null), null);
});

test("monthly residual: one payment per month from live date to CED", () => {
  const live = new Date(Date.UTC(2025, 8, 1));
  const ced = new Date(Date.UTC(2026, 8, 1));
  const dates = residualDates(live, ced);
  assert.equal(dates.length, 12);
  assert.equal(dates[0]?.toISOString().slice(0, 10), "2025-09-01");
  assert.equal(dates[11]?.toISOString().slice(0, 10), "2026-08-01");
});

test("monthly residual splits net after TPI, or uses £/month", () => {
  const live = new Date(Date.UTC(2025, 8, 1));
  const ced = new Date(Date.UTC(2026, 8, 1));
  const even = applyResidual(3600, 0, live, ced, null);
  assert.equal(even.payments.length, 12);
  assert.equal(even.payments[0]?.amountDue, 300);
  assert.equal(even.payments[11]?.amountDue, 300);
  assert.equal(even.rollup.amountDue, 3600);
  const typed = applyResidual(3600, 20, live, ced, 200);
  assert.equal(typed.net, 2880);
  assert.equal(typed.payments[0]?.amountDue, 200);
  assert.equal(typed.rollup.amountDue, 2400);
});

test("finance groups due and paid by payment stage", () => {
  const buckets = groupByPaymentStage([
    { stage: "ON_SIGN", label: "On Sign", amountDue: 2176, actualPaid: 2176, estimatedCommission: 2176 },
    { stage: "ON_LIVE", label: "On Live", amountDue: 2176, actualPaid: 0, estimatedCommission: 2176 },
    { stage: "EOC", label: "EOC", amountDue: 1088, actualPaid: 0, estimatedCommission: 1088 },
  ]);
  assert.equal(buckets[0]?.key, "ON_SIGN");
  assert.equal(buckets[0]?.paid, 2176);
  assert.equal(buckets[1]?.key, "ON_LIVE");
  assert.equal(buckets[1]?.remaining, 2176);
  assert.equal(buckets[2]?.due, 1088);
});

test("one agent keeps the full amount", () => {
  const slice = splitAmounts({ amountDue: 4600, actualPaid: 4600, estimatedCommission: 4600 }, 1);
  assert.equal(slice.amountDue, 4600);
  assert.equal(slice.actualPaid, 4600);
});

test("parseMoney reads UK deal values the form used to treat as zero", () => {
  assert.equal(Number.isNaN(Number("6,800")), true);
  assert.equal(parseMoney("6,800"), 6800);
  assert.equal(parseMoney("£6,800"), 6800);
  assert.equal(parseMoney("£ 6,800.00"), 6800);
  assert.equal(parseMoney("20%"), 20);
});

test("live calculator: full value minus TPI, then split legs, before save", () => {
  const preview = liveDealPreview({
    gross: "£6,800",
    tpiPercent: "20%",
    payoutType: "SPLIT",
    percents: [40, 40, 20],
  });
  assert.equal(preview.gross, 6800);
  assert.equal(preview.tpiAmount, 1360);
  assert.equal(preview.net, 5440);
  assert.equal(preview.totalDue, 5440);
  assert.deepEqual(
    preview.legs.map((leg) => leg.amountDue),
    [2176, 2176, 1088],
  );
});

test("quarterly reminder due dates are 1 Jan / 1 Apr / 1 Jul / 1 Oct", () => {
  assert.equal(nextQuarterDue(new Date("2026-08-17T12:00:00.000Z")).toISOString().slice(0, 10), "2026-10-01");
  assert.equal(nextQuarterDue(new Date("2026-10-01T12:00:00.000Z")).toISOString().slice(0, 10), "2026-10-01");
  assert.equal(nextQuarterDue(new Date("2026-01-01T12:00:00.000Z")).toISOString().slice(0, 10), "2026-01-01");
  assert.equal(nextQuarterDue(new Date("2026-12-02T12:00:00.000Z")).toISOString().slice(0, 10), "2027-01-01");
});

test("marking the quarterly reminder done rolls to the next quarter", () => {
  const oct = new Date("2026-10-01T12:00:00.000Z");
  assert.equal(rollQuarterDue(oct, new Date("2026-08-17T12:00:00.000Z")).toISOString().slice(0, 10), "2027-01-01");
  assert.equal(rollQuarterDue(new Date("2026-07-01T12:00:00.000Z"), new Date("2026-08-17T12:00:00.000Z")).toISOString().slice(0, 10), "2026-10-01");
});

test("only Joel / Admin sees the quarterly market-update reminder", () => {
  assert.equal(isDeskAdmin(null), false);
  assert.equal(isDeskAdmin({ role: "Sales", email: "priya.shah@nzce.co.uk" }), false);
  assert.equal(isDeskAdmin({ role: "Admin", email: "joel.pearson@nzcenergy.co.uk" }), true);
  assert.equal(isDeskAdmin({ role: "Sales", email: "joel.pearson@nzcenergy.co.uk" }), true);
});

test("deal CSV import uses the same TPI and split calculator as the form", () => {
  assert.equal(parseTpiPartner("Infinite"), "INFINITE");
  assert.equal(parseTpiPartner("Joose + UCR"), "JOOSE_UCR");
  assert.equal(parseTpiPartner("Love Energy Savings"), "NONE");
  assert.deepEqual(parsePayoutPercents("40/60"), [40, 60]);
  assert.deepEqual(parsePayoutPercents("50/50"), [50, 50]);

  const infinite = buildImportedFinance({
    estimatedCommission: 6800,
    tpiPartner: "INFINITE",
    tpiPercent: null,
    payoutType: "SPLIT",
    payoutSplit: "40/40/20",
    contractStart: new Date("2026-04-01T12:00:00.000Z"),
    contractEnd: new Date("2027-03-31T12:00:00.000Z"),
    dueDate: new Date("2026-04-01T12:00:00.000Z"),
  });
  assert.equal(infinite.tpiPercent, 20);
  assert.equal(infinite.net, 5440);
  assert.deepEqual(
    infinite.payments.map((row) => row.amountDue),
    [2176, 2176, 1088],
  );
  assert.equal(infinite.rollup.amountDue, 5440);

  const jooseUcr = buildImportedFinance({
    estimatedCommission: 10000,
    tpiPartner: "JOOSE_UCR",
    tpiPercent: null,
    contractStart: new Date("2026-04-01T12:00:00.000Z"),
    contractEnd: new Date("2027-03-31T12:00:00.000Z"),
  });
  assert.equal(jooseUcr.tpiPercent, 30);
  assert.equal(jooseUcr.net, 7000);
  assert.deepEqual(
    jooseUcr.payments.map((row) => row.amountDue),
    [2800, 2800, 1400],
  );

  const residual = buildImportedFinance({
    estimatedCommission: 3600,
    tpiPartner: "NONE",
    tpiPercent: null,
    payoutType: "RESIDUAL",
    contractStart: new Date("2025-09-01T12:00:00.000Z"),
    contractEnd: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(residual.payoutType, "RESIDUAL");
  assert.equal(residual.payments.length, 12);
  assert.equal(residual.payments[0]?.amountDue, 300);
  assert.equal(residual.rollup.amountDue, 3600);

  const typedMonthly = buildImportedFinance({
    estimatedCommission: 3600,
    tpiPartner: "NONE",
    tpiPercent: null,
    residualMonthly: 200,
    contractStart: new Date("2025-09-01T12:00:00.000Z"),
    contractEnd: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(typedMonthly.payoutType, "RESIDUAL");
  assert.equal(typedMonthly.payments[0]?.amountDue, 200);
});

test("live calculator: residual months use typed CSD/CED, not a saved deal", () => {
  const preview = liveDealPreview({
    gross: "3,750",
    tpiPercent: "0",
    payoutType: "RESIDUAL",
    start: "2025-09-01",
    end: "2026-09-01",
  });
  assert.equal(preview.net, 3750);
  assert.equal(preview.legs.length, 12);
  assert.equal(preview.legs[0]?.amountDue, 312.5);
  assert.equal(preview.totalDue, 3750);
  const empty = liveDealPreview({
    gross: "3,750",
    tpiPercent: "0",
    payoutType: "RESIDUAL",
  });
  assert.equal(empty.net, 3750);
  assert.equal(empty.legs.length, 0);
  assert.equal(empty.totalDue, 0);
});
