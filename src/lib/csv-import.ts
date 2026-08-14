import { CSV_IMPORT_HEADERS, FUEL_TYPES, LOA_STATUSES } from "@/lib/constants";
import { isEmail } from "@/lib/format";

export type ImportAction = "CREATE_CUSTOMER" | "CREATE_METER" | "UPDATE_METER" | "SKIP";

export type ImportPreviewRow = {
  line: number;
  companyName: string;
  contactName: string;
  email: string;
  siteName: string;
  fuelType: string;
  mpan: string | null;
  mprn: string | null;
  action: ImportAction;
  customerMatch: string | null;
  meterMatch: string | null;
  errors: string[];
  values: Record<string, string>;
};

const FUELS = new Set<string>(FUEL_TYPES.map((item) => item.value));
const LOAS = new Set<string>(LOA_STATUSES.map((item) => item.value));

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

export function csvTemplate() {
  const header = CSV_IMPORT_HEADERS.join(",");
  const example = [
    "Example Bakery Ltd",
    "",
    "Samira Khan",
    "samira@example-bakery.co.uk",
    "0117 555 0000",
    "Food",
    "1 High Street",
    "Bristol",
    "BS1 1AA",
    "Stokes Croft",
    "44 Stokes Croft, Bristol BS1 3QD",
    "ELECTRIC",
    "1234567890123",
    "",
    "50000",
    "",
    "Octopus Energy",
    "NHH",
    "NOT_REQUESTED",
    "",
  ].join(",");
  return `${header}\n${example}\n`;
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function validMpan(value: string) {
  const digits = digitsOnly(value);
  return digits.length === 13 || digits.length === 21 || (digits.length >= 11 && digits.length <= 21);
}

export function validMprn(value: string) {
  const digits = digitsOnly(value);
  return digits.length >= 6 && digits.length <= 12;
}

export function rowToRecord(header: string[], cells: string[]) {
  const values: Record<string, string> = {};
  header.forEach((key, index) => {
    values[key] = (cells[index] ?? "").trim();
  });
  return values;
}

export function validateImportRow(values: Record<string, string>, line: number): ImportPreviewRow {
  const errors: string[] = [];
  const companyName = values.companyName ?? "";
  const contactName = values.contactName ?? "";
  const email = (values.email ?? "").toLowerCase();
  const fuelType = (values.fuelType ?? "ELECTRIC").toUpperCase();
  const mpan = digitsOnly(values.mpan ?? "") || null;
  const mprn = digitsOnly(values.mprn ?? "") || null;
  const siteName = values.siteName ?? "";

  if (!companyName) errors.push("Company name is required.");
  if (!contactName) errors.push("Contact name is required.");
  if (!email || !isEmail(email)) errors.push("A valid email is required.");
  if (!siteName) errors.push("Site name is required — meters sit on a site.");
  if (!FUELS.has(fuelType)) errors.push("Fuel must be ELECTRIC, GAS or DUAL.");
  if (!mpan && !mprn) errors.push("Enter an MPAN and/or MPRN.");
  if (mpan && !validMpan(mpan)) errors.push("MPAN should be 13 or 21 digits (11–21 accepted).");
  if (mprn && !validMprn(mprn)) errors.push("MPRN should be 6–12 digits.");
  if ((fuelType === "ELECTRIC" || fuelType === "DUAL") && !mpan) {
    errors.push("Electric / dual-fuel rows need an MPAN.");
  }
  if ((fuelType === "GAS" || fuelType === "DUAL") && !mprn) {
    errors.push("Gas / dual-fuel rows need an MPRN.");
  }
  if (values.loaStatus && !LOAS.has(values.loaStatus.toUpperCase())) {
    errors.push("LOA status is not a known value.");
  }

  return {
    line,
    companyName,
    contactName,
    email,
    siteName,
    fuelType,
    mpan,
    mprn,
    action: errors.length ? "SKIP" : "CREATE_METER",
    customerMatch: null,
    meterMatch: null,
    errors,
    values: { ...values, fuelType, email, mpan: mpan ?? "", mprn: mprn ?? "" },
  };
}
