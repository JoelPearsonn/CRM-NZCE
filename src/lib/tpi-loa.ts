import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { logActivity } from "@/lib/activity";
import { DOCX_MIME, fillDocxTemplate, type LoaPlaceholderValues } from "@/lib/docx-fill";
import type { DeskPrisma } from "@/lib/prisma";

export type TpiLoaKind = "IE" | "JOOSE";

export type TpiLoaCustomer = {
  companyName: string;
  tradingName?: string | null;
  contactName: string;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postcode?: string | null;
  companyNumber?: string | null;
  country?: string | null;
  position?: string | null;
};

export type TpiLoaFields = {
  kind: TpiLoaKind;
  templateLabel: string;
  companyName: string;
  tradingName: string;
  addressLine1: string;
  town: string;
  country: string;
  postcode: string;
  companyNumber: string;
  loaDate: string;
  contactName: string;
  position: string;
  phone: string;
  email: string;
};

export type TpiLoaDocument = TpiLoaFields & {
  docx: Buffer;
  fileName: string;
  mimeType: string;
};

export function formatLoaDotDate(value: Date = new Date()) {
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${value.getFullYear()}`;
}

export function parseTpiLoaKind(raw: string | null | undefined): TpiLoaKind | null {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s+]+/g, "_");
  if (value === "IE" || value === "INFINITE" || value === "INFINITE_20" || value === "IE_LOA") return "IE";
  if (
    value === "J" ||
    value === "JOOSE" ||
    value === "JOOSE_UCR" ||
    value === "JOOSE_UCR_CONSULTANTS" ||
    value === "SOFT_LOA" ||
    value === "SOFTLOA"
  ) {
    return "JOOSE";
  }
  return null;
}

export function tpiLoaKindFromPartner(tpiPartner?: string | null): TpiLoaKind | null {
  return parseTpiLoaKind(tpiPartner);
}

export function tpiLoaKindFromDeals(
  deals: { tpiPartner?: string | null; updatedAt?: Date | string | null }[],
): TpiLoaKind | null {
  const ranked = [...deals].sort((left, right) => {
    const leftAt = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightAt = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    return rightAt - leftAt;
  });
  for (const deal of ranked) {
    const kind = tpiLoaKindFromPartner(deal.tpiPartner);
    if (kind) return kind;
  }
  return null;
}

export function tpiLoaTemplateLabel(kind: TpiLoaKind) {
  return kind === "IE" ? "IE LOA" : "SOFT_LOA";
}

export function tpiLoaTemplateFileName(kind: TpiLoaKind) {
  return kind === "IE" ? "IE_LOA.docx" : "SOFT_LOA.docx";
}

export function tpiLoaTemplatePath(kind: TpiLoaKind, root = process.cwd()) {
  return path.join(root, "templates", "loa", tpiLoaTemplateFileName(kind));
}

export function loadTpiLoaTemplate(kind: TpiLoaKind, options?: { root?: string; template?: Buffer | null }) {
  if (options?.template) return options.template;
  const file = tpiLoaTemplatePath(kind, options?.root);
  if (!existsSync(file)) return null;
  return readFileSync(file);
}

export function buildTpiLoaFields(
  customer: TpiLoaCustomer,
  kind: TpiLoaKind,
  now: Date = new Date(),
): TpiLoaFields {
  return {
    kind,
    templateLabel: tpiLoaTemplateLabel(kind),
    companyName: customer.companyName.trim(),
    tradingName: customer.tradingName?.trim() || "",
    addressLine1: customer.addressLine1?.trim() || "",
    town: customer.city?.trim() || "",
    country: customer.country?.trim() || "",
    postcode: customer.postcode?.trim() || "",
    companyNumber: customer.companyNumber?.trim() || "",
    loaDate: formatLoaDotDate(now),
    contactName: customer.contactName.trim(),
    position: customer.position?.trim() || "",
    phone: customer.phone?.trim() || "",
    email: customer.email.trim(),
  };
}

export function loaPlaceholderValues(fields: TpiLoaFields): LoaPlaceholderValues {
  return {
    companyName: fields.companyName,
    tradingName: fields.tradingName,
    addressLine1: fields.addressLine1,
    town: fields.town,
    country: fields.country,
    postcode: fields.postcode,
    companyNumber: fields.companyNumber,
    loaDate: fields.loaDate,
    contactName: fields.contactName,
    position: fields.position,
    phone: fields.phone,
    email: fields.email,
  };
}

export function buildTpiLoaDocument(
  customer: TpiLoaCustomer,
  kind: TpiLoaKind,
  template: Buffer,
  now: Date = new Date(),
): TpiLoaDocument {
  const fields = buildTpiLoaFields(customer, kind, now);
  const safe = fields.companyName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "customer";
  const prefix = kind === "IE" ? "IE-LOA" : "SOFT_LOA";
  return {
    ...fields,
    docx: fillDocxTemplate(template, loaPlaceholderValues(fields)),
    fileName: `${prefix}-${safe}.docx`,
    mimeType: DOCX_MIME,
  };
}

export async function generateTpiLoa(options: {
  customerId: string;
  kind?: string | null;
  leadId?: string | null;
  db: DeskPrisma;
  now?: Date;
  markRequested?: boolean;
  template?: Buffer | null;
  templatesRoot?: string;
}): Promise<{ error?: string; document?: TpiLoaDocument; kind?: TpiLoaKind }> {
  const customer = await options.db.customer.findUnique({
    where: { id: options.customerId },
    include: {
      deals: { select: { tpiPartner: true, updatedAt: true }, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!customer) return { error: "Customer not found." };

  const lead = options.leadId
    ? await options.db.lead.findUnique({
        where: { id: options.leadId },
        include: { deals: { select: { tpiPartner: true, updatedAt: true } } },
      })
    : null;
  const kind =
    parseTpiLoaKind(options.kind) ??
    tpiLoaKindFromDeals([...(lead?.deals ?? []), ...customer.deals]);
  if (!kind) return { error: "Choose IE LOA or SOFT_LOA." };

  const template = loadTpiLoaTemplate(kind, {
    root: options.templatesRoot,
    template: options.template,
  });
  if (!template) {
    return { error: `${tpiLoaTemplateLabel(kind)} Word template is not on the desk yet.` };
  }

  const document = buildTpiLoaDocument(
    {
      ...customer,
      position: lead?.jobTitle ?? "",
    },
    kind,
    template,
    options.now,
  );
  if (options.markRequested !== false) {
    await options.db.meter.updateMany({
      where: { customerId: customer.id, loaStatus: { notIn: ["SIGNED", "RECEIVED"] } },
      data: { loaStatus: "REQUESTED" },
    });
    await logActivity(
      customer.id,
      "LOA_GENERATED",
      `${document.templateLabel} generated for ${customer.companyName}. Download only — DocuSign was not used.`,
      undefined,
      options.db,
    );
  }
  return { document, kind };
}
