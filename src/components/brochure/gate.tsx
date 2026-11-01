"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestBrochure, type BrochureGateState } from "@/app/actions/brochure";
import { SubmitButton } from "@/components/forms";
import { Field, Notice, inputClass } from "@/components/ui";
import type { ServicePathId } from "@/knowledge/catalog";

/** Name and email; we email a link that opens the brochure once the address is confirmed. */
export function BrochureGate({ plan }: { plan: ServicePathId }) {
  const [state, action] = useActionState<BrochureGateState, FormData>(requestBrochure, undefined);

  if (state?.sent) {
    return (
      <div className="rounded-card bg-surface p-6 text-fg ring-1 ring-line sm:p-8" role="status">
        <p className="text-4xl" aria-hidden>
          📬
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Check your inbox</h2>
        <p className="mt-2 text-muted">
          We&apos;ve sent your link to <strong className="text-fg">{state.sent}</strong>. Open it to unlock the brochure — it works on any device for 7 days.
        </p>
        <p className="mt-3 text-sm text-muted">Not there in a minute? Check spam or promotions.</p>
        {state.devLink && (
          <div className="mt-5">
            <Notice tone="info">
              Local development: email isn&apos;t set up, so here&apos;s the link —{" "}
              <Link href={state.devLink} className="font-medium underline">
                open the brochure
              </Link>
            </Notice>
          </div>
        )}
      </div>
    );
  }

  const errors = state?.errors ?? {};
  return (
    <form action={action} className="rounded-card bg-surface p-5 text-fg ring-1 ring-line sm:p-7" noValidate>
      <input type="hidden" name="plan" value={plan} />
      <div aria-hidden className="hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <h2 className="text-xl font-semibold">Where should we send it?</h2>
      <p className="mt-1 text-sm text-muted">We email you a link. Open it and the full brochure is yours.</p>
      <div className="mt-5 grid gap-4">
        <Field label="Your name" htmlFor="b-name" error={errors.name}>
          <input id="b-name" name="name" autoComplete="name" required className={inputClass} aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Work email" htmlFor="b-email" error={errors.email}>
          <input id="b-email" name="email" type="email" autoComplete="email" inputMode="email" required className={inputClass} aria-invalid={Boolean(errors.email)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business" htmlFor="b-company" optional error={errors.company}>
            <input id="b-company" name="company" autoComplete="organization" className={inputClass} />
          </Field>
          <Field label="WhatsApp" htmlFor="b-phone" optional error={errors.phone}>
            <input id="b-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" className={inputClass} aria-invalid={Boolean(errors.phone)} />
          </Field>
        </div>
      </div>
      {state?.formError && (
        <div className="mt-4">
          <Notice tone="error">{state.formError}</Notice>
        </div>
      )}
      <SubmitButton size="lg" className="mt-6 w-full" pendingLabel="Sending your link…">
        Email me the brochure
      </SubmitButton>
      <p className="mt-3 text-center text-xs text-muted">No spam. We only use this to send the brochure and follow up once.</p>
    </form>
  );
}
