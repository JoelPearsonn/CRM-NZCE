import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Serverless hosts wipe the SQLite file between instances.
 * Copy the seeded book from the build into a writable path when empty.
 */
export function ensureDemoSqlite() {
  if (process.env.NZCE_SQLITE_READY === "1") return;

  const serverless = Boolean(process.env.VERCEL || process.env.NZCE_DEMO_SQLITE === "1");
  if (serverless) {
    const dest = process.env.NZCE_SQLITE_PATH || "/tmp/nzce-demo.db";
    if (!existsSync(dest)) {
      const src = join(process.cwd(), "prisma", "dev.db");
      if (existsSync(src)) {
        copyFileSync(src, dest);
      }
    }
    process.env.DATABASE_URL = `file:${dest}`;
  }

  process.env.NZCE_SQLITE_READY = "1";
}

ensureDemoSqlite();
