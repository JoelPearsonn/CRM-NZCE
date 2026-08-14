import { CSV_LEAD_HEADERS, LEAD_STAGES } from "@/lib/constants";
import { csvLine, parseCsv, rowToRecord } from "@/lib/csv-import";
import { isEmail } from "@/lib/format";

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

const STAGES = new Set<string>(LEAD_STAGES.map((item) => item.value));

export function leadsCsvTemplate() {
  return `${csvLine(CSV_LEAD_HEADERS)}\n${csvLine([
    "Example Bakery Ltd",
    "samira@example-bakery.co.uk",
    "Bakery electric renewal",
    "TENDERING",
    "Referral",
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
  const stage = (values.stage ?? "NEW").toUpperCase();

  if (!companyName) errors.push("Company name is required.");
  if (!email || !isEmail(email)) errors.push("A valid email is required to match the customer.");
  if (!title) errors.push("Lead title is required.");
  if (!STAGES.has(stage)) errors.push("Stage is not a known pipeline value.");
  if ((stage === "SOLD" || stage === "LOST") && !(values.outcomeReason ?? "").trim()) {
    errors.push(stage === "SOLD" ? "Say why this was won." : "Say why this was lost.");
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
    values: { ...values, email, stage },
  };
}

export { parseCsv, rowToRecord };
