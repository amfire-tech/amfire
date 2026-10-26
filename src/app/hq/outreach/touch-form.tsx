"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Field, Notice, cx, inputClass } from "@/components/ui";
import { CHANNEL_LABELS, OBJECTIONS, OUTCOMES, TOUCH_CHANNELS, type TouchChannel } from "@/knowledge/outreach";
import type { ActionState } from "@/lib/action-result";

const GOOD = new Set(["interested", "demo_sent", "meeting_booked", "replied", "met", "call_back"]);
const BAD = new Set(["not_interested", "do_not_contact", "wrong_number"]);

/**
 * What happened on this call, message or visit. Each outcome is its own
 * submit button, so logging a call is one tap; the objection, note and
 * follow-up time are optional.
 */
export function TouchForm({
  action,
  defaultChannel = "call",
  channels = TOUCH_CHANNELS,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultChannel?: TouchChannel;
  channels?: readonly TouchChannel[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  const [channel, setChannel] = useState<TouchChannel>(defaultChannel);
  const outcomes = OUTCOMES.filter((o) => (o.channels as readonly string[]).includes(channel));

  return (
    <form action={formAction} className="space-y-4" key={state?.ok}>
      <input type="hidden" name="channel" value={channel} />
      <div role="radiogroup" aria-label="Channel" className="flex flex-wrap gap-2">
        {channels.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={channel === c}
            onClick={() => setChannel(c)}
            className={cx("rounded-full px-3 py-1.5 text-sm ring-1 ring-line", channel === c ? "bg-fg font-medium text-page ring-fg" : "bg-surface text-fg/80 hover:bg-subtle")}
          >
            {CHANNEL_LABELS[c]}
          </button>
        ))}
      </div>

      {channel !== "note" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Objection" htmlFor="objection" optional>
            <select id="objection" name="objection" defaultValue="" className={inputClass}>
              <option value="">None</option>
              {OBJECTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label.replaceAll('"', "")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Follow up at" htmlFor="followUpAt" optional hint="Leave empty for the usual gap.">
            <input id="followUpAt" name="followUpAt" type="datetime-local" className={inputClass} />
          </Field>
        </div>
      )}
      <Field label="Note" htmlFor="note" optional>
        <textarea id="note" name="note" rows={2} maxLength={4000} placeholder="What they said, in their words" className={inputClass} />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">{channel === "note" ? "Save" : "What happened?"}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {outcomes.map((o) => (
            <OutcomeButton key={o.id} value={o.id} tone={GOOD.has(o.id) ? "good" : BAD.has(o.id) ? "bad" : "neutral"}>
              {o.label}
            </OutcomeButton>
          ))}
        </div>
      </fieldset>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
    </form>
  );
}

function OutcomeButton({ value, tone, children }: { value: string; tone: "good" | "bad" | "neutral"; children: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="outcome"
      value={value}
      disabled={pending}
      className={cx(
        "min-h-12 rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition disabled:opacity-50",
        tone === "good" && "bg-[#ecfdf3] text-[#05603a] ring-[#6ce9a6]/60 hover:bg-[#d1fadf]",
        tone === "bad" && "bg-[#fef3f2] text-[#b42318] ring-[#fda29b]/60 hover:bg-[#fee4e2]",
        tone === "neutral" && "bg-surface text-fg ring-line hover:bg-subtle",
      )}
    >
      {children}
    </button>
  );
}
