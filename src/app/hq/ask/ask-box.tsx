"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/forms";
import { Card, Notice, inputClass } from "@/components/ui";
import { askHqAction, type AskState } from "../actions";

/** A short conversation with HQ: each answer comes from the records, with links to them. */
export function AskBox({ examples }: { examples: string[] }) {
  const [state, action] = useActionState<AskState, FormData>(askHqAction, { turns: [] });
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current) input.current.value = "";
  }, [state.turns.length]);

  return (
    <div className="space-y-5">
      {state.turns.map((t, i) => (
        <div key={i} className="space-y-2">
          <p className="ml-auto w-fit max-w-[85%] rounded-2xl bg-fg px-4 py-2 text-page">{t.q}</p>
          <Card>
            <p className="leading-relaxed whitespace-pre-wrap">{t.answer.answer}</p>
            {t.answer.links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {t.answer.links.map((l) => (
                  <Link key={l.href} href={l.href} className="font-medium underline underline-offset-4">
                    {l.label} →
                  </Link>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-muted">{t.answer.note ?? (t.answer.engine === "gemini" ? "Answered by AMFIRE AI from all your records." : "Answered from your records.")}</p>
          </Card>
        </div>
      ))}

      {state.error && <Notice tone="error">{state.error}</Notice>}

      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ask-q" className="sr-only">
          Your question
        </label>
        <input
          ref={input}
          id="ask-q"
          name="question"
          required
          minLength={3}
          maxLength={500}
          placeholder={state.turns.length ? "Ask a follow-up…" : "Ask anything about your business"}
          className={`${inputClass} text-base`}
          autoFocus
        />
        <SubmitButton pendingLabel="Thinking…">Ask</SubmitButton>
      </form>

      {state.turns.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {examples.map((e) => (
            <form key={e} action={action}>
              <input type="hidden" name="question" value={e} />
              <button className="rounded-full bg-surface px-3 py-1.5 text-sm ring-1 ring-line hover:ring-fg/30">{e}</button>
            </form>
          ))}
        </div>
      ) : (
        <form action={action}>
          <input type="hidden" name="reset" value="1" />
          <button className="text-sm text-muted underline underline-offset-4 hover:text-fg">Start over</button>
        </form>
      )}
    </div>
  );
}
