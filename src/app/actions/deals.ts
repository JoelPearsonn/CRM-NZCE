"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { liveDealOnSupply } from "@/lib/deals";
import { applyPayouts, applyResidual, parseDealPayments, resolveTpi } from "@/lib/deal-payouts";
import { rollupPayments } from "@/lib/finance";
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
  const payoutType = str(formData.get("payoutType")) === "RESIDUAL" ? "RESIDUAL" : "SPLIT";
  const parsedPayments = parseDealPayments(formData);
  if (parsedPayments.error) return { error: parsedPayments.error };

  const tpi = resolveTpi(
    str(formData.get("tpiPartner")) || "NONE",
    parseMoney(formData.get("tpiPercent")),
  );
  const gross = parseMoney(formData.get("estimatedCommission"));
  const contractStart = parseDate(formData.get("contractStart"));
  const contractEnd = parseDate(formData.get("contractEnd"));
  if (contractStart && contractEnd && contractEnd < contractStart) {
    return { error: "Contract end (CED) must be on or after contract start (CSD)." };
  }
  if (payoutType === "RESIDUAL" && (!contractStart || !contractEnd)) {
    return { error: "Monthly residual needs a live date (CSD) and CED." };
  }

  const residualMonthly = parseMoney(formData.get("residualMonthly"));
  const dealActualPaid = parseMoney(formData.get("actualPaid"));
  const dealActualPaidDate = parseDate(formData.get("actualPaidDate"));
  const existingPayments = id
    ? await prisma.dealPayment.findMany({ where: { dealId: id }, orderBy: { sortOrder: "asc" } })
    : [];
  const built =
    payoutType === "RESIDUAL" && contractStart && contractEnd
      ? applyResidual(gross, tpi.tpiPercent, contractStart, contractEnd, residualMonthly, existingPayments)
      : applyPayouts(gross, tpi.tpiPercent, parsedPayments.payments);

  const data = {
    customerId,
    meterId: optionalStr(formData.get("meterId")),
    leadId,
    salespersonId,
    supplier,
    fuelType,
    contractStart,
    contractEnd,
    renewalDate: parseDate(formData.get("renewalDate")) ?? contractEnd,
    status: str(formData.get("status")) || "LIVE",
    dueDate: built.rollup.dueDate,
    amountDue: built.rollup.amountDue,
    estimatedCommission: gross,
    actualPaid: payoutType === "RESIDUAL" ? built.rollup.actualPaid : dealActualPaid,
    actualPaidDate: payoutType === "RESIDUAL" ? null : dealActualPaidDate,
    tpiPartner: tpi.tpiPartner,
    tpiPercent: tpi.tpiPercent,
    payoutType,
    residualMonthly,
    notes: optionalStr(formData.get("notes")),
  };
  const paymentCreates = built.payments.map((row) => ({
    stage: row.stage,
    label: row.label,
    percent: row.percent,
    expectedDate: row.expectedDate,
    amountDue: row.amountDue,
    actualPaid: row.actualPaid,
    sortOrder: row.sortOrder,
  }));

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
        payments: {
          deleteMany: {},
          create: paymentCreates,
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
      payments: { create: paymentCreates },
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
    include: { customer: true, payments: { orderBy: { sortOrder: "asc" } } },
  });
  if (!deal) return { error: "Contract not found." };

  const actorId = await getWorkingAsId();
  let amountDue = deal.amountDue;
  let estimatedCommission = deal.estimatedCommission;
  let actualPaid = deal.actualPaid;

  if (deal.payments.length > 0 && deal.payoutType === "RESIDUAL") {
    for (const payment of deal.payments) {
      await prisma.dealPayment.update({
        where: { id: payment.id },
        data: {
          expectedDate: parseDate(formData.get(`paymentDate_${payment.id}`)) ?? payment.expectedDate,
          actualPaid: parseMoney(formData.get(`paymentPaid_${payment.id}`)) ?? 0,
        },
      });
    }
    const fresh = await prisma.dealPayment.findMany({
      where: { dealId: id },
      orderBy: { sortOrder: "asc" },
    });
    const rollup = rollupPayments(fresh);
    amountDue = rollup.amountDue;
    actualPaid = rollup.actualPaid;
    await prisma.deal.update({
      where: { id },
      data: { dueDate: rollup.dueDate, amountDue, actualPaid, actualPaidDate: null },
    });
  } else if (deal.payments.length > 0) {
    for (const payment of deal.payments) {
      await prisma.dealPayment.update({
        where: { id: payment.id },
        data: {
          expectedDate: parseDate(formData.get(`paymentDate_${payment.id}`)) ?? payment.expectedDate,
          amountDue: parseMoney(formData.get(`paymentAmount_${payment.id}`)) ?? payment.amountDue,
          actualPaid: 0,
        },
      });
    }
    const fresh = await prisma.dealPayment.findMany({
      where: { dealId: id },
      orderBy: { sortOrder: "asc" },
    });
    const rollup = rollupPayments(fresh);
    amountDue = rollup.amountDue;
    actualPaid = parseMoney(formData.get("actualPaid"));
    const actualPaidDate = parseDate(formData.get("actualPaidDate"));
    await prisma.deal.update({
      where: { id },
      data: { dueDate: rollup.dueDate, amountDue, actualPaid, actualPaidDate },
    });
  } else {
    amountDue = parseMoney(formData.get("amountDue"));
    estimatedCommission = parseMoney(formData.get("estimatedCommission"));
    actualPaid = parseMoney(formData.get("actualPaid"));
    await prisma.deal.update({
      where: { id },
      data: {
        dueDate: parseDate(formData.get("dueDate")),
        amountDue,
        estimatedCommission,
        actualPaid,
        actualPaidDate: parseDate(formData.get("actualPaidDate")),
      },
    });
  }
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
