"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { ActionState } from "@/lib/action-result";

/** Asks first, then deletes. On success it goes to `redirectTo` (or refreshes this page); a failure shows here. */
export function DeleteButton({
  action,
  confirm,
  label = "Delete",
  size = "sm",
  variant = "danger",
  redirectTo,
}: {
  action: () => Promise<ActionState>;
  confirm: string;
  label?: string;
  size?: "sm" | "md";
  variant?: "danger" | "ghost";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirm)) return;
          setError(undefined);
          start(async () => {
            const res = await action();
            if (res?.error) return setError(res.error);
            if (redirectTo) router.replace(redirectTo);
            router.refresh();
          });
        }}
      >
        {pending ? "Deleting…" : label}
      </Button>
      {error && <span className="text-sm text-danger">{error}</span>}
    </span>
  );
}
