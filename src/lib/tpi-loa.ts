import type { PrismaClient } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { buildSimplePdf, wrapPdfText, type PdfRun } from "@/lib/simple-pdf";

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
  city: string;
  country: string;
  postcode: string;
  companyNumber: string;
  loaDate: string;
  validMonths: number;
  contactName: string;
  position: string;
  phone: string;
  email: string;
  appointedName: string;
  body: string[];
  footerName: string;
  footerAddress: string;
};

export type TpiLoaDocument = TpiLoaFields & {
  html: string;
  pdf: Buffer;
  fileName: string;
};

const IE_APPOINTED = "Infinite Energy Group Holdings Ltd";
const JOOSE_APPOINTED = "Joose Energy Ltd / UCR Consultants";

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
  return kind === "IE" ? "IE LOA (Infinite)" : "SOFT_LOA (Joose / Joose+UCR)";
}

export function buildTpiLoaFields(
  customer: TpiLoaCustomer,
  kind: TpiLoaKind,
  now: Date = new Date(),
): TpiLoaFields {
  const appointedName = kind === "IE" ? IE_APPOINTED : JOOSE_APPOINTED;
  const body =
    kind === "IE"
      ? [
          `I/We the undersigned hereby appoint ${IE_APPOINTED} to act as our authorised agent in respect of our electricity and/or gas supplies.`,
          `${IE_APPOINTED} may obtain billing and consumption information from current and previous suppliers and may receive quotations on our behalf.`,
          `This Letter of Authority is valid for 12 months from the date of this letter.`,
        ]
      : [
          `I/We the undersigned hereby appoint ${JOOSE_APPOINTED} to act as our authorised agent in respect of our electricity and/or gas supplies.`,
          `Joose / UCR Consultants may obtain consumption data, billing information and quotations, and may discuss our contracts with suppliers. They cannot enter into or terminate contracts without our permission.`,
          `This Letter of Authority is valid for 12 months from the date of this letter.`,
        ];

  return {
    kind,
    templateLabel: tpiLoaTemplateLabel(kind),
    companyName: customer.companyName.trim(),
    tradingName: customer.tradingName?.trim() || "",
    addressLine1: customer.addressLine1?.trim() || "",
    city: customer.city?.trim() || "",
    country: customer.country?.trim() || "United Kingdom",
    postcode: customer.postcode?.trim() || "",
    companyNumber: customer.companyNumber?.trim() || "",
    loaDate: formatLoaDotDate(now),
    validMonths: 12,
    contactName: customer.contactName.trim(),
    position: customer.position?.trim() || "",
    phone: customer.phone?.trim() || "",
    email: customer.email.trim(),
    appointedName,
    body,
    footerName: kind === "IE" ? IE_APPOINTED : "Joose Energy Ltd",
    footerAddress:
      kind === "IE"
        ? "7 Bell Yard, London WC2A 2JR"
        : "Athenaeum House, Newcastle Road, Sunderland SR5 1JT",
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function display(value: string) {
  return value || "—";
}

function letterFacts(fields: TpiLoaFields) {
  return [
    ["Company name", fields.companyName],
    ["Trading name", fields.tradingName],
    ["Address", fields.addressLine1],
    ["City", fields.city],
    ["Country", fields.country],
    ["Postcode", fields.postcode],
    ["Company number", fields.companyNumber],
    ["Date", fields.loaDate],
    ["Valid for", `${fields.validMonths} months`],
    ["Contact name", fields.contactName],
    ["Position", fields.position],
    ["Telephone", fields.phone],
    ["Email", fields.email],
  ] as const;
}

function buildHtml(fields: TpiLoaFields) {
  const facts = letterFacts(fields)
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(display(value))}</td></tr>`,
    )
    .join("");
  const paragraphs = fields.body.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(fields.templateLabel)} — ${escapeHtml(fields.companyName)}</title>
  <style>
    body { font-family: "Source Serif 4", Georgia, serif; color: #101c18; margin: 2rem auto; max-width: 44rem; line-height: 1.45; }
    .kicker { font-family: "IBM Plex Sans", sans-serif; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: #5d6c64; }
    h1 { font-size: 1.55rem; letter-spacing: 0.04em; margin: 0.35rem 0 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.92rem; margin: 1.25rem 0; }
    th { text-align: left; width: 11rem; padding: 0.28rem 0.4rem 0.28rem 0; color: #5d6c64; font-weight: 600; font-family: "IBM Plex Sans", sans-serif; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; vertical-align: top; }
    td { padding: 0.28rem 0; vertical-align: top; }
    .sign { margin-top: 2rem; }
    .line { border-top: 1px solid #101c18; width: 16rem; padding-top: 0.35rem; font-size: 0.8rem; }
    footer { margin-top: 2.5rem; padding-top: 0.8rem; border-top: 1px solid #d6cdb8; font-size: 0.82rem; color: #5d6c64; }
  </style>
</head>
<body>
  <p class="kicker">${escapeHtml(fields.templateLabel)}</p>
  <h1>Letter of Authority</h1>
  <p>${escapeHtml(fields.loaDate)}</p>
  <p>To whom it may concern</p>
  <table>${facts}</table>
  ${paragraphs}
  <div class="sign">
    <div class="line">Customer signature</div>
  </div>
  <p>Print name: ${escapeHtml(display(fields.contactName))}<br/>
  Position: ${escapeHtml(display(fields.position))}</p>
  <footer>
    <strong>${escapeHtml(fields.footerName)}</strong><br/>
    ${escapeHtml(fields.footerAddress)}
  </footer>
</body>
</html>`;
}

function buildPdf(fields: TpiLoaFields) {
  const runs: PdfRun[] = [];
  let y = 800;
  const left = 50;

  const add = (text: string, size: number, bold = false, gap = 16) => {
    const wrapped = wrapPdfText(text, size >= 14 ? 42 : 88);
    for (const part of wrapped) {
      runs.push({ text: part, x: left, y, size, bold });
      y -= size >= 14 ? 22 : 14;
    }
    y -= gap - 14;
  };

  add("LETTER OF AUTHORITY", 16, true, 8);
  add(fields.templateLabel, 10, true, 10);
  add(fields.loaDate, 10, false, 10);
  add("To whom it may concern", 10, false, 14);

  for (const [label, value] of letterFacts(fields)) {
    add(`${label}: ${display(value)}`, 10, false, 4);
  }
  y -= 8;
  for (const paragraph of fields.body) {
    add(paragraph, 10, false, 10);
  }
  y -= 8;
  add("Customer signature ________________________", 10, false, 10);
  add(`Print name: ${display(fields.contactName)}`, 10, false, 4);
  add(`Position: ${display(fields.position)}`, 10, false, 16);
  add(fields.footerName, 10, true, 4);
  add(fields.footerAddress, 10, false, 4);

  return buildSimplePdf([runs]);
}

export function buildTpiLoaDocument(
  customer: TpiLoaCustomer,
  kind: TpiLoaKind,
  now: Date = new Date(),
): TpiLoaDocument {
  const fields = buildTpiLoaFields(customer, kind, now);
  const safe = fields.companyName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "customer";
  const prefix = kind === "IE" ? "IE-LOA" : "SOFT_LOA";
  return {
    ...fields,
    html: buildHtml(fields),
    pdf: buildPdf(fields),
    fileName: `${prefix}-${safe}.pdf`,
  };
}

export async function generateTpiLoa(options: {
  customerId: string;
  kind?: string | null;
  leadId?: string | null;
  db: PrismaClient;
  now?: Date;
  markRequested?: boolean;
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
  if (!kind) return { error: "Choose the IE or Joose letter." };

  const document = buildTpiLoaDocument(customer, kind, options.now);
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
