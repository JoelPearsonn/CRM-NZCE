import { NextResponse } from "next/server";
import { optionalStr, str } from "@/lib/format";
import { storeGeneratedLoaBytes } from "@/lib/loa-files";
import { prisma } from "@/lib/prisma";
import { generateTpiLoa, parseTpiLoaKind } from "@/lib/tpi-loa";

async function loadLetter(
  customerId: string,
  request: Request,
  markRequested: boolean,
) {
  const url = new URL(request.url);
  let formKind = "";
  let formLeadId: string | null = null;
  if (request.method === "POST") {
    const form = await request.formData();
    formKind = str(form.get("kind"));
    formLeadId = optionalStr(form.get("leadId"));
  }
  const kind = parseTpiLoaKind(formKind || url.searchParams.get("kind"));
  const leadId = formLeadId ?? optionalStr(url.searchParams.get("leadId"));
  return generateTpiLoa({
    customerId,
    kind,
    leadId,
    db: prisma,
    markRequested,
  });
}

function letterResponse(document: NonNullable<Awaited<ReturnType<typeof generateTpiLoa>>["document"]>, download: boolean) {
  return new NextResponse(new Uint8Array(document.docx), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.fileName}"`,
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const result = await loadLetter(customerId, request, false);
  if (result.error || !result.document) {
    return new NextResponse(result.error ?? "Could not build the LOA.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return letterResponse(result.document, new URL(request.url).searchParams.get("download") === "1");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const result = await loadLetter(customerId, request, true);
  if (result.error || !result.document) {
    return new NextResponse(result.error ?? "Could not build the LOA.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  try {
    const stored = await storeGeneratedLoaBytes(
      customerId,
      result.document.fileName,
      Buffer.from(result.document.docx),
      "docx",
    );
    await prisma.loaDocument.create({
      data: {
        customerId,
        fileName: stored.loaFileName,
        storedName: stored.loaStoredName,
        mimeType: result.document.mimeType,
        source: "GENERATED",
        note: result.document.templateLabel,
      },
    });
  } catch {
    // Download still works if the desk cannot keep a copy.
  }
  return letterResponse(result.document, true);
}
