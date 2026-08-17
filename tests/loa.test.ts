import assert from "node:assert/strict";
import { test } from "node:test";
import { isDocusignConfigured, parseDocusignWebhook, type DocusignClient } from "../src/lib/docusign";
import { buildLoaDocument, loaTabValues } from "../src/lib/loa-document";
import { completeLoaEnvelope, sendCustomerLoa } from "../src/lib/loa-send";
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
