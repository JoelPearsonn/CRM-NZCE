#!/usr/bin/env node
/**
 * prisma generate / db push using sqlite locally (`file:`) and
 * postgresql when DATABASE_URL is a Postgres URL (Neon / Vercel Postgres).
 * Does not connect at generate time. Does not invent credentials.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/prisma-with-provider.mjs <prisma args>");
  process.exit(1);
}

const url = (process.env.DATABASE_URL ?? "").trim();
const isPostgres = /^postgres(ql)?:\/\//i.test(url);
const databaseUrl = url || "file:./dev.db";

let schema = path.join(root, "prisma", "schema.prisma");
if (isPostgres) {
  const generatedDir = path.join(root, "prisma", ".generated");
  mkdirSync(generatedDir, { recursive: true });
  const source = readFileSync(schema, "utf8").replace(
    /provider\s*=\s*"sqlite"/,
    'provider = "postgresql"',
  );
  schema = path.join(generatedDir, "schema.prisma");
  writeFileSync(schema, source);
}

execFileSync("npx", ["prisma", ...args, "--schema", schema], {
  cwd: root,
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: "inherit",
});
