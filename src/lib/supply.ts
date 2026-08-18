import type { DeskPrisma } from "@/lib/prisma";

export async function findSupplyClash(
  db: DeskPrisma,
  mpan: string | null,
  mprn: string | null,
  excludeId?: string | null,
) {
  const or = [
    mpan ? { mpan } : undefined,
    mprn ? { mprn } : undefined,
  ].filter(Boolean) as Array<{ mpan?: string; mprn?: string }>;
  if (!or.length) return null;
  return db.meter.findFirst({
    where: {
      OR: or,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { customer: true },
  });
}
