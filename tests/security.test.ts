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
import { hashPassword } from "../src/lib/portal-crypto";
import { authenticateStaff } from "../src/lib/staff-accounts";
import {
  createStaffSessionToken,
  isNceWorkEmail,
  isProtectedStaffApiPath,
  parseStaffPasswordHashes,
  planWorkingAsCookie,
  STAFF_COOKIE,
  STAFF_SESSION_MAX_AGE,
  staffPasswordHashFor,
  staffSessionCookieOptions,
  verifyStaffSessionToken,
  workingAsCookieMaxAge,
} from "../src/lib/staff-auth";
import { withTestDb } from "./helpers/test-db";

/** Test-only addresses. Not real colleagues. */
const TEST_STAFF_A = "staff.a@nzcenergy.co.uk";
const TEST_STAFF_B = "staff.b@nzcenergy.co.uk";
const JOEL_EMAIL = "joel.pearson@nzcenergy.co.uk";

function staffEnv(overrides: Record<string, string> = {}) {
  return {
    CRM_SESSION_SECRET: "session-secret-test",
    ...overrides,
  };
}

function staffRequest(url: string, token?: string | null) {
  const headers = new Headers();
  if (token) headers.set("cookie", `${STAFF_COOKIE}=${token}`);
  return new Request(url, { headers });
}

test("unauthenticated customer export is 401, including when no staff secret is set", async () => {
  const closed = await exportCustomers(new Request("http://localhost/api/export/customers"));
  assert.equal(closed.status, 401);

  const env = staffEnv();
  assert.equal(createStaffSessionToken("agent-a", Date.now(), env), null);
  const token = createStaffSessionToken(TEST_STAFF_A, Date.now(), env);
  assert.ok(token);
  assert.equal(verifyStaffSessionToken(token, Date.now(), env)?.email, TEST_STAFF_A);
  assert.equal(verifyStaffSessionToken(token, Date.now(), {}), null);
});

test("user A’s session cannot be used as user B, and an unknown person cannot sign in", async () => {
  const env = staffEnv();
  const tokenA = createStaffSessionToken(TEST_STAFF_A, Date.now(), env);
  const tokenB = createStaffSessionToken(TEST_STAFF_B, Date.now(), env);
  assert.ok(tokenA);
  assert.ok(tokenB);
  assert.equal(verifyStaffSessionToken(tokenA, Date.now(), env)?.email, TEST_STAFF_A);
  assert.notEqual(verifyStaffSessionToken(tokenA, Date.now(), env)?.email, TEST_STAFF_B);
  assert.equal(verifyStaffSessionToken(tokenB, Date.now(), env)?.email, TEST_STAFF_B);

  await withTestDb(async (db) => {
    const joelHash = hashPassword("joel-local-test");
    await db.agent.create({
      data: {
        name: "Joel Pearson",
        email: JOEL_EMAIL,
        role: "Admin",
        passwordHash: joelHash,
      },
    });
    await db.agent.create({
      data: { name: "Priya Shah", email: "priya.shah@nzce.co.uk", role: "Sales" },
    });

    const unknown = await authenticateStaff(
      { email: "nobody@not-on-the-desk.test", password: "anything-long" },
      db,
      env,
    );
    assert.equal("error" in unknown, true);

    const seedDomain = await authenticateStaff(
      { email: "priya.shah@nzce.co.uk", password: "anything-long" },
      db,
      env,
    );
    assert.equal("error" in seedDomain, true);

    const byName = await authenticateStaff(
      { email: "Joel Pearson", password: "joel-local-test" },
      db,
      env,
    );
    assert.equal("error" in byName, true);

    const joelOk = await authenticateStaff(
      { email: JOEL_EMAIL, password: "joel-local-test" },
      db,
      env,
    );
    assert.ok("ok" in joelOk && joelOk.ok);
    assert.equal(joelOk.agent.email, JOEL_EMAIL);

    const wrong = await authenticateStaff(
      { email: JOEL_EMAIL, password: "not-joel" },
      db,
      env,
    );
    assert.equal("error" in wrong, true);

    const seedBootstrapHash = hashPassword("priya-bootstrap-test");
    const seedBootstrapped = await authenticateStaff(
      { email: "priya.shah@nzce.co.uk", password: "priya-bootstrap-test" },
      db,
      { ...env, CRM_STAFF_PASSWORDS: `priya.shah@nzce.co.uk=${seedBootstrapHash}` },
    );
    assert.equal("error" in seedBootstrapped, true);

    const unknownWorkEmail = await authenticateStaff(
      { email: TEST_STAFF_A, password: "anything-long" },
      db,
      env,
    );
    assert.equal("error" in unknownWorkEmail, true);

    await db.agent.create({
      data: { name: "Test Staff A", email: TEST_STAFF_A, role: "Sales" },
    });
    const noHash = await authenticateStaff(
      { email: TEST_STAFF_A, password: "anything-long" },
      db,
      env,
    );
    assert.equal("error" in noHash, true);

    const envHash = hashPassword("staff-a-env-test");
    const envLogin = await authenticateStaff(
      { email: TEST_STAFF_A, password: "staff-a-env-test" },
      db,
      { ...env, CRM_STAFF_PASSWORDS: `${TEST_STAFF_A}=${envHash}` },
    );
    assert.ok("ok" in envLogin && envLogin.ok);
    assert.equal(envLogin.agent.email, TEST_STAFF_A);
  });
});

test("recordings download requires a staff session and a known customer record", async () => {
  const previousSecret = process.env.CRM_SESSION_SECRET;
  process.env.CRM_SESSION_SECRET = "session-secret-test";
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

    const token = createStaffSessionToken(TEST_STAFF_A);
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
    if (previousSecret === undefined) delete process.env.CRM_SESSION_SECRET;
    else process.env.CRM_SESSION_SECRET = previousSecret;
  }
});

test("LOA document download requires a staff session and a known customer", async () => {
  const previousSecret = process.env.CRM_SESSION_SECRET;
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

    const token = createStaffSessionToken(TEST_STAFF_A);
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
    actorAgentId: null,
    actorIsAdmin: false,
    agentId: "agent-anyone",
    agentExists: true,
  });
  assert.equal(denied.action, "deny");
  assert.equal(denied.maxAge, undefined);

  const otherPerson = planWorkingAsCookie({
    hasStaffSession: true,
    actorAgentId: "agent-a",
    actorIsAdmin: false,
    agentId: "agent-b",
    agentExists: true,
  });
  assert.equal(otherPerson.action, "deny");

  const unknown = planWorkingAsCookie({
    hasStaffSession: true,
    actorAgentId: "agent-a",
    actorIsAdmin: true,
    agentId: "not-a-real-agent",
    agentExists: false,
  });
  assert.equal(unknown.action, "deny");

  const self = planWorkingAsCookie({
    hasStaffSession: true,
    actorAgentId: "agent-a",
    actorIsAdmin: false,
    agentId: "agent-a",
    agentExists: true,
  });
  assert.equal(self.action, "set");
  assert.equal(self.maxAge, 12 * 60 * 60);

  const adminSwitch = planWorkingAsCookie({
    hasStaffSession: true,
    actorAgentId: "agent-a",
    actorIsAdmin: true,
    agentId: "agent-b",
    agentExists: true,
  });
  assert.equal(adminSwitch.action, "set");
  assert.ok((adminSwitch.maxAge ?? 0) < 60 * 60 * 24);
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

test("source no longer embeds portal passwords, tokens, or a shared staff password", () => {
  const files = [
    "src/lib/portal-constants.ts",
    "src/lib/portal-seed.ts",
    "src/app/portal/login/page.tsx",
    "src/lib/staff-auth.ts",
    "src/app/actions/staff.ts",
    "src/app/login/page.tsx",
  ];
  for (const file of files) {
    const source = readFileSync(path.join(import.meta.dirname, "..", file), "utf8");
    assert.equal(source.includes("harbour-view"), false, file);
    assert.equal(source.includes("harbour-portal"), false, file);
    assert.equal(source.includes("bakery-view"), false, file);
    assert.equal(source.includes("bakery-portal"), false, file);
    assert.equal(source.includes("claire.debenham@"), false, file);
    assert.equal(source.includes("CRM_STAFF_PASSWORD="), false, file);
    assert.equal(source.includes("CRM_STAFF_PASSWORD?"), false, file);
    assert.equal(source.includes("identifier"), false, file);
  }
  const login = readFileSync(path.join(import.meta.dirname, "..", "src/app/login/page.tsx"), "utf8");
  assert.equal(login.includes("Work email"), true);
  assert.equal(login.includes('type="email"'), true);
  assert.equal(login.includes("@nzcenergy.co.uk"), true);
  assert.equal(parseStaffPasswordHashes({ CRM_STAFF_PASSWORDS: "plain@x=not-a-hash" }).size, 0);
  const hash = "ab".repeat(16) + ":" + "cd".repeat(32);
  assert.equal(staffPasswordHashFor("plain@x", null, { CRM_STAFF_PASSWORDS: `plain@x=${hash}` }), null);
  assert.equal(
    parseStaffPasswordHashes({ CRM_STAFF_PASSWORDS: `priya.shah@nzce.co.uk=${hash}` }).size,
    0,
  );
  assert.equal(
    staffPasswordHashFor(JOEL_EMAIL, null, { CRM_STAFF_PASSWORDS: `${JOEL_EMAIL}=${hash}` }),
    hash,
  );
  assert.equal(isNceWorkEmail(JOEL_EMAIL), true);
  assert.equal(isNceWorkEmail("priya.shah@nzce.co.uk"), false);
  assert.equal(isNceWorkEmail("Joel Pearson"), false);
});
