import { logActivity } from "@/lib/activity";
import { getDocusignClient, isDocusignConfigured, type DocusignClient, type DocusignStatus } from "@/lib/docusign";
import { buildLoaDocument } from "@/lib/loa-document";
import { storeGeneratedLoaPdf } from "@/lib/loa-files";
import { prisma, type DeskPrisma } from "@/lib/prisma";

export type SendLoaResult = {
  error?: string;
  envelopeRecordId?: string;
  channel?: "DOWNLOAD" | "DOCUSIGN";
  status?: string;
  envelopeId?: string | null;
  sigLink?: string | null;
  pdfFileName?: string | null;
  connected?: boolean;
};

async function loadCustomer(customerId: string, db: DeskPrisma) {
  return db.customer.findUnique({
    where: { id: customerId },
    include: { meters: { orderBy: [{ siteName: "asc" }, { fuelType: "asc" }] } },
  });
}

export async function sendCustomerLoa(options: {
  customerId: string;
  leadId?: string | null;
  db?: DeskPrisma;
  docusign?: DocusignClient | null;
  env?: Record<string, string | undefined>;
}): Promise<SendLoaResult> {
  const db = options.db ?? prisma;
  const env = options.env ?? process.env;
  const customer = await loadCustomer(options.customerId, db);
  if (!customer) return { error: "Customer not found." };
  if (customer.meters.length === 0) return { error: "Add a meter before sending an LOA." };

  const document = buildLoaDocument(customer, customer.meters);
  const stored = await storeGeneratedLoaPdf(customer.id, document.fileName, document.pdf);
  const connected = options.docusign !== undefined ? Boolean(options.docusign) : isDocusignConfigured(env);
  const client = options.docusign === undefined ? getDocusignClient(env) : options.docusign;

  if (connected && client) {
    try {
      const created = await client.createLoaEnvelope({
        document,
        signerName: customer.contactName,
        signerEmail: customer.email,
      });
      const record = await db.loaEnvelope.create({
        data: {
          customerId: customer.id,
          leadId: options.leadId || null,
          envelopeId: created.envelopeId,
          sigLink: created.sigLink,
          status: "SENT",
          channel: "DOCUSIGN",
          sentAt: new Date(),
          pdfFileName: stored.loaFileName,
          pdfStoredName: stored.loaStoredName,
        },
      });
      await markMetersRequested(db, customer.id);
      await logActivity(
        customer.id,
        "LOA_SENT",
        `LOA sent via DocuSign to ${customer.email}. Envelope ${created.envelopeId}.`,
        undefined,
        db,
      );
      return {
        envelopeRecordId: record.id,
        channel: "DOCUSIGN",
        status: "SENT",
        envelopeId: created.envelopeId,
        sigLink: created.sigLink,
        pdfFileName: stored.loaFileName,
        connected: true,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "DocuSign did not send the LOA.",
        connected: true,
      };
    }
  }

  const record = await db.loaEnvelope.create({
    data: {
      customerId: customer.id,
      leadId: options.leadId || null,
      status: "SENT",
      channel: "DOWNLOAD",
      sentAt: new Date(),
      pdfFileName: stored.loaFileName,
      pdfStoredName: stored.loaStoredName,
    },
  });
  await markMetersRequested(db, customer.id);
  await logActivity(
    customer.id,
    "LOA_SENT",
    `LOA prepared for download. DocuSign is not connected. Status set to requested.`,
    undefined,
    db,
  );
  return {
    envelopeRecordId: record.id,
    channel: "DOWNLOAD",
    status: "SENT",
    envelopeId: null,
    sigLink: null,
    pdfFileName: stored.loaFileName,
    connected: false,
  };
}

async function markMetersRequested(db: DeskPrisma, customerId: string) {
  await db.meter.updateMany({
    where: { customerId, loaStatus: { notIn: ["SIGNED", "RECEIVED"] } },
    data: { loaStatus: "REQUESTED" },
  });
}

export async function completeLoaEnvelope(
  envelopeId: string,
  status: DocusignStatus,
  db: DeskPrisma = prisma,
) {
  const record = await db.loaEnvelope.findFirst({
    where: { envelopeId },
    include: { customer: true },
  });
  if (!record) return { error: "Envelope not on the book." };

  if (status === "completed") {
    await db.loaEnvelope.update({
      where: { id: record.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await db.meter.updateMany({
      where: { customerId: record.customerId, loaStatus: { not: "SIGNED" } },
      data: {
        loaStatus: "RECEIVED",
        loaSignedOn: new Date(),
        loaSignedBy: record.customer.contactName,
      },
    });
    await logActivity(
      record.customerId,
      "LOA_STATUS_CHANGED",
      `DocuSign LOA completed. Supplies marked received.`,
      undefined,
      db,
    );
    return { ok: true, status: "COMPLETED" as const };
  }

  if (status === "voided" || status === "declined") {
    await db.loaEnvelope.update({
      where: { id: record.id },
      data: { status: status.toUpperCase() },
    });
    return { ok: true, status: status.toUpperCase() };
  }

  await db.loaEnvelope.update({
    where: { id: record.id },
    data: { status: status === "delivered" ? "SENT" : record.status },
  });
  return { ok: true, status: record.status };
}

export async function syncOpenLoaEnvelopes(options?: {
  db?: DeskPrisma;
  docusign?: DocusignClient | null;
  env?: Record<string, string | undefined>;
}) {
  const db = options?.db ?? prisma;
  const env = options?.env ?? process.env;
  const client = options?.docusign === undefined ? getDocusignClient(env) : options.docusign;
  if (!client) return { error: "DocuSign is not connected.", updated: 0 };

  const open = await db.loaEnvelope.findMany({
    where: { channel: "DOCUSIGN", envelopeId: { not: null }, status: { in: ["SENT", "PREPARED"] } },
  });
  let updated = 0;
  for (const item of open) {
    if (!item.envelopeId) continue;
    const status = await client.getEnvelopeStatus(item.envelopeId);
    if (status === "completed" || status === "voided" || status === "declined") {
      await completeLoaEnvelope(item.envelopeId, status, db);
      updated += 1;
    }
  }
  return { updated };
}
