import { LEAD_STAGES, labelFor } from "@/lib/constants";
import { formatMpan } from "@/lib/format";
import { resolveLeadBoardStage } from "@/lib/lead-board";
import type { SearchResponse } from "@/lib/master-search";
import { prisma } from "@/lib/prisma";

export async function searchBook(q: string, type = ""): Promise<SearchResponse> {
  const query = q.trim();
  if (query.length < 2) {
    return { customers: [], meters: [], leads: [], deals: [] };
  }

  const contains = { contains: query };
  const want = (key: string) => !type || type === key;

  const [customers, meters, leads, deals] = await Promise.all([
    want("customer")
      ? prisma.customer.findMany({
          where: {
            archivedAt: null,
            OR: [
              { companyName: contains },
              { tradingName: contains },
              { contactName: contains },
              { email: contains },
              { postcode: contains },
              { city: contains },
            ],
          },
          include: { meters: { select: { loaStatus: true, objectionStatus: true } } },
          take: 8,
          orderBy: { companyName: "asc" },
        })
      : Promise.resolve([]),
    want("meter")
      ? prisma.meter.findMany({
          where: {
            customer: { archivedAt: null },
            OR: [
              { mpan: contains },
              { mprn: contains },
              { siteName: contains },
              { supplier: contains },
              { siteAddress: contains },
              { objectionNote: contains },
            ],
          },
          include: { customer: true },
          take: 8,
        })
      : Promise.resolve([]),
    want("lead")
      ? prisma.lead.findMany({
          where: {
            customer: { archivedAt: null },
            OR: [{ title: contains }, { notes: contains }, { customer: { companyName: contains } }],
          },
          include: { customer: true },
          take: 8,
        })
      : Promise.resolve([]),
    want("deal")
      ? prisma.deal.findMany({
          where: {
            customer: { archivedAt: null },
            OR: [{ supplier: contains }, { notes: contains }, { customer: { companyName: contains } }],
          },
          include: { customer: true },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  return {
    customers: customers.map((customer) => ({
      id: customer.id,
      type: "customer" as const,
      title: customer.companyName,
      subtitle: [customer.contactName, customer.email, customer.postcode].filter(Boolean).join(" · "),
      href: `/customers/${customer.id}`,
      loaStatus:
        customer.meters.find((meter) => meter.loaStatus === "SIGNED")?.loaStatus ??
        customer.meters[0]?.loaStatus ??
        null,
      objectionStatus: customer.meters.some((meter) => meter.objectionStatus === "IN_OBJECTION")
        ? "IN_OBJECTION"
        : (customer.meters.find((meter) => meter.objectionStatus === "CLEARED")?.objectionStatus ?? "NONE"),
    })),
    meters: meters.map((meter) => ({
      id: meter.id,
      type: "meter" as const,
      title: meter.mpan ? `MPAN ${formatMpan(meter.mpan)}` : `MPRN ${meter.mprn}`,
      subtitle: [meter.customer.companyName, meter.siteName, meter.supplier].filter(Boolean).join(" · "),
      href: `/customers/${meter.customerId}`,
      loaStatus: meter.loaStatus,
      objectionStatus: meter.objectionStatus,
    })),
    leads: leads.map((lead) => ({
      id: lead.id,
      type: "lead" as const,
      title: lead.title,
      subtitle: `${lead.customer.companyName} · ${labelFor(LEAD_STAGES, resolveLeadBoardStage(lead))}`,
      href: `/leads/${lead.id}`,
    })),
    deals: deals.map((deal) => ({
      id: deal.id,
      type: "deal" as const,
      title: `${deal.supplier} · ${deal.customer.companyName}`,
      subtitle: deal.fuelType,
      href: `/contracts/${deal.id}`,
    })),
  };
}
