import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { leadMatchesSearch } from "../src/lib/book-filters";
import { pickEnterDestination } from "../src/lib/master-search";
import {
  CSV_DEAL_HEADERS,
  CSV_IMPORT_HEADERS,
  CSV_LEAD_HEADERS,
  isClosedLeadStage,
  LEAD_STAGES,
  OPEN_LEAD_STAGES,
} from "../src/lib/constants";
import { ensureLeadBoardStages, resolveLeadBoardStage } from "../src/lib/lead-board";
import { runImport } from "../src/app/actions/import";
import { runDealImport } from "../src/app/actions/import-deals";
import { runLeadImport } from "../src/app/actions/import-leads";
import { applyExistingDealToPreview, dealsCsvTemplate, validateDealRow } from "../src/lib/csv-deals";
import { commitImportRows } from "../src/lib/csv-import-commit";
import { csvTemplate, parseCsv, rowToRecord, validateImportRow } from "../src/lib/csv-import";
import { leadsCsvTemplate, validateLeadRow } from "../src/lib/csv-leads";
import { ensureRenewalReminderTasks } from "../src/lib/renewal-tasks";
import { liveDealOnSupply } from "../src/lib/deals";
import { findSupplyClash } from "../src/lib/supply";
import { withTestDb } from "./helpers/test-db";

test("import templates download with columns the importer accepts", () => {
  const meter = parseCsv(csvTemplate());
  assert.deepEqual(meter[0], [...CSV_IMPORT_HEADERS]);
  const meterRow = validateImportRow(rowToRecord(meter[0], meter[1]), 2);
  assert.deepEqual(meterRow.errors, []);
  assert.equal(meterRow.fuelType, "ELECTRIC");
  assert.equal(meterRow.mpan, "1234567890123");
  assert.equal(meterRow.siteName, "Stokes Croft");

  const deals = parseCsv(dealsCsvTemplate());
  assert.deepEqual(deals[0], [...CSV_DEAL_HEADERS]);
  const dealRow = validateDealRow(rowToRecord(deals[0], deals[1]), 2);
  assert.deepEqual(dealRow.errors, []);
  assert.equal(dealRow.supplier, "Octopus Energy");
  assert.equal(dealRow.mpan, "1234567890123");
  assert.equal(dealRow.net, 1800);
  assert.equal(dealRow.amountDue, 1800);
  assert.match(dealRow.tpiLabel ?? "", /None/);
  assert.match(dealRow.payoutLabel ?? "", /40 \/ 40 \/ 20/);

  const infinite = validateDealRow(
    {
      companyName: "Harbour View Hotels Ltd",
      email: "claire@harbour.test",
      supplier: "EDF Energy",
      fuelType: "ELECTRIC",
      status: "LIVE",
      contractStart: "2026-04-01",
      contractEnd: "2027-03-31",
      estimatedCommission: "£6,800",
      tpiPartner: "Infinite",
    },
    3,
  );
  assert.deepEqual(infinite.errors, []);
  assert.equal(infinite.net, 6800);
  assert.equal(infinite.amountDue, 6800);
  assert.match(infinite.tpiLabel ?? "", /Infinite · 20%/);
  assert.match(infinite.payoutLabel ?? "", /40 \/ 40 \/ 20/);

  const residualMissingDates = validateDealRow(
    {
      companyName: "Coastal Care Homes",
      email: "nisha@coastal.test",
      supplier: "British Gas",
      fuelType: "GAS",
      status: "LIVE",
      estimatedCommission: "3600",
      payoutType: "RESIDUAL",
    },
    4,
  );
  assert.ok(residualMissingDates.errors.some((error) => /CSD/.test(error) && /CED/.test(error)));

  const updatePreview = validateDealRow(
    {
      companyName: "Harbour View Hotels Ltd",
      email: "claire@harbour.test",
      supplier: "EDF Energy",
      fuelType: "ELECTRIC",
      status: "LIVE",
      contractStart: "2026-04-01",
      contractEnd: "2027-03-31",
    },
    5,
  );
  applyExistingDealToPreview(updatePreview, {
    estimatedCommission: 10000,
    tpiPartner: "JOOSE",
    tpiPercent: 25,
    payoutType: "SPLIT",
    residualMonthly: null,
    contractStart: new Date("2026-04-01T12:00:00.000Z"),
    contractEnd: new Date("2027-03-31T12:00:00.000Z"),
    dueDate: new Date("2026-04-01T12:00:00.000Z"),
    actualPaid: 0,
    payments: [
      { stage: "ON_SIGN", percent: 40, expectedDate: null, actualPaid: 0 },
      { stage: "ON_LIVE", percent: 60, expectedDate: null, actualPaid: 0 },
    ],
  });
  assert.equal(updatePreview.net, 10000);
  assert.deepEqual(updatePreview.payoutLabel, "40 / 60 / 0");
  assert.equal(updatePreview.amountDue, 10000);

  const leads = parseCsv(leadsCsvTemplate());
  assert.deepEqual(leads[0], [...CSV_LEAD_HEADERS]);
  const leadRow = validateLeadRow(rowToRecord(leads[0], leads[1]), 2);
  assert.deepEqual(leadRow.errors, []);
  assert.equal(leadRow.stage, "Sent For Tender");
  assert.ok(CSV_IMPORT_HEADERS.includes("renewalDate"));
  assert.ok(CSV_IMPORT_HEADERS.includes("objectionStatus"));
});

test("lead board columns match Monday Customer Board groups and import mapping", async () => {
  assert.deepEqual(
    LEAD_STAGES.map((item) => item.label),
    [
      "Potential Lead Joel",
      "Potential Lead Pauly",
      "Steve Madden Leads",
      "Potential Lead Rory",
      "Hot lead Joel",
      "Harry Accuradata Leads",
      "Hot Leads Rory",
      "Sent For Tender",
      "Tender Received",
      "Set Up Call Completed",
      "Proposal Sent",
      "Won",
      "Lost",
      "Follow up at a Later Date",
      "Rory Follow up",
      "Joel Follow Up",
    ],
  );
  assert.equal(LEAD_STAGES.length, 16);
  assert.equal(OPEN_LEAD_STAGES.includes("Won"), false);
  assert.equal(OPEN_LEAD_STAGES.includes("Lost"), false);
  assert.equal(isClosedLeadStage("Won"), true);
  assert.equal(isClosedLeadStage("Lost"), true);
  assert.equal(isClosedLeadStage("SOLD"), true);
  assert.equal(isClosedLeadStage("Hot lead Joel"), false);
  assert.equal(isClosedLeadStage("Harry Accuradata Leads"), false);

  assert.equal(resolveLeadBoardStage({ stage: "NEW", notes: null }), "Potential Lead Joel");
  assert.equal(resolveLeadBoardStage({ stage: "LOA_REQUESTED", notes: null }), "Sent For Tender");
  assert.equal(resolveLeadBoardStage({ stage: "TENDERING", notes: null }), "Sent For Tender");
  assert.equal(resolveLeadBoardStage({ stage: "QUOTED", notes: null }), "Proposal Sent");
  assert.equal(resolveLeadBoardStage({ stage: "SOLD", notes: null }), "Won");
  assert.equal(resolveLeadBoardStage({ stage: "LOST", notes: null }), "Lost");
  assert.equal(resolveLeadBoardStage({ stage: "CONTACTED", notes: null }), "Potential Lead Joel");
  assert.equal(
    resolveLeadBoardStage({ stage: "NEW", notes: "Monday group: Proposal Sent" }),
    "Proposal Sent",
  );
  assert.equal(
    resolveLeadBoardStage({ stage: "", notes: "Called.\nMonday group: Hot lead Joel" }),
    "Hot lead Joel",
  );

  const monday = validateLeadRow(
    {
      companyName: "Acme Bakery Ltd",
      email: "sam@acme-bakery.test",
      title: "Electric renewal",
      stage: "Proposal Sent",
      notes: "",
    },
    2,
  );
  assert.deepEqual(monday.errors, []);
  assert.equal(monday.stage, "Proposal Sent");

  const legacyNew = validateLeadRow(
    {
      companyName: "Acme Bakery Ltd",
      email: "sam@acme-bakery.test",
      title: "Gas enquiry",
      stage: "NEW",
      notes: "",
    },
    2,
  );
  assert.equal(legacyNew.stage, "Potential Lead Joel");

  const legacyLoa = validateLeadRow(
    {
      companyName: "Acme Bakery Ltd",
      email: "sam@acme-bakery.test",
      title: "LOA out",
      stage: "LOA_REQUESTED",
      notes: "",
    },
    2,
  );
  assert.equal(legacyLoa.stage, "Sent For Tender");

  const legacyQuoted = validateLeadRow(
    {
      companyName: "Acme Bakery Ltd",
      email: "sam@acme-bakery.test",
      title: "Quote pack",
      stage: "QUOTED",
      notes: "",
    },
    2,
  );
  assert.equal(legacyQuoted.stage, "Proposal Sent");

  const legacySold = validateLeadRow(
    {
      companyName: "Acme Bakery Ltd",
      email: "sam@acme-bakery.test",
      title: "Won site",
      stage: "SOLD",
      notes: "",
    },
    2,
  );
  assert.equal(legacySold.stage, "Won");

  const fromNotes = validateLeadRow(
    {
      companyName: "Acme Bakery Ltd",
      email: "sam@acme-bakery.test",
      title: "Quote pack",
      stage: "",
      notes: "Monday group: Proposal Sent",
    },
    2,
  );
  assert.deepEqual(fromNotes.errors, []);
  assert.equal(fromNotes.stage, "Proposal Sent");

  await withTestDb(async (db) => {
    const customer = await db.customer.create({
      data: {
        companyName: "Acme Bakery Ltd",
        contactName: "Sam Baker",
        email: "sam@acme-bakery.test",
      },
    });
    const lead = await db.lead.create({
      data: {
        customerId: customer.id,
        title: "Electric renewal",
        stage: "NEW",
        notes: "Monday group: Proposal Sent",
      },
    });
    const moved = await ensureLeadBoardStages(db);
    assert.ok(moved >= 1);
    const updated = await db.lead.findUnique({ where: { id: lead.id } });
    assert.equal(updated?.stage, "Proposal Sent");
  });
});

test("import actions return a visible preview from the sample templates", async () => {
  const empty = new FormData();
  empty.set("intent", "preview");
  const missing = await runImport({}, empty);
  assert.equal(missing.error, "Choose a CSV file.");
  assert.equal(missing.preview, undefined);

  const meters = new FormData();
  meters.set("csv", csvTemplate());
  meters.set("intent", "preview");
  const meterState = await runImport({}, meters);
  assert.equal(meterState.error, undefined);
  assert.ok(meterState.preview);
  assert.ok((meterState.preview?.rows.length ?? 0) >= 1);
  assert.equal(meterState.committed, undefined);

  const deals = new FormData();
  deals.set("csv", dealsCsvTemplate());
  deals.set("intent", "preview");
  const dealState = await runDealImport({}, deals);
  assert.equal(dealState.error, undefined);
  assert.ok(dealState.preview);
  assert.ok((dealState.preview?.rows.length ?? 0) >= 1);

  const leads = new FormData();
  leads.set("csv", leadsCsvTemplate());
  leads.set("intent", "preview");
  const leadState = await runLeadImport({}, leads);
  assert.equal(leadState.error, undefined);
  assert.ok(leadState.preview);
  assert.ok((leadState.preview?.rows.length ?? 0) >= 1);
});

test("CSV import source never deletes customers or meters", () => {
  const files = [
    path.join(import.meta.dirname, "../src/lib/csv-import-commit.ts"),
    path.join(import.meta.dirname, "../src/app/actions/import.ts"),
    path.join(import.meta.dirname, "../src/app/actions/import-leads.ts"),
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

test("renewal reminder tasks skip archived customers", async () => {
  await withTestDb(async (db) => {
    const live = await db.customer.create({
      data: {
        companyName: "Live Book Ltd",
        contactName: "Ann Live",
        email: "ann@live-book.co.uk",
      },
    });
    const archived = await db.customer.create({
      data: {
        companyName: "Archived Hall",
        contactName: "Pat Archive",
        email: "pat@archived-hall.co.uk",
        archivedAt: new Date(),
      },
    });
    const soon = new Date();
    soon.setDate(soon.getDate() + 20);
    await db.meter.create({
      data: {
        customerId: live.id,
        siteName: "High Street",
        fuelType: "ELECTRIC",
        mpan: "1234567890123",
        renewalDate: soon,
      },
    });
    await db.meter.create({
      data: {
        customerId: archived.id,
        siteName: "Old hall",
        fuelType: "ELECTRIC",
        mpan: "1234567890456",
        renewalDate: soon,
      },
    });

    const created = await ensureRenewalReminderTasks(db);
    assert.equal(created, 1);
    assert.equal(await db.task.count({ where: { customerId: live.id } }), 1);
    assert.equal(await db.task.count({ where: { customerId: archived.id } }), 0);
  });
});

test("leads board search matches company, contact and MPAN", () => {
  const lead = {
    title: "Harbour electric renewal",
    notes: null,
    customer: {
      companyName: "Harbour View Hotels Ltd",
      tradingName: null,
      contactName: "Claire Debenham",
      email: "claire@harbour.test",
      meters: [{ mpan: "002160013300112233445", mprn: null, siteName: "Marine Parade" }],
    },
    allocations: [{ agent: { name: "Priya Shah" } }],
  };
  assert.equal(leadMatchesSearch(lead, ""), true);
  assert.equal(leadMatchesSearch(lead, "harbour"), true);
  assert.equal(leadMatchesSearch(lead, "Claire"), true);
  assert.equal(leadMatchesSearch(lead, "002160013300"), true);
  assert.equal(leadMatchesSearch(lead, "bakery"), false);
});

test("header search Enter opens the best match, or the results page", () => {
  const customer = {
    id: "c1",
    type: "customer" as const,
    title: "Harbour View Hotels Ltd",
    subtitle: "Claire Debenham · claire@harbour.test",
    href: "/customers/c1",
  };
  const lead = {
    id: "l1",
    type: "lead" as const,
    title: "Hotel group 2026 renewal",
    subtitle: "Harbour View Hotels Ltd · TENDERING",
    href: "/leads/l1",
  };
  const meter = {
    id: "m1",
    type: "meter" as const,
    title: "MPAN 00 216 001 3300 112 233 445",
    subtitle: "Harbour View Hotels Ltd · Marine Parade",
    href: "/customers/c1",
  };
  const book = { customers: [customer], meters: [meter], leads: [lead], deals: [] };

  assert.deepEqual(pickEnterDestination({ customers: [], meters: [], leads: [], deals: [] }, "xx", "/"), {
    none: true,
  });
  const href = (result: ReturnType<typeof pickEnterDestination>) =>
    "href" in result ? result.href : "";
  assert.equal(href(pickEnterDestination({ ...book, meters: [], leads: [] }, "Harbour", "/")), "/customers/c1");
  assert.equal(href(pickEnterDestination(book, "Harbour View", "/")), "/customers/c1");
  assert.equal(href(pickEnterDestination(book, "Hotel group", "/leads")), "/leads/l1");
  assert.equal(href(pickEnterDestination(book, "Hotel group", "/")), "/leads/l1");

  const oak = {
    customers: [
      { ...customer, id: "o1", title: "Oak Lodge", href: "/customers/o1" },
      { ...customer, id: "o2", title: "Oak Hall", href: "/customers/o2" },
    ],
    meters: [],
    leads: [],
    deals: [],
  };
  assert.deepEqual(pickEnterDestination(oak, "Oak", "/"), { resultsPage: true });
});
