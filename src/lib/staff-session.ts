import { cookies } from "next/headers";
import { STAFF_COOKIE, STAFF_DENIED, verifyStaffSessionToken } from "@/lib/staff-auth";

export async function hasStaffSessionFromCookies(env: NodeJS.ProcessEnv = process.env) {
  try {
    const store = await cookies();
    return verifyStaffSessionToken(store.get(STAFF_COOKIE)?.value, Date.now(), env);
  } catch {
    return false;
  }
}

export async function staffActionError(): Promise<{ error: string } | null> {
  if (await hasStaffSessionFromCookies()) return null;
  return { error: STAFF_DENIED.error };
}
