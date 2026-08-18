import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

export async function withTestDb(run: (db: PrismaClient) => Promise<void>) {
  const dir = mkdtempSync(path.join(tmpdir(), "nzce-test-"));
  const file = path.join(dir, "test.db");
  const url = `file:${file}`;
  execFileSync("node", ["scripts/prisma-with-provider.mjs", "db", "push", "--skip-generate"], {
    cwd: path.join(import.meta.dirname, "../.."),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    await run(db);
  } finally {
    await db.$disconnect();
    rmSync(dir, { recursive: true, force: true });
  }
}
