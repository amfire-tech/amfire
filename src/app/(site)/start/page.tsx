import type { Metadata } from "next";
import { GiftIcon } from "@/components/demo-offer";
import { CheckList, Container, Eyebrow } from "@/components/ui";
import { contact, site } from "@/config/site";
import { AGENCY_PARTNER, FREE_DEMO, GOALS, LEAD_AUDIT, OPPORTUNITY_MAP } from "@/knowledge/catalog";
import { CalBooking } from "@/components/cal-booking";
import { Money } from "@/components/currency";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { DiscoveryForm } from "./discovery-form";

export const metadata: Metadata = {
  title: `${FREE_DEMO.title} — 30 Minutes, No Obligation`,
  alternates: { canonical: "/start" },
  description: FREE_DEMO.summary,
};

export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const { goal } = await searchParams;
  // Visitors coming for the AI Opportunity Map or a partner call see it framed that way; the booking is the same.
  const intro =
    goal === OPPORTUNITY_MAP.goal ? OPPORTUNITY_MAP : goal === AGENCY_PARTNER.goal ? AGENCY_PARTNER : goal === LEAD_AUDIT.goal ? LEAD_AUDIT : FREE_DEMO;
  const initialGoal = typeof goal === "string" ? goal : undefined;
  const partner = intro === AGENCY_PARTNER;
  // The calendar comes first: owners pick a time without filling in a form. Only the lead
  // response audit keeps the form first, because it needs the clients to test.
  const calLink = intro === LEAD_AUDIT ? "" : partner ? site.booking.partner : site.booking.demo;
  const topic = initialGoal && !partner ? GOALS.find((g) => g.id === initialGoal)?.label : undefined;
  return (
    <div className="bg-subtle">
      {/* Phones: heading and offer, then the form, then the details. Desktop: details beside the form. */}
      <Container className="grid gap-6 py-8 sm:gap-10 sm:py-16 lg:grid-cols-[0.8fr_1.4fr] lg:grid-rows-[auto_1fr] lg:gap-y-0">
        <div className="lg:pt-4">
          <Eyebrow>Free · no obligation</Eyebrow>
          <h1 className="mt-3 text-[1.75rem] leading-tight font-semibold tracking-tight sm:mt-4 sm:text-4xl">{intro.title}</h1>
          <p className="mt-3 text-fg/75">{intro.summary}</p>
          {/* The free-demo discount is for clients; partners get partner pricing instead. */}
          {intro !== AGENCY_PARTNER && (
          <div className="shine mt-5 rounded-card bg-ink p-4 text-white sm:mt-6 sm:p-5">
            <div aria-hidden className="bg-brand absolute -top-16 -right-16 size-40 rounded-full opacity-30 blur-2xl" />
            <div className="relative flex gap-4">
              <span className="bg-brand grid size-10 shrink-0 place-items-center rounded-full text-ink">
                <GiftIcon className="size-5" />
              </span>
              <div>
                <p className="text-lg font-semibold">
                  Get flat <span className="text-flame"><Money amounts={DEMO_OFFER.amount} /> off</span> any plan
                </p>
                <p className="mt-1 text-sm text-white/75">
                  Book this free demo and your personal promo code appears instantly. We take <Money amounts={DEMO_OFFER.amount} /> off your proposal, so you see the saving
                  before you agree to anything.
                </p>
              </div>
            </div>
          </div>
          )}
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {calLink ? (
            <>
              <h2 className="text-xl font-semibold tracking-tight">{partner ? "Pick a time for your 15-minute partner call" : "Pick a time for your free 30-minute call"}</h2>
              <p className="mt-1 text-sm text-muted">Times are shown in your own time zone. Just your name and email, and the invite is in your inbox.</p>
              <CalBooking className="mt-4" calLink={calLink} kind={partner ? "partner" : "demo"} notes={topic ? `Interested in: ${topic}` : undefined} redirect />
              <details className="group mt-6 rounded-card bg-surface ring-1 ring-line">
                <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium marker:hidden">
                  Rather tell us about your business first? <span className="text-muted">Answer four quick questions instead (optional)</span>
                </summary>
                <div className="border-t border-line p-1 sm:p-2">
                  <DiscoveryForm initialGoal={initialGoal} />
                </div>
              </details>
            </>
          ) : (
            <DiscoveryForm initialGoal={initialGoal} />
          )}
        </div>
        <div className="lg:col-start-1">
          <div className="text-sm lg:mt-6">
            <CheckList items={[...intro.points]} />
          </div>
          <p className="mt-8 text-sm text-muted">
            Prefer to talk?{" "}
            <a href={contact.call} className="font-medium text-fg underline underline-offset-4">
              Call {site.contactPhone}
            </a>
            ,{" "}
            <a href={contact.whatsapp()} target="_blank" rel="noopener noreferrer" className="font-medium text-fg underline underline-offset-4">
              WhatsApp us
            </a>{" "}
            or{" "}
            <a href={contact.email} className="font-medium text-fg underline underline-offset-4">
              email {site.contactEmail}
            </a>
            .
          </p>
        </div>
      </Container>
    </div>
  );
}
