import type { PrismaClient } from "@prisma/client";
import {
  DESK_ADMIN_EMAIL,
  QUARTERLY_MARKET_UPDATE_KEY,
  QUARTERLY_MARKET_UPDATE_TITLE,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export function isDeskAdmin(agent: { role: string; email: string } | null | undefined) {
  if (!agent) return false;
  if (agent.role === "Admin") return true;
  return agent.email.trim().toLowerCase() === DESK_ADMIN_EMAIL;
}

function utcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function quarterStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1, 12, 0, 0, 0));
}

/** Next quarter day on or after `from`: 1 Jan, 1 Apr, 1 Jul, 1 Oct. */
export function nextQuarterDue(from: Date) {
  const year = from.getUTCFullYear();
  const fromDay = utcDay(from);
  for (const month of [0, 3, 6, 9]) {
    const start = Date.UTC(year, month, 1);
    if (start >= fromDay) return quarterStart(year, month);
  }
  return quarterStart(year + 1, 0);
}

/** After mark-done: the quarter start strictly after today and the due date just completed. */
export function rollQuarterDue(currentDue: Date, today: Date) {
  const latest = utcDay(today) > utcDay(currentDue) ? today : currentDue;
  const nextDay = new Date(latest);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextQuarterDue(nextDay);
}

export async function ensureQuarterlyMarketReminder(db: PrismaClient = prisma) {
  const existing = await db.deskReminder.findUnique({
    where: { key: QUARTERLY_MARKET_UPDATE_KEY },
  });
  if (existing) {
    if (existing.title !== QUARTERLY_MARKET_UPDATE_TITLE) {
      return db.deskReminder.update({
        where: { id: existing.id },
        data: { title: QUARTERLY_MARKET_UPDATE_TITLE },
      });
    }
    return existing;
  }
  return db.deskReminder.create({
    data: {
      key: QUARTERLY_MARKET_UPDATE_KEY,
      title: QUARTERLY_MARKET_UPDATE_TITLE,
      dueDate: nextQuarterDue(new Date()),
    },
  });
}
