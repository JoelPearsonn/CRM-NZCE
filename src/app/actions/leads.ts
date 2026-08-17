"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { DEFAULT_LEAD_STAGE, LEAD_STAGES, isClosedLeadStage, labelFor } from "@/lib/constants";
import { optionalStr, str } from "@/lib/format";
import { resolveLeadBoardStage, withMondayGroupNote } from "@/lib/lead-board";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string };

function agentIdsFrom(formData: FormData) {
  return formData
    .getAll("agentIds")
    .map((value) => String(value))
    .filter(Boolean);
}

export async function saveLead(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = optionalStr(formData.get("id"));
  const customerId = str(formData.get("customerId"));
  const title = str(formData.get("title"));
  const stage = resolveLeadBoardStage({
    stage: str(formData.get("stage")) || DEFAULT_LEAD_STAGE,
    notes: optionalStr(formData.get("notes")),
  });
  const outcomeReason = optionalStr(formData.get("outcomeReason"));
  const agentIds = agentIdsFrom(formData);

  if (!customerId) return { error: "Choose a customer." };
  if (!title) return { error: "Give the lead a title." };
  if (!LEAD_STAGES.some((item) => item.value === stage)) {
    return { error: "Choose a valid pipeline stage." };
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer not found." };
  if (!id && customer.archivedAt) {
    return { error: "This customer is archived. Restore them before opening a lead." };
  }

  const data = {
    customerId,
    title,
    stage,
    source: optionalStr(formData.get("source")),
    notes: withMondayGroupNote(optionalStr(formData.get("notes")), stage),
    outcomeReason: isClosedLeadStage(stage) ? outcomeReason : null,
  };

  if (id) {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return { error: "Lead not found." };
    await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        allocations: {
          deleteMany: {},
          create: agentIds.map((agentId) => ({ agentId })),
        },
      },
    });
    if (existing.stage !== stage) {
      await logActivity(
        customerId,
        "LEAD_STAGE_CHANGED",
        `${title} moved to ${labelFor(LEAD_STAGES, stage)}.`,
      );
    } else {
      await logActivity(customerId, "LEAD_UPDATED", `Lead updated: ${title}.`);
    }
    if (agentIds.length) {
      await logActivity(customerId, "AGENT_ALLOCATED", `Agents allocated on ${title}.`);
    }
    revalidatePath("/");
    revalidatePath("/leads");
    revalidatePath(`/customers/${customerId}`);
    redirect(`/leads/${id}`);
  }

  const lead = await prisma.lead.create({
    data: {
      ...data,
      allocations: {
        create: agentIds.map((agentId) => ({ agentId })),
      },
    },
  });
  await logActivity(customerId, "LEAD_CREATED", `Lead opened: ${title}.`);
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/leads/${lead.id}`);
}

export async function updateLeadStage(formData: FormData) {
  const id = str(formData.get("id"));
  const requested = str(formData.get("stage"));
  const outcomeReason = optionalStr(formData.get("outcomeReason"));
  if (!id) return;
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return;
  const stage = resolveLeadBoardStage({ stage: requested, notes: existing.notes });
  if (!LEAD_STAGES.some((item) => item.value === stage)) return;

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      stage,
      notes: withMondayGroupNote(existing.notes, stage),
      outcomeReason: isClosedLeadStage(stage) ? outcomeReason ?? existing.outcomeReason : null,
    },
    include: { customer: true },
  });
  await logActivity(
    lead.customerId,
    "LEAD_STAGE_CHANGED",
    `${lead.title} moved to ${labelFor(LEAD_STAGES, stage)}${outcomeReason ? ` — ${outcomeReason}` : ""}.`,
  );
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath(`/customers/${lead.customerId}`);
}

export async function allocateLeadAgents(formData: FormData) {
  const id = str(formData.get("id"));
  const agentIds = agentIdsFrom(formData);
  if (!id) return;

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      allocations: {
        deleteMany: {},
        create: agentIds.map((agentId) => ({ agentId })),
      },
    },
  });
  await logActivity(lead.customerId, "AGENT_ALLOCATED", `Sales allocation updated on ${lead.title}.`);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath(`/customers/${lead.customerId}`);
}

export async function bulkAllocateLeads(formData: FormData) {
  const leadIds = [
    ...new Set(formData.getAll("leadIds").map((value) => String(value)).filter(Boolean)),
  ];
  const agentIds = agentIdsFrom(formData);
  if (leadIds.length === 0 || agentIds.length === 0) return;

  const leads = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
  });

  for (const lead of leads) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        allocations: {
          deleteMany: {},
          create: agentIds.map((agentId) => ({ agentId })),
        },
      },
    });
    await logActivity(lead.customerId, "AGENT_ALLOCATED", `Bulk allocation on ${lead.title}.`);
    revalidatePath(`/customers/${lead.customerId}`);
    revalidatePath(`/leads/${lead.id}`);
  }
  revalidatePath("/leads");
}
