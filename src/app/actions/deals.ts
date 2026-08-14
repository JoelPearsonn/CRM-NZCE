"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { liveDealOnSupply } from "@/lib/deals";
import { gbpExact, optionalStr, parseDate, parseMoney, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getWorkingAsId } from "@/lib/working-as";

export type ActionState = { error?: string };

export async function saveDeal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = optionalStr(formData.get("id"));
  const customerId = str(formData.get("customerId"));
  const supplier = str(formData.get("supplier"));
  const fuelType = str(formData.get("fuelType"));

  if (!customerId) return { error: "Choose a customer." };
  if (!supplier) return { error: "Supplier is required." };
  if (!fuelType) return { error: "Choose a fuel type." };

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer not found." };
  if (!id && customer.archivedAt) {
    return { error: "This customer is archived. Restore them before recording a deal." };
  }

  const clash = await liveDealOnSupply({
    dealId: id,
    meterId: optionalStr(formData.get("meterId")),
    status: str(formData.get("status")) || "LIVE",
  });
  if (clash) {
    const supply = clash.meter?.mpan || clash.meter?.mprn || "this supply";
    return {
      error: `A live contract already sits on ${supply} (${clash.supplier} · ${clash.customer.companyName}). One live contract per MPAN/MPRN.`,
    };
  }

  const agentIds = formData
    .getAll("agentIds")
    .map((value) => String(value))
    .filter(Boolean);
  const leadId = optionalStr(formData.get("leadId"));
  if (leadId && agentIds.length === 0) {
    const leadAgents = await prisma.leadAllocation.findMany({ where: { leadId } });
    agentIds.push(...leadAgents.map((row) => row.agentId));
  }
  const salespersonId = optionalStr(formData.get("salespersonId")) || agentIds[0] || null;

  const data = {
    customerId,
    meterId: optionalStr(formData.get("meterId")),
    leadId,
    salespersonId,
    supplier,
    fuelType,
    contractStart: parseDate(formData.get("contractStart")),
    contractEnd: parseDate(formData.get("contractEnd")),
    renewalDate: parseDate(formData.get("renewalDate")),
    status: str(formData.get("status")) || "LIVE",
    dueDate: parseDate(formData.get("dueDate")),
    amountDue: parseMoney(formData.get("amountDue")),
    estimatedCommission: parseMoney(formData.get("estimatedCommission")),
    actualPaid: parseMoney(formData.get("actualPaid")),
    notes: optionalStr(formData.get("notes")),
  };

  if (id) {
    const existing = await prisma.deal.findUnique({ where: { id } });
    if (!existing) return { error: "Contract not found." };
    await prisma.deal.update({
      where: { id },
      data: {
        ...data,
        allocations: {
          deleteMany: {},
          create: uniqueIds(agentIds.length ? agentIds : salespersonId ? [salespersonId] : []).map(
            (agentId) => ({ agentId }),
          ),
        },
      },
    });
    await recordFinanceChange(existing, {
      amountDue: data.amountDue,
      estimatedCommission: data.estimatedCommission,
      actualPaid: data.actualPaid,
    });
    await logActivity(
      customerId,
      "DEAL_UPDATED",
      `${supplier} contract updated for ${customer.companyName}.`,
    );
    revalidatePath("/");
    revalidatePath("/contracts");
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    revalidatePath("/finance");
    redirect(returnToCustomer(formData, customerId, id));
  }

  const deal = await prisma.deal.create({
    data: {
      ...data,
      allocations: {
        create: uniqueIds(agentIds.length ? agentIds : salespersonId ? [salespersonId] : []).map(
          (agentId) => ({ agentId }),
        ),
      },
    },
  });
  await logActivity(
    customerId,
    "DEAL_RECORDED",
    `${supplier} contract recorded for ${customer.companyName}.`,
  );
  revalidatePath("/");
  revalidatePath("/contracts");
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/finance");
  redirect(returnToCustomer(formData, customerId, deal.id));
}

async function recordFinanceChange(
  existing: { id: string; amountDue: number | null; estimatedCommission: number | null; actualPaid: number | null },
  next: { amountDue: number | null; estimatedCommission: number | null; actualPaid: number | null },
  actorId?: string | null,
) {
  const changed =
    existing.amountDue !== next.amountDue ||
    existing.estimatedCommission !== next.estimatedCommission ||
    existing.actualPaid !== next.actualPaid;
  if (!changed) return false;
  const actor = actorId === undefined ? await getWorkingAsId() : actorId;
  await prisma.dealReconciliation.create({
    data: {
      dealId: existing.id,
      actorId: actor,
      actualPaidOld: existing.actualPaid,
      actualPaidNew: next.actualPaid,
      amountDueOld: existing.amountDue,
      amountDueNew: next.amountDue,
      estimatedOld: existing.estimatedCommission,
      estimatedNew: next.estimatedCommission,
    },
  });
  return true;
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

function returnToCustomer(formData: FormData, customerId: string, dealId: string) {
  return str(formData.get("returnTo")) === "customer"
    ? `/customers/${customerId}`
    : `/contracts/${dealId}`;
}

export async function reconcileDeal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = str(formData.get("id"));
  if (!id) return { error: "Deal is missing." };

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!deal) return { error: "Contract not found." };

  const actualPaid = parseMoney(formData.get("actualPaid"));
  const amountDue = parseMoney(formData.get("amountDue"));
  const estimatedCommission = parseMoney(formData.get("estimatedCommission"));
  const dueDate = parseDate(formData.get("dueDate"));
  const actorId = await getWorkingAsId();

  await prisma.deal.update({
    where: { id },
    data: {
      dueDate,
      amountDue,
      estimatedCommission,
      actualPaid,
    },
  });
  const wrote = await recordFinanceChange(
    deal,
    { amountDue, estimatedCommission, actualPaid },
    actorId,
  );
  if (wrote) {
    await logActivity(
      deal.customerId,
      "FINANCE_RECONCILED",
      `${deal.supplier} actual paid ${gbpExact(deal.actualPaid)} → ${gbpExact(actualPaid)}.`,
      actorId,
    );
  }
  revalidatePath("/");
  revalidatePath("/contracts");
  revalidatePath("/customers");
  revalidatePath(`/customers/${deal.customerId}`);
  revalidatePath(`/contracts/${id}`);
  revalidatePath("/renewals");
  revalidatePath("/finance");
  return {};
}
