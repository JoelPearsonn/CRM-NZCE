export const LEAD_STAGES = [
  { value: "Potential Lead Joel", label: "Potential Lead Joel" },
  { value: "Potential Lead Pauly", label: "Potential Lead Pauly" },
  { value: "Steve Madden Leads", label: "Steve Madden Leads" },
  { value: "Potential Lead Rory", label: "Potential Lead Rory" },
  { value: "Hot lead Joel", label: "Hot lead Joel" },
  { value: "Harry Accuradata Leads", label: "Harry Accuradata Leads" },
  { value: "Hot Leads Rory", label: "Hot Leads Rory" },
  { value: "Sent For Tender", label: "Sent For Tender" },
  { value: "Tender Received", label: "Tender Received" },
  { value: "Set Up Call Completed", label: "Set Up Call Completed" },
  { value: "Proposal Sent", label: "Proposal Sent" },
  { value: "Won", label: "Won" },
  { value: "Lost", label: "Lost" },
  { value: "Follow up at a Later Date", label: "Follow up at a Later Date" },
  { value: "Rory Follow up", label: "Rory Follow up" },
  { value: "Joel Follow Up", label: "Joel Follow Up" },
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number]["value"];

export const DEFAULT_LEAD_STAGE: LeadStage = "Potential Lead Joel";

export const OPEN_LEAD_STAGES = LEAD_STAGES.filter(
  (stage) => stage.value !== "Won" && stage.value !== "Lost",
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

export const TENDER_LEAD_STAGES = ["Sent For Tender", "Tender Received", "TENDERING", "QUOTED"] as const;

export function isTenderLeadStage(stage: string) {
  return (TENDER_LEAD_STAGES as readonly string[]).includes(stage);
}

export function isWonLeadStage(stage: string) {
  return stage === "Won" || stage === "SOLD";
}

export function isLostLeadStage(stage: string) {
  return stage === "Lost" || stage === "LOST";
}

export function isClosedLeadStage(stage: string) {
  return isWonLeadStage(stage) || isLostLeadStage(stage);
}

export const TPI_PARTNERS = [
  { value: "NONE", label: "None / direct", percent: 0 },
  { value: "JOOSE_UCR", label: "Joose + UCR", percent: 30 },
  { value: "JOOSE", label: "Joose", percent: 25 },
  { value: "INFINITE", label: "Infinite", percent: 20 },
] as const;

export const PAYMENT_STAGES = [
  { value: "ON_SIGN", label: "On Sign" },
  { value: "ON_LIVE", label: "On Live" },
  { value: "EOC", label: "EOC" },
] as const;

export const PAYOUT_TYPES = [
  { value: "SPLIT", label: "Split — On Sign / On Live / EOC" },
  { value: "RESIDUAL", label: "Monthly residual" },
] as const;

export const PAYOUT_PRESETS = [
  { value: "40_40_20", label: "40 / 40 / 20 · sign / live / EOC", percents: [40, 40, 20] },
  { value: "0_80_20", label: "0 / 80 / 20 · sign / live / EOC", percents: [0, 80, 20] },
  { value: "40_60", label: "40 / 60 · sign / live", percents: [40, 60, 0] },
  { value: "CUSTOM", label: "Custom %", percents: [40, 40, 20] },
] as const;

export function tpiPercentFor(value: string | null | undefined) {
  return TPI_PARTNERS.find((item) => item.value === value)?.percent ?? 0;
}

export const DEAL_STATUSES = [
  { value: "LIVE", label: "Live" },
  { value: "PENDING", label: "Pending start" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export const AGENT_ROLES = ["Admin", "Sales", "Operations", "Finance"] as const;

export const DESK_ADMIN_EMAIL = "joel.pearson@nzcenergy.co.uk";

export const QUARTERLY_MARKET_UPDATE_KEY = "QUARTERLY_MARKET_UPDATE";
export const QUARTERLY_MARKET_UPDATE_TITLE = "Send quarterly market update to all customers";

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
  "tpiPartner",
  "tpiPercent",
  "payoutType",
  "payoutSplit",
  "residualMonthly",
  "expectedDate1",
  "expectedDate2",
  "expectedDate3",
  "payment1",
  "payment2",
  "payment3",
  "payment1Fixed",
  "actualPaidDate",
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
  "contractStart",
  "contractEnd",
  "renewalDate",
  "currentRates",
  "meterType",
  "objectionStatus",
  "objectionNote",
] as const;

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((option) => option.value === value)?.label ?? value ?? "—";
}
