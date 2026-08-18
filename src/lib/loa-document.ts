import { FUEL_TYPES, labelFor } from "@/lib/constants";
import { formatMpan } from "@/lib/format";
import { buildSimplePdf, wrapPdfText, type PdfRun } from "@/lib/simple-pdf";

export const NZCE_BROKER_NAME = "NZC Energy (NZCE)";

export type LoaMeterInput = {
  siteName?: string | null;
  siteAddress?: string | null;
  fuelType: string;
  mpan?: string | null;
  mprn?: string | null;
};

export type LoaCustomerInput = {
  companyName: string;
  tradingName?: string | null;
  contactName: string;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  postcode?: string | null;
};

export type LoaDocument = {
  legalName: string;
  tradingName: string;
  contactName: string;
  email: string;
  phone: string;
  siteAddress: string;
  brokerName: string;
  supplies: {
    siteName: string;
    fuel: string;
    mpan: string;
    mprn: string;
    siteAddress: string;
  }[];
  html: string;
  pdf: Buffer;
  fileName: string;
};

function customerAddress(customer: LoaCustomerInput) {
  return [customer.addressLine1, customer.city, customer.postcode].filter(Boolean).join(", ");
}

export function buildLoaFields(customer: LoaCustomerInput, meters: LoaMeterInput[]) {
  const supplies = meters.map((meter) => ({
    siteName: meter.siteName?.trim() || "Site",
    fuel: labelFor(FUEL_TYPES, meter.fuelType),
    mpan: meter.mpan ? formatMpan(meter.mpan) : "-",
    mprn: meter.mprn?.trim() || "-",
    siteAddress: meter.siteAddress?.trim() || customerAddress(customer) || "-",
  }));
  const siteAddress =
    supplies.find((item) => item.siteAddress !== "-")?.siteAddress || customerAddress(customer) || "-";
  return {
    legalName: customer.companyName.trim(),
    tradingName: customer.tradingName?.trim() || customer.companyName.trim(),
    contactName: customer.contactName.trim(),
    email: customer.email.trim(),
    phone: customer.phone?.trim() || "-",
    siteAddress,
    brokerName: NZCE_BROKER_NAME,
    supplies,
  };
}

function letterParagraphs(fields: ReturnType<typeof buildLoaFields>) {
  return [
    "LETTER OF AUTHORITY",
    `To whom it may concern`,
    `I/We, ${fields.legalName}${fields.tradingName !== fields.legalName ? ` trading as ${fields.tradingName}` : ""}, appoint ${fields.brokerName} as our appointed energy broker.`,
    "This letter authorises NZCE to obtain consumption data and quotes, discuss our electricity and/or gas contracts, and receive tender responses for the supplies listed below. It does not authorise NZCE to enter a contract without our further instruction.",
    `Contact: ${fields.contactName}`,
    `Email: ${fields.email}`,
    `Phone: ${fields.phone}`,
    `Address: ${fields.siteAddress}`,
    "Supplies",
    ...fields.supplies.map(
      (supply, index) =>
        `${index + 1}. ${supply.siteName} | ${supply.fuel} | MPAN ${supply.mpan} | MPRN ${supply.mprn} | ${supply.siteAddress}`,
    ),
    "Customer signature ________________________    Date ________________",
    `Print name: ${fields.contactName}`,
    `Appointed broker: ${fields.brokerName}`,
  ];
}

function buildPdf(fields: ReturnType<typeof buildLoaFields>) {
  const runs: PdfRun[] = [];
  let y = 800;
  const left = 50;
  for (const [index, line] of letterParagraphs(fields).entries()) {
    const size = index === 0 ? 16 : 10;
    const bold = index === 0 || line === "Supplies";
    const wrapped = wrapPdfText(line, index === 0 ? 40 : 88);
    for (const part of wrapped) {
      runs.push({ text: part, x: left, y, size, bold });
      y -= index === 0 ? 22 : 16;
      if (y < 60) break;
    }
    y -= 6;
  }
  return buildSimplePdf([runs]);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildHtml(fields: ReturnType<typeof buildLoaFields>) {
  const rows = fields.supplies
    .map(
      (supply) =>
        `<tr><td>${escapeHtml(supply.siteName)}</td><td>${escapeHtml(supply.fuel)}</td><td>${escapeHtml(supply.mpan)}</td><td>${escapeHtml(supply.mprn)}</td><td>${escapeHtml(supply.siteAddress)}</td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <title>NZCE Letter of Authority — ${escapeHtml(fields.legalName)}</title>
  <style>
    body { font-family: "IBM Plex Sans", Georgia, serif; color: #101c18; margin: 2rem auto; max-width: 48rem; }
    h1 { font-size: 1.4rem; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { border-bottom: 1px solid #d6cdb8; text-align: left; padding: 0.4rem 0.3rem; vertical-align: top; }
    .sign { margin-top: 2.5rem; display: flex; gap: 3rem; }
    .line { border-top: 1px solid #101c18; width: 14rem; padding-top: 0.35rem; font-size: 0.8rem; }
  </style>
</head>
<body>
  <p>NZCE</p>
  <h1>Letter of Authority</h1>
  <p>I/We, <strong>${escapeHtml(fields.legalName)}</strong>${
    fields.tradingName !== fields.legalName ? ` trading as <strong>${escapeHtml(fields.tradingName)}</strong>` : ""
  }, appoint <strong>${escapeHtml(fields.brokerName)}</strong> as our appointed energy broker.</p>
  <p>This letter authorises NZCE to obtain consumption data and quotes, discuss our electricity and/or gas contracts, and receive tender responses for the supplies listed below. It does not authorise NZCE to enter a contract without our further instruction.</p>
  <p><strong>Contact</strong> ${escapeHtml(fields.contactName)}<br/>
  <strong>Email</strong> ${escapeHtml(fields.email)}<br/>
  <strong>Phone</strong> ${escapeHtml(fields.phone)}<br/>
  <strong>Address</strong> ${escapeHtml(fields.siteAddress)}</p>
  <h2>Supplies</h2>
  <table>
    <thead><tr><th>Site</th><th>Fuel</th><th>MPAN</th><th>MPRN</th><th>Site address</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sign">
    <div class="line">Customer signature</div>
    <div class="line">Date</div>
  </div>
  <p>Print name: ${escapeHtml(fields.contactName)}</p>
  <p>Appointed broker: ${escapeHtml(fields.brokerName)}</p>
</body>
</html>`;
}

export function buildLoaDocument(customer: LoaCustomerInput, meters: LoaMeterInput[]): LoaDocument {
  const fields = buildLoaFields(customer, meters);
  const safe = fields.legalName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "") || "customer";
  return {
    ...fields,
    html: buildHtml(fields),
    pdf: buildPdf(fields),
    fileName: `NZCE-LOA-${safe}.pdf`,
  };
}

export function loaTabValues(document: LoaDocument) {
  return {
    legal_name: document.legalName,
    trading_name: document.tradingName,
    contact_name: document.contactName,
    email: document.email,
    phone: document.phone,
    site_address: document.siteAddress,
    broker_name: document.brokerName,
    supplies: document.supplies
      .map((supply) => `${supply.siteName} | ${supply.fuel} | MPAN ${supply.mpan} | MPRN ${supply.mprn}`)
      .join("\n"),
  };
}
