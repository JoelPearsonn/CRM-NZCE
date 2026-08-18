import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "path";
import { test } from "node:test";
import { GET as exportCustomers } from "../src/app/api/export/customers/route";
import { handleDocusignWebhook } from "../src/app/api/docusign/webhook/route";
import { handleLoaDocumentDownload } from "../src/app/api/loa/documents/[id]/route";
import { handleRecordingDownload } from "../src/app/api/recordings/[id]/route";
import { csvTemplate } from "../src/lib/csv-import";
import { previewMeterImport } from "../src/lib/csv-import-preview";
import { dealRefsBelongToCustomer } from "../src/lib/deals";
import {
  createStaffSessionToken,
  isProtectedStaffApiPath,
  planWorkingAsCookie,
  STAFF_COOKIE,
  STAFF_SESSION_MAX_AGE,
  staffSessionCookieOptions,
  verifyStaffSessionToken,
  workingAsCookieMaxAge,
} from "../src/lib/staff-auth";
import { withTestDb } from "./helpers/test-db";

function staffEnv(overrides: Record<string, string> = {}) {
  return {
    CRM_STAFF_PASSWORD: "desk-lock-test",
    CRM_SESSION_SECRET: "session-secret-test",
    ...overrides,
  };
}

function staffRequest(url: string, token?: string | null) {
  const headers = new Headers();
  if (token) headers.set("cookie", `${STAFF_COOKIE}=${token}`);
  return new Request(url, { headers });
}

test("unauthenticated customer export is 401, including when the staff password is unset", async () => {
  const closed = await exportCustomers(new Request("http://localhost/api/export/customers"));
  assert.equal(closed.status, 401);

  const env = staffEnv();
  const token = createStaffSessionToken(Date.now(), env);
  assert.ok(token);
  const authed = verifyStaffSessionToken(token, Date.now(), env);
  assert.equal(authed, true);
  assert.equal(verifyStaffSessionToken(token, Date.now(), { CRM_STAFF_PASSWORD: "" }), false);
});

test("recordings download requires a staff session and a known customer record", async () => {
  const env = { ...process.env, ...staffEnv() };
  const previousPassword = process.env.CRM_STAFF_PASSWORD;
  const previousSecret = process.env.CRM_SESSION_SECRET;
  process.env.CRM_STAFF_PASSWORD = env.CRM_STAFF_PASSWORD;
  process.env.CRM_SESSION_SECRET = env.CRM_SESSION_SECRET;
  try {
    const unauth = await handleRecordingDownload(
      staffRequest("http://localhost/api/recordings/rec-1"),
      "rec-1",
      {
        findRecording: async () => ({
          fileName: "call.txt",
          storedName: "call.txt",
          mimeType: "text/plain",
          customer: { id: "c1" },
        }),
        readFile: async () => Buffer.from("hello"),
      },
    );
    assert.equal(unauth.status, 401);

    const token = createStaffSessionToken();
    assert.ok(token);
    const missing = await handleRecordingDownload(
      staffRequest("http://localhost/api/recordings/no-such", token),
      "no-such",
      {
        findRecording: async () => null,
        readFile: async () => Buffer.from("hello"),
      },
    );
    assert.equal(missing.status, 404);

    const orphan = await handleRecordingDownload(
      staffRequest("http://localhost/api/recordings/orphan", token),
      "orphan",
      {
        findRecording: async () => ({
          fileName: "call.txt",
          storedName: "call.txt",
          mimeType: "text/plain",
          customer: null,
        }),
        readFile: async () => Buffer.from("hello"),
      },
    );
    assert.equal(orphan.status, 404);
  } finally {
    if (previousPassword === undefined) delete process.env.CRM_STAFF_PASSWORD;
    else process.env.CRM_STAFF_PASSWORD = previousPassword;
    if (previousSecret === undefined) delete process.env.CRM_SESSION_SECRET;
    else process.env.CRM_SESSION_SECRET = previousSecret;
  }
});

test("LOA document download requires a staff session and a known customer", async () => {
  const previousPassword = process.env.CRM_STAFF_PASSWORD;
  const previousSecret = process.env.CRM_SESSION_SECRET;
  process.env.CRM_STAFF_PASSWORD = "desk-lock-test";
  process.env.CRM_SESSION_SECRET = "session-secret-test";
  try {
    const unauth = await handleLoaDocumentDownload(
      staffRequest("http://localhost/api/loa/documents/loa-1"),
      "loa-1",
      {
        findDocument: async () => ({
          fileName: "loa.pdf",
          storedName: "loa.pdf",
          mimeType: "application/pdf",
          customer: { id: "c1" },
        }),
        readFile: async () => Buffer.from("%PDF"),
      },
    );
    assert.equal(unauth.status, 401);

    const token = createStaffSessionToken();
    assert.ok(token);
    const missing = await handleLoaDocumentDownload(
      staffRequest("http://localhost/api/loa/documents/no-such", token),
      "no-such",
      {
        findDocument: async () => null,
        readFile: async () => Buffer.from("%PDF"),
      },
    );
    assert.equal(missing.status, 404);
  } finally {
    if (previousPassword === undefined) delete process.env.CRM_STAFF_PASSWORD;
    else process.env.CRM_STAFF_PASSWORD = previousPassword;
    if (previousSecret === undefined) delete process.env.CRM_SESSION_SECRET;
    else process.env.CRM_SESSION_SECRET = previousSecret;
  }
});

test("DocuSign webhook rejects a missing secret and a forged signature", async () => {
  const previous = process.env.DOCUSIGN_WEBHOOK_SECRET;
  const body = JSON.stringify({ envelopeId: "env-test", status: "completed" });
  const complete = async () => ({ envelopeRecordId: "ok" });
  delete process.env.DOCUSIGN_WEBHOOK_SECRET;
  const closed = await handleDocusignWebhook(
    new Request("http://localhost/api/docusign/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-docusign-signature-1": "anything" },
      body,
    }),
    complete,
  );
  assert.equal(closed.status, 401);

  process.env.DOCUSIGN_WEBHOOK_SECRET = "connect-hmac-test";
  const forged = await handleDocusignWebhook(
    new Request("http://localhost/api/docusign/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-docusign-signature-1": "forged-signature" },
      body,
    }),
    complete,
  );
  assert.equal(forged.status, 401);

  const signature = createHmac("sha256", "connect-hmac-test").update(body).digest("base64");
  const valid = await handleDocusignWebhook(
    new Request("http://localhost/api/docusign/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-docusign-signature-1": signature },
      body,
    }),
    complete,
  );
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { envelopeRecordId: "ok" });

  if (previous === undefined) delete process.env.DOCUSIGN_WEBHOOK_SECRET;
  else process.env.DOCUSIGN_WEBHOOK_SECRET = previous;
});

test("deal meter and lead IDs must belong to the selected customer", async () => {
  await withTestDb(async (db) => {
    const customer = await db.customer.create({
      data: { companyName: "North Desk Ltd", contactName: "Ada", email: "ada@north-desk.test" },
    });
    const other = await db.customer.create({
      data: { companyName: "South Desk Ltd", contactName: "Ben", email: "ben@south-desk.test" },
    });
    const meter = await db.meter.create({
      data: { customerId: other.id, siteName: "Yard", fuelType: "ELECTRIC", mpan: "1234567890123" },
    });
    const lead = await db.lead.create({
      data: { customerId: other.id, title: "Gas enquiry" },
    });

    const meterMismatch = await dealRefsBelongToCustomer(db, {
      customerId: customer.id,
      meterId: meter.id,
    });
    assert.equal(meterMismatch.ok, false);

    const leadMismatch = await dealRefsBelongToCustomer(db, {
      customerId: customer.id,
      leadId: lead.id,
    });
    assert.equal(leadMismatch.ok, false);

    const ownMeter = await db.meter.create({
      data: { customerId: customer.id, siteName: "Office", fuelType: "ELECTRIC", mpan: "1234567890456" },
    });
    const ok = await dealRefsBelongToCustomer(db, {
      customerId: customer.id,
      meterId: ownMeter.id,
    });
    assert.equal(ok.ok, true);
  });
});

test("import preview labels a new customer’s first row CREATE_CUSTOMER", async () => {
  await withTestDb(async (db) => {
    const first = await previewMeterImport(db, csvTemplate());
    assert.equal(first.preview?.rows[0]?.action, "CREATE_CUSTOMER");
    assert.equal(first.preview?.createCustomers, 1);

    const twoSites = `${csvTemplate().trim()}\n${[
      "Example Bakery Ltd",
      "",
      "Samira Khan",
      "samira@example-bakery.co.uk",
      "0117 555 0000",
      "Food",
      "1 High Street",
      "Bristol",
      "BS1 1AA",
      "Second site",
      "2 High Street",
      "ELECTRIC",
      "1234567890999",
      "",
      "10000",
      "",
      "Octopus Energy",
      "NHH",
      "NOT_REQUESTED",
      "",
      "2026-04-01",
      "2027-03-31",
      "2027-03-31",
      "",
      "",
      "NONE",
      "",
    ].join(",")}\n`;
    const preview = await previewMeterImport(db, twoSites);
    assert.equal(preview.preview?.rows[0]?.action, "CREATE_CUSTOMER");
    assert.equal(preview.preview?.rows[1]?.action, "CREATE_METER");
    assert.equal(preview.preview?.createCustomers, 1);
    assert.equal(preview.preview?.createMeters, 2);
  });
});

test("setWorkingAs cannot mint a year-long arbitrary cookie without a staff session", () => {
  const denied = planWorkingAsCookie({
    hasStaffSession: false,
    agentId: "agent-anyone",
    agentExists: true,
  });
  assert.equal(denied.action, "deny");
  assert.equal(denied.maxAge, undefined);

  const unknown = planWorkingAsCookie({
    hasStaffSession: true,
    agentId: "not-a-real-agent",
    agentExists: false,
  });
  assert.equal(unknown.action, "deny");

  const allowed = planWorkingAsCookie({
    hasStaffSession: true,
    agentId: "agent-1",
    agentExists: true,
  });
  assert.equal(allowed.action, "set");
  assert.equal(allowed.maxAge, 12 * 60 * 60);
  assert.ok((allowed.maxAge ?? 0) < 60 * 60 * 24);
  assert.equal(workingAsCookieMaxAge(), STAFF_SESSION_MAX_AGE);
  assert.notEqual(workingAsCookieMaxAge(), 60 * 60 * 24 * 365);
  assert.equal(staffSessionCookieOptions().maxAge, 12 * 60 * 60);
  assert.equal(staffSessionCookieOptions().httpOnly, true);
  assert.equal(staffSessionCookieOptions().secure, true);
  assert.equal(staffSessionCookieOptions().sameSite, "lax");
});

test("staff API matcher locks exports and downloads, not the portal or webhook", () => {
  assert.equal(isProtectedStaffApiPath("/api/export/customers"), true);
  assert.equal(isProtectedStaffApiPath("/api/recordings/abc"), true);
  assert.equal(isProtectedStaffApiPath("/api/loa/documents/abc"), true);
  assert.equal(isProtectedStaffApiPath("/api/search"), true);
  assert.equal(isProtectedStaffApiPath("/api/docusign/webhook"), false);
  assert.equal(isProtectedStaffApiPath("/api/portal/me"), false);
  assert.equal(isProtectedStaffApiPath("/customers"), false);
});

test("source no longer embeds portal passwords or tokens", () => {
  const files = [
    "src/lib/portal-constants.ts",
    "src/lib/portal-seed.ts",
    "src/app/portal/login/page.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(path.join(import.meta.dirname, "..", file), "utf8");
    assert.equal(source.includes("harbour-view"), false, file);
    assert.equal(source.includes("harbour-portal"), false, file);
    assert.equal(source.includes("bakery-view"), false, file);
    assert.equal(source.includes("bakery-portal"), false, file);
    assert.equal(source.includes("claire.debenham@"), false, file);
  }
});
