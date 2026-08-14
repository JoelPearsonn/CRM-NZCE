"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { CALL_NOTE_KINDS } from "@/lib/constants";
import { isEmail, optionalStr, parseDate, str } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string };

function refreshCustomer(customerId: string) {
  revalidatePath(`/customers/${customerId}`);
  revalidatePath("/");
}

export async function addCallNote(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const customerId = str(formData.get("customerId"));
  const body = str(formData.get("body"));
  const authorId = optionalStr(formData.get("authorId"));
  const kind = str(formData.get("kind")) || "NOTE";

  if (!customerId) return { error: "Customer is missing." };
  if (!body) return { error: "Write a call note before saving." };
  if (!CALL_NOTE_KINDS.some((item) => item.value === kind)) {
    return { error: "Choose phone, visit, or note." };
  }

  await prisma.callNote.create({
    data: { customerId, body, authorId, kind },
  });
  const label = CALL_NOTE_KINDS.find((item) => item.value === kind)?.label ?? "Note";
  await logActivity(customerId, "NOTE_ADDED", `${label} logged.`, authorId);
  refreshCustomer(customerId);
  return {};
}

export async function logEmail(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const customerId = str(formData.get("customerId"));
  const subject = str(formData.get("subject"));
  const fromAddr = str(formData.get("fromAddr"));
  const toAddr = str(formData.get("toAddr"));
  const body = str(formData.get("body"));

  if (!customerId) return { error: "Customer is missing." };
  if (!subject) return { error: "Subject is required." };
  if (!fromAddr || !isEmail(fromAddr)) return { error: "Enter a valid from address." };
  if (!toAddr || !isEmail(toAddr)) return { error: "Enter a valid to address." };
  if (!body) return { error: "Log the email body or a short summary." };

  await prisma.emailLog.create({
    data: {
      customerId,
      subject,
      fromAddr,
      toAddr,
      body,
      loggedAt: parseDate(formData.get("loggedAt")) ?? new Date(),
    },
  });
  await logActivity(customerId, "EMAIL_LOGGED", `Email logged: ${subject}.`);
  refreshCustomer(customerId);
  return {};
}

export async function addTask(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const customerId = str(formData.get("customerId"));
  const title = str(formData.get("title"));
  if (!customerId) return { error: "Customer is missing." };
  if (!title) return { error: "Give the follow-up a title." };

  await prisma.task.create({
    data: {
      customerId,
      title,
      dueDate: parseDate(formData.get("dueDate")),
      assigneeId: optionalStr(formData.get("assigneeId")),
    },
  });
  await logActivity(customerId, "TASK_CREATED", `Follow-up added: ${title}.`);
  refreshCustomer(customerId);
  return {};
}

export async function toggleTask(formData: FormData) {
  const id = str(formData.get("id"));
  if (!id) return;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return;
  const status = task.status === "OPEN" ? "DONE" : "OPEN";
  await prisma.task.update({ where: { id }, data: { status } });
  if (status === "DONE") {
    await logActivity(task.customerId, "TASK_COMPLETED", `Follow-up completed: ${task.title}.`);
  }
  refreshCustomer(task.customerId);
  revalidatePath("/tasks");
}
