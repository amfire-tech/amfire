"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestLoginLink, type LoginState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { Field, Notice, inputClass } from "@/components/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(requestLoginLink, undefined);

  if (state?.sent) {
    return (
      <div className="space-y-4">
        <Notice tone="success" title="Check your email">
          If that address has access, we&apos;ve sent a sign-in link. It works once and expires in 15 minutes.
        </Notice>
        {state.devLink && (
          <Notice tone="warning" title="Development mode">
            Email isn&apos;t configured yet, so here is the link:{" "}
            <Link href={state.devLink} className="font-semibold underline underline-offset-4">
              Open sign-in link
            </Link>
          </Notice>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <Field label="Email address" htmlFor="email" error={state?.error}>
        <input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state?.error} className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending…">
        Email me a sign-in link
      </SubmitButton>
    </form>
  );
}
