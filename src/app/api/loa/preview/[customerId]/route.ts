import { NextResponse } from "next/server";
import { buildLoaDocument } from "@/lib/loa-document";
import { prisma } from "@/lib/prisma";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  const { customerId } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { meters: { orderBy: [{ siteName: "asc" }, { fuelType: "asc" }] } },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  if (customer.meters.length === 0) {
    return NextResponse.json({ error: "Add a meter before previewing an LOA." }, { status: 400 });
  }
  const document = buildLoaDocument(customer, customer.meters);
  return new NextResponse(document.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
