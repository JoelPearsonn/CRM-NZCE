import { NextResponse } from "next/server";
import { parseDocusignWebhook, verifyDocusignWebhookRequest, type DocusignStatus } from "@/lib/docusign";
import { completeLoaEnvelope } from "@/lib/loa-send";

export async function handleDocusignWebhook(
  request: Request,
  complete: (
    envelopeId: string,
    status: DocusignStatus,
  ) => Promise<{ error?: string } & Record<string, unknown>> = completeLoaEnvelope,
) {
  const raw = await request.text();
  if (!verifyDocusignWebhookRequest(raw, request.headers)) {
    return NextResponse.json({ error: "Webhook signature rejected." }, { status: 401 });
  }

  let payload: unknown = {};
  const contentType = request.headers.get("content-type") ?? "";
  try {
    payload = contentType.includes("json")
      ? raw
        ? JSON.parse(raw)
        : {}
      : Object.fromEntries(new URLSearchParams(raw));
  } catch {
    return NextResponse.json({ error: "Could not read DocuSign payload." }, { status: 400 });
  }
  const event = parseDocusignWebhook(payload);
  if (!event) return NextResponse.json({ error: "Envelope id missing." }, { status: 400 });
  const result = await complete(event.envelopeId, event.status);
  if (result.error) return NextResponse.json(result, { status: 404 });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return handleDocusignWebhook(request);
}
