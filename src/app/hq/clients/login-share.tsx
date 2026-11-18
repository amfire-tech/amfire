"use client";

import { useState } from "react";
import { Button, Notice, buttonClass } from "@/components/ui";
import type { LoginShare } from "@/server/clients";

/** The sign-in details to pass on. Shown once: the password isn't stored anywhere. */
export function LoginSharePanel({ login, title = "Login details" }: { login: LoginShare; title?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Notice tone="success" title={title}>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted">Name</dt>
        <dd>{login.name}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="break-all">{login.email}</dd>
        <dt className="text-muted">Password</dt>
        <dd>
          {login.password ? (
            <span className="font-mono text-base font-semibold tracking-wide select-all">{login.password}</span>
          ) : login.hasOwnPassword ? (
            "They already chose their own password; it was left as it is."
          ) : (
            'Password sign-in isn\'t set up here. They sign in with "Email link".'
          )}
        </dd>
      </dl>
      {login.password && (
        <p className="mt-2 text-sm text-muted">One-time password: they choose their own the first time they sign in. Copy it now; it isn&apos;t shown again.</p>
      )}
      {login.emailed && <p className="mt-2 text-sm">The sign-in details were also emailed to them.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(login.message);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy message"}
        </Button>
        {login.whatsapp && (
          <a href={login.whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>
            Send on WhatsApp ↗
          </a>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">See the message</summary>
        <pre className="mt-2 font-sans whitespace-pre-wrap">{login.message}</pre>
      </details>
    </Notice>
  );
}
