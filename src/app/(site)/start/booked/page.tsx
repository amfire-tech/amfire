import type { Metadata } from "next";
import { LeadConversion } from "@/components/analytics-client";
import { WhatsAppIcon } from "@/components/contact";
import { CheckList, Container, buttonClass } from "@/components/ui";
import { contact, site } from "@/config/site";
import { getDb } from "@/db";
import { Money } from "@/components/currency";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { bookedCall, bookingOfferCode } from "@/server/bookings";
import { AddToCalendar } from "./add-to-calendar";

export const metadata: Metadata = { title: "You're booked", robots: { index: false } };

// Where the calendar sends visitors the moment a call is booked (see OneClickBooking).
export default async function BookedPage({ searchParams }: PageProps<"/start/booked">) {
  const { b, k, s, e } = await searchParams;
  const uid = typeof b === "string" && /^[\w-]{6,64}$/.test(b) ? b : null;
  const partner = k === "partner";
  const iso = (v: unknown) => (typeof v === "string" && !Number.isNaN(new Date(v).getTime()) ? v : undefined);
  const db = uid ? await getDb() : null;
  const code = db && uid && !partner ? await bookingOfferCode(db, uid) : null;
  // The time from Cal.com's success message, else from its webhook if that has already arrived.
  const call = db && uid ? await bookedCall(db, uid, { start: iso(s), end: iso(e), partner }) : null;

  return (
    <div className="bg-subtle">
      <Container className="max-w-3xl py-10 sm:py-16">
        {uid && <LeadConversion bookingRef={uid} path={partner ? "partner" : "demo"} />}
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <span aria-hidden>✓</span> Booked
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">You&apos;re booked. See you on the call.</h1>
        <p className="mt-2 text-fg/75">We&apos;ve emailed your invite with the Google Meet link. Nothing to prepare: come as you are.</p>

        {uid ? (
          <AddToCalendar
            uid={uid}
            kind={partner ? "partner" : "demo"}
            start={call?.start.toISOString()}
            end={call?.end.toISOString()}
            code={code}
            offer={<Money amounts={DEMO_OFFER.amount} />}
          />
        ) : (
          <p className="mt-6 rounded-card bg-surface p-5 ring-1 ring-line">Your invite is in your email: open it and tap &ldquo;Yes&rdquo; to add the call to your calendar.</p>
        )}

        <section aria-labelledby="on-the-call" className="mt-8 rounded-card bg-surface p-6 ring-1 ring-line sm:p-8">
          <h2 id="on-the-call" className="text-lg font-semibold">On the call</h2>
          <div className="mt-4 text-sm">
            <CheckList
              items={
                partner
                  ? ["How the white-label deal works and what you'd resell", "What we'd build for your first client", "Prices in writing before anything starts"]
                  : [
                      "You tell us how the business runs today, in your own words",
                      "We show working examples close to yours",
                      "You leave with where AI and automation would save you the most, even if the answer is that you don't need us yet",
                    ]
              }
            />
          </div>
        </section>

        <div className="mt-8 rounded-card bg-ink p-6 text-white sm:p-8">
          <h2 className="text-lg font-semibold">Need to change something?</h2>
          <p className="mt-2 text-white/70">Use the link in your invite to reschedule, or message us and a person will sort it.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={contact.whatsapp("Hi amfire, I just booked a call.")}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("inverse")}
            >
              <WhatsAppIcon className="text-[#25d366]" /> WhatsApp {site.contactPhone}
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}
