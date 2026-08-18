import { notFound } from "next/navigation";
import { LeadForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { IdPageProps } from "@/lib/page-props";
import { listDeskAgents } from "@/lib/agents";
import { prisma } from "@/lib/prisma";

export default async function EditLeadPage({ params }: IdPageProps) {
  const { id } = await params;
  const [lead, customers, agents] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: { allocations: true, customer: true },
    }),
    prisma.customer.findMany({ orderBy: { companyName: "asc" } }),
    listDeskAgents(),
  ]);
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker={lead.customer.companyName} title="Edit lead" />
      <LeadForm
        lead={lead}
        customers={customers}
        agents={agents}
        selectedAgentIds={lead.allocations.map((allocation) => allocation.agentId)}
      />
    </div>
  );
}
