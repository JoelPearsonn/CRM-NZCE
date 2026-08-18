import { NextResponse } from "next/server";
import { readLoaFile } from "@/lib/loa-files";
import { prisma } from "@/lib/prisma";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;
  const { id } = await params;
  const envelope = await prisma.loaEnvelope.findUnique({
    where: { id },
    include: { customer: { select: { id: true } } },
  });
  if (!envelope?.customer) {
    return NextResponse.json({ error: "No filled LOA stored for this send." }, { status: 404 });
  }
  if (!envelope?.pdfStoredName || !envelope.pdfFileName) {
    return NextResponse.json({ error: "No filled LOA stored for this send." }, { status: 404 });
  }
  try {
    const bytes = await readLoaFile(envelope.pdfStoredName);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${envelope.pdfFileName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Filled LOA is missing from disk." }, { status: 404 });
  }
}
