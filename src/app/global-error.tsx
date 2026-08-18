"use client";

import { DatabaseSetup } from "@/components/database-setup";

export default function GlobalDeskError({
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

  return (
    <html lang="en-GB">
      <body className="min-h-full bg-[#f7f6f1] text-[#07121f]">
        {database ? (
          <DatabaseSetup />
        ) : (
          <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
            <h1 className="text-3xl">This page couldn’t load</h1>
            <p className="mt-2 text-sm">
              A server error occurred. If this is a new Vercel deploy, add{" "}
              <span className="font-mono">DATABASE_URL</span> (Postgres) and Redeploy.
            </p>
          </div>
        )}
      </body>
    </html>
  );
}
