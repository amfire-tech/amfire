"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import { Field, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";
import { updateLeadContactAction } from "../../actions";

/** For hand-added leads that are missing an email or phone number. */
export function ContactForm({ leadId, needsEmail, needsPhone }: { leadId: string; needsEmail: boolean; needsPhone: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(updateLeadContactAction.bind(null, leadId), undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {needsEmail && (
          <Field label="Email" htmlFor="contact-email" hint="Needed to send a proposal." error={state?.error}>
            <input id="contact-email" name="email" type="email" maxLength={200} className={inputClass} />
          </Field>
        )}
        {needsPhone && (
          <Field label="Phone / WhatsApp" htmlFor="contact-phone" error={needsEmail ? undefined : state?.error}>
            <input id="contact-phone" name="phone" inputMode="tel" maxLength={20} className={inputClass} />
          </Field>
        )}
      </div>
      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save contact details
      </SubmitButton>
    </form>
  );
}
