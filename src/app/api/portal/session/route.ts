import { NextResponse } from "next/server";
import { authenticatePortal, clearPortalCookie, getPortalAccount } from "@/lib/portal-auth";
import { portalSessionOf } from "@/lib/portal-data";

export async function GET() {
  const account = await getPortalAccount();
  if (!account) return NextResponse.json({ signedIn: false });
  return NextResponse.json(portalSessionOf(account));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    token?: string;
  };
  const result = await authenticatePortal(body);
  if ("error" in result) {
    return NextResponse.json({ signedIn: false, error: result.error }, { status: 401 });
  }
  return NextResponse.json(portalSessionOf(result.account));
}

export async function DELETE() {
  await clearPortalCookie();
  return NextResponse.json({ signedIn: false });
}
