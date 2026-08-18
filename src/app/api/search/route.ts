import { NextResponse } from "next/server";
import { searchBook } from "@/lib/search";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(request: Request) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") ?? "";
  return NextResponse.json(await searchBook(q, type));
}
