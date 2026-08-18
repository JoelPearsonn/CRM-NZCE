"use client";

import { useActionState } from "react";
import { signInStaff, type StaffLoginState } from "@/app/actions/staff";
import { ErrorBanner, Field } from "@/components/ui";

const empty: StaffLoginState = {};

export default function StaffLoginPage() {
  const [state, action, pending] = useActionState(signInStaff, empty);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-gold uppercase">
        NZCE brokerage desk
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink">Staff sign-in</h1>
      <p className="mt-2 text-sm text-muted">
        Use your own @nzcenergy.co.uk work email and password. There is no shared code and no
        public login provider.
      </p>
      <form action={action} className="card mt-6 grid gap-3 p-5" data-testid="staff-login">
        <ErrorBanner message={state.error} />
        <Field label="Work email" name="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="name@nzcenergy.co.uk"
            required
          />
        </Field>
        <Field label="Password" name="password">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Unlock desk writes"}
        </button>
        <p className="text-[0.7rem] text-muted">
          If no password hash is set for that work email, this form stays closed. After Joel signs
          in, an admin can set a hash on the Agents page. That hash never goes in git.
        </p>
      </form>
    </div>
  );
}
