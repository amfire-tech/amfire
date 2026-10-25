"use client";

import { useActionState } from "react";
import { setPassword, type PasswordState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { Field, Notice, inputClass } from "@/components/ui";

export function PasswordForm() {
  const [state, action] = useActionState<PasswordState, FormData>(setPassword, undefined);
  return (
    <form action={action} className="space-y-4" key={state?.ok}>
      <Field label="New password" htmlFor="password" hint="At least 10 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
      </Field>
      <Field label="Type it again" htmlFor="confirm" error={state?.error}>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
      </Field>
      {state?.ok && <Notice tone="success">{state.ok}</Notice>}
      <SubmitButton className="w-full" pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
