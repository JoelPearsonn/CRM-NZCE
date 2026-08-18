import { NextResponse } from "next/server";
import { readLoaFile } from "@/lib/loa-files";
import { prisma } from "@/lib/prisma";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ meterId: string }> },
) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  const { meterId } = await params;
  const meter = await prisma.meter.findUnique({
    where: { id: meterId },
    include: { customer: { select: { id: true } } },
  });
  if (!meter?.customer) {
    return NextResponse.json({ error: "No LOA copy on this meter." }, { status: 404 });
  }
  if (!meter?.loaStoredName || !meter.loaFileName) {
    return NextResponse.json({ error: "No LOA copy on this meter." }, { status: 404 });
  }

  try {
    const bytes = await readLoaFile(meter.loaStoredName);
    const lower = meter.loaFileName.toLowerCase();
    const type = lower.endsWith(".pdf")
      ? "application/pdf"
      : lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${meter.loaFileName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "LOA file is missing from disk." }, { status: 404 });
  }
}
