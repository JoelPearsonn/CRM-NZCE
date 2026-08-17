import { NextResponse } from "next/server";
import { readLoaFile } from "@/lib/loa-files";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const envelope = await prisma.loaEnvelope.findUnique({ where: { id } });
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
