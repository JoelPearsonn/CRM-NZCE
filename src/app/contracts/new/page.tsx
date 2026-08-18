import { DealForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { SearchPageProps } from "@/lib/page-props";
import { listDeskAgents } from "@/lib/agents";
import { prisma } from "@/lib/prisma";

export default async function NewDealPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const customerId = typeof query.customerId === "string" ? query.customerId : undefined;
  const [customers, meters, leads, agents] = await Promise.all([
    prisma.customer.findMany({
      where: { archivedAt: null },
      orderBy: { companyName: "asc" },
    }),
    prisma.meter.findMany({
      where: customerId ? { customerId } : undefined,
      orderBy: { siteName: "asc" },
    }),
    prisma.lead.findMany({
      where: customerId ? { customerId } : undefined,
      orderBy: { title: "asc" },
    }),
    listDeskAgents(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Sold"
        title="Record contract"
        description="Put CSD, CED, TPI and the full deal value. Net commission and each payout’s amount due update on the form before you save."
      />
      <DealForm
        customers={customers}
        meters={meters}
        leads={leads}
        agents={agents}
        presetCustomerId={customerId}
      />
    </div>
  );
}
