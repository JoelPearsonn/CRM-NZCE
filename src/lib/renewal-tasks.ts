import { logActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { siteKey } from "@/lib/sites";

const TITLE_PREFIX = "Renewal due —";

export async function ensureRenewalReminderTasks() {
  const horizon = new Date();
  horizon.setHours(12, 0, 0, 0);
  horizon.setDate(horizon.getDate() + 90);

  const meters = await prisma.meter.findMany({
    where: {
      OR: [{ renewalDate: { lte: horizon } }, { contractEnd: { lte: horizon } }],
    },
    include: { customer: true, salesperson: true },
  });

  const dueMeters = meters.filter((meter) => {
    const date = meter.renewalDate ?? meter.contractEnd;
    return Boolean(date);
  });
  if (dueMeters.length === 0) return 0;

  const customerIds = [...new Set(dueMeters.map((meter) => meter.customerId))];
  const openTasks = await prisma.task.findMany({
    where: { customerId: { in: customerIds }, status: "OPEN" },
  });

  const groups = new Map<
    string,
    {
      customerId: string;
      siteName: string;
      supplies: string[];
      due: Date;
      assigneeId: string | null;
    }
  >();

  for (const meter of dueMeters) {
    const due = (meter.renewalDate ?? meter.contractEnd) as Date;
    const key = `${meter.customerId}:${siteKey(meter)}`;
    const supply = meter.mpan || meter.mprn;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        customerId: meter.customerId,
        siteName: meter.siteName?.trim() || "Unnamed site",
        supplies: supply ? [supply] : [],
        due,
        assigneeId: meter.salespersonId,
      });
    } else {
      if (supply && !existing.supplies.includes(supply)) existing.supplies.push(supply);
      if (due < existing.due) existing.due = due;
      if (!existing.assigneeId && meter.salespersonId) existing.assigneeId = meter.salespersonId;
    }
  }

  let created = 0;
  for (const group of groups.values()) {
    const already = openTasks.some((task) => {
      const title = task.title.toLowerCase();
      if (task.customerId !== group.customerId) return false;
      if (!title.includes("renewal")) return false;
      if (title.includes(`${TITLE_PREFIX} ${group.siteName}`.toLowerCase())) return true;
      if (group.supplies.some((supply) => title.includes(supply.toLowerCase()))) return true;
      return false;
    });
    if (already) continue;

    const supplyNote = group.supplies[0] ? ` · ${group.supplies[0]}` : "";
    const title = `${TITLE_PREFIX} ${group.siteName}${supplyNote}`;
    await prisma.task.create({
      data: {
        customerId: group.customerId,
        title,
        dueDate: group.due,
        assigneeId: group.assigneeId,
        status: "OPEN",
      },
    });
    await logActivity(
      group.customerId,
      "TASK_CREATED",
      `Renewal reminder opened for ${group.siteName}.`,
    );
    created += 1;
  }

  return created;
}
