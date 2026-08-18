import { LEAD_STAGES } from "@/lib/constants";
import { resolveLeadBoardStage } from "@/lib/lead-board";

export function loaBoardFlags(
  meters: { loaStatus: string }[] = [],
  envelope?: { status?: string | null } | null,
) {
  const statuses = meters.map((meter) => meter.loaStatus);
  const loaReceived =
    statuses.some((status) => status === "RECEIVED" || status === "SIGNED") ||
    envelope?.status === "COMPLETED" ||
    envelope?.status === "RECEIVED";
  const loaSent =
    loaReceived || statuses.some((status) => status === "REQUESTED") || Boolean(envelope);
  return { loaSent, loaReceived };
}

export function leadBoardColumns(stageFilter = "") {
  return LEAD_STAGES.filter((item) => !stageFilter || item.value === stageFilter);
}

export function leadsInColumn<T extends { stage?: string | null; notes?: string | null }>(
  leads: T[],
  stage: string,
) {
  return leads.filter((lead) => resolveLeadBoardStage(lead) === stage);
}

export function countLeadsByColumn<T extends { stage?: string | null; notes?: string | null }>(
  leads: T[],
) {
  return Object.fromEntries(
    LEAD_STAGES.map((item) => [item.value, leadsInColumn(leads, item.value).length]),
  ) as Record<(typeof LEAD_STAGES)[number]["value"], number>;
}

export function ownerFirstNames(names: string[]) {
  return names.map((name) => name.split(" ")[0]).filter(Boolean);
}
