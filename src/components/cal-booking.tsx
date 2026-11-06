"use client";

// A Cal.com calendar embedded in the page (https://cal.com/docs/developing/guides/embeds).
// The visitor picks a time without leaving amfire; Cal.com sends the invite and
// reminders, and its webhook (/api/webhooks/cal) records the booking in HQ.
// Renders nothing until the link is configured in site.booking.

import { useEffect, useId, useRef, useState } from "react";
import { track } from "@/lib/analytics";

type CalApi = ((...args: unknown[]) => void) & { ns: Record<string, (...args: unknown[]) => void>; loaded?: boolean; q?: unknown[] };

declare global {
  interface Window {
    Cal?: CalApi;
  }
}

/** Cal.com's loader, as published in their embed snippet: queues calls until embed.js arrives. */
function loadCal() {
  if (window.Cal) return window.Cal;
  const push = (api: { q: unknown[] }, args: unknown) => api.q.push(args);
  const cal = function (...args: unknown[]) {
    const self = window.Cal!;
    if (!self.loaded) {
      self.ns = {};
      self.q = self.q ?? [];
      const script = document.createElement("script");
      script.src = "https://app.cal.com/embed/embed.js";
      script.async = true;
      document.head.appendChild(script);
      self.loaded = true;
    }
    if (args[0] === "init") {
      const api = Object.assign((...a: unknown[]) => push(api, a), { q: [] as unknown[] });
      const namespace = args[1];
      if (typeof namespace === "string") {
        self.ns[namespace] = self.ns[namespace] ?? api;
        push(self.ns[namespace] as unknown as { q: unknown[] }, args);
        push(self as unknown as { q: unknown[] }, ["initNamespace", namespace]);
      } else push(self as unknown as { q: unknown[] }, args);
      return;
    }
    push(self as unknown as { q: unknown[] }, args);
  } as CalApi;
  cal.q = [];
  window.Cal = cal;
  return cal;
}

export function CalBooking({
  calLink,
  name,
  email,
  notes,
  kind,
  className,
}: {
  /** "username/event-slug" on cal.com. */
  calLink: string;
  name?: string;
  email?: string;
  notes?: string;
  /** For analytics: which calendar this is. */
  kind: "partner" | "demo";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const namespace = `amfire${id}`;
  const box = useRef<HTMLDivElement>(null);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    if (!calLink || !box.current) return;
    const Cal = loadCal();
    Cal("init", namespace, { origin: "https://cal.com" });
    const api = () => Cal.ns[namespace];
    api()("inline", {
      elementOrSelector: box.current,
      calLink,
      config: {
        layout: "month_view",
        ...(name ? { name } : {}),
        ...(email ? { email } : {}),
        ...(notes ? { notes } : {}),
      },
    });
    api()("ui", { hideEventTypeDetails: false, layout: "month_view", styles: { branding: { brandColor: "#ff453a" } } });
    const done = () => {
      setBooked(true);
      track("call_booked", { kind });
    };
    api()("on", { action: "bookingSuccessful", callback: done });
    api()("on", { action: "bookingSuccessfulV2", callback: done });
  }, [calLink, name, email, notes, namespace, kind]);

  if (!calLink) return null;
  return (
    <div className={className}>
      {booked && (
        <p role="status" className="mb-3 rounded-xl bg-subtle px-4 py-3 text-sm font-medium ring-1 ring-line">
          Booked. The invite is on its way to your inbox, and we&apos;ll see you then.
        </p>
      )}
      <div ref={box} className="min-h-[34rem] w-full overflow-auto rounded-[1.5rem] bg-surface ring-1 ring-line" />
    </div>
  );
}
