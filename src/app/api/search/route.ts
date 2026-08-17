import { NextResponse } from "next/server";
import { searchBook } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const type = searchParams.get("type") ?? "";
  return NextResponse.json(await searchBook(q, type));
}
