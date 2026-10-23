"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/forms";
import { Button, Card, CardTitle, Field, Notice, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";
import { acceptProposalAction, requestChangesAction } from "../../actions";

export function DecisionPanel({ proposalId, company }: { proposalId: string; company: string }) {
  const [accState, accept] = useActionState<ActionState, FormData>(acceptProposalAction.bind(null, proposalId), undefined);
  const [chgState, requestChanges] = useActionState<ActionState, FormData>(requestChangesAction.bind(null, proposalId), undefined);
  const [mode, setMode] = useState<"accept" | "changes">("accept");

  if (chgState?.ok) return <Notice tone="success">{chgState.ok}</Notice>;

  return (
    <Card>
      <CardTitle>Your decision</CardTitle>
      {mode === "accept" ? (
        <form action={accept} className="space-y-4">
          <label className="flex gap-3 text-sm">
            <input type="checkbox" name="agree" className="mt-0.5 size-4 shrink-0 accent-signal" />
            <span>I have read the scope, milestones and terms, and I agree to them on behalf of {company}.</span>
          </label>
          {accState?.error && <Notice tone="error">{accState.error}</Notice>}
          <SubmitButton className="w-full" pendingLabel="Accepting…">
            Accept proposal
          </SubmitButton>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("changes")}>
            Request changes instead
          </Button>
        </form>
      ) : (
        <form action={requestChanges} className="space-y-4">
          <Field label="What would you like changed?" htmlFor="note" error={chgState?.error}>
            <textarea id="note" name="note" rows={4} className={inputClass} />
          </Field>
          <SubmitButton className="w-full" pendingLabel="Sending…">
            Send to AMFIRE
          </SubmitButton>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("accept")}>
            Back
          </Button>
        </form>
      )}
    </Card>
  );
}
