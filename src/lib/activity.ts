import { prisma } from "@/lib/prisma";
import { getWorkingAsId } from "@/lib/working-as";

export async function logActivity(
  customerId: string,
  type: string,
  summary: string,
  actorId?: string | null,
) {
  const resolved = actorId || (await getWorkingAsId());
  await prisma.activity.create({
    data: {
      customerId,
      type,
      summary,
      actorId: resolved || null,
    },
  });
}
