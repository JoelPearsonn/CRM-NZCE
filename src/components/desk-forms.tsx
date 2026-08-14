"use client";

import { useActionState } from "react";
import type { Agent } from "@prisma/client";
import { addCallNote, addTask, logEmail, type ActionState } from "@/app/actions/desk";
import { addCallRecording } from "@/app/actions/recordings";
import { ErrorBanner, Field } from "@/components/ui";
import { CALL_NOTE_KINDS } from "@/lib/constants";

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
      <fieldset className="grid gap-1.5">
        <legend className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted uppercase">
          What happened
        </legend>
        <div className="flex flex-wrap gap-3">
          {CALL_NOTE_KINDS.map((item) => (
            <label key={item.value} className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="kind"
                value={item.value}
                defaultChecked={item.value === "PHONE"}
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>
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

export function RecordingForm({
  customerId,
  agents,
  workingAsId,
}: {
  customerId: string;
  agents: Agent[];
  workingAsId?: string | null;
}) {
  const [state, action, pending] = useActionState(addCallRecording, empty);
  return (
    <form action={action} encType="multipart/form-data" className="grid gap-3 border-b border-rule p-4">
      <input type="hidden" name="customerId" value={customerId} />
      <ErrorBanner message={state.error} />
      <p className="text-xs text-muted">
        Store a call recording or a typed transcript. This does not dial or record a live line.
      </p>
      <Field label="Audio or transcript" name="file">
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".mp3,.wav,.m4a,.webm,.ogg,.txt,.vtt,.srt,audio/*,text/plain"
        />
      </Field>
      <Field label="Short note" name="note">
        <input
          id="note"
          name="note"
          required
          placeholder="Claire, 14 Aug — renewal walkthrough"
        />
      </Field>
      <div className="flex items-end gap-3">
        <Field label="Logged by" name="authorId">
          <select id="recordingAuthorId" name="authorId" defaultValue={workingAsId ?? ""}>
            <option value="">Desk</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn btn-primary mb-0.5" disabled={pending}>
          {pending ? "Saving…" : "Store file"}
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
