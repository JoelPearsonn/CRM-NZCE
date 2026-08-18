import { CSV_LEAD_HEADERS, CSV_LEAD_LETTER_FIELDS } from "@/lib/constants";
import { csvLine, parseCsv, rowToRecord } from "@/lib/csv-import";
import { isEmail, optionalStr } from "@/lib/format";
import { isKnownLeadStageInput, resolveLeadBoardStage, withMondayGroupNote } from "@/lib/lead-board";

export type LeadImportAction = "CREATE_LEAD" | "UPDATE_LEAD" | "SKIP";

export type LeadPreviewRow = {
  line: number;
  companyName: string;
  email: string;
  title: string;
  stage: string;
  action: LeadImportAction;
  customerMatch: string | null;
  leadMatch: string | null;
  errors: string[];
  values: Record<string, string>;
};

export function leadsCsvTemplate() {
  return `${csvLine(CSV_LEAD_HEADERS)}\n${csvLine([
    "Example Bakery Ltd",
    "samira@example-bakery.co.uk",
    "Bakery electric renewal",
    "Sent For Tender",
    "Referral",
    "",
    "",
    "",
    "",
    "",
    "",
    "tom.brennan@nzce.co.uk",
    "Waiting on LOA",
  ])}\n`;
}

export function validateLeadRow(values: Record<string, string>, line: number): LeadPreviewRow {
  const errors: string[] = [];
  const companyName = values.companyName ?? "";
  const email = (values.email ?? "").toLowerCase();
  const title = values.title ?? "";
  const rawStage = values.stage ?? "";
  const notes = values.notes ?? "";
  const stage = resolveLeadBoardStage({ stage: rawStage, notes });

  if (!companyName) errors.push("Company name is required.");
  if (!email || !isEmail(email)) errors.push("A valid email is required to match the customer.");
  if (!title) errors.push("Lead title is required.");
  if (rawStage && !isKnownLeadStageInput(rawStage, notes)) {
    errors.push("Stage is not a known pipeline value.");
  }

  return {
    line,
    companyName,
    email,
    title,
    stage,
    action: errors.length ? "SKIP" : "CREATE_LEAD",
    customerMatch: null,
    leadMatch: null,
    errors,
    values: { ...values, email, stage, notes: withMondayGroupNote(notes, stage) },
  };
}

/** Only set letter fields when the CSV header includes them, so Monday imports do not wipe saved values. */
export function leadLetterFieldsFromCsv(values: Record<string, string>) {
  const next: Partial<Record<(typeof CSV_LEAD_LETTER_FIELDS)[number], string | null>> = {};
  for (const key of CSV_LEAD_LETTER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      next[key] = optionalStr(values[key]);
    }
  }
  return next;
}

export { parseCsv, rowToRecord };
