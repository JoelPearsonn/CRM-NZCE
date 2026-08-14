export const LEAD_STAGES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "LOA_REQUESTED", label: "LOA requested" },
  { value: "TENDERING", label: "Tendering" },
  { value: "QUOTED", label: "Quoted" },
  { value: "SOLD", label: "Sold" },
  { value: "LOST", label: "Lost" },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]["value"];

export const OPEN_LEAD_STAGES = LEAD_STAGES.filter(
  (stage) => stage.value !== "SOLD" && stage.value !== "LOST",
).map((stage) => stage.value);

export const FUEL_TYPES = [
  { value: "ELECTRIC", label: "Electric" },
  { value: "GAS", label: "Gas" },
  { value: "DUAL", label: "Dual fuel" },
] as const;

export const SETTLEMENT_TYPES = [
  { value: "NHH", label: "NHH" },
  { value: "HH", label: "HH" },
] as const;

export const OBJECTION_STATUSES = [
  { value: "NONE", label: "None" },
  { value: "IN_OBJECTION", label: "In objection" },
  { value: "CLEARED", label: "Cleared" },
] as const;

export const LOA_STATUSES = [
  { value: "NOT_REQUESTED", label: "Not requested" },
  { value: "REQUESTED", label: "Requested" },
  { value: "RECEIVED", label: "Received" },
  { value: "SIGNED", label: "Signed" },
  { value: "EXPIRED", label: "Expired" },
] as const;

export const METER_TYPES = [
  "Whole current",
  "CT",
  "Smart",
  "Traditional",
  "Prepayment",
] as const;

export const TENDER_STATUSES = [
  { value: "RECEIVED", label: "Received" },
  { value: "DECLINED", label: "Declined" },
  { value: "PREFERRED", label: "Preferred" },
  { value: "EXPIRED", label: "Expired" },
] as const;

export const TENDER_LEAD_STAGES = ["TENDERING", "QUOTED"] as const;

export function isTenderLeadStage(stage: string) {
  return (TENDER_LEAD_STAGES as readonly string[]).includes(stage);
}

export const DEAL_STATUSES = [
  { value: "LIVE", label: "Live" },
  { value: "PENDING", label: "Pending start" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export const AGENT_ROLES = ["Sales", "Operations", "Finance"] as const;

export const UK_SUPPLIERS = [
  "British Gas",
  "EDF Energy",
  "E.ON Next",
  "Octopus Energy",
  "ScottishPower",
  "SSE",
  "TotalEnergies",
  "Yu Energy",
  "SmartestEnergy",
  "Opus Energy",
] as const;

export const WON_REASONS = [
  "Best price",
  "Service / existing relationship",
  "Contract length",
  "Green / renewable tariff",
  "Renewal timing",
] as const;

export const LOST_REASONS = [
  "Stayed with incumbent on price",
  "Went direct to supplier",
  "Another broker won",
  "No decision / went quiet",
  "Site closed / change of tenancy",
  "Objection not cleared",
] as const;

export const CALL_NOTE_KINDS = [
  { value: "PHONE", label: "Phone" },
  { value: "VISIT", label: "Visit" },
  { value: "NOTE", label: "Note" },
] as const;

export const CSV_LEAD_HEADERS = [
  "companyName",
  "email",
  "title",
  "stage",
  "source",
  "outcomeReason",
  "agentEmails",
  "notes",
] as const;

export const CSV_DEAL_HEADERS = [
  "companyName",
  "email",
  "supplier",
  "fuelType",
  "status",
  "siteName",
  "mpan",
  "mprn",
  "contractStart",
  "contractEnd",
  "renewalDate",
  "dueDate",
  "amountDue",
  "estimatedCommission",
  "actualPaid",
  "salespersonEmail",
  "agentEmails",
] as const;

export const CSV_IMPORT_HEADERS = [
  "companyName",
  "tradingName",
  "contactName",
  "email",
  "phone",
  "industry",
  "addressLine1",
  "city",
  "postcode",
  "siteName",
  "siteAddress",
  "fuelType",
  "mpan",
  "mprn",
  "electricEac",
  "gasAq",
  "supplier",
  "settlement",
  "loaStatus",
  "salespersonEmail",
] as const;

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((option) => option.value === value)?.label ?? value ?? "—";
}
