"use client";

import { setWorkingAs } from "@/app/actions/session";
import { signOutStaff } from "@/app/actions/staff";
import type { PublicAgent } from "@/lib/staff-auth";

export function WorkingAsPicker({
  agents,
  currentId,
  staffSignedIn,
  staffName,
}: {
  agents: PublicAgent[];
  currentId: string | null;
  staffSignedIn: boolean;
  staffName: string | null;
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
          disabled={!staffSignedIn || agents.length === 0}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
          className="h-11 max-w-[12rem] border border-gold/40 bg-card px-2 text-base text-ink md:h-auto md:py-1 md:text-sm"
        >
          {staffSignedIn && agents.length > 1 ? <option value="">Desk — no actor</option> : null}
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
            : staffName
              ? `Signed in as ${staffName}`
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
