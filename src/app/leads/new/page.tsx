import { LeadForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { SearchPageProps } from "@/lib/page-props";
import { listDeskAgents } from "@/lib/agents";
import { prisma } from "@/lib/prisma";

export default async function NewLeadPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const customerId = typeof query.customerId === "string" ? query.customerId : undefined;
  const [customers, agents] = await Promise.all([
    prisma.customer.findMany({
      where: { archivedAt: null },
      orderBy: { companyName: "asc" },
    }),
    listDeskAgents(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Pipeline"
        title="Open lead"
        description="A lead is a sales process on a customer. Allocate one or more agents."
      />
      <LeadForm customers={customers} agents={agents} presetCustomerId={customerId} />
    </div>
  );
}
