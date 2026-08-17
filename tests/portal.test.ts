import assert from "node:assert/strict";
import { test } from "node:test";
import {
  portalContractOf,
  portalCustomerOf,
  portalMeterOf,
  portalPayloadIsSafe,
  portalRenewalsOf,
} from "../src/lib/portal-data";
import { hashPassword, verifyPassword } from "../src/lib/portal-crypto";
import { loadPortalBook } from "../src/lib/portal-book";
import { withTestDb } from "./helpers/test-db";

test("portal password hash verifies, and a wrong password does not", () => {
  const stored = hashPassword("harbour-view");
  assert.equal(verifyPassword("harbour-view", stored), true);
  assert.equal(verifyPassword("wrong", stored), false);
});

test("portal serializers never include TPI, commission or payout fields", () => {
  const customer = {
    id: "c1",
    companyName: "Harbour View Hotels Ltd",
    tradingName: "Harbour View",
    contactName: "Claire Debenham",
    email: "claire.debenham@harbourviewhotels.co.uk",
    phone: "01273 555 441",
    addressLine1: "2 Marine Parade",
    city: "Brighton",
    postcode: "BN2 1TL",
    industry: "Hospitality",
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const meter = {
    id: "m1",
    customerId: "c1",
    siteName: "Marine Parade hotel",
    siteAddress: "2 Marine Parade",
    fuelType: "ELECTRIC",
    mpan: "002160013300112233445",
    mprn: null,
    electricEac: 180000,
    gasAq: null,
    supplier: "EDF Energy",
    contractStart: new Date("2024-10-01"),
    contractEnd: new Date("2026-09-28"),
    meterType: null,
    settlement: "NHH",
    currentRates: "Day 28p",
    renewalDate: new Date("2026-09-28"),
    loaStatus: "SIGNED",
    loaSignedOn: null,
    loaSignedBy: null,
    loaFileName: null,
    loaStoredName: null,
    objectionStatus: "NONE",
    objectionNote: "broker only",
    objectionRaisedOn: null,
    objectionClearedOn: null,
    salespersonId: "agent-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const deal = {
    id: "d1",
    customerId: "c1",
    meterId: "m1",
    leadId: null,
    salespersonId: "agent-1",
    supplier: "EDF Energy",
    fuelType: "ELECTRIC",
    contractStart: new Date("2024-10-01"),
    contractEnd: new Date("2026-09-28"),
    renewalDate: new Date("2026-09-28"),
    status: "LIVE",
    dueDate: new Date("2026-04-01"),
    amountDue: 5440,
    estimatedCommission: 6800,
    actualPaid: 0,
    actualPaidDate: null,
    tpiPartner: "INFINITE",
    tpiPercent: 20,
    payoutType: "SPLIT",
    residualMonthly: null,
    notes: "broker note",
    createdAt: new Date(),
    updatedAt: new Date(),
    meter,
  };

  const payload = {
    customer: portalCustomerOf(customer),
    contract: portalContractOf(deal),
    meter: portalMeterOf(meter),
    renewals: portalRenewalsOf([meter], [deal]),
  };
  assert.equal(portalPayloadIsSafe(payload), true);
  assert.equal("tpiPercent" in payload.contract, false);
  assert.equal("estimatedCommission" in payload.contract, false);
  assert.equal("amountDue" in payload.contract, false);
  assert.equal(payload.contract.supplier, "EDF Energy");
  assert.equal(payload.renewals.length, 2);
});

test("portal book only returns that customer’s meters and contracts", async () => {
  await withTestDb(async (db) => {
    const harbour = await db.customer.create({
      data: {
        companyName: "Harbour View Hotels Ltd",
        contactName: "Claire Debenham",
        email: "claire.debenham@harbourviewhotels.co.uk",
      },
    });
    const bakery = await db.customer.create({
      data: {
        companyName: "Greenfield Artisan Bakery",
        contactName: "Samira Khan",
        email: "samira@greenfieldbakery.co.uk",
      },
    });
    await db.meter.create({
      data: {
        customerId: harbour.id,
        siteName: "Marine Parade hotel",
        fuelType: "ELECTRIC",
        mpan: "002160013300112233445",
        renewalDate: new Date("2026-09-28"),
      },
    });
    await db.meter.create({
      data: {
        customerId: bakery.id,
        siteName: "Stokes Croft",
        fuelType: "ELECTRIC",
        mpan: "1234567890123",
      },
    });
    await db.deal.create({
      data: {
        customerId: harbour.id,
        supplier: "EDF Energy",
        fuelType: "ELECTRIC",
        status: "LIVE",
        estimatedCommission: 6800,
        tpiPercent: 20,
        amountDue: 5440,
      },
    });
    await db.deal.create({
      data: {
        customerId: bakery.id,
        supplier: "Octopus Energy",
        fuelType: "ELECTRIC",
        status: "LIVE",
        estimatedCommission: 1800,
      },
    });

    const book = await loadPortalBook(harbour.id, db);
    assert.ok(book);
    assert.equal(book?.customer.companyName, "Harbour View Hotels Ltd");
    assert.equal(book?.meters.length, 1);
    assert.equal(book?.meters[0]?.siteName, "Marine Parade hotel");
    assert.equal(book?.contracts.length, 1);
    assert.equal(book?.contracts[0]?.supplier, "EDF Energy");
    assert.equal(book?.contracts.some((row) => row.supplier === "Octopus Energy"), false);
    assert.equal(portalPayloadIsSafe(book), true);
  });
});
