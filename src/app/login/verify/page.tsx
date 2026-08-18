import Link from "next/link";
import { readStaffVerifyToken } from "@/lib/staff-verify";
import { CreateVerifiedPasswordForm } from "./create-form";

export default async function StaffVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verified = await readStaffVerifyToken(token);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-gold uppercase">
        NZCE brokerage desk
      </p>
      {"error" in verified ? (
        <>
          <h1 className="mt-2 font-serif text-3xl text-ink">Link not valid</h1>
          <p className="mt-2 text-sm text-muted">{verified.error}</p>
          <p className="card mt-6 p-5 text-sm text-muted" data-testid="staff-verify-denied">
            Ask the desk to send a new verification email from /login. Forged, expired, or reused
            links cannot create a password.
          </p>
          <Link href="/login" className="btn btn-primary mt-4">
            Back to sign-in
          </Link>
        </>
      ) : (
        <>
          <h1 className="mt-2 font-serif text-3xl text-ink">Create your password</h1>
          <p className="mt-2 text-sm text-muted">
            Type a password only you know. It is hashed on this desk and never shown, logged, or
            put in git.
          </p>
          <CreateVerifiedPasswordForm email={verified.email} token={token ?? ""} />
        </>
      )}
    </div>
  );
}
