import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { isDocusignConfigured, parseDocusignWebhook, type DocusignClient } from "../src/lib/docusign";
import { buildLoaDocument, loaTabValues } from "../src/lib/loa-document";
import { completeLoaEnvelope, sendCustomerLoa } from "../src/lib/loa-send";
import {
  buildTpiLoaDocument,
  formatLoaDotDate,
  generateTpiLoa,
  parseTpiLoaKind,
  tpiLoaKindFromDeals,
  tpiLoaKindFromPartner,
  tpiLoaTemplateLabel,
} from "../src/lib/tpi-loa";
import { buildTestLoaDocx, xmlFromDocx } from "./helpers/loa-docx";
import { withTestDb } from "./helpers/test-db";

const acme = {
  companyName: "Acme Bakery Ltd",
  tradingName: "Acme Bakes",
  contactName: "Sam Baker",
  email: "sam@acme-bakery.test",
  phone: "0117 000 0000",
  addressLine1: "1 High Street",
  city: "Bristol",
  postcode: "BS1 1AA",
};

const meters = [
  {
    siteName: "Shop floor",
    siteAddress: "1 High Street, Bristol BS1 1AA",
    fuelType: "ELECTRIC",
    mpan: "1234567890123",
    mprn: null,
  },
  {
    siteName: "Kitchen",
    siteAddress: "1 High Street, Bristol BS1 1AA",
    fuelType: "GAS",
    mpan: null,
    mprn: "1234567890",
  },
];

test("LOA document fills legal name, contact and two supplies", () => {
  const document = buildLoaDocument(acme, meters);
  assert.equal(document.legalName, "Acme Bakery Ltd");
  assert.equal(document.tradingName, "Acme Bakes");
  assert.equal(document.contactName, "Sam Baker");
  assert.equal(document.email, "sam@acme-bakery.test");
  assert.equal(document.phone, "0117 000 0000");
  assert.equal(document.supplies.length, 2);
  assert.match(document.supplies[0]?.mpan ?? "", /1234567890123|12 345 678 90123/);
  assert.equal(document.supplies[1]?.mprn, "1234567890");
  assert.match(document.html, /Acme Bakery Ltd/);
  assert.match(document.html, /Shop floor/);
  assert.match(document.html, /Kitchen/);
  assert.match(document.html, /NZC Energy/);
  assert.match(document.pdf.toString("latin1"), /^%PDF-1.4/);
  assert.match(document.pdf.toString("latin1"), /Acme Bakery Ltd/);
  assert.match(document.pdf.toString("latin1"), /12 345 678 90123/);
  assert.match(document.pdf.toString("latin1"), /1234567890/);
  const tabs = loaTabValues(document);
  assert.equal(tabs.legal_name, "Acme Bakery Ltd");
  assert.match(tabs.supplies, /Shop floor/);
  assert.match(tabs.supplies, /Kitchen/);
});

test("Send LOA without DocuSign env generates a PDF and sets REQUESTED", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({
      data: {
        ...acme,
        meters: {
          create: meters.map((meter) => ({
            siteName: meter.siteName,
            siteAddress: meter.siteAddress,
            fuelType: meter.fuelType,
            mpan: meter.mpan,
            mprn: meter.mprn,
          })),
        },
      },
      include: { meters: true },
    });

    const result = await sendCustomerLoa({
      customerId: customer.id,
      db,
      docusign: null,
      env: { ...process.env, DOCUSIGN_TEMPLATE_ID: "", DOCUSIGN_ACCOUNT_ID: "", DOCUSIGN_ACCESS_TOKEN: "" },
    });

    assert.equal(result.error, undefined);
    assert.equal(result.channel, "DOWNLOAD");
    assert.equal(result.connected, false);
    assert.equal(result.envelopeId, null);
    assert.ok(result.pdfFileName?.endsWith(".pdf"));

    const updated = await db.meter.findMany({ where: { customerId: customer.id } });
    assert.equal(updated.length, 2);
    assert.ok(updated.every((meter) => meter.loaStatus === "REQUESTED"));

    const envelope = await db.loaEnvelope.findFirst({ where: { customerId: customer.id } });
    assert.ok(envelope);
    assert.equal(envelope?.channel, "DOWNLOAD");
    assert.equal(envelope?.status, "SENT");
    assert.ok(envelope?.pdfStoredName);
  });
});

test("Send LOA with a mocked DocuSign client stores the envelope and sig link", async () => {
  const mock: DocusignClient = {
    async createLoaEnvelope() {
      return { envelopeId: "env-acme-1", sigLink: "https://example.test/sign/acme" };
    },
    async getEnvelopeStatus() {
      return "sent";
    },
  };

  await withTestDb(async (db) => {
    const customer = await db.customer.create({
      data: {
        ...acme,
        meters: {
          create: [
            { siteName: "Shop floor", fuelType: "ELECTRIC", mpan: "1234567890123" },
            { siteName: "Kitchen", fuelType: "GAS", mprn: "1234567890" },
          ],
        },
      },
    });

    const result = await sendCustomerLoa({
      customerId: customer.id,
      db,
      docusign: mock,
    });

    assert.equal(result.error, undefined);
    assert.equal(result.channel, "DOCUSIGN");
    assert.equal(result.envelopeId, "env-acme-1");
    assert.equal(result.sigLink, "https://example.test/sign/acme");

    const envelope = await db.loaEnvelope.findFirst({ where: { customerId: customer.id } });
    assert.equal(envelope?.envelopeId, "env-acme-1");
    assert.equal(envelope?.sigLink, "https://example.test/sign/acme");
    assert.equal(envelope?.status, "SENT");

    const completed = await completeLoaEnvelope("env-acme-1", "completed", db);
    assert.equal(completed.status, "COMPLETED");
    const metersAfter = await db.meter.findMany({ where: { customerId: customer.id } });
    assert.ok(metersAfter.every((meter) => meter.loaStatus === "RECEIVED"));
    assert.ok(metersAfter.every((meter) => meter.loaSignedBy === "Sam Baker"));
  });
});

test("IE LOA fills Acme Bakery placeholders in the Word template", () => {
  const now = new Date(2026, 7, 17);
  const template = buildTestLoaDocx({ splitCompany: true });
  const document = buildTpiLoaDocument({ ...acme, position: "Buyer" }, "IE", template, now);
  assert.equal(document.kind, "IE");
  assert.equal(document.templateLabel, "IE LOA");
  assert.equal(document.companyName, "Acme Bakery Ltd");
  assert.equal(document.tradingName, "Acme Bakes");
  assert.equal(document.town, "Bristol");
  assert.equal(document.country, "");
  assert.equal(document.companyNumber, "");
  assert.equal(document.position, "Buyer");
  assert.equal(document.loaDate, "17.08.2026");
  assert.equal(formatLoaDotDate(now), "17.08.2026");
  assert.equal(document.fileName, "IE-LOA-Acme-Bakery-Ltd.docx");
  assert.match(document.docx.toString("latin1"), /^PK/);
  const xml = xmlFromDocx(document.docx);
  assert.match(xml, /Acme Bakery Ltd/);
  assert.match(xml, /Acme Bakes/);
  assert.match(xml, /1 High Street/);
  assert.match(xml, /Bristol/);
  assert.match(xml, /BS1 1AA/);
  assert.match(xml, /17\.08\.2026/);
  assert.match(xml, /Sam Baker/);
  assert.match(xml, /Buyer/);
  assert.match(xml, /0117 000 0000/);
  assert.match(xml, /sam@acme-bakery\.test/);
  assert.match(xml, /w:val="1F497D"/);
  assert.doesNotMatch(xml, /\{\{companyName\}\}/);
  const header = xmlFromDocx(document.docx, "word/header1.xml");
  assert.match(header, /0117 000 0000/);
  assert.match(header, /w:val="1F497D"/);
});

test("SOFT_LOA leaves position blank and does not invent Director", () => {
  const document = buildTpiLoaDocument(acme, "JOOSE", buildTestLoaDocx(), new Date(2026, 7, 17));
  assert.equal(document.templateLabel, "SOFT_LOA");
  assert.equal(document.position, "");
  assert.equal(document.fileName, "SOFT_LOA-Acme-Bakery-Ltd.docx");
  const xml = xmlFromDocx(document.docx);
  assert.match(xml, /Acme Bakery Ltd/);
  assert.doesNotMatch(xml, /Director/);
  assert.doesNotMatch(xml, /\{\{position\}\}/);
});

test("TPI partner picks IE LOA or SOFT_LOA, otherwise the user chooses", () => {
  assert.equal(tpiLoaKindFromPartner("INFINITE"), "IE");
  assert.equal(tpiLoaKindFromPartner("JOOSE"), "JOOSE");
  assert.equal(tpiLoaKindFromPartner("JOOSE_UCR"), "JOOSE");
  assert.equal(parseTpiLoaKind("SOFT_LOA"), "JOOSE");
  assert.equal(tpiLoaTemplateLabel("IE"), "IE LOA");
  assert.equal(tpiLoaTemplateLabel("JOOSE"), "SOFT_LOA");
  assert.equal(tpiLoaKindFromPartner("NONE"), null);
  assert.equal(tpiLoaKindFromPartner("TUS"), null);
  assert.equal(tpiLoaKindFromDeals([{ tpiPartner: "NONE" }, { tpiPartner: "INFINITE" }]), "IE");
  assert.equal(
    tpiLoaKindFromDeals([
      { tpiPartner: "JOOSE", updatedAt: new Date("2026-08-01") },
      { tpiPartner: "INFINITE", updatedAt: new Date("2026-07-01") },
    ]),
    "JOOSE",
  );
  const ui = readFileSync(path.join(import.meta.dirname, "../src/components/generate-loa.tsx"), "utf8");
  assert.match(ui, /Generate IE LOA/);
  assert.match(ui, /Generate SOFT_LOA/);
  assert.equal(ui.includes("IE LOA (Infinite)"), false);
  assert.equal(ui.includes("Generate Joose LOA"), false);
});

test("Generate LOA marks meters REQUESTED and does not need DocuSign", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({
      data: {
        ...acme,
        meters: {
          create: [{ siteName: "Shop floor", fuelType: "ELECTRIC", mpan: "1234567890123" }],
        },
        deals: {
          create: {
            supplier: "Example Energy",
            fuelType: "ELECTRIC",
            tpiPartner: "INFINITE",
            tpiPercent: 20,
          },
        },
      },
    });

    const result = await generateTpiLoa({
      customerId: customer.id,
      db,
      template: buildTestLoaDocx(),
    });
    assert.equal(result.error, undefined);
    assert.equal(result.kind, "IE");
    assert.equal(result.document?.companyName, "Acme Bakery Ltd");
    assert.match(xmlFromDocx(result.document?.docx ?? Buffer.alloc(0)), /Acme Bakery Ltd/);

    const meters = await db.meter.findMany({ where: { customerId: customer.id } });
    assert.ok(meters.every((meter) => meter.loaStatus === "REQUESTED"));
  });
});

test("Generate LOA fills jobTitle as position and works with no meters", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({ data: acme });
    const lead = await db.lead.create({
      data: {
        customerId: customer.id,
        title: "Electric renewal",
        jobTitle: "Site manager",
      },
    });
    const result = await generateTpiLoa({
      customerId: customer.id,
      leadId: lead.id,
      kind: "JOOSE",
      db,
      template: buildTestLoaDocx(),
    });
    assert.equal(result.error, undefined);
    assert.equal(result.kind, "JOOSE");
    assert.equal(result.document?.position, "Site manager");
    assert.equal(result.document?.addressLine1, "");
    assert.equal(result.document?.town, "");
    assert.equal(result.document?.postcode, "");
    assert.equal(result.document?.country, "");
    const xml = xmlFromDocx(result.document?.docx ?? Buffer.alloc(0));
    assert.match(xml, /Site manager/);
    assert.doesNotMatch(xml, /Director/);
    assert.doesNotMatch(xml, /1 High Street/);
    assert.doesNotMatch(xml, /Bristol/);
    assert.doesNotMatch(xml, /United Kingdom/);
  });
});

test("Generate LOA fills lead address lines and leaves blanks empty", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({ data: acme });
    const lead = await db.lead.create({
      data: {
        customerId: customer.id,
        title: "Electric renewal",
        jobTitle: "Buyer",
        addressLine1: "12 Baker Street",
        town: "Bath",
        postcode: "BA1 1AA",
      },
    });
    const result = await generateTpiLoa({
      customerId: customer.id,
      leadId: lead.id,
      kind: "IE",
      db,
      template: buildTestLoaDocx(),
    });
    assert.equal(result.error, undefined);
    assert.equal(result.document?.position, "Buyer");
    assert.equal(result.document?.addressLine1, "12 Baker Street");
    assert.equal(result.document?.town, "Bath");
    assert.equal(result.document?.postcode, "BA1 1AA");
    assert.equal(result.document?.country, "");
    const xml = xmlFromDocx(result.document?.docx ?? Buffer.alloc(0));
    assert.match(xml, /12 Baker Street/);
    assert.match(xml, /Bath/);
    assert.match(xml, /BA1 1AA/);
    assert.doesNotMatch(xml, /1 High Street/);
    assert.doesNotMatch(xml, /Bristol/);
    assert.doesNotMatch(xml, /United Kingdom/);
    assert.doesNotMatch(xml, /Director/);
  });
});

test("Generate LOA without a Word file says the template is not on the desk", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({ data: acme });
    const result = await generateTpiLoa({
      customerId: customer.id,
      kind: "IE",
      db,
      templatesRoot: "/tmp/nzce-no-loa-templates",
    });
    assert.match(result.error ?? "", /IE LOA Word template is not on the desk yet/);
  });
});

test("DocuSign is not configured without template and account env", () => {
  assert.equal(
    isDocusignConfigured({
      DOCUSIGN_TEMPLATE_ID: "",
      DOCUSIGN_ACCOUNT_ID: "",
      DOCUSIGN_ACCESS_TOKEN: "",
    }),
    false,
  );
  assert.equal(
    isDocusignConfigured({
      DOCUSIGN_TEMPLATE_ID: "tmpl-1",
      DOCUSIGN_ACCOUNT_ID: "acc-1",
      DOCUSIGN_ACCESS_TOKEN: "token",
    }),
    true,
  );
  const event = parseDocusignWebhook({
    event: "envelope-completed",
    data: { envelopeId: "env-acme-1", envelopeSummary: { status: "completed" } },
  });
  assert.deepEqual(event, { envelopeId: "env-acme-1", status: "completed" });
});
