"use client";

import { DatabaseSetup } from "@/components/database-setup";

export default function DeskError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const message = error.message ?? "";
  const database =
    message.includes("DATABASE_URL") ||
    message.includes("database is not set") ||
    message.includes("Environment variable not found") ||
    message.includes("P1001") ||
    message.includes("P1003") ||
    message.includes("P1013") ||
    message.includes("P2021");

  if (database) {
    return <DatabaseSetup />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-gold uppercase">
        NZCE brokerage desk
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink">This page couldn’t load</h1>
      <p className="mt-2 text-sm text-muted">
        A server error occurred. If this is a new Vercel deploy, check that{" "}
        <span className="font-mono">DATABASE_URL</span> is a Postgres URL, not a SQLite file.
      </p>
    </div>
  );
}
