import { readZip, writeZip } from "@/lib/zip-store";

export const LOA_PLACEHOLDERS = [
  "companyName",
  "tradingName",
  "addressLine1",
  "town",
  "country",
  "postcode",
  "companyNumber",
  "loaDate",
  "contactName",
  "position",
  "phone",
  "email",
] as const;

export type LoaPlaceholderValues = Record<(typeof LOA_PLACEHOLDERS)[number], string>;

const WORD_XML = /^(word\/document\.xml|word\/header\d*\.xml|word\/footer\d*\.xml)$/;

export function isWordXmlPart(name: string) {
  return WORD_XML.test(name.replaceAll("\\", "/"));
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeRe(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function replaceDocxPlaceholder(xml: string, key: string, value: string) {
  const token = `{{${key}}}`;
  const chars = [...token];
  const flex = chars.map((ch) => escapeRe(ch)).join("((?:<[^>]+>)*)");
  return xml.replace(new RegExp(flex, "g"), (...args) => {
    const seps = args.slice(1, chars.length) as string[];
    return escapeXml(value) + seps.join("");
  });
}

export function fillDocxXml(xml: string, values: Partial<LoaPlaceholderValues> & Record<string, string>) {
  return LOA_PLACEHOLDERS.reduce(
    (next, key) => replaceDocxPlaceholder(next, key, values[key] ?? ""),
    xml,
  );
}

export function fillDocxTemplate(template: Buffer, values: Partial<LoaPlaceholderValues> & Record<string, string>) {
  const entries = readZip(template).map((entry) => {
    if (!isWordXmlPart(entry.name)) return entry;
    return { ...entry, data: Buffer.from(fillDocxXml(entry.data.toString("utf8"), values), "utf8") };
  });
  return writeZip(entries);
}

export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
