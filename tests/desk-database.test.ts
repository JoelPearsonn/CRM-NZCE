import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  isDeskDatabaseConfigured,
  isPostgresDatabaseUrl,
  isSqliteFileUrl,
  withServerlessPool,
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

test("committed Prisma schema is PostgreSQL for Vercel / Neon", () => {
  const schema = readFileSync(path.join(import.meta.dirname, "../prisma/schema.prisma"), "utf8");
  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.equal(/provider\s*=\s*"sqlite"/.test(schema), false);
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

test("serverless Prisma URLs keep a single warm connection", () => {
  const pooled = withServerlessPool("postgresql://db.prisma.io:5432/crm");
  assert.match(pooled, /connection_limit=1/);
  assert.match(pooled, /pool_timeout=20/);
  assert.match(pooled, /connect_timeout=10/);
  assert.equal(withServerlessPool("file:./dev.db"), "file:./dev.db");
  assert.equal(
    withServerlessPool("postgresql://db.prisma.io:5432/crm?connection_limit=5"),
    "postgresql://db.prisma.io:5432/crm?connection_limit=5",
  );
});
