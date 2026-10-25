"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import { Card, CardTitle, Field, Notice, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";
import { approveAndSendAction } from "../../actions";

export function ApprovePanel({
  proposalId,
  isOwner,
  belowGuideline,
  guidelineText,
  clientEmail,
}: {
  proposalId: string;
  isOwner: boolean;
  belowGuideline: boolean;
  guidelineText: string;
  clientEmail: string | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(approveAndSendAction.bind(null, proposalId), undefined);

  return (
    <Card>
      <CardTitle>Approve and send</CardTitle>
      {clientEmail ? (
        <p className="text-sm text-muted">
          Sends this proposal to <strong className="text-fg">{clientEmail}</strong> through the Client Hub and gives them access.
          This is a commercial commitment.
        </p>
      ) : (
        <Notice tone="warning" title="No email for this client yet">
          Add their email on the lead page. The proposal is sent through the Client Hub, which needs it.
        </Notice>
      )}
      <p className="mt-3 text-sm">Pricing guideline: {guidelineText}</p>

      {!isOwner ? (
        <div className="mt-4">
          <Notice tone="info">Only the owner can approve proposals. Save your draft and ask them to review it.</Notice>
        </div>
      ) : (
        <form action={action} className="mt-4 space-y-4">
          {(belowGuideline || state?.code === "PRICING_BELOW_GUIDELINE") && (
            <Field
              label="Reason for pricing below the guideline"
              htmlFor="pricingOverrideNote"
              hint="Recorded in the audit history."
              error={state?.code === "PRICING_BELOW_GUIDELINE" ? state.error : undefined}
            >
              <textarea id="pricingOverrideNote" name="pricingOverrideNote" rows={2} className={inputClass} />
            </Field>
          )}
          {state?.error && state.code !== "PRICING_BELOW_GUIDELINE" && <Notice tone="error">{state.error}</Notice>}
          {state?.ok && <Notice tone="success">{state.ok}</Notice>}
          <SubmitButton className="w-full" pendingLabel="Sending…">
            Approve and send to client
          </SubmitButton>
        </form>
      )}
    </Card>
  );
}
