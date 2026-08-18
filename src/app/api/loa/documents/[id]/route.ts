import { NextResponse } from "next/server";
import { readLoaFile } from "@/lib/loa-files";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await prisma.loaDocument.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "No LOA copy on this customer." }, { status: 404 });
  }

  try {
    const bytes = await readLoaFile(document.storedName);
    const lower = document.fileName.toLowerCase();
    const type =
      document.mimeType ||
      (lower.endsWith(".pdf")
        ? "application/pdf"
        : lower.endsWith(".png")
          ? "image/png"
          : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
            ? "image/jpeg"
            : lower.endsWith(".docx")
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "application/octet-stream");

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `inline; filename="${document.fileName.replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "LOA file is missing from disk." }, { status: 404 });
  }
}
