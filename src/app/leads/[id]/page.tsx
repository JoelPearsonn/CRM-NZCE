import Link from "next/link";
import { notFound } from "next/navigation";
import { AllocateAgents, StageSelect } from "@/components/lead-controls";
import { PageHeader, Section, StagePill } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function LeadDetailPage({ params }: IdPageProps) {
  const { id } = await params;
  const [lead, agents] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        customer: true,
        allocations: { include: { agent: true } },
        deals: true,
      },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        kicker="Lead"
        title={lead.title}
        description={`${lead.customer.companyName}${lead.source ? ` · ${lead.source}` : ""}`}
        actions={
          <>
            <Link href={`/customers/${lead.customerId}`} className="btn btn-ghost">
              Customer
            </Link>
            <Link href={`/leads/${lead.id}/edit`} className="btn btn-primary">
              Edit lead
            </Link>
          </>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <StagePill value={lead.stage} />
        <span className="text-xs text-muted">Updated {formatDateTime(lead.updatedAt)}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Move stage">
          <div className="p-4">
            <StageSelect leadId={lead.id} stage={lead.stage} />
            <p className="mt-2 text-xs text-muted">
              Stages live in <code>src/lib/constants.ts</code> if you need to rename the process.
            </p>
          </div>
        </Section>
        <Section title="Allocate agents">
          <div className="p-4">
            <AllocateAgents
              leadId={lead.id}
              agents={agents}
              selectedIds={lead.allocations.map((allocation) => allocation.agentId)}
            />
          </div>
        </Section>
      </div>

      {lead.notes ? (
        <section className="card mt-4 p-4">
          <h2 className="section-title mb-2">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
        </section>
      ) : null}

      {lead.deals.length > 0 ? (
        <section className="card mt-4 p-4">
          <h2 className="section-title mb-2">Linked contracts</h2>
          <ul className="text-sm">
            {lead.deals.map((deal) => (
              <li key={deal.id}>
                <Link href={`/contracts/${deal.id}`}>{deal.supplier}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
