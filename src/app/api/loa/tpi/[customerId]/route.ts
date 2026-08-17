import { NextResponse } from "next/server";
import { optionalStr, str } from "@/lib/format";
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const result = await loadLetter(customerId, request, false);
  if (result.error || !result.document) {
    return NextResponse.json({ error: result.error ?? "Could not build the LOA." }, { status: 400 });
  }
  const download = new URL(request.url).searchParams.get("download") === "1";
  if (download) {
    return new NextResponse(new Uint8Array(result.document.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${result.document.fileName}"`,
      },
    });
  }
  return new NextResponse(result.document.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  const result = await loadLetter(customerId, request, true);
  if (result.error || !result.document) {
    return NextResponse.json({ error: result.error ?? "Could not build the LOA." }, { status: 400 });
  }
  return new NextResponse(new Uint8Array(result.document.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.document.fileName}"`,
    },
  });
}
