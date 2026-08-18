import { NextResponse } from "next/server";
import { getPortalAccount } from "@/lib/portal-auth";
import { loadPortalBook } from "@/lib/portal-book";

export async function GET() {
  const account = await getPortalAccount();
  if (!account) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const book = await loadPortalBook(account.customerId);
  return NextResponse.json(book?.contracts ?? []);
}
