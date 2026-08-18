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
  authenticateStaff,
  createStaffPasswordFromToken,
  staffEmailLoginStep,
} from "../src/lib/staff-accounts";
import { MAIL_NOT_SET_UP } from "../src/lib/staff-mail";
import {
  issueStaffVerifyToken,
  readStaffVerifyToken,
  startStaffEmailVerification,
} from "../src/lib/staff-verify";
import {
  createStaffSessionToken,
  isNceWorkEmail,
  isProtectedStaffApiPath,
  planWorkingAsCookie,
  STAFF_COOKIE,
  STAFF_SESSION_MAX_AGE,
  staffHasPassword,
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
    await db.agent.create({
      data: { name: "Joel Pearson", email: JOEL_EMAIL, role: "Admin" },
    });
    await db.agent.create({
      data: { name: "Priya Shah", email: "priya.shah@nzce.co.uk", role: "Sales" },
    });

    const otherDomain = await staffEmailLoginStep("nobody@not-on-the-desk.test", db);
    assert.equal("error" in otherDomain, true);

    const seedDomain = await startStaffEmailVerification("priya.shah@nzce.co.uk", {
      db,
      env: { RESEND_API_KEY: "re_test_not_a_real_key" },
      publicOrigin: "http://desk.test",
      send: async () => ({ ok: true }),
    });
    assert.equal("error" in seedDomain, true);

    const byName = await staffEmailLoginStep("Joel Pearson", db);
    assert.equal("error" in byName, true);

    const firstVisit = await staffEmailLoginStep(JOEL_EMAIL, db);
    assert.ok("step" in firstVisit && firstVisit.step === "verify");

    const noMailer = await startStaffEmailVerification(TEST_STAFF_A, {
      db,
      env: {},
      publicOrigin: "http://desk.test",
    });
    assert.equal("error" in noMailer, true);
    if ("error" in noMailer) assert.equal(noMailer.error, MAIL_NOT_SET_UP);
    assert.equal(await db.agent.findUnique({ where: { email: TEST_STAFF_A } }), null);
    assert.equal(await db.staffVerifyToken.count(), 0);
    const joelBefore = await db.agent.findUnique({
      where: { email: JOEL_EMAIL },
      select: { passwordHash: true },
    });
    assert.equal(joelBefore?.passwordHash ?? null, null);

    const forged = await readStaffVerifyToken("forged-token", db);
    assert.equal("error" in forged && forged.status, 401);
    const noTokenCreate = await createStaffPasswordFromToken(
      { token: "forged-token", password: "first-time-secret", confirm: "first-time-secret" },
      db,
    );
    assert.equal("error" in noTokenCreate && noTokenCreate.status, 401);

    let sent = 0;
    const mailed = await startStaffEmailVerification(JOEL_EMAIL, {
      db,
      env: { RESEND_API_KEY: "re_test_not_a_real_key" },
      publicOrigin: "http://desk.test",
      send: async () => {
        sent += 1;
        return { ok: true };
      },
    });
    assert.ok("ok" in mailed && mailed.ok);
    assert.equal(sent, 1);
    assert.equal(
      (await db.agent.findUnique({
        where: { email: JOEL_EMAIL },
        select: { passwordHash: true },
      }))?.passwordHash ?? null,
      null,
    );

    const expired = await issueStaffVerifyToken(JOEL_EMAIL, db, Date.now() - 2 * 60 * 60 * 1000);
    assert.ok("raw" in expired);
    const expiredRead = await readStaffVerifyToken(expired.raw, db);
    assert.equal("error" in expiredRead && expiredRead.status, 401);

    const issued = await issueStaffVerifyToken(JOEL_EMAIL, db);
    assert.ok("raw" in issued);
    const created = await createStaffPasswordFromToken(
      { token: issued.raw, password: "joel-local-test", confirm: "joel-local-test" },
      db,
    );
    assert.ok("ok" in created && created.ok);
    assert.equal(created.agent.email, JOEL_EMAIL);
    const createdDump = JSON.stringify(created);
    assert.equal(createdDump.includes("joel-local-test"), false);
    assert.equal(createdDump.includes("passwordHash"), false);
    assert.equal(createdDump.includes(issued.raw), false);

    const reused = await readStaffVerifyToken(issued.raw, db);
    assert.equal("error" in reused && reused.status, 401);
    const reusedCreate = await createStaffPasswordFromToken(
      { token: issued.raw, password: "another-secret", confirm: "another-secret" },
      db,
    );
    assert.equal("error" in reusedCreate && reusedCreate.status, 401);

    const laterVisit = await staffEmailLoginStep(JOEL_EMAIL, db);
    assert.ok("step" in laterVisit && laterVisit.step === "signin");

    const joelOk = await authenticateStaff({ email: JOEL_EMAIL, password: "joel-local-test" }, db);
    assert.ok("ok" in joelOk && joelOk.ok);
    assert.equal(joelOk.agent.email, JOEL_EMAIL);
    const signinDump = JSON.stringify(joelOk);
    assert.equal(signinDump.includes("joel-local-test"), false);
    assert.equal(signinDump.includes("passwordHash"), false);

    const wrong = await authenticateStaff({ email: JOEL_EMAIL, password: "not-joel" }, db);
    assert.equal("error" in wrong, true);
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
    "src/lib/staff-mail.ts",
    "src/lib/staff-verify.ts",
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
    assert.equal(source.includes("CRM_STAFF_PASSWORDS"), false, file);
    assert.equal(source.includes("identifier"), false, file);
  }
  const login = readFileSync(path.join(import.meta.dirname, "..", "src/app/login/page.tsx"), "utf8");
  assert.equal(login.includes("Work email"), true);
  assert.equal(login.includes("Create your password"), false);
  assert.equal(login.includes('type="email"'), true);
  assert.equal(login.includes("@nzcenergy.co.uk"), true);
  const verifyPage = readFileSync(
    path.join(import.meta.dirname, "..", "src/app/login/verify/page.tsx"),
    "utf8",
  );
  assert.equal(verifyPage.includes("Create your password"), true);
  const hash = "ab".repeat(16) + ":" + "cd".repeat(32);
  assert.equal(staffPasswordHashFor("plain@x", hash), null);
  assert.equal(staffPasswordHashFor(JOEL_EMAIL, null), null);
  assert.equal(staffHasPassword(JOEL_EMAIL, hash), true);
  assert.equal(isNceWorkEmail(JOEL_EMAIL), true);
  assert.equal(isNceWorkEmail("priya.shah@nzce.co.uk"), false);
  assert.equal(isNceWorkEmail("Joel Pearson"), false);
});
