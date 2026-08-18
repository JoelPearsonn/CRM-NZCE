import { NextResponse } from "next/server";
import { readLoaFile } from "@/lib/loa-files";
import { prisma } from "@/lib/prisma";
import { rejectUnlessStaff } from "@/lib/staff-auth";

export type LoaDocumentLookup = {
  fileName: string;
  storedName: string;
  mimeType: string | null;
  customer: { id: string } | null;
};

export async function handleLoaDocumentDownload(
  request: Request,
  id: string,
  deps: {
    findDocument: (id: string) => Promise<LoaDocumentLookup | null>;
    readFile: (storedName: string) => Promise<Buffer>;
  } = {
    findDocument: (documentId) =>
      prisma.loaDocument.findUnique({
        where: { id: documentId },
        include: { customer: { select: { id: true } } },
      }),
    readFile: readLoaFile,
  },
) {
  const denied = rejectUnlessStaff(request);
  if (denied) return denied;

  const document = await deps.findDocument(id);
  if (!document?.customer) {
    return NextResponse.json({ error: "No LOA copy on this customer." }, { status: 404 });
  }

  try {
    const bytes = await deps.readFile(document.storedName);
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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleLoaDocumentDownload(request, id);
}
