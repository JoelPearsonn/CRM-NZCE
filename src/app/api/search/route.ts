import { NextResponse } from "next/server";
import { formatMpan } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ customers: [], meters: [], leads: [], deals: [] });
  }

  const contains = { contains: q };

  const [customers, meters, leads, deals] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { companyName: contains },
          { tradingName: contains },
          { contactName: contains },
          { email: contains },
          { postcode: contains },
          { city: contains },
        ],
      },
      take: 6,
      orderBy: { companyName: "asc" },
    }),
    prisma.meter.findMany({
      where: {
        OR: [
          { mpan: contains },
          { mprn: contains },
          { siteName: contains },
          { supplier: contains },
          { siteAddress: contains },
        ],
      },
      include: { customer: true },
      take: 6,
    }),
    prisma.lead.findMany({
      where: {
        OR: [{ title: contains }, { notes: contains }, { customer: { companyName: contains } }],
      },
      include: { customer: true },
      take: 6,
    }),
    prisma.deal.findMany({
      where: {
        OR: [{ supplier: contains }, { notes: contains }, { customer: { companyName: contains } }],
      },
      include: { customer: true },
      take: 6,
    }),
  ]);

  return NextResponse.json({
    customers: customers.map((customer) => ({
      id: customer.id,
      type: "customer",
      title: customer.companyName,
      subtitle: [customer.contactName, customer.email, customer.postcode].filter(Boolean).join(" · "),
      href: `/customers/${customer.id}`,
    })),
    meters: meters.map((meter) => ({
      id: meter.id,
      type: "meter",
      title: meter.mpan ? `MPAN ${formatMpan(meter.mpan)}` : `MPRN ${meter.mprn}`,
      subtitle: [meter.customer.companyName, meter.siteName, meter.supplier].filter(Boolean).join(" · "),
      href: `/customers/${meter.customerId}`,
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
