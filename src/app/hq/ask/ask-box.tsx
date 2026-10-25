"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import { Card, Notice, inputClass } from "@/components/ui";
import { askHqAction, type AskState } from "../actions";

export function AskBox({ examples }: { examples: string[] }) {
  const [state, action] = useActionState<AskState, FormData>(askHqAction, undefined);
  return (
    <div className="space-y-5">
      <form action={action} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="ask-q" className="sr-only">
          Your question
        </label>
        <input id="ask-q" name="question" required minLength={3} maxLength={500} defaultValue={state?.question} placeholder="Who owes us money?" className={`${inputClass} text-base`} autoFocus />
        <SubmitButton pendingLabel="Thinking…">Ask</SubmitButton>
      </form>
      <div className="flex flex-wrap gap-2">
        {examples.map((e) => (
          <form key={e} action={action}>
            <input type="hidden" name="question" value={e} />
            <button className="rounded-full bg-surface px-3 py-1.5 text-sm ring-1 ring-line hover:ring-fg/30">{e}</button>
          </form>
        ))}
      </div>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.answer && (
        <Card>
          <p className="text-xs text-muted">{state.question}</p>
          <p className="mt-2 text-lg leading-relaxed">{state.answer.answer}</p>
          {state.answer.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {state.answer.links.map((l) => (
                <Link key={l.href} href={l.href} className="font-medium underline underline-offset-4">
                  {l.label} →
                </Link>
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">{state.answer.engine === "gemini" ? "Answered by Gemini from your records." : "Answered from your records."}</p>
        </Card>
      )}
    </div>
  );
}
