import { prisma, type DeskPrisma } from "@/lib/prisma";

export async function liveDealOnSupply(
  opts: {
    dealId?: string | null;
    meterId?: string | null;
    status: string;
  },
  db: DeskPrisma = prisma,
) {
  if (opts.status !== "LIVE" || !opts.meterId) return null;

  const meter = await db.meter.findUnique({ where: { id: opts.meterId } });
  if (!meter) return null;

  const or: Array<{ meterId?: string; meter?: { mpan?: string; mprn?: string } }> = [
    { meterId: meter.id },
  ];
  if (meter.mpan) or.push({ meter: { mpan: meter.mpan } });
  if (meter.mprn) or.push({ meter: { mprn: meter.mprn } });

  return db.deal.findFirst({
    where: {
      status: "LIVE",
      ...(opts.dealId ? { id: { not: opts.dealId } } : {}),
      OR: or,
    },
    include: { customer: true, meter: true },
  });
}

export async function dealRefsBelongToCustomer(
  db: DeskPrisma,
  input: { customerId: string; meterId?: string | null; leadId?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.meterId) {
    const meter = await db.meter.findUnique({ where: { id: input.meterId } });
    if (!meter || meter.customerId !== input.customerId) {
      return { ok: false, error: "That meter does not belong to this customer." };
    }
  }
  if (input.leadId) {
    const lead = await db.lead.findUnique({ where: { id: input.leadId } });
    if (!lead || lead.customerId !== input.customerId) {
      return { ok: false, error: "That lead does not belong to this customer." };
    }
  }
  return { ok: true };
}
