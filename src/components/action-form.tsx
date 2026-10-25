"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/lib/action-result";
import { SubmitButton } from "./forms";
import { buttonClass, cx, Notice } from "./ui";

/**
 * A form for a server action that returns ActionState: shows the error or
 * success message, clears itself after success, and offers `link` (e.g.
 * WhatsApp with an approved message typed in) as a button.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant = "secondary",
  size = "md",
  className,
  inline,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children?: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  /** Fields and button on one row. */
  inline?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);
  return (
    <form action={formAction} className={cx(inline ? "flex flex-wrap items-end gap-2" : "space-y-3", className)} key={state?.ok}>
      {children}
      <div className={cx("flex flex-wrap items-center gap-3", inline && "pb-0.5")}>
        <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel}>
          {submitLabel}
        </SubmitButton>
        {state?.ok && !state.link && <span className="text-sm text-success">{state.ok}</span>}
      </div>
      {state?.error && (
        <div className="basis-full">
          <Notice tone="error">{state.error}</Notice>
        </div>
      )}
      {state?.link && (
        <div className="basis-full">
          <Notice tone="success" title={state.ok}>
            <a href={state.link} target="_blank" rel="noopener noreferrer" className={cx(buttonClass("primary", "sm"), "mt-2")}>
              {state.link.startsWith("mailto:") ? "Open email" : state.link.includes("linkedin.com") ? "Open LinkedIn" : "Open WhatsApp"} ↗
            </a>
          </Notice>
        </div>
      )}
    </form>
  );
}
