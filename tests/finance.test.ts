import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByAgent, splitAmounts } from "../src/lib/finance";

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

test("one agent keeps the full amount", () => {
  const slice = splitAmounts({ amountDue: 4600, actualPaid: 4600, estimatedCommission: 4600 }, 1);
  assert.equal(slice.amountDue, 4600);
  assert.equal(slice.actualPaid, 4600);
});
