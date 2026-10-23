import type { Metadata } from "next";
import { GiftIcon } from "@/components/demo-offer";
import { CheckList, Container, Eyebrow } from "@/components/ui";
import { contact, site } from "@/config/site";
import { FREE_DEMO } from "@/knowledge/catalog";
import { Money } from "@/components/currency";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { DiscoveryForm } from "./discovery-form";

export const metadata: Metadata = {
  title: FREE_DEMO.title,
  description: FREE_DEMO.summary,
};

export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const { goal } = await searchParams;
  return (
    <div className="bg-subtle">
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[0.8fr_1.4fr]">
        <div className="lg:pt-4">
          <Eyebrow>Free · no obligation</Eyebrow>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{FREE_DEMO.title}</h1>
          <p className="mt-3 text-fg/75">{FREE_DEMO.summary}</p>
          <div className="relative mt-6 overflow-hidden rounded-card bg-ink p-5 text-white">
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
          <div className="mt-6 text-sm">
            <CheckList items={FREE_DEMO.points} />
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
        <DiscoveryForm initialGoal={typeof goal === "string" ? goal : undefined} />
      </Container>
    </div>
  );
}
