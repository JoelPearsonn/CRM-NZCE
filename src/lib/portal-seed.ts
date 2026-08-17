import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/portal-crypto";
import {
  HARBOUR_PORTAL_EMAIL,
  HARBOUR_PORTAL_PASSWORD,
  HARBOUR_PORTAL_TOKEN,
} from "@/lib/portal-constants";
import { prisma } from "@/lib/prisma";

export async function ensurePortalAccounts(db: PrismaClient = prisma) {
  const harbour = await db.customer.findFirst({
    where: { companyName: "Harbour View Hotels Ltd", archivedAt: null },
  });
  if (harbour) {
    await upsertAccount(db, {
      customerId: harbour.id,
      email: HARBOUR_PORTAL_EMAIL,
      password: HARBOUR_PORTAL_PASSWORD,
      magicToken: HARBOUR_PORTAL_TOKEN,
    });
  }

  const bakery = await db.customer.findFirst({
    where: { companyName: "Greenfield Artisan Bakery", archivedAt: null },
  });
  if (bakery) {
    await upsertAccount(db, {
      customerId: bakery.id,
      email: bakery.email.toLowerCase(),
      password: "bakery-view",
      magicToken: "bakery-portal",
    });
  }
}

async function upsertAccount(
  db: PrismaClient,
  input: { customerId: string; email: string; password: string; magicToken: string },
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
