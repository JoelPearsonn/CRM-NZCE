import { after } from "next/server";
import { ensureLeadBoardStages } from "@/lib/lead-board";
import { ensureRenewalReminderTasks } from "@/lib/renewal-tasks";

/** Run book housekeeping after the page is sent so a click is not waiting on it. */
export function scheduleLeadBoardStageSync() {
  after(() => {
    void ensureLeadBoardStages().catch(() => undefined);
  });
}

export function scheduleRenewalReminderSync() {
  after(() => {
    void ensureRenewalReminderTasks().catch(() => undefined);
  });
}
