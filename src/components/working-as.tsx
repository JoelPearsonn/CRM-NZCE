"use client";

import type { Agent } from "@prisma/client";
import { setWorkingAs } from "@/app/actions/session";
import { signOutStaff } from "@/app/actions/staff";

export function WorkingAsPicker({
  agents,
  currentId,
  staffSignedIn,
}: {
  agents: Agent[];
  currentId: string | null;
  staffSignedIn: boolean;
}) {
  const current = agents.find((agent) => agent.id === currentId);

  return (
    <div className="working-as text-right">
      <form action={setWorkingAs}>
        <label className="mb-0.5 block text-[0.68rem] font-semibold tracking-[0.12em] text-gold-soft uppercase" htmlFor="working-as">
          Working as
        </label>
        <select
          id="working-as"
          key={currentId ?? "desk"}
          name="agentId"
          defaultValue={currentId ?? ""}
          disabled={!staffSignedIn}
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
      </form>
      <p className="working-as-hint mt-0.5 text-[0.7rem] text-gold-soft/80">
        {staffSignedIn
          ? current
            ? `${current.name} · ${current.role}`
            : "Notes and activity stay unattributed"
          : "Writes and exports stay locked"}
      </p>
      {staffSignedIn ? (
        <form action={signOutStaff}>
          <button type="submit" className="mt-1 text-[0.68rem] font-semibold tracking-[0.08em] text-gold-soft uppercase">
            Lock desk
          </button>
        </form>
      ) : (
        <a href="/login" className="mt-1 inline-block text-[0.68rem] font-semibold tracking-[0.08em] text-gold-soft uppercase">
          Staff sign-in
        </a>
      )}
    </div>
  );
}
