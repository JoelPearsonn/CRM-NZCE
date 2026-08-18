#!/usr/bin/env node
/**
 * Committed schema is PostgreSQL (Vercel Postgres / Neon).
 * Local tests and a laptop can still use DATABASE_URL=file:… — this
 * rewrites provider to sqlite for that generate/push only.
 * Unset URL: generate with a dummy postgres URL (no live DB, no secrets).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const committed = path.join(root, "prisma", "schema.prisma");
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/prisma-with-provider.mjs <prisma args | push-if-postgres>");
  process.exit(1);
}

const url = (process.env.DATABASE_URL ?? "").trim();
const isSqliteFile = /^file:/i.test(url);
const isPostgres = /^postgres(ql)?:\/\//i.test(url);
const generateUrl = url || "postgresql://127.0.0.1:5432/prisma";

function schemaPathFor(provider) {
  if (provider === "postgresql") return committed;
  const generatedDir = path.join(root, "prisma", ".generated");
  mkdirSync(generatedDir, { recursive: true });
  const source = readFileSync(committed, "utf8").replace(
    /provider\s*=\s*"(sqlite|postgresql)"/,
    `provider = "${provider}"`,
  );
  const out = path.join(generatedDir, "schema.prisma");
  writeFileSync(out, source);
  return out;
}

const provider = isSqliteFile ? "sqlite" : "postgresql";
const schema = schemaPathFor(provider);

if (args[0] === "push-if-postgres") {
  if (!isPostgres) process.exit(0);
  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--schema", schema], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "inherit",
  });
  process.exit(0);
}

execFileSync("npx", ["prisma", ...args, "--schema", schema], {
  cwd: root,
  env: { ...process.env, DATABASE_URL: generateUrl },
  stdio: "inherit",
});
