import Link from "next/link";
import { BulkAllocate } from "@/components/bulk-allocate";
import { LeadKanban } from "@/components/lead-kanban";
import { PageHeader } from "@/components/ui";
import { exportHref, leadFilterParams, leadMatchesSearch, parseLeadFilters } from "@/lib/book-filters";
import { LEAD_STAGES } from "@/lib/constants";
import { loaBoardFlags } from "@/lib/lead-card";
import { ensureLeadBoardStages, resolveLeadBoardStage } from "@/lib/lead-board";
import type { SearchPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function LeadsPage({ searchParams }: SearchPageProps) {
  const query = await searchParams;
  const filters = parseLeadFilters(query);
  const { stage, agent, q } = filters;
  await ensureLeadBoardStages();

  const [leads, agents, envelopes] = await Promise.all([
    prisma.lead.findMany({
      where: { customer: { archivedAt: null } },
      include: {
        customer: {
          include: { meters: { select: { mpan: true, mprn: true, siteName: true, loaStatus: true } } },
        },
        allocations: { include: { agent: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
    prisma.loaEnvelope.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  const latestLoa = new Map<string, (typeof envelopes)[number]>();
  for (const item of envelopes) {
    if (!latestLoa.has(item.customerId)) latestLoa.set(item.customerId, item);
  }

  const filtered = leads.filter((lead) => {
    if (stage && resolveLeadBoardStage(lead) !== stage) return false;
    if (agent && !lead.allocations.some((allocation) => allocation.agentId === agent)) return false;
    return leadMatchesSearch(lead, q);
  });

  return (
    <div>
      <PageHeader
        kicker="Pipeline"
        title="Leads"
        description="Search the board, then filter by stage or agent. Cards show company, contact and LOA. Allocate sits in the dropdown. Drag a card to move it."
        actions={
          <>
            <a href={exportHref("/api/export/leads", leadFilterParams(filters))} className="btn btn-ghost">
              {stage || agent || q ? "Export this view" : "Export leads"}
            </a>
            <Link href="/import#leads" className="btn btn-ghost">
              Import leads
            </Link>
            <Link href="/leads/new" className="btn btn-primary">
              Open lead
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { stage: "", label: "All" },
          { stage: "Sent For Tender", label: "Sent For Tender" },
          { stage: "Tender Received", label: "Tender Received" },
          { stage: "Proposal Sent", label: "Proposal Sent" },
          { stage: "Won", label: "Won" },
        ].map((view) => {
          const href = exportHref("/leads", leadFilterParams({ ...filters, stage: view.stage, agent: "" }));
          const active = !agent && stage === view.stage;
          return (
            <Link
              key={view.label}
              href={href}
              className={`btn text-[0.75rem] ${active ? "btn-brass" : "btn-ghost"}`}
            >
              {view.label}
            </Link>
          );
        })}
      </div>

      <form className="card mb-4 grid gap-3 p-4 md:grid-cols-4" method="get" data-testid="leads-search">
        <label className="field md:col-span-2">
          <span>Search this board</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Company, contact, MPAN, MPRN…"
          />
        </label>
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
        <div className="flex items-end gap-2 md:col-span-4">
          <button type="submit" className="btn btn-brass flex-1 sm:flex-none">
            Apply
          </button>
          <Link href="/leads" className="btn btn-ghost flex-1 sm:flex-none">
            Clear
          </Link>
        </div>
      </form>

      <BulkAllocate agents={agents}>
        <LeadKanban
          stageFilter={stage}
          agents={agents}
          leads={filtered.map((lead) => {
            const loa = latestLoa.get(lead.customerId);
            const flags = loaBoardFlags(lead.customer.meters, loa);
            return {
              id: lead.id,
              title: lead.title,
              stage: lead.stage,
              notes: lead.notes,
              outcomeReason: lead.outcomeReason,
              customerId: lead.customerId,
              companyName: lead.customer.companyName,
              contactName: lead.customer.contactName,
              phone: lead.customer.phone,
              email: lead.customer.email,
              loaSent: flags.loaSent,
              loaReceived: flags.loaReceived,
              ownerNames: lead.allocations.map((allocation) => allocation.agent.name),
              allocations: lead.allocations.map((allocation) => ({ agentId: allocation.agentId })),
              loa: loa ? { sigLink: loa.sigLink, status: loa.status, channel: loa.channel } : null,
            };
          })}
        />
      </BulkAllocate>
    </div>
  );
}
