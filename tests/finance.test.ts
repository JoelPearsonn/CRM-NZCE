import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contractMonths,
  filterDealsByMonth,
  groupByAgent,
  groupByPaymentStage,
  monthKey,
  netCommission,
  splitAmounts,
  splitByPercent,
} from "../src/lib/finance";

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
