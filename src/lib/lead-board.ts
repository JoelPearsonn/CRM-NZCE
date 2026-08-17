import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_LEAD_STAGE,
  LEAD_STAGES,
  type LeadStage,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const LEGACY_LEAD_STAGE_MAP: Record<string, LeadStage> = {
  NEW: "Potential Lead Joel",
  CONTACTED: "Potential Lead Joel",
  LOA_REQUESTED: "Sent For Tender",
  TENDERING: "Sent For Tender",
  QUOTED: "Proposal Sent",
  SOLD: "Won",
  LOST: "Lost",
};

const STAGE_BY_KEY = new Map(
  LEAD_STAGES.flatMap((item) => [
    [item.value.toLowerCase(), item.value],
    [item.label.toLowerCase(), item.value],
  ]),
);

export function matchLeadStage(raw: string | null | undefined): LeadStage | null {
  const key = raw?.trim().toLowerCase();
  if (!key) return null;
  return STAGE_BY_KEY.get(key) ?? null;
}

export function parseMondayGroupNote(notes: string | null | undefined): LeadStage | null {
  if (!notes) return null;
  const match = notes.match(/^Monday group:\s*(.+)$/im);
  return matchLeadStage(match?.[1] ?? "");
}

export function withMondayGroupNote(notes: string | null | undefined, group: string) {
  const line = `Monday group: ${group}`;
  const text = notes?.trim() ?? "";
  if (!text) return line;
  if (/^Monday group:\s*.+$/im.test(text)) return text.replace(/^Monday group:\s*.+$/im, line);
  return `${text}\n${line}`;
}

export function resolveLeadBoardStage(lead: {
  stage?: string | null;
  notes?: string | null;
}): LeadStage {
  const stage = lead.stage?.trim() ?? "";
  const fromStage = matchLeadStage(stage);
  if (fromStage) return fromStage;
  const fromNotes = parseMondayGroupNote(lead.notes);
  if (fromNotes) return fromNotes;
  const fromLegacy = LEGACY_LEAD_STAGE_MAP[stage.toUpperCase()];
  if (fromLegacy) return fromLegacy;
  return DEFAULT_LEAD_STAGE;
}

export function isKnownLeadStageInput(raw: string | null | undefined, notes?: string | null) {
  const stage = raw?.trim() ?? "";
  if (!stage) return Boolean(parseMondayGroupNote(notes));
  return Boolean(matchLeadStage(stage) || LEGACY_LEAD_STAGE_MAP[stage.toUpperCase()] || parseMondayGroupNote(notes));
}

export async function ensureLeadBoardStages(db: PrismaClient = prisma) {
  const leads = await db.lead.findMany({ select: { id: true, stage: true, notes: true } });
  let updated = 0;
  for (const lead of leads) {
    const stage = resolveLeadBoardStage(lead);
    if (stage === lead.stage) continue;
    await db.lead.update({ where: { id: lead.id }, data: { stage } });
    updated += 1;
  }
  return updated;
}
