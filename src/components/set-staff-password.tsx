"use client";

import { useActionState } from "react";
import { setStaffPassword, type StaffPasswordState } from "@/app/actions/staff";
import { ErrorBanner, Field } from "@/components/ui";

const empty: StaffPasswordState = {};

export function SetStaffPasswordForm({
  agentId,
  agentName,
}: {
  agentId: string;
  agentName: string;
}) {
  const [state, action, pending] = useActionState(setStaffPassword, empty);

  return (
    <form action={action} className="grid gap-2" data-testid={`set-staff-password-${agentId}`}>
      <input type="hidden" name="agentId" value={agentId} />
      <ErrorBanner message={state.error} />
      {state.saved ? <p className="text-[0.75rem] text-moss">{state.saved}</p> : null}
      <Field label={`Set password for ${agentName}`} name={`password-${agentId}`}>
        <input
          id={`password-${agentId}`}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>
      <button className="btn btn-ghost" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save hash"}
      </button>
    </form>
  );
}
