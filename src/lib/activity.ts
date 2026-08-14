import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getWorkingAsId } from "@/lib/working-as";

export async function logActivity(
  customerId: string,
  type: string,
  summary: string,
  actorId?: string | null,
  db: PrismaClient = prisma,
) {
  const resolved = actorId || (await getWorkingAsId());
  await db.activity.create({
    data: {
      customerId,
      type,
      summary,
      actorId: resolved || null,
    },
  });
}
