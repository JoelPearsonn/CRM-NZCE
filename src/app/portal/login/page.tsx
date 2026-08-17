"use client";

import { useActionState } from "react";
import { signInPortal, type PortalLoginState } from "@/app/actions/portal";
import { ErrorBanner, Field } from "@/components/ui";
import { HARBOUR_PORTAL_EMAIL, HARBOUR_PORTAL_PASSWORD } from "@/lib/portal-constants";

const empty: PortalLoginState = {};

export default function PortalLoginPage() {
  const [state, action, pending] = useActionState(signInPortal, empty);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-muted uppercase">
        Customer portal
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink">Your NZCE energy book</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to see your contracts, meters and renewal dates. This is your supply — not the
        broker desk.
      </p>
      <form action={action} className="card mt-6 grid gap-3 p-5" data-testid="portal-login">
        <ErrorBanner message={state.error} />
        <Field label="Email" name="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            defaultValue={HARBOUR_PORTAL_EMAIL}
            required
          />
        </Field>
        <Field label="Password" name="password">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            defaultValue={HARBOUR_PORTAL_PASSWORD}
            required
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-[0.7rem] text-muted">
          Demo: Harbour View · {HARBOUR_PORTAL_EMAIL} / {HARBOUR_PORTAL_PASSWORD}
        </p>
      </form>
    </div>
  );
}
