"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import { Card, Notice, inputClass } from "@/components/ui";
import { askConciergeAction, type ConciergeState } from "./actions";

const SUGGESTIONS = ["When will it be ready?", "Is anything waiting on me?", "What do I owe?"];

/** "Ask about your project" — answered from the client's own records only. */
export function Concierge({ orgId }: { orgId: string }) {
  const [state, action] = useActionState<ConciergeState, FormData>(askConciergeAction.bind(null, orgId), undefined);
  return (
    <Card>
      <h2 className="font-semibold">Ask about your project</h2>
      <p className="mt-0.5 text-sm text-muted">Instant answers from your project records. Anything else goes to a person.</p>
      <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="concierge-q" className="sr-only">
          Your question
        </label>
        <input id="concierge-q" name="question" required minLength={3} maxLength={500} defaultValue={state?.question} placeholder="When will it be ready?" className={inputClass} />
        <SubmitButton pendingLabel="Checking…">Ask</SubmitButton>
      </form>
      {!state && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <form key={s} action={action}>
              <input type="hidden" name="question" value={s} />
              <button className="rounded-full bg-subtle px-3 py-1.5 text-sm ring-1 ring-line hover:ring-fg/30">{s}</button>
            </form>
          ))}
        </div>
      )}
      {state?.error && (
        <div className="mt-3">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
      {state?.answer && (
        <div className="mt-4 rounded-xl bg-subtle p-4">
          <p className="whitespace-pre-wrap">{state.answer.answer}</p>
          {state.answer.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              {state.answer.links.map((l) => (
                <Link key={l.href} href={l.href} className="font-medium underline underline-offset-4">
                  {l.label} →
                </Link>
              ))}
            </div>
          )}
          {state.answer.handedOff && <p className="mt-2 text-sm text-muted">Use “Talk to a person” on your project page, or WhatsApp us.</p>}
        </div>
      )}
    </Card>
  );
}
