import type { Metadata } from "next";
import { LeadConversion } from "@/components/analytics-client";
import { WhatsAppIcon } from "@/components/contact";
import { GiftIcon, PromoCode } from "@/components/demo-offer";
import { CheckList, Container, buttonClass } from "@/components/ui";
import { contact, site } from "@/config/site";
import { getDb } from "@/db";
import { Money } from "@/components/currency";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { bookingOfferCode } from "@/server/bookings";

export const metadata: Metadata = { title: "You're booked", robots: { index: false } };

// Where the calendar sends visitors the moment a call is booked (see OneClickBooking).
export default async function BookedPage({ searchParams }: PageProps<"/start/booked">) {
  const { b, k } = await searchParams;
  const uid = typeof b === "string" && /^[\w-]{6,64}$/.test(b) ? b : null;
  const partner = k === "partner";
  const code = uid && !partner ? await bookingOfferCode(await getDb(), uid) : null;

  return (
    <div className="bg-subtle">
      <Container className="max-w-3xl py-12 sm:py-16">
        {uid && <LeadConversion bookingRef={uid} path={partner ? "partner" : "demo"} />}
        <p className="text-sm font-medium text-muted">Booked</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">You&apos;re booked. See you on the call.</h1>
        <p className="mt-3 text-fg/75">
          The calendar invite with the Google Meet link is on its way to your inbox. Nothing to prepare: come as you are, and we&apos;ll do the work of
          understanding your business.
        </p>

        {!partner && (
          <section aria-labelledby="offer" className="relative mt-8 overflow-hidden rounded-card bg-ink p-6 text-white sm:p-8">
            <div aria-hidden className="bg-brand absolute -top-24 -right-24 size-64 rounded-full opacity-30 blur-3xl" />
            <div className="relative">
              <p className="flex items-center gap-2 text-sm font-semibold tracking-widest text-flame uppercase">
                <GiftIcon /> Unlocked
              </p>
              <h2 id="offer" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                You&apos;ve got <span className="text-brand"><Money amounts={DEMO_OFFER.amount} /> off</span> any plan
              </h2>
              {code ? (
                <>
                  <p className="mt-2 text-white/75">Here&apos;s your personal promo code. It&apos;s linked to this booking.</p>
                  <div className="mt-5 max-w-md">
                    <PromoCode code={code} />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-white/75">It&apos;s linked to your booking.</p>
              )}
              <p className="mt-4 text-sm text-white/60">
                There&apos;s nothing to enter later: we take <Money amounts={DEMO_OFFER.amount} /> off your proposal, and you&apos;ll see it there before you accept.
              </p>
            </div>
          </section>
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
