"use client";

import { useActionState } from "react";
import { continueStaffLogin, type StaffLoginState } from "@/app/actions/staff";
import { ErrorBanner, Field } from "@/components/ui";

const empty: StaffLoginState = { step: "email" };

export default function StaffLoginPage() {
  const [state, action, pending] = useActionState(continueStaffLogin, empty);
  const step = state.step ?? "email";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-gold uppercase">
        NZCE brokerage desk
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink">Staff sign-in</h1>
      <p className="mt-2 text-sm text-muted">
        {step === "check"
          ? "A one-time link was sent to that work inbox. Open it to set your password."
          : "Use your own @nzcenergy.co.uk work email. First time: we email a verification link. Later visits: email and password only."}
      </p>
      <form action={action} className="card mt-6 grid gap-3 p-5" data-testid="staff-login">
        <ErrorBanner message={state.error} />

        {step === "email" ? (
          <>
            <Field label="Work email" name="email">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="name@nzcenergy.co.uk"
                defaultValue={state.email}
                required
              />
            </Field>
            <button
              className="btn btn-primary"
              type="submit"
              name="intent"
              value="email"
              disabled={pending}
            >
              {pending ? "Checking…" : "Continue"}
            </button>
          </>
        ) : null}

        {step === "check" ? (
          <>
            <p className="text-sm text-ink">{state.email}</p>
            <p className="text-sm text-muted">
              Check that inbox for the verification link. This page will not ask for a password
              until you open it.
            </p>
            <button
              className="btn btn-ghost"
              type="submit"
              name="intent"
              value="reset"
              formNoValidate
              disabled={pending}
            >
              Use a different email
            </button>
          </>
        ) : null}

        {step === "signin" ? (
          <>
            <input type="hidden" name="email" value={state.email ?? ""} />
            <p className="text-sm text-ink">{state.email}</p>
            <Field label="Password" name="password">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <button
              className="btn btn-primary"
              type="submit"
              name="intent"
              value="signin"
              disabled={pending}
            >
              {pending ? "Signing in…" : "Unlock desk writes"}
            </button>
            <button
              className="btn btn-ghost"
              type="submit"
              name="intent"
              value="reset"
              formNoValidate
              disabled={pending}
            >
              Use a different email
            </button>
          </>
        ) : null}

        <p className="text-[0.7rem] text-muted">
          Writes stay locked until the verification link is used and a password is set. Nobody else
          needs to know that password.
        </p>
      </form>
    </div>
  );
}
