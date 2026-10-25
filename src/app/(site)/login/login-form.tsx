"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { requestLoginLink, signInWithGoogle, signInWithPassword, type LoginState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { Field, Notice, cx, inputClass } from "@/components/ui";

export function LoginForm({ next, passwordEnabled, googleEnabled }: { next: string; passwordEnabled: boolean; googleEnabled: boolean }) {
  const [mode, setMode] = useState<"link" | "password">(passwordEnabled ? "password" : "link");
  const [linkState, linkAction] = useActionState<LoginState, FormData>(requestLoginLink, undefined);
  const [pwState, pwAction] = useActionState<LoginState, FormData>(signInWithPassword, undefined);

  if (mode === "link" && linkState?.sent) {
    return (
      <div className="space-y-4">
        <Notice tone="success" title="Check your email">
          If that address has access, we&apos;ve sent a sign-in link. It works once and expires in 15 minutes.
        </Notice>
        {linkState.devLink && (
          <Notice tone="warning" title="Development mode">
            Email isn&apos;t configured yet, so here is the link:{" "}
            <Link href={linkState.devLink} className="font-semibold underline underline-offset-4">
              Open sign-in link
            </Link>
          </Notice>
        )}
        {passwordEnabled && (
          <button type="button" onClick={() => setMode("password")} className="text-sm text-muted underline underline-offset-4 hover:text-fg">
            Sign in with a password instead
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {googleEnabled && (
        <>
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <SubmitButton variant="secondary" className="w-full" pendingLabel="Opening Google…">
              <GoogleIcon /> Continue with Google
            </SubmitButton>
          </form>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      {passwordEnabled && (
        <div role="tablist" aria-label="How to sign in" className="grid grid-cols-2 rounded-full bg-subtle p-1 text-sm">
          {(
            [
              ["password", "Password"],
              ["link", "Email link"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cx("rounded-full py-2 font-medium", mode === id ? "bg-surface shadow-sm ring-1 ring-line" : "text-muted hover:text-fg")}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "password" ? (
        <form action={pwAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label="Email address" htmlFor="pw-email">
            <input id="pw-email" name="email" type="email" autoComplete="email" required className={inputClass} />
          </Field>
          <Field label="Password" htmlFor="pw-password" error={pwState?.error}>
            <input id="pw-password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!pwState?.error} className={inputClass} />
          </Field>
          <SubmitButton className="w-full" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
          <p className="text-xs text-muted">First time? Use the email link once, then set a password under Account.</p>
        </form>
      ) : (
        <form action={linkAction} className="space-y-5">
          <input type="hidden" name="next" value={next} />
          <Field label="Email address" htmlFor="email" error={linkState?.error}>
            <input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!linkState?.error} className={inputClass} />
          </Field>
          <SubmitButton className="w-full" pendingLabel="Sending…">
            Email me a sign-in link
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
