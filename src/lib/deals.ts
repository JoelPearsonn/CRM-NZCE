import { prisma } from "@/lib/prisma";

export async function liveDealOnSupply(opts: {
  dealId?: string | null;
  meterId?: string | null;
  status: string;
}) {
  if (opts.status !== "LIVE" || !opts.meterId) return null;

  const meter = await prisma.meter.findUnique({ where: { id: opts.meterId } });
  if (!meter) return null;

  const or: Array<{ meterId?: string; meter?: { mpan?: string; mprn?: string } }> = [
    { meterId: meter.id },
  ];
  if (meter.mpan) or.push({ meter: { mpan: meter.mpan } });
  if (meter.mprn) or.push({ meter: { mprn: meter.mprn } });

  return prisma.deal.findFirst({
    where: {
      status: "LIVE",
      ...(opts.dealId ? { id: { not: opts.dealId } } : {}),
      OR: or,
    },
    include: { customer: true, meter: true },
  });
}
