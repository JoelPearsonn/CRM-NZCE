"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { Agent } from "@prisma/client";
import { updateLeadStage } from "@/app/actions/leads";
import { LeadSelect } from "@/components/bulk-allocate";
import { LeadCardFacts } from "@/components/lead-card-facts";
import { AllocateDisclosure, StageSelect } from "@/components/lead-controls";
import { LeadLoaActions } from "@/components/send-loa";
import { isClosedLeadStage, isTenderLeadStage, isWonLeadStage } from "@/lib/constants";
import { leadBoardColumns, leadsInColumn } from "@/lib/lead-card";
import { resolveLeadBoardStage } from "@/lib/lead-board";

export type LeadCardData = {
  id: string;
  title: string;
  stage: string;
  notes: string | null;
  outcomeReason: string | null;
  customerId: string;
  companyName: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  loaSent: boolean;
  loaReceived: boolean;
  ownerNames: string[];
  allocations: { agentId: string }[];
  loa?: { sigLink: string | null; status: string; channel: string } | null;
};

export function LeadKanban({
  leads,
  agents,
  stageFilter,
}: {
  leads: LeadCardData[];
  agents: Agent[];
  stageFilter: string;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const columns = leadBoardColumns(stageFilter);

  function moveLead(leadId: string, stage: string) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || resolveLeadBoardStage(lead) === stage) return;
    setPendingId(leadId);
    const formData = new FormData();
    formData.set("id", leadId);
    formData.set("stage", stage);
    startTransition(async () => {
      await updateLeadStage(formData);
      setPendingId(null);
    });
  }

  return (
    <div className="lead-board" data-testid="lead-board" data-column-count={columns.length}>
      <div className="lead-board-row">
      {columns.map((item) => {
        const column = leadsInColumn(leads, item.value);
        return (
          <section
            key={item.value}
            className="lead-column"
            data-testid="lead-column"
            data-stage={item.value}
            data-count={column.length}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const leadId = event.dataTransfer.getData("text/lead-id");
              if (leadId) moveLead(leadId, item.value);
            }}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h2 className="text-[0.8rem] font-semibold leading-tight text-ink">{item.label}</h2>
              <span className="shrink-0 text-xs text-muted" data-testid="lead-column-count">
                {column.length}
              </span>
            </div>
            <div className="min-h-16 space-y-2 rounded-sm border border-dashed border-transparent p-0.5">
              {column.length === 0 ? (
                <div className="card px-3 py-6 text-center text-xs text-muted">Empty</div>
              ) : (
                column.map((lead) => (
                  <article
                    key={lead.id}
                    className={`card p-3 ${pendingId === lead.id ? "opacity-60" : ""}`}
                    data-testid="lead-card"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/lead-id", lead.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <LeadSelect leadId={lead.id} />
                    </div>
                    <Link href={`/leads/${lead.id}`} className="block">
                      <LeadCardFacts
                        companyName={lead.companyName}
                        contactName={lead.contactName}
                        phone={lead.phone}
                        email={lead.email}
                        loaSent={lead.loaSent}
                        loaReceived={lead.loaReceived}
                        owners={lead.ownerNames}
                      />
                    </Link>
                    {lead.outcomeReason && isClosedLeadStage(lead.stage) ? (
                      <p className="mt-1 text-[0.7rem] text-ink">
                        {isWonLeadStage(lead.stage) ? "Won" : "Lost"}: {lead.outcomeReason}
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
                        stage={resolveLeadBoardStage(lead)}
                        outcomeReason={lead.outcomeReason}
                      />
                    </div>
                    <LeadLoaActions customerId={lead.customerId} leadId={lead.id} latest={lead.loa} />
                    <AllocateDisclosure
                      leadId={lead.id}
                      agents={agents}
                      selectedIds={lead.allocations.map((allocation) => allocation.agentId)}
                    />
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}
