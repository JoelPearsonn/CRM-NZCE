"use client";

import type { Agent } from "@prisma/client";
import { setWorkingAs } from "@/app/actions/session";

export function WorkingAsPicker({
  agents,
  currentId,
}: {
  agents: Agent[];
  currentId: string | null;
}) {
  const current = agents.find((agent) => agent.id === currentId);

  return (
    <form action={setWorkingAs} className="working-as text-right">
      <label className="mb-0.5 block text-[0.68rem] font-semibold tracking-[0.12em] text-gold-soft uppercase" htmlFor="working-as">
        Working as
      </label>
      <select
        id="working-as"
        key={currentId ?? "desk"}
        name="agentId"
        defaultValue={currentId ?? ""}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-11 max-w-[12rem] border border-gold/40 bg-card px-2 text-base text-ink md:h-auto md:py-1 md:text-sm"
      >
        <option value="">Desk — no actor</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
      <p className="working-as-hint mt-0.5 text-[0.7rem] text-gold-soft/80">
        {current ? `${current.name} · ${current.role}` : "Notes and activity stay unattributed"}
      </p>
    </form>
  );
}
