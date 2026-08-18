import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isDeskDatabaseConfigured,
  isPostgresDatabaseUrl,
  isSqliteFileUrl,
} from "../src/lib/desk-database";

test("desk database is off when DATABASE_URL is missing", () => {
  assert.equal(isDeskDatabaseConfigured({}), false);
  assert.equal(isDeskDatabaseConfigured({ DATABASE_URL: "   " }), false);
});

test("local sqlite file is allowed; the same file URL is rejected on Vercel", () => {
  assert.equal(isSqliteFileUrl("file:./dev.db"), true);
  assert.equal(isDeskDatabaseConfigured({ DATABASE_URL: "file:./dev.db" }), true);
  assert.equal(
    isDeskDatabaseConfigured({ DATABASE_URL: "file:./dev.db", VERCEL: "1" }),
    false,
  );
  assert.equal(
    isDeskDatabaseConfigured({ DATABASE_URL: "file:./dev.db", VERCEL_ENV: "production" }),
    false,
  );
});

test("Postgres URLs are accepted for Neon / Vercel Postgres", () => {
  assert.equal(isPostgresDatabaseUrl("postgresql://127.0.0.1/crm"), true);
  assert.equal(isPostgresDatabaseUrl("postgres://127.0.0.1/crm"), true);
  assert.equal(isDeskDatabaseConfigured({ DATABASE_URL: "postgresql://127.0.0.1/crm" }), true);
  assert.equal(
    isDeskDatabaseConfigured({ DATABASE_URL: "postgres://127.0.0.1/crm", VERCEL: "1" }),
    true,
  );
});
