"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import { Field, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";
import { postUpdateAction } from "../../actions";

export function UpdateForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(postUpdateAction.bind(null, projectId), undefined);
  return (
    <form action={action} className="space-y-3" key={state?.ok}>
      <Field label="Post an update for the client" htmlFor="body" hint="Plain language. Clients see this in their Hub." error={state?.error}>
        <textarea id="body" name="body" rows={3} className={inputClass} />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton variant="secondary" pendingLabel="Posting…">
          Post update
        </SubmitButton>
        {state?.ok && <span className="text-sm text-success">{state.ok}</span>}
      </div>
    </form>
  );
}
