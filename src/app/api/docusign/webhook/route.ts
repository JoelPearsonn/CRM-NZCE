import { NextResponse } from "next/server";
import { parseDocusignWebhook, verifyDocusignWebhookRequest } from "@/lib/docusign";
import { completeLoaEnvelope } from "@/lib/loa-send";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyDocusignWebhookRequest(raw, request.headers)) {
    return NextResponse.json({ error: "Webhook signature rejected." }, { status: 401 });
  }

  let payload: unknown = {};
  const contentType = request.headers.get("content-type") ?? "";
  try {
    payload = contentType.includes("json")
      ? (raw ? JSON.parse(raw) : {})
      : Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return NextResponse.json({ error: "Could not read DocuSign payload." }, { status: 400 });
  }
  const event = parseDocusignWebhook(payload);
  if (!event) return NextResponse.json({ error: "Envelope id missing." }, { status: 400 });
  const result = await completeLoaEnvelope(event.envelopeId, event.status);
  if (result.error) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}
