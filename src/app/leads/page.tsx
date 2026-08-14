import Link from "next/link";
import { BulkAllocate, LeadSelect } from "@/components/bulk-allocate";
import { AllocateAgents, StageSelect } from "@/components/lead-controls";
import { EmptyState, PageHeader, StagePill } from "@/components/ui";
import { exportHref, leadFilterParams, parseLeadFilters } from "@/lib/book-filters";
import { isTenderLeadStage, LEAD_STAGES } from "@/lib/constants";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function LeadsPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const filters = parseLeadFilters(query);
  const { stage, agent } = filters;

  const [leads, agents] = await Promise.all([
    prisma.lead.findMany({
      where: { customer: { archivedAt: null } },
      include: {
        customer: true,
        allocations: { include: { agent: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
  ]);

  const filtered = leads.filter((lead) => {
    if (stage && lead.stage !== stage) return false;
    if (agent && !lead.allocations.some((allocation) => allocation.agentId === agent)) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        kicker="Pipeline"
        title="Leads"
        description="Filter by stage or agent. Move a card or allocate one or more people."
        actions={
          <>
            <a href={exportHref("/api/export/leads", leadFilterParams(filters))} className="btn btn-ghost">
              {stage || agent ? "Export this view" : "Export leads"}
            </a>
            <Link href="/leads/new" className="btn btn-primary">
              Open lead
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { href: "/leads", label: "All" },
          { href: "/leads?stage=TENDERING", label: "Tendering" },
          { href: "/leads?stage=LOA_REQUESTED", label: "LOA requested" },
          { href: "/leads?stage=QUOTED", label: "Quoted" },
          { href: "/leads?stage=SOLD", label: "Sold" },
        ].map((view) => {
          const current = stage ? `/leads?stage=${stage}` : "/leads";
          const active = !agent && view.href === current;
          return (
            <Link
              key={view.href}
              href={view.href}
              className={`btn text-[0.75rem] ${active ? "btn-brass" : "btn-ghost"}`}
            >
              {view.label}
            </Link>
          );
        })}
      </div>

      <form className="card mb-4 grid gap-3 p-4 md:grid-cols-3" method="get">
        <label className="field">
          <span>Stage</span>
          <select name="stage" defaultValue={stage}>
            <option value="">All stages</option>
            {LEAD_STAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Agent</span>
          <select name="agent" defaultValue={agent}>
            <option value="">Anyone</option>
            {agents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-brass">
            Apply
          </button>
          <Link href="/leads" className="btn btn-ghost">
            Clear
          </Link>
        </div>
      </form>

      {leads.length === 0 ? (
        <EmptyState
          title="Pipeline is empty"
          body="Add a customer first, then open a lead against them. You do not need the demo seed."
          actionHref="/leads/new"
          actionLabel="Open lead"
          secondaryHref="/customers/new"
          secondaryLabel="Add customer first"
        />
      ) : (
        <BulkAllocate agents={agents}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {LEAD_STAGES.filter((item) => !stage || item.value === stage).map((item) => {
            const column = filtered.filter((lead) => lead.stage === item.value);
            return (
              <section key={item.value} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <StagePill value={item.value} />
                  <span className="text-xs text-muted">{column.length}</span>
                </div>
                <div className="space-y-2">
                  {column.length === 0 ? (
                    <div className="card px-3 py-6 text-center text-xs text-muted">Empty</div>
                  ) : (
                    column.map((lead) => (
                      <article key={lead.id} className="card p-3">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <LeadSelect leadId={lead.id} />
                        </div>
                        <Link href={`/leads/${lead.id}`} className="font-medium">
                          {lead.customer.companyName}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted">{lead.title}</p>
                        {lead.outcomeReason && (lead.stage === "SOLD" || lead.stage === "LOST") ? (
                          <p className="mt-1 text-[0.7rem] text-ink">
                            {lead.stage === "SOLD" ? "Won" : "Lost"}: {lead.outcomeReason}
                          </p>
                        ) : null}
                        {isTenderLeadStage(lead.stage) ? (
                          <Link
                            href={`/customers/${lead.customerId}?leadId=${lead.id}#tenders`}
                            className="mt-2 inline-block text-[0.7rem] font-semibold text-brass-dark"
                          >
                            Add tender response
                          </Link>
                        ) : null}
                        <div className="mt-2">
                          <StageSelect
                            leadId={lead.id}
                            stage={lead.stage}
                            outcomeReason={lead.outcomeReason}
                          />
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
        </BulkAllocate>
      )}
    </div>
  );
}
