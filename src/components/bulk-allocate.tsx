"use client";

import { createContext, useContext, useState } from "react";
import type { Agent } from "@prisma/client";
import { bulkAllocateLeads } from "@/app/actions/leads";

const BulkSelectContext = createContext<{
  selected: string[];
  toggle: (id: string, on: boolean) => void;
} | null>(null);

export function BulkAllocate({
  agents,
  children,
}: {
  agents: Agent[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  function toggle(id: string, on: boolean) {
    setSelected((current) =>
      on ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    );
  }

  return (
    <BulkSelectContext.Provider value={{ selected, toggle }}>
      <form
        className="card mb-4 flex flex-wrap items-end gap-3 p-4"
        action={async (formData) => {
          setPending(true);
          await bulkAllocateLeads(formData);
          setSelected([]);
          setPending(false);
        }}
      >
        {selected.map((id) => (
          <input key={id} type="hidden" name="leadIds" value={id} />
        ))}
        <div className="min-w-[12rem]">
          <p className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
            Bulk allocate
          </p>
          <p className="text-sm text-muted">
            {selected.length === 0
              ? "Tick leads on the board, then assign one or more agents."
              : `${selected.length} lead${selected.length === 1 ? "" : "s"} selected`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {agents.map((agent) => (
            <label key={agent.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="agentIds" value={agent.id} />
              {agent.name}
            </label>
          ))}
        </div>
        <button className="btn btn-brass" disabled={pending || selected.length === 0}>
          {pending ? "Assigning…" : "Assign to selected"}
        </button>
      </form>
      <div className="leads-board-host min-w-0">{children}</div>
    </BulkSelectContext.Provider>
  );
}

export function LeadSelect({ leadId }: { leadId: string }) {
  const ctx = useContext(BulkSelectContext);
  const checked = ctx?.selected.includes(leadId) ?? false;
  return (
    <label className="flex items-center gap-1.5 text-[0.7rem] text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => ctx?.toggle(leadId, event.target.checked)}
      />
      Select
    </label>
  );
}
