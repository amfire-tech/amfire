"use client";

import { site } from "@/config/site";
import { Button, Notice } from "./ui";

/** Shared recovery screen: say what happened, offer a retry and a person. */
export function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const denied = error.name === "AccessDenied" || /access/i.test(error.message);
  return (
    <div className="mx-auto max-w-lg py-12">
      <Notice tone="error" title={denied ? "You don't have access to this" : "Something went wrong"}>
        {denied
          ? "If you think you should, contact a person and we'll sort it out."
          : "Your last change may not have been saved. Try again, or refresh to see the latest state."}
        {error.digest && <p className="mt-2 text-xs opacity-70">Reference: {error.digest}</p>}
      </Notice>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <a href={`mailto:${site.contactEmail}`} className="inline-flex items-center px-2 text-sm font-medium underline underline-offset-4">
          Contact a person
        </a>
      </div>
    </div>
  );
}
