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
      <h1 className="mt-2 font-serif text-3xl text-ink">
        {step === "create" ? "Create your password" : "Staff sign-in"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {step === "create"
          ? "Type a password only you know. It is hashed on this desk and never shown, logged, or put in git."
          : "Use your own @nzcenergy.co.uk work email. There is no shared code and no public login provider."}
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

        {step === "create" ? (
          <>
            <input type="hidden" name="email" value={state.email ?? ""} />
            <p className="text-sm text-ink">{state.email}</p>
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
            <button
              className="btn btn-primary"
              type="submit"
              name="intent"
              value="create"
              disabled={pending}
            >
              {pending ? "Saving…" : "Save password and sign in"}
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
          First time on a work email: create your own password. Later visits: the same email and
          password. Nobody else needs to know it. Writes stay locked until that step is done.
        </p>
      </form>
    </div>
  );
}
