import { NextResponse } from "next/server";
import { parseDocusignWebhook } from "@/lib/docusign";
import { completeLoaEnvelope } from "@/lib/loa-send";

export async function POST(request: Request) {
  let payload: unknown = {};
  const contentType = request.headers.get("content-type") ?? "";
  try {
    payload = contentType.includes("json") ? await request.json() : Object.fromEntries(new URLSearchParams(await request.text()));
  } catch {
    return NextResponse.json({ error: "Could not read DocuSign payload." }, { status: 400 });
  }
  const event = parseDocusignWebhook(payload);
  if (!event) return NextResponse.json({ error: "Envelope id missing." }, { status: 400 });
  const result = await completeLoaEnvelope(event.envelopeId, event.status);
  if (result.error) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}
