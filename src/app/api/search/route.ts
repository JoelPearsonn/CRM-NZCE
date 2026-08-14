import { NextResponse } from "next/server";
import { formatMpan } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") ?? "";
  if (q.length < 2) {
    return NextResponse.json({ customers: [], meters: [], leads: [], deals: [] });
  }

  const contains = { contains: q };
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
          take: 6,
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
          take: 6,
        })
      : Promise.resolve([]),
    want("lead")
      ? prisma.lead.findMany({
          where: {
            customer: { archivedAt: null },
            OR: [{ title: contains }, { notes: contains }, { customer: { companyName: contains } }],
          },
          include: { customer: true },
          take: 6,
        })
      : Promise.resolve([]),
    want("deal")
      ? prisma.deal.findMany({
          where: {
            customer: { archivedAt: null },
            OR: [{ supplier: contains }, { notes: contains }, { customer: { companyName: contains } }],
          },
          include: { customer: true },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    customers: customers.map((customer) => ({
      id: customer.id,
      type: "customer",
      title: customer.companyName,
      subtitle: [customer.contactName, customer.email, customer.postcode].filter(Boolean).join(" · "),
      href: `/customers/${customer.id}`,
      loaStatus: customer.meters.find((meter) => meter.loaStatus === "SIGNED")?.loaStatus
        ?? customer.meters[0]?.loaStatus
        ?? null,
      objectionStatus: customer.meters.some((meter) => meter.objectionStatus === "IN_OBJECTION")
        ? "IN_OBJECTION"
        : customer.meters.find((meter) => meter.objectionStatus === "CLEARED")?.objectionStatus
          ?? "NONE",
    })),
    meters: meters.map((meter) => ({
      id: meter.id,
      type: "meter",
      title: meter.mpan ? `MPAN ${formatMpan(meter.mpan)}` : `MPRN ${meter.mprn}`,
      subtitle: [meter.customer.companyName, meter.siteName, meter.supplier].filter(Boolean).join(" · "),
      href: `/customers/${meter.customerId}`,
      loaStatus: meter.loaStatus,
      objectionStatus: meter.objectionStatus,
    })),
    leads: leads.map((lead) => ({
      id: lead.id,
      type: "lead",
      title: lead.title,
      subtitle: `${lead.customer.companyName} · ${lead.stage.replaceAll("_", " ")}`,
      href: `/leads/${lead.id}`,
    })),
    deals: deals.map((deal) => ({
      id: deal.id,
      type: "deal",
      title: `${deal.supplier} · ${deal.customer.companyName}`,
      subtitle: deal.fuelType,
      href: `/contracts/${deal.id}`,
    })),
  });
}
