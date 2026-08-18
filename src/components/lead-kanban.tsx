"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import type { Agent } from "@prisma/client";
import { updateLeadStage } from "@/app/actions/leads";
import { LeadSelect } from "@/components/bulk-allocate";
import { LeadCardFacts } from "@/components/lead-card-facts";
import { AllocateDisclosure, StageSelect } from "@/components/lead-controls";
import { LeadsJump } from "@/components/leads-jump";
import { LeadLoaActions } from "@/components/send-loa";
import { isClosedLeadStage, isTenderLeadStage, isWonLeadStage, LEAD_STAGES } from "@/lib/constants";
import { leadBoardColumns, leadsInColumn } from "@/lib/lead-card";
import { resolveLeadBoardStage } from "@/lib/lead-board";
import { scrollLeadsBoardToColumn, syncLeadsBoardScroller } from "@/lib/leads-board-scroll";

export type LeadCardData = {
  id: string;
  title: string;
  stage: string;
  notes: string | null;
  outcomeReason: string | null;
  customerId: string;
  companyName: string;
  contactName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  loaSent: boolean;
  loaReceived: boolean;
  ownerNames: string[];
  allocations: { agentId: string }[];
  loa?: { sigLink: string | null; status: string; channel: string } | null;
};

export function leadColumnDomId(stage: string) {
  return `lead-col-${stage.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function LeadKanban({
  leads,
  agents,
  stageFilter,
}: {
  leads: LeadCardData[];
  agents: Agent[];
  stageFilter: string;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const columns = leadBoardColumns(stageFilter);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const run = () => syncLeadsBoardScroller(board);
    run();
    const observer = new ResizeObserver(run);
    observer.observe(board);
    window.addEventListener("resize", run);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [columns.length, leads.length]);

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

  function jumpTo(stage: string) {
    const board = boardRef.current;
    if (board) scrollLeadsBoardToColumn(board, stage);
  }

  return (
    <div className="leads-board-shell lead-board-shell" data-testid="leads-board-shell">
      <LeadsJump stages={LEAD_STAGES} onJump={jumpTo} />
      <div
        ref={boardRef}
        className="leads-board lead-board"
        data-testid="leads-board"
        data-column-count={columns.length}
        style={{ ["--lead-col-count" as string]: String(columns.length) }}
      >
        <div className="leads-board-row lead-board-row">
          {columns.map((item) => {
            const column = leadsInColumn(leads, item.value);
            return (
              <section
                key={item.value}
                id={leadColumnDomId(item.value)}
                className="leads-column lead-column"
                data-testid="leads-column"
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
                <div className="leads-column-cards lead-column-cards space-y-2 rounded-sm border border-dashed border-transparent p-0.5">
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
                            jobTitle={lead.jobTitle}
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
    </div>
  );
}
