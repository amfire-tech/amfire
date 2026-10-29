"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/forms";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { createKeyAction, type KeyState } from "../../engine-actions";

/** Creates a personal connector key and shows it once, with a copy button. */
export function KeyForm() {
  const [state, action] = useActionState<KeyState, FormData>(createKeyAction, undefined);
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <Field label="Where you'll use it" htmlFor="key-label">
          <input id="key-label" name="label" defaultValue="Cloud routine" maxLength={60} className={`${inputClass} sm:!w-56`} />
        </Field>
        <div className="pb-0.5">
          <SubmitButton size="sm" pendingLabel="Creating…">
            Create my key
          </SubmitButton>
        </div>
      </form>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.key && (
        <Notice tone="success" title="Your key. Copy it now: it won't be shown again.">
          <code className="mt-2 block rounded bg-surface px-2 py-1.5 text-xs break-all select-all">{state.key}</code>
          <button
            type="button"
            className={`${buttonClass("secondary", "sm")} mt-2`}
            onClick={() => {
              navigator.clipboard.writeText(state.key!).then(() => setCopied(true));
            }}
          >
            {copied ? "Copied" : "Copy key"}
          </button>
        </Notice>
      )}
    </div>
  );
}
