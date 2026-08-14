"use client";

import { useState } from "react";
import type { Agent } from "@prisma/client";
import { allocateLeadAgents, updateLeadStage } from "@/app/actions/leads";
import { LEAD_STAGES } from "@/lib/constants";

export function StageSelect({
  leadId,
  stage,
  outcomeReason,
}: {
  leadId: string;
  stage: string;
  outcomeReason?: string | null;
}) {
  const [next, setNext] = useState(stage);
  const needsReason = next === "SOLD" || next === "LOST";

  return (
    <form action={updateLeadStage} className="grid gap-1.5">
      <input type="hidden" name="id" value={leadId} />
      <label className="sr-only" htmlFor={`stage-${leadId}`}>
        Stage
      </label>
      <select
        id={`stage-${leadId}`}
        name="stage"
        value={next}
        onChange={(event) => {
          const value = event.target.value;
          setNext(value);
          if (value !== "SOLD" && value !== "LOST") {
            event.currentTarget.form?.requestSubmit();
          }
        }}
        className="w-full border border-rule bg-card px-2 py-1 text-xs"
      >
        {LEAD_STAGES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      {needsReason ? (
        <>
          <label className="sr-only" htmlFor={`reason-${leadId}`}>
            {next === "SOLD" ? "Won reason" : "Lost reason"}
          </label>
          <input
            id={`reason-${leadId}`}
            name="outcomeReason"
            required
            defaultValue={outcomeReason ?? ""}
            placeholder={next === "SOLD" ? "Why was this won?" : "Why was this lost?"}
            className="w-full border border-rule bg-card px-2 py-1 text-xs"
          />
          <button className="btn btn-brass px-2 py-1 text-[0.7rem]">Save stage</button>
        </>
      ) : null}
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
