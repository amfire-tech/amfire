"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/forms";
import { Card, Notice, inputClass } from "@/components/ui";
import { askConciergeAction, type ConciergeState } from "./actions";

const SUGGESTIONS = ["When will it be ready?", "Is anything waiting on me?", "What do I owe?"];

/** "Ask about your project" — amfire AI answers from the client's own records; anything else goes to a person. */
export function Concierge({ orgId }: { orgId: string }) {
  const [state, action] = useActionState<ConciergeState, FormData>(askConciergeAction.bind(null, orgId), { turns: [] });
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current) input.current.value = "";
  }, [state.turns.length]);

  return (
    <Card>
      <h2 className="font-semibold">Ask about your project</h2>
      <p className="mt-0.5 text-sm text-muted">Instant answers from your project records, in English or Hindi. Anything else goes to a person.</p>

      {state.turns.length > 0 && (
        <div className="mt-4 space-y-3">
          {state.turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl bg-fg px-4 py-2 text-sm text-page">{t.q}</p>
              <div className="max-w-[92%] rounded-2xl bg-subtle p-4 text-sm">
                <p className="leading-relaxed whitespace-pre-wrap">{t.answer.answer}</p>
                {t.answer.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    {t.answer.links.map((l) => (
                      <Link key={l.href} href={l.href} className="font-medium underline underline-offset-4">
                        {l.label} →
                      </Link>
                    ))}
                  </div>
                )}
                {t.answer.handedOff && <p className="mt-2 text-muted">Use “Talk to a person” on your project page, or WhatsApp us.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={action} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="concierge-q" className="sr-only">
          Your question
        </label>
        <input
          ref={input}
          id="concierge-q"
          name="question"
          required
          minLength={3}
          maxLength={500}
          placeholder={state.turns.length ? "Ask a follow-up…" : "When will it be ready?"}
          className={inputClass}
        />
        <SubmitButton pendingLabel="Checking…">Ask</SubmitButton>
      </form>

      {state.turns.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <form key={s} action={action}>
              <input type="hidden" name="question" value={s} />
              <button className="rounded-full bg-subtle px-3 py-1.5 text-sm ring-1 ring-line hover:ring-fg/30">{s}</button>
            </form>
          ))}
        </div>
      )}
      {state.error && (
        <div className="mt-3">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
    </Card>
  );
}
