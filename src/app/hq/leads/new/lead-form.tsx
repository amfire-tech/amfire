"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/forms";
import { Field, Notice, inputClass } from "@/components/ui";
import { BUSINESS_TYPES, GOALS, URGENCY } from "@/knowledge/catalog";
import { MANUAL_SOURCES, sourceLabel } from "@/lib/attribution";
import type { ActionState } from "@/lib/action-result";
import { addLeadAction } from "../../actions";

export function LeadForm({ defaultSource }: { defaultSource?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addLeadAction, undefined);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Where did they come from?" htmlFor="source">
          <select id="source" name="source" required defaultValue={defaultSource ?? ""} className={inputClass}>
            <option value="" disabled>
              Choose a source
            </option>
            {MANUAL_SOURCES.map((s) => (
              <option key={s} value={s}>
                {sourceLabel(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Source detail" htmlFor="sourceNote" optional>
          <input id="sourceNote" name="sourceNote" maxLength={300} placeholder="DM after the Oct 21 post · referred by Rahul" className={inputClass} />
        </Field>
        <Field label="Name" htmlFor="name">
          <input id="name" name="name" required maxLength={120} autoComplete="off" className={inputClass} />
        </Field>
        <Field label="Organisation" htmlFor="company">
          <input id="company" name="company" required maxLength={160} autoComplete="off" className={inputClass} />
        </Field>
        <Field label="Email" htmlFor="email" optional hint="Needed later to send a proposal.">
          <input id="email" name="email" type="email" maxLength={200} autoComplete="off" className={inputClass} />
        </Field>
        <Field label="Phone / WhatsApp" htmlFor="phone" optional hint="An Indian mobile, or + and the country code.">
          <input id="phone" name="phone" inputMode="tel" maxLength={20} autoComplete="off" className={inputClass} />
        </Field>
      </div>

      <Field label="What do they need?" htmlFor="problem" hint="In a sentence or two, or paste the LinkedIn or WhatsApp conversation.">
        <textarea id="problem" name="problem" required rows={7} maxLength={8000} className={inputClass} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Goal" htmlFor="goal">
          <select id="goal" name="goal" defaultValue="not-sure" className={inputClass}>
            {GOALS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Organisation type" htmlFor="businessType">
          <select id="businessType" name="businessType" defaultValue="Something else" className={inputClass}>
            {BUSINESS_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Timing" htmlFor="urgency">
          <select id="urgency" name="urgency" defaultValue="exploring" className={inputClass}>
            {URGENCY.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pendingLabel="Adding…">Add lead</SubmitButton>
    </form>
  );
}
