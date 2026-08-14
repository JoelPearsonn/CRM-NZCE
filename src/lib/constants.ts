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

export const LOA_STATUSES = [
  { value: "NOT_REQUESTED", label: "Not requested" },
  { value: "REQUESTED", label: "Requested" },
  { value: "RECEIVED", label: "Received" },
  { value: "EXPIRED", label: "Expired" },
] as const;

export const METER_TYPES = [
  "Whole current",
  "CT",
  "Smart",
  "Traditional",
  "Prepayment",
] as const;

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

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((option) => option.value === value)?.label ?? value ?? "—";
}
