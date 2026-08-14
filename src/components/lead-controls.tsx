"use client";

import type { Agent } from "@prisma/client";
import { allocateLeadAgents, updateLeadStage } from "@/app/actions/leads";
import { LEAD_STAGES } from "@/lib/constants";

export function StageSelect({ leadId, stage }: { leadId: string; stage: string }) {
  return (
    <form action={updateLeadStage}>
      <input type="hidden" name="id" value={leadId} />
      <label className="sr-only" htmlFor={`stage-${leadId}`}>
        Stage
      </label>
      <select
        id={`stage-${leadId}`}
        name="stage"
        defaultValue={stage}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
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
