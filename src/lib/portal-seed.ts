import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/portal-crypto";
import { portalDemoCredentials } from "@/lib/portal-constants";
import { prisma } from "@/lib/prisma";

export async function ensurePortalAccounts(db: PrismaClient = prisma) {
  const demo = portalDemoCredentials();
  if (!demo.email || !demo.password) return;

  const customer = await db.customer.findFirst({
    where: { email: demo.email, archivedAt: null },
  });
  if (!customer) return;

  await upsertAccount(db, {
    customerId: customer.id,
    email: demo.email,
    password: demo.password,
    magicToken: demo.token || null,
  });
}

async function upsertAccount(
  db: PrismaClient,
  input: { customerId: string; email: string; password: string; magicToken: string | null },
) {
  const existing = await db.customerAccount.findUnique({ where: { customerId: input.customerId } });
  const passwordHash = existing?.passwordHash || hashPassword(input.password);
  if (existing) {
    if (existing.email !== input.email || existing.magicToken !== input.magicToken) {
      await db.customerAccount.update({
        where: { id: existing.id },
        data: { email: input.email, magicToken: input.magicToken },
      });
    }
    return existing;
  }
  return db.customerAccount.create({
    data: {
      customerId: input.customerId,
      email: input.email,
      passwordHash,
      magicToken: input.magicToken,
    },
  });
}
