import Link from "next/link";

export function DatabaseSetup() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-gold uppercase">
        NZCE brokerage desk
      </p>
      <h1 className="mt-2 font-serif text-3xl text-ink">Database isn’t set</h1>
      <p className="mt-2 text-sm text-muted" data-testid="database-not-set">
        This site is up, but it has no desk database. A local SQLite file does not work on Vercel.
      </p>
      <div className="card mt-6 grid gap-3 p-5 text-sm text-ink">
        <p>
          On the Vercel project, add this env var, then <strong>Redeploy</strong>:
        </p>
        <p className="font-mono text-[0.85rem]">
          <strong>DATABASE_URL</strong>
        </p>
        <p className="text-muted">
          Value: the Postgres connection string from a Neon or Vercel Postgres store created for
          this CRM. Use the pooled / Prisma URL they show (
          <span className="font-mono">postgresql://</span> or{" "}
          <span className="font-mono">postgres://</span>
          ). Do not invent a password here. Do not commit <span className="font-mono">.env</span>.
          Do not paste the URL into chat.
        </p>
        <p className="text-muted">
          After the store exists, push the schema from a machine that can reach it:{" "}
          <span className="font-mono">npx prisma db push</span>. Then Redeploy again if the first
          deploy ran before the URL was set.
        </p>
      </div>
      <p className="mt-4 text-sm text-muted">
        <Link href="/login" className="text-ink underline">
          Staff sign-in
        </Link>{" "}
        stays on this message until <span className="font-mono">DATABASE_URL</span> is a Postgres
        URL.
      </p>
    </div>
  );
}
