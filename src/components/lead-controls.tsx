"use client";

import { useEffect, useState } from "react";
import type { Agent } from "@prisma/client";
import { allocateLeadAgents, updateLeadStage } from "@/app/actions/leads";
import { isWonLeadStage, LEAD_STAGES, LOST_REASONS, WON_REASONS } from "@/lib/constants";

export function OutcomeReasonField({
  id,
  name,
  stage,
  defaultValue,
  compact,
}: {
  id: string;
  name: string;
  stage: string;
  defaultValue?: string | null;
  compact?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const presets = isWonLeadStage(stage) ? WON_REASONS : LOST_REASONS;
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-1">
        {presets.map((reason) => (
          <button
            key={reason}
            type="button"
            className={`btn ${compact ? "px-1.5 py-0.5 text-[0.65rem]" : "px-2 py-1 text-[0.7rem]"} ${
              value === reason ? "btn-brass" : "btn-ghost"
            }`}
            onClick={() => setValue(reason)}
          >
            {reason}
          </button>
        ))}
      </div>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={isWonLeadStage(stage) ? "Why was this won?" : "Why was this lost?"}
        className={compact ? "w-full border border-rule bg-card px-2 py-1 text-xs" : undefined}
      />
    </div>
  );
}

export function StageSelect({
  leadId,
  stage,
  onMove,
}: {
  leadId: string;
  stage: string;
  outcomeReason?: string | null;
  onMove?: (leadId: string, stage: string) => void;
}) {
  const [next, setNext] = useState(stage);

  useEffect(() => {
    setNext(stage);
  }, [stage]);

  function persistStage(value: string) {
    setNext(value);
    if (onMove) {
      onMove(leadId, value);
      return;
    }
    const formData = new FormData();
    formData.set("id", leadId);
    formData.set("stage", value);
    void updateLeadStage(formData);
  }

  return (
    <form
      action={onMove ? undefined : updateLeadStage}
      onSubmit={onMove ? (event) => event.preventDefault() : undefined}
      className="grid gap-1.5"
    >
      <input type="hidden" name="id" value={leadId} />
      <label className="sr-only" htmlFor={`stage-${leadId}`}>
        Stage
      </label>
      <select
        id={`stage-${leadId}`}
        name="stage"
        value={next}
        draggable={false}
        onChange={(event) => persistStage(event.target.value)}
        className="w-full border border-rule bg-card px-2 py-1 text-xs"
      >
        {LEAD_STAGES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </form>
  );
}

export function AllocateAgents({
  leadId,
  agents,
  selectedIds,
}: {
  leadId: string;
  agents: Agent[];
  selectedIds: string[];
}) {
  return (
    <form action={allocateLeadAgents} className="grid gap-1.5">
      <input type="hidden" name="id" value={leadId} />
      {agents.map((agent) => (
        <label key={agent.id} className="flex items-center gap-1.5 text-[0.72rem] text-ink">
          <input
            type="checkbox"
            name="agentIds"
            value={agent.id}
            defaultChecked={selectedIds.includes(agent.id)}
          />
          {agent.name.split(" ")[0]}
        </label>
      ))}
      <button className="btn btn-ghost px-2 py-1 text-[0.7rem]">Save allocation</button>
    </form>
  );
}

export function AllocateDisclosure({
  leadId,
  agents,
  selectedIds,
}: {
  leadId: string;
  agents: Agent[];
  selectedIds: string[];
}) {
  return (
    <details className="lead-allocate mt-2 border-t border-rule pt-2" data-testid="lead-allocate">
      <summary className="cursor-pointer text-[0.7rem] text-muted">
        <span className="font-semibold tracking-[0.08em] uppercase">Allocate</span>
      </summary>
      <div className="mt-2">
        <AllocateAgents leadId={leadId} agents={agents} selectedIds={selectedIds} />
      </div>
    </details>
  );
}
