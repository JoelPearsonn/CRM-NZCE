import { PrismaClient } from "@prisma/client";

function createPrisma() {
  return new PrismaClient({
    omit: { agent: { passwordHash: true } },
  });
}

export type DeskPrisma = ReturnType<typeof createPrisma>;

const globalForPrisma = globalThis as unknown as { prisma?: DeskPrisma };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
