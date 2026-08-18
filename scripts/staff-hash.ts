import { hashPassword } from "../src/lib/portal-crypto";

const password = process.argv.slice(2).join(" ").trim();
if (!password) {
  console.error("Usage: npm run staff-hash -- \"the-password\"");
  process.exit(1);
}

process.stdout.write(`${hashPassword(password)}\n`);
