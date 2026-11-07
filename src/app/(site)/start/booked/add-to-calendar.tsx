"use client";

// The one job of the booked page: get the call into the client's own calendar
// before they leave.

import { useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";

type Props = {
  uid: string;
  kind: "demo" | "partner";
  start?: string;
  end?: string;
};

const storageKey = (uid: string) => `call-in-calendar:${uid}`;
const noop = () => () => {};

function readStored(uid: string) {
  try {
    return Boolean(localStorage.getItem(storageKey(uid)));
  } catch {
    return false; // Storage blocked: they tap a button again, no harm done.
  }
}

/** The call's time in the visitor's own time zone, which only the browser knows. */
function localWhen(start?: string) {
  const s = start ? new Date(start) : null;
  if (!s || Number.isNaN(s.getTime())) return null;
  const day = s.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const time = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

export function AddToCalendar({ uid, kind, start, end }: Props) {
  const [clicked, setClicked] = useState(false);
  // Remembered across a reload; the server never knows, so it renders the locked state first.
  const remembered = useSyncExternalStore(noop, () => readStored(uid), () => false);
  const added = clicked || remembered;
  const when = useSyncExternalStore(noop, () => localWhen(start), () => null);

  const params = new URLSearchParams({ b: uid, k: kind });
  if (start) params.set("s", start);
  if (end) params.set("e", end);
  const link = (to: "google" | "ics") => `/start/booked/calendar?${params}&to=${to}`;

  const markAdded = (via: string) => {
    track("call_added_to_calendar", { via, kind });
    try {
      localStorage.setItem(storageKey(uid), via);
    } catch {
      // Fine: it only remembers the unlock for a reload.
    }
    setClicked(true);
  };

  return (
    <>
      <section aria-labelledby="add-to-calendar" className="mt-8 rounded-card bg-surface p-6 ring-1 ring-line sm:p-10">
        <p className="text-[13px] font-medium tracking-[0.12em] text-muted uppercase">{added ? "Done ✓" : "One last step"}</p>
        <h2 id="add-to-calendar" className="mt-3 text-3xl leading-tight font-medium tracking-[-0.03em] sm:text-5xl">
          {added ? "It's in your calendar." : "Add the call to your calendar now."}
        </h2>
        {when && <p className="mt-3 text-xl font-medium sm:text-2xl">{when}</p>}
        <p className="mt-3 text-lg text-fg/75 sm:text-xl">
          {added
            ? "You'll get a reminder before it starts, with the meeting link inside."
            : "One tap, and the meeting link and a reminder are saved, so you don't have to look for an email on the day."}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a
            href={link("google")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => markAdded("google")}
            className="flex items-center justify-center gap-2 rounded-md bg-ink px-6 py-4 text-base font-medium text-white hover:bg-ink/85"
          >
            <CalendarIcon /> Add to Google Calendar
          </a>
          <a
            href={link("ics")}
            onClick={() => markAdded("ics")}
            className="flex items-center justify-center gap-2 rounded-md px-6 py-4 text-base font-medium ring-1 ring-fg/20 ring-inset hover:ring-fg/45"
          >
            <CalendarIcon /> Outlook / Apple / other
          </a>
        </div>

        <div className="mt-8 rounded-md bg-subtle p-5 sm:p-6">
          <p className="text-xl leading-snug font-medium sm:text-2xl">
            Then open the invite we&apos;ve emailed you and tap &ldquo;Yes&rdquo;.
          </p>
          <p className="mt-2 text-base text-fg/75 sm:text-lg">
            After that, Gmail treats amfire as someone you know, and our invites go straight into your calendar. Using Gmail? The invite may be under the{" "}
            <strong>Promotions</strong> or <strong>Updates</strong> tab.
          </p>
        </div>
      </section>

    </>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
      <path d="M3 8.5h14M7 2.5v4M13 2.5v4M10 11v4M8 13h4" />
    </svg>
  );
}
