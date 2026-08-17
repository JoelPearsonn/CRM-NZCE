import { notFound } from "next/navigation";
import { DealForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function EditDealPage({ params }: IdPageProps) {
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: { customer: true, allocations: true, payments: { orderBy: { sortOrder: "asc" } } },
  });
  if (!deal) notFound();

  const [customers, meters, leads, agents] = await Promise.all([
    prisma.customer.findMany({
      where: { OR: [{ archivedAt: null }, { id: deal.customerId }] },
      orderBy: { companyName: "asc" },
    }),
    prisma.meter.findMany({ where: { customerId: deal.customerId }, orderBy: { siteName: "asc" } }),
    prisma.lead.findMany({ where: { customerId: deal.customerId }, orderBy: { title: "asc" } }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker={deal.customer.companyName} title="Edit contract" />
      <DealForm
        deal={deal}
        customers={customers}
        meters={meters}
        leads={leads}
        agents={agents}
        selectedAgentIds={deal.allocations.map((row) => row.agentId)}
      />
    </div>
  );
}
