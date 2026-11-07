"use client";

// The one job of the booked page: get the call into the client's own calendar
// before they leave. The ₹5,000 code stays locked until they tap one of the
// calendar buttons, so nobody skips it.

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { PromoCode } from "@/components/demo-offer";
import { track } from "@/lib/analytics";

type Props = {
  uid: string;
  kind: "demo" | "partner";
  start?: string;
  end?: string;
  /** The promo code, revealed once the call is in their calendar; null for partner calls. */
  code: string | null;
  /** The discount, as shown in the visitor's currency. */
  offer: ReactNode;
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

export function AddToCalendar({ uid, kind, start, end, code, offer }: Props) {
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
      <section aria-labelledby="add-to-calendar" className="mt-8 rounded-card bg-surface p-6 ring-2 ring-[#ff453a] sm:p-10">
        <p className="text-sm font-semibold tracking-widest text-[#ff453a] uppercase">{added ? "Done ✓" : "One last step"}</p>
        <h2 id="add-to-calendar" className="mt-2 text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
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
            className="bg-brand shine flex items-center justify-center gap-2 rounded-full px-6 py-4 text-lg font-semibold text-ink shadow-[0_10px_30px_-12px_rgba(255,69,58,0.8)] hover:brightness-105"
          >
            <CalendarIcon /> Add to Google Calendar
          </a>
          <a
            href={link("ics")}
            onClick={() => markAdded("ics")}
            className="flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-lg font-semibold text-white hover:bg-ink/90"
          >
            <CalendarIcon /> Outlook / Apple / other
          </a>
        </div>

        <div className="mt-8 rounded-2xl bg-subtle p-5 sm:p-6">
          <p className="text-xl leading-snug font-semibold sm:text-2xl">
            Then open the invite we&apos;ve emailed you and tap <span className="text-[#ff453a]">&ldquo;Yes&rdquo;</span>.
          </p>
          <p className="mt-2 text-base text-fg/75 sm:text-lg">
            After that, Gmail treats amfire as someone you know, and our invites go straight into your calendar. Using Gmail? The invite may be under the{" "}
            <strong>Promotions</strong> or <strong>Updates</strong> tab.
          </p>
        </div>
      </section>

      {code && (
        <section aria-labelledby="offer" className="relative mt-8 overflow-hidden rounded-card bg-ink p-6 text-white sm:p-8">
          <div aria-hidden className="bg-brand absolute -top-24 -right-24 size-64 rounded-full opacity-30 blur-3xl" />
          <div className="relative">
            <p className="text-sm font-semibold tracking-widest text-flame uppercase">{added ? "Unlocked" : "Locked"}</p>
            <h2 id="offer" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {added ? (
                <>You&apos;ve got <span className="text-brand">{offer} off</span> any plan</>
              ) : (
                <>Your <span className="text-brand">{offer} off</span> code unlocks once the call is in your calendar</>
              )}
            </h2>
            {added ? (
              <>
                <p className="mt-2 text-white/75">Here&apos;s your personal promo code. It&apos;s linked to this booking.</p>
                <div className="mt-5 max-w-md">
                  <PromoCode code={code} />
                </div>
                <p className="mt-4 text-sm text-white/60">There&apos;s nothing to enter later: we take it off your proposal, and you&apos;ll see it there before you accept.</p>
              </>
            ) : (
              <p className="mt-3 text-white/75">Tap one of the calendar buttons above and your code appears here.</p>
            )}
          </div>
        </section>
      )}
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
