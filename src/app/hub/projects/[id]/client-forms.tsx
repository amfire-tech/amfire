"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import { Field, Notice, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";
import { approveMilestoneAction, supportRequestAction } from "../../actions";

export function ApproveMilestoneButton({ projectId, milestoneId, title }: { projectId: string; milestoneId: string; title: string }) {
  const [state, action] = useActionState<ActionState, FormData>(approveMilestoneAction.bind(null, projectId, milestoneId), undefined);
  return (
    <form action={action} className="space-y-2">
      <SubmitButton pendingLabel="Approving…" aria-label={`Approve milestone: ${title}`}>
        Approve milestone
      </SubmitButton>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}

export function SupportRequestForm({ orgId, projectId }: { orgId: string; projectId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(supportRequestAction.bind(null, orgId, projectId), undefined);
  if (state?.ok) return <Notice tone="success">{state.ok}</Notice>;
  return (
    <form action={action} className="space-y-4">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Subject" htmlFor="subject">
        <input id="subject" name="subject" className={inputClass} />
      </Field>
      <Field label="How can we help?" htmlFor="req-body" hint="Questions, changes, problems — or something we got wrong.">
        <textarea id="req-body" name="body" rows={4} className={inputClass} />
      </Field>
      <SubmitButton variant="secondary" pendingLabel="Sending…">
        Send to a person
      </SubmitButton>
    </form>
  );
}
