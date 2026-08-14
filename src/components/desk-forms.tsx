"use client";

import { useActionState } from "react";
import type { Agent } from "@prisma/client";
import { addCallNote, addTask, logEmail, type ActionState } from "@/app/actions/desk";
import { ErrorBanner, Field } from "@/components/ui";

const empty: ActionState = {};

export function NoteForm({
  customerId,
  agents,
  workingAsId,
}: {
  customerId: string;
  agents: Agent[];
  workingAsId?: string | null;
}) {
  const [state, action, pending] = useActionState(addCallNote, empty);
  return (
    <form action={action} className="grid gap-3 border-b border-rule p-4">
      <input type="hidden" name="customerId" value={customerId} />
      <ErrorBanner message={state.error} />
      <Field label="Call note" name="body">
        <textarea id="body" name="body" rows={3} required placeholder="What was said, who promised what…" />
      </Field>
      <div className="flex items-end gap-3">
        <Field label="Logged by" name="authorId">
          <select id="authorId" name="authorId" defaultValue={workingAsId ?? ""}>
            <option value="">Desk</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn btn-primary mb-0.5" disabled={pending}>
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
    </form>
  );
}

export function EmailForm({ customerId }: { customerId: string }) {
  const [state, action, pending] = useActionState(logEmail, empty);
  return (
    <form action={action} className="grid gap-3 border-b border-rule p-4">
      <input type="hidden" name="customerId" value={customerId} />
      <ErrorBanner message={state.error} />
      <Field label="Subject" name="subject">
        <input id="subject" name="subject" required />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="From" name="fromAddr">
          <input id="fromAddr" name="fromAddr" type="email" required defaultValue="desk@nzce.co.uk" />
        </Field>
        <Field label="To" name="toAddr">
          <input id="toAddr" name="toAddr" type="email" required />
        </Field>
      </div>
      <Field label="Body / summary" name="body">
        <textarea id="body" name="body" rows={3} required />
      </Field>
      <div className="flex justify-end">
        <button className="btn btn-ghost" disabled={pending}>
          {pending ? "Saving…" : "Log email"}
        </button>
      </div>
    </form>
  );
}

export function TaskForm({
  customerId,
  agents,
  workingAsId,
}: {
  customerId: string;
  agents: Agent[];
  workingAsId?: string | null;
}) {
  const [state, action, pending] = useActionState(addTask, empty);
  return (
    <form action={action} className="grid gap-3 border-b border-rule p-4">
      <input type="hidden" name="customerId" value={customerId} />
      <ErrorBanner message={state.error} />
      <Field label="Follow-up" name="title">
        <input id="title" name="title" required placeholder="Chase LOA, send quote pack…" />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Due" name="dueDate">
          <input id="dueDate" name="dueDate" type="date" />
        </Field>
        <Field label="Assignee" name="assigneeId">
          <select id="assigneeId" name="assigneeId" defaultValue={workingAsId ?? ""}>
            <option value="">Unassigned</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex justify-end">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Add follow-up"}
        </button>
      </div>
    </form>
  );
}
