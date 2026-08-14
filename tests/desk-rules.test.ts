import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { commitImportRows } from "../src/lib/csv-import-commit";
import { validateImportRow } from "../src/lib/csv-import";
import { liveDealOnSupply } from "../src/lib/deals";
import { findSupplyClash } from "../src/lib/supply";
import { withTestDb } from "./helpers/test-db";

test("CSV import source never deletes customers or meters", () => {
  const files = [
    path.join(import.meta.dirname, "../src/lib/csv-import-commit.ts"),
    path.join(import.meta.dirname, "../src/app/actions/import.ts"),
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("customer.delete"), false, `${file} must not delete customers`);
    assert.equal(source.includes("meter.delete"), false, `${file} must not delete meters`);
    assert.equal(source.includes(".deleteMany"), false, `${file} must not deleteMany`);
  }
});

test("CSV import never deletes: existing customer and meter stay, same ids", async () => {
  await withTestDb(async (db) => {
    const keep = await db.customer.create({
      data: {
        companyName: "Keep Me Ltd",
        contactName: "Sam Keep",
        email: "sam@keep-me.co.uk",
      },
    });
    const meter = await db.meter.create({
      data: {
        customerId: keep.id,
        siteName: "High Street",
        fuelType: "ELECTRIC",
        mpan: "1234567890123",
        objectionStatus: "IN_OBJECTION",
        objectionNote: "Debt on account",
      },
    });
    const other = await db.customer.create({
      data: {
        companyName: "Other Book Ltd",
        contactName: "Pat Other",
        email: "pat@other-book.co.uk",
      },
    });

    const row = validateImportRow(
      {
        companyName: "Keep Me Ltd",
        contactName: "Sam Keep",
        email: "sam@keep-me.co.uk",
        siteName: "High Street annex",
        fuelType: "ELECTRIC",
        mpan: "1234567890123",
        supplier: "Octopus Energy",
      },
      2,
    );
    row.action = "UPDATE_METER";

    const beforeCustomers = await db.customer.count();
    const beforeMeters = await db.meter.count();
    const result = await commitImportRows(db, [row]);

    assert.equal(result.updateMeters, 1);
    assert.equal(result.createCustomers, 0);
    assert.equal(await db.customer.count(), beforeCustomers);
    assert.equal(await db.meter.count(), beforeMeters);
    assert.ok(await db.customer.findUnique({ where: { id: keep.id } }));
    assert.ok(await db.customer.findUnique({ where: { id: other.id } }));
    const updated = await db.meter.findUnique({ where: { id: meter.id } });
    assert.ok(updated);
    assert.equal(updated?.supplier, "Octopus Energy");
    assert.equal(updated?.objectionStatus, "IN_OBJECTION");
    assert.equal(updated?.objectionNote, "Debt on account");
  });
});

test("cannot create a duplicate MPAN", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({
      data: {
        companyName: "Harbour View Hotels Ltd",
        contactName: "Claire Debenham",
        email: "claire@harbour.test",
      },
    });
    await db.meter.create({
      data: {
        customerId: customer.id,
        siteName: "Marine Parade hotel",
        fuelType: "ELECTRIC",
        mpan: "002160013300112233445",
      },
    });
    const other = await db.customer.create({
      data: {
        companyName: "Greenfield Artisan Bakery",
        contactName: "Samira Khan",
        email: "samira@bakery.test",
      },
    });
    const clash = await findSupplyClash(db, "002160013300112233445", null);
    assert.ok(clash);
    assert.equal(clash?.customer.companyName, "Harbour View Hotels Ltd");

    const created = clash
      ? null
      : await db.meter.create({
          data: {
            customerId: other.id,
            siteName: "Night-shift ovens",
            fuelType: "ELECTRIC",
            mpan: "002160013300112233445",
          },
        });
    assert.equal(created, null);
    assert.equal(await db.meter.count({ where: { mpan: "002160013300112233445" } }), 1);
  });
});

test("objection status persists when the meter is updated", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({
      data: {
        companyName: "Northern Steel Fabrications",
        contactName: "Ian Croft",
        email: "ian@steel.test",
      },
    });
    const meter = await db.meter.create({
      data: {
        customerId: customer.id,
        siteName: "Attercliffe works",
        fuelType: "ELECTRIC",
        mpan: "000080016600223344556",
        objectionStatus: "IN_OBJECTION",
        objectionNote: "Debt on account — TotalEnergies",
        objectionRaisedOn: new Date("2026-08-08T12:00:00.000Z"),
      },
    });

    await db.meter.update({
      where: { id: meter.id },
      data: { supplier: "TotalEnergies", currentRates: "Day 28p" },
    });

    const after = await db.meter.findUnique({ where: { id: meter.id } });
    assert.equal(after?.objectionStatus, "IN_OBJECTION");
    assert.equal(after?.objectionNote, "Debt on account — TotalEnergies");
    assert.ok(after?.objectionRaisedOn);
  });
});

test("two live contracts on one MPAN are rejected", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({
      data: {
        companyName: "Mersey Logistics Ltd",
        contactName: "Becky Shaw",
        email: "becky@mersey.test",
      },
    });
    const meter = await db.meter.create({
      data: {
        customerId: customer.id,
        siteName: "Bootle warehouse",
        fuelType: "ELECTRIC",
        mpan: "001590017700334455112",
      },
    });
    await db.deal.create({
      data: {
        customerId: customer.id,
        meterId: meter.id,
        supplier: "SmartestEnergy",
        fuelType: "ELECTRIC",
        status: "LIVE",
        amountDue: 4600,
      },
    });

    const clash = await liveDealOnSupply({ meterId: meter.id, status: "LIVE" }, db);
    assert.ok(clash);
    assert.equal(clash?.supplier, "SmartestEnergy");

    const allowed = clash ? false : true;
    assert.equal(allowed, false);
    assert.equal(await db.deal.count({ where: { meterId: meter.id, status: "LIVE" } }), 1);
  });
});
