"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { str } from "@/lib/format";
import {
  createStaffSessionToken,
  passwordsMatch,
  staffPasswordConfigured,
  staffSessionCookieOptions,
  STAFF_COOKIE,
} from "@/lib/staff-auth";

export type StaffLoginState = { error?: string };

export async function signInStaff(
  _prev: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  if (!staffPasswordConfigured()) {
    return { error: "Staff sign-in is not configured on this desk." };
  }
  const password = str(formData.get("password"));
  if (!passwordsMatch(password, process.env.CRM_STAFF_PASSWORD ?? "")) {
    return { error: "That password is wrong." };
  }
  const token = createStaffSessionToken();
  if (!token) return { error: "Staff sign-in is not configured on this desk." };
  const store = await cookies();
  store.set(STAFF_COOKIE, token, staffSessionCookieOptions());
  redirect("/");
}

export async function signOutStaff() {
  const store = await cookies();
  store.delete(STAFF_COOKIE);
  redirect("/login");
}
