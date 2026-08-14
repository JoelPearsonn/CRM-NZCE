import assert from "node:assert/strict";
import { test } from "node:test";
import { filterDealsByMonth, groupByAgent, monthKey, splitAmounts } from "../src/lib/finance";

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

test("one agent keeps the full amount", () => {
  const slice = splitAmounts({ amountDue: 4600, actualPaid: 4600, estimatedCommission: 4600 }, 1);
  assert.equal(slice.amountDue, 4600);
  assert.equal(slice.actualPaid, 4600);
});
