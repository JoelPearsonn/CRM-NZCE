import { prisma, type DeskPrisma } from "@/lib/prisma";
import { getWorkingAsId } from "@/lib/working-as";

export async function logActivity(
  customerId: string,
  type: string,
  summary: string,
  actorId?: string | null,
  db: DeskPrisma = prisma,
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
