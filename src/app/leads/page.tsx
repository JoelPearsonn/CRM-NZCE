import Link from "next/link";
import { AllocateAgents, StageSelect } from "@/components/lead-controls";
import { EmptyState, PageHeader, StagePill } from "@/components/ui";
import { isTenderLeadStage, LEAD_STAGES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export default async function LeadsPage() {
  const [leads, agents] = await Promise.all([
    prisma.lead.findMany({
      include: {
        customer: true,
        allocations: { include: { agent: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        kicker="Pipeline"
        title="Leads"
        description="Move a card between stages or allocate one or more agents. Stages are a single list in the code if you need to rename them."
        actions={
          <Link href="/leads/new" className="btn btn-primary">
            Open lead
          </Link>
        }
      />

      {leads.length === 0 ? (
        <EmptyState
          title="Pipeline is empty"
          body="Open a lead against a customer and put it on a stage."
          actionHref="/leads/new"
          actionLabel="Open lead"
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STAGES.map((stage) => {
            const column = leads.filter((lead) => lead.stage === stage.value);
            return (
              <section key={stage.value} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <StagePill value={stage.value} />
                  <span className="text-xs text-muted">{column.length}</span>
                </div>
                <div className="space-y-2">
                  {column.length === 0 ? (
                    <div className="card px-3 py-6 text-center text-xs text-muted">Empty</div>
                  ) : (
                    column.map((lead) => (
                      <article key={lead.id} className="card p-3">
                        <Link href={`/leads/${lead.id}`} className="font-medium">
                          {lead.customer.companyName}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">{lead.title}</p>
                        {isTenderLeadStage(lead.stage) ? (
                          <Link
                            href={`/customers/${lead.customerId}?leadId=${lead.id}#tenders`}
                            className="mt-2 inline-block text-[0.7rem] font-semibold text-brass-dark"
                          >
                            Add tender response
                          </Link>
                        ) : null}
                        <div className="mt-2">
                          <StageSelect leadId={lead.id} stage={lead.stage} />
                        </div>
                        <div className="mt-2 border-t border-rule pt-2">
                          <p className="mb-1 text-[0.65rem] font-semibold tracking-[0.08em] text-muted uppercase">
                            Allocate
                          </p>
                          <AllocateAgents
                            leadId={lead.id}
                            agents={agents}
                            selectedIds={lead.allocations.map((allocation) => allocation.agentId)}
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
