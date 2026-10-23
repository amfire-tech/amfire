"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/forms";
import { inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";
import { updateMilestoneAction } from "../../actions";

const OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "awaiting_approval", label: "Ready for client approval" },
];

export function MilestoneForm({
  projectId,
  milestoneId,
  status,
  blockerNote,
}: {
  projectId: string;
  milestoneId: string;
  status: string;
  blockerNote: string | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateMilestoneAction.bind(null, projectId, milestoneId), undefined);
  const [value, setValue] = useState(status);

  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[220px_1fr_auto] sm:items-start">
      <label className="sr-only" htmlFor={`status-${milestoneId}`}>
        Status
      </label>
      <select id={`status-${milestoneId}`} name="status" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}>
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {value === "blocked" ? (
        <div>
          <label className="sr-only" htmlFor={`blocker-${milestoneId}`}>
            What is blocking this milestone?
          </label>
          <input
            id={`blocker-${milestoneId}`}
            name="blockerNote"
            defaultValue={blockerNote ?? ""}
            placeholder="Explain the blocker for the client, e.g. “Waiting for access to Xero”"
            className={inputClass}
          />
        </div>
      ) : (
        <span className="hidden sm:block" />
      )}
      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save
      </SubmitButton>
      {(state?.error || state?.ok) && (
        <p className={`text-sm sm:col-span-3 ${state.error ? "text-danger" : "text-success"}`} aria-live="polite">
          {state.error ?? state.ok}
        </p>
      )}
    </form>
  );
}
