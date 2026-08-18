import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const STAFF_COOKIE = "nzce_staff_session";
export const STAFF_SESSION_HOURS = 12;
export const STAFF_SESSION_MAX_AGE = STAFF_SESSION_HOURS * 60 * 60;
export const STAFF_DENIED = { error: "Staff sign-in required." } as const;

type EnvMap = Record<string, string | undefined>;

export function staffPasswordConfigured(env: EnvMap = process.env) {
  return Boolean(env.CRM_STAFF_PASSWORD?.length);
}

export function staffSigningSecret(env: EnvMap = process.env) {
  const explicit = env.CRM_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  const password = env.CRM_STAFF_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(`nzce-staff:${password}`).digest("hex");
}

export function passwordsMatch(provided: string, expected: string) {
  if (!provided || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createStaffSessionToken(now = Date.now(), env: EnvMap = process.env) {
  const secret = staffSigningSecret(env);
  if (!staffPasswordConfigured(env) || !secret) return null;
  const exp = now + STAFF_SESSION_MAX_AGE * 1000;
  const payload = `v1.${now}.${exp}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyStaffSessionToken(
  token: string | undefined | null,
  now = Date.now(),
  env: EnvMap = process.env,
) {
  if (!staffPasswordConfigured(env)) return false;
  const secret = staffSigningSecret(env);
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const issued = Number(parts[1]);
  const exp = Number(parts[2]);
  const signature = parts[3];
  if (!Number.isFinite(issued) || !Number.isFinite(exp) || !signature) return false;
  if (exp <= now || issued > now + 60_000) return false;
  const payload = `v1.${parts[1]}.${parts[2]}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
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

export function requestHasStaffSession(request: Request, env: EnvMap = process.env) {
  return verifyStaffSessionToken(staffCookieFromRequest(request), Date.now(), env);
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
  agentId: string | null;
  agentExists: boolean;
}): { action: "deny" | "clear" | "set"; maxAge?: number } {
  if (!input.hasStaffSession) return { action: "deny" };
  if (!input.agentId) return { action: "clear" };
  if (!input.agentExists) return { action: "deny" };
  return { action: "set", maxAge: workingAsCookieMaxAge() };
}
