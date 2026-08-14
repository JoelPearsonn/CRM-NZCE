import { DealForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function NewDealPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const customerId = typeof query.customerId === "string" ? query.customerId : undefined;
  const [customers, meters, leads, agents] = await Promise.all([
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
    prisma.meter.findMany({
      where: customerId ? { customerId } : undefined,
      orderBy: { siteName: "asc" },
    }),
    prisma.lead.findMany({
      where: customerId ? { customerId } : undefined,
      orderBy: { title: "asc" },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Sold"
        title="Record contract"
        description="Finance fields sit on the deal: due date, amount due, estimated commission, actual paid."
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
