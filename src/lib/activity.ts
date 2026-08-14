import { prisma } from "@/lib/prisma";

export async function logActivity(
  customerId: string,
  type: string,
  summary: string,
  actorId?: string | null,
) {
  await prisma.activity.create({
    data: {
      customerId,
      type,
      summary,
      actorId: actorId || null,
    },
  });
}
