import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const STAFF_COOKIE = "nzce_staff_session";
export const STAFF_SESSION_HOURS = 12;
export const STAFF_SESSION_MAX_AGE = STAFF_SESSION_HOURS * 60 * 60;
export const STAFF_DENIED = { error: "Staff sign-in required." } as const;

export type StaffSession = { agentId: string };
export type PublicAgent = { id: string; name: string; email: string; role: string };

type EnvMap = Record<string, string | undefined>;

export function parseStaffPasswordHashes(env: EnvMap = process.env) {
  const raw = env.CRM_STAFF_PASSWORDS ?? "";
  const map = new Map<string, string>();
  for (const part of raw.split(/[\n,;]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const email = trimmed.slice(0, eq).trim().toLowerCase();
    const hash = trimmed.slice(eq + 1).trim();
    if (email && isStaffPasswordHash(hash)) map.set(email, hash);
  }
  return map;
}

export function isStaffPasswordHash(value: string) {
  const [salt, hash] = value.split(":");
  return Boolean(salt && hash && /^[a-f0-9]+$/i.test(salt) && /^[a-f0-9]+$/i.test(hash));
}

export function staffPasswordHashFor(
  email: string,
  storedHash: string | null | undefined,
  env: EnvMap = process.env,
) {
  if (storedHash && isStaffPasswordHash(storedHash)) return storedHash;
  return parseStaffPasswordHashes(env).get(email.trim().toLowerCase()) ?? null;
}

export function staffHasPassword(
  email: string,
  storedHash: string | null | undefined,
  env: EnvMap = process.env,
) {
  return Boolean(staffPasswordHashFor(email, storedHash, env));
}

export function staffSigningSecret(env: EnvMap = process.env) {
  const explicit = env.CRM_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  const bootstrap = env.CRM_STAFF_PASSWORDS?.trim();
  if (bootstrap) return createHash("sha256").update(`nzce-staff-hashes:${bootstrap}`).digest("hex");
  return null;
}

export function createStaffSessionToken(
  agentId: string,
  now = Date.now(),
  env: EnvMap = process.env,
) {
  const secret = staffSigningSecret(env);
  if (!secret || !agentId || agentId.includes(".")) return null;
  const exp = now + STAFF_SESSION_MAX_AGE * 1000;
  const payload = `v1.${agentId}.${now}.${exp}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyStaffSessionToken(
  token: string | undefined | null,
  now = Date.now(),
  env: EnvMap = process.env,
): StaffSession | null {
  const secret = staffSigningSecret(env);
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return null;
  const agentId = parts[1];
  const issued = Number(parts[2]);
  const exp = Number(parts[3]);
  const signature = parts[4];
  if (!agentId || agentId.includes(".") || !signature) return null;
  if (!Number.isFinite(issued) || !Number.isFinite(exp)) return null;
  if (exp <= now || issued > now + 60_000) return null;
  const payload = `v1.${agentId}.${parts[2]}.${parts[3]}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!timingSafeEqual(left, right)) return null;
  return { agentId };
}

export function staffSessionCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    maxAge: STAFF_SESSION_MAX_AGE,
  };
}

export function staffCookieFromRequest(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${STAFF_COOKIE}=`)) continue;
    return decodeURIComponent(trimmed.slice(STAFF_COOKIE.length + 1));
  }
  return undefined;
}

export function readStaffSessionFromRequest(request: Request, env: EnvMap = process.env) {
  return verifyStaffSessionToken(staffCookieFromRequest(request), Date.now(), env);
}

export function requestHasStaffSession(request: Request, env: EnvMap = process.env) {
  return Boolean(readStaffSessionFromRequest(request, env));
}

export function isProtectedStaffApiPath(pathname: string) {
  if (!pathname.startsWith("/api/")) return false;
  if (pathname === "/api/docusign/webhook" || pathname.startsWith("/api/docusign/webhook/")) {
    return false;
  }
  if (pathname === "/api/portal" || pathname.startsWith("/api/portal/")) {
    return false;
  }
  return true;
}

export function unauthorizedStaff() {
  return NextResponse.json(STAFF_DENIED, { status: 401 });
}

export function rejectUnlessStaff(request: Request, env: EnvMap = process.env) {
  if (requestHasStaffSession(request, env)) return null;
  return unauthorizedStaff();
}

export function workingAsCookieMaxAge() {
  return STAFF_SESSION_MAX_AGE;
}

export function workingAsCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: workingAsCookieMaxAge(),
  };
}

export function planWorkingAsCookie(input: {
  hasStaffSession: boolean;
  actorAgentId: string | null;
  actorIsAdmin: boolean;
  agentId: string | null;
  agentExists: boolean;
}): { action: "deny" | "clear" | "set"; maxAge?: number } {
  if (!input.hasStaffSession || !input.actorAgentId) return { action: "deny" };
  if (!input.agentId) return { action: "clear" };
  if (!input.agentExists) return { action: "deny" };
  if (!input.actorIsAdmin && input.agentId !== input.actorAgentId) return { action: "deny" };
  return { action: "set", maxAge: workingAsCookieMaxAge() };
}

export function publicAgentOf(agent: PublicAgent): PublicAgent {
  return { id: agent.id, name: agent.name, email: agent.email, role: agent.role };
}
