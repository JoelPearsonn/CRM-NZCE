"use client";

import { useActionState } from "react";
import { createVerifiedStaffPassword, type StaffVerifyState } from "@/app/actions/staff";
import { ErrorBanner, Field } from "@/components/ui";

const empty: StaffVerifyState = {};

export function CreateVerifiedPasswordForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [state, action, pending] = useActionState(createVerifiedStaffPassword, empty);

  return (
    <form action={action} className="card mt-6 grid gap-3 p-5" data-testid="staff-create-password">
      <input type="hidden" name="token" value={token} />
      <ErrorBanner message={state.error} />
      <p className="text-sm text-ink">{email}</p>
      <Field label="Create your password" name="password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>
      <Field label="Confirm password" name="confirm">
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save password and sign in"}
      </button>
    </form>
  );
}
