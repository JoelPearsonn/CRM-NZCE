import { PrismaClient } from "@prisma/client";
import {
  DESK_DATABASE_MISSING,
  deskDatabaseUrl,
  isDeskDatabaseConfigured,
} from "@/lib/desk-database";

function createPrisma() {
  const url = deskDatabaseUrl();
  return new PrismaClient({
    datasources: { db: { url } },
    omit: { agent: { passwordHash: true } },
  });
}

export type DeskPrisma = ReturnType<typeof createPrisma>;

const globalForPrisma = globalThis as unknown as { prisma?: DeskPrisma };

export function getPrisma(): DeskPrisma {
  if (!isDeskDatabaseConfigured()) {
    throw new Error(DESK_DATABASE_MISSING);
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrisma();
  }
  return globalForPrisma.prisma;
}

/** Lazy: new PrismaClient() without DATABASE_URL is a 500. Never construct until configured. */
export const prisma = new Proxy({} as DeskPrisma, {
  get(_target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, client) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
