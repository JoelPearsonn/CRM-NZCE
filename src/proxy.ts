import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedStaffApiPath, requestHasStaffSession, STAFF_DENIED } from "@/lib/staff-auth";

export function proxy(request: NextRequest) {
  if (!isProtectedStaffApiPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  if (requestHasStaffSession(request)) {
    return NextResponse.next();
  }
  return NextResponse.json(STAFF_DENIED, { status: 401 });
}

export const config = {
  matcher: ["/api/:path*"],
};
