/** Runtime checks only. Never construct Prisma until these pass. */

export const DESK_DATABASE_MISSING =
  "The desk database is not set. Add DATABASE_URL on the Vercel project (a Postgres URL from Neon or Vercel Postgres), then Redeploy.";

export function deskDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return env.DATABASE_URL?.trim() ?? "";
}

/** One pooled connection per warm function — avoids reconnecting a pool on every request. */
export function withServerlessPool(url: string) {
  if (!url || !isPostgresDatabaseUrl(url)) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "1");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    if (!parsed.searchParams.has("connect_timeout")) {
      parsed.searchParams.set("connect_timeout", "10");
    }
    return parsed.href;
  } catch {
    return url;
  }
}

export function isPostgresDatabaseUrl(url: string) {
  return /^postgres(ql)?:\/\//i.test(url);
}

export function isSqliteFileUrl(url: string) {
  return /^file:/i.test(url);
}

export function isRunningOnVercel(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.VERCEL || env.VERCEL_ENV);
}

/** Local SQLite (`file:…`) is fine on a laptop. On Vercel only Postgres works. */
export function isDeskDatabaseConfigured(env: NodeJS.ProcessEnv = process.env) {
  const url = deskDatabaseUrl(env);
  if (!url) return false;
  if (isSqliteFileUrl(url) && isRunningOnVercel(env)) return false;
  return isSqliteFileUrl(url) || isPostgresDatabaseUrl(url);
}
