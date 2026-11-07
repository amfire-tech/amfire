"use client";

// A Cal.com calendar embedded in the page (https://cal.com/docs/developing/guides/embeds).
// The visitor picks a time without leaving amfire; Cal.com sends the invite and
// reminders, and its webhook (/api/webhooks/cal) records the booking in HQ.
// Renders nothing until the link is configured in site.booking.

import { useEffect, useId, useRef, useState } from "react";
import { site } from "@/config/site";
import { AGENCY_PARTNER, GOALS, LEAD_AUDIT } from "@/knowledge/catalog";
import { track } from "@/lib/analytics";

type CalApi = ((...args: unknown[]) => void) & { ns: Record<string, (...args: unknown[]) => void>; loaded?: boolean; q?: unknown[] };

declare global {
  interface Window {
    Cal?: CalApi;
  }
}

/** Cal.com's loader, as published in their embed snippet: queues calls until embed.js arrives. */
export function loadCal() {
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

export type CalKind = "partner" | "demo";

/** What Cal.com tells the page about a booking it just confirmed. */
export type Booked = { uid?: string; start?: string; end?: string };

/** Where a visitor lands once the calendar confirms a booking: adding it to their calendar, then their promo code. */
export function bookedUrl(kind: CalKind, booked: Booked = {}) {
  const params = new URLSearchParams({ k: kind });
  if (booked.uid) params.set("b", booked.uid);
  if (booked.start) params.set("s", booked.start);
  if (booked.end) params.set("e", booked.end);
  return `/start/booked?${params}`;
}

/** The booking from either of Cal.com's success events. */
function bookingDetails(e: unknown): Booked {
  type Data = { uid?: unknown; startTime?: unknown; endTime?: unknown; date?: unknown; duration?: unknown; booking?: { uid?: unknown; startTime?: unknown; endTime?: unknown } };
  const data = (e as { detail?: { data?: Data } })?.detail?.data;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  return {
    uid: str(data?.uid) ?? str(data?.booking?.uid),
    start: str(data?.startTime) ?? str(data?.booking?.startTime) ?? str(data?.date),
    end: str(data?.endTime) ?? str(data?.booking?.endTime),
  };
}

/** Runs `done` once per booking, whichever of Cal.com's success events arrives first. */
function onBooked(api: (...args: unknown[]) => void, done: (booked: Booked) => void) {
  let fired = false;
  const once = (e: unknown) => {
    if (fired) return;
    fired = true;
    done(bookingDetails(e));
  };
  api("on", { action: "bookingSuccessfulV2", callback: once });
  api("on", { action: "bookingSuccessful", callback: once });
}

const UI = { hideEventTypeDetails: false, layout: "month_view", styles: { branding: { brandColor: "#ff453a" } } };

export function CalBooking({
  calLink,
  name,
  email,
  notes,
  kind,
  className,
  redirect,
}: {
  /** "username/event-slug" on cal.com. */
  calLink: string;
  name?: string;
  email?: string;
  notes?: string;
  /** For analytics: which calendar this is. */
  kind: CalKind;
  className?: string;
  /** Send the visitor to their promo code page once booked, instead of a note above the calendar. */
  redirect?: boolean;
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
    api()("ui", UI);
    onBooked(api(), (booked) => {
      track("call_booked", { kind });
      if (redirect) window.location.assign(bookedUrl(kind, booked));
      else setBooked(true);
    });
  }, [calLink, name, email, notes, namespace, kind, redirect]);

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

// --- One-click booking --------------------------------------------------------

const POPUP_NS: Record<CalKind, string> = { demo: "amfire-demo", partner: "amfire-partner" };
const ready = new Set<CalKind>();

/** Sets up a popup calendar once per page: Cal.com's script, the brand colours and the success hand-off. */
function popupApi(kind: CalKind) {
  const Cal = loadCal();
  const ns = POPUP_NS[kind];
  if (!ready.has(kind)) {
    ready.add(kind);
    Cal("init", ns, { origin: "https://cal.com" });
    Cal.ns[ns]("ui", UI);
    onBooked(Cal.ns[ns], (booked) => {
      track("call_booked", { kind, via: "popup" });
      window.location.assign(bookedUrl(kind, booked));
    });
  }
  return Cal.ns[ns];
}

/** Opens the calendar over the current page: one click from any button to picking a time. */
export function openBooking(kind: CalKind, notes?: string) {
  const calLink = kind === "partner" ? site.booking.partner : site.booking.demo;
  if (!calLink) return false;
  popupApi(kind)("modal", { calLink, config: { layout: "month_view", ...(notes ? { notes } : {}) } });
  track("booking_opened", { kind, page: window.location.pathname });
  return true;
}

// Goals whose form gathers something the call can't do without (the audit needs the clients to test).
const FORM_FIRST = new Set<string>([LEAD_AUDIT.goal]);

/**
 * Turns every "Book a free demo" link on the public site (any link to /start)
 * into the calendar popup, so nobody has to fill in a form before picking a
 * time. The link still works without JavaScript, and a new-tab click is left alone.
 */
export function OneClickBooking() {
  useEffect(() => {
    // Warm up Cal.com's script once the page has settled, so the first click opens at once.
    const warm = window.setTimeout(() => {
      if (!site.booking.demo) return;
      popupApi("demo")("preload", { calLink: site.booking.demo });
    }, 2500);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (!a || !href || a.target === "_blank" || !/^\/start(\?|$)/.test(href)) return;
      const goal = new URL(href, window.location.origin).searchParams.get("goal") ?? "";
      if (FORM_FIRST.has(goal)) return;
      const partner = goal === AGENCY_PARTNER.goal;
      const topic = goal && !partner ? GOALS.find((g) => g.id === goal)?.label : undefined;
      if (!openBooking(partner ? "partner" : "demo", topic ? `Interested in: ${topic}` : undefined)) return;
      // Stop Next.js from also following the link.
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      window.clearTimeout(warm);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);
  return null;
}
