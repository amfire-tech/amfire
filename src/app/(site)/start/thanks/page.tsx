import type { Metadata } from "next";
import { LeadConversion } from "@/components/analytics-client";
import { WhatsAppIcon } from "@/components/contact";
import { GiftIcon, PromoCode } from "@/components/demo-offer";
import { BulletList, ButtonLink, Card, Container, PathBadge, buttonClass } from "@/components/ui";
import { contact, site } from "@/config/site";
import { getDb } from "@/db";
import { Money } from "@/components/currency";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { getPublicDiscoveryResult } from "@/server/leads";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

export default async function ThanksPage({ searchParams }: PageProps<"/start/thanks">) {
  const { ref } = await searchParams;
  const result = typeof ref === "string" ? await getPublicDiscoveryResult(await getDb(), ref) : null;
  const rec = result?.recommendation;

  return (
    <div className="bg-subtle">
      <Container className="max-w-3xl py-12 sm:py-16">
        {result && typeof ref === "string" && <LeadConversion bookingRef={ref} path={rec?.path} />}
        <p className="text-sm font-medium text-muted">Received</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          Thank you{result ? `, ${result.firstName}` : ""}.
        </h1>
        <p className="mt-3 text-fg/75">
          Your free demo request is in. A person at amfire will call or email you to fix a time. Nothing is agreed until you approve a written proposal.
        </p>

        {result && (
          <section aria-labelledby="offer" className="relative mt-8 overflow-hidden rounded-card bg-ink p-6 text-white sm:p-8">
            <div aria-hidden className="bg-brand absolute -top-24 -right-24 size-64 rounded-full opacity-30 blur-3xl" />
            <div className="relative">
              <p className="flex items-center gap-2 text-sm font-semibold tracking-widest text-flame uppercase">
                <GiftIcon /> Unlocked
              </p>
              <h2 id="offer" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                You&apos;ve got <span className="text-brand"><Money amounts={DEMO_OFFER.amount} /> off</span> any plan
              </h2>
              <p className="mt-2 text-white/75">Here&apos;s your personal promo code. It&apos;s linked to this booking.</p>
              <div className="mt-5 max-w-md">
                <PromoCode code={result.offerCode} />
              </div>
              <p className="mt-4 text-sm text-white/60">
                There&apos;s nothing to enter later: we take <Money amounts={DEMO_OFFER.amount} /> off your proposal, and you&apos;ll see it there before you accept. Keep the
                code for your records.
              </p>
            </div>
          </section>
        )}

        {rec && (
          <Card className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              <PathBadge path={rec.path} />
              <span className="text-sm text-muted">Our initial read — to be confirmed with you</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">{rec.headline}</h2>
            <p className="mt-2 text-fg/80">{rec.summary}</p>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">How we&apos;d approach it</h3>
                <div className="mt-3 text-sm">
                  <BulletList items={rec.approach} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">What we&apos;re assuming</h3>
                <div className="mt-3 text-sm">
                  <BulletList items={rec.assumptions} />
                </div>
              </div>
            </div>

            {rec.openQuestions.length > 0 && (
              <div className="mt-8 rounded-xl bg-subtle p-4">
                <h3 className="text-sm font-semibold">Questions we&apos;ll likely ask</h3>
                <div className="mt-2 text-sm">
                  <BulletList items={rec.openQuestions} />
                </div>
              </div>
            )}
          </Card>
        )}

        <div className="mt-8 rounded-card bg-ink p-6 text-white sm:p-8">
          <h2 className="text-lg font-semibold">Did we misunderstand something?</h2>
          <p className="mt-2 text-white/70">
            WhatsApp, call or email us — a person will correct it. You don&apos;t need to fill in the form again.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={contact.whatsapp("Hi amfire, I just booked a free demo.")}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("inverse")}
            >
              <WhatsAppIcon className="text-[#25d366]" /> WhatsApp {site.contactPhone}
            </a>
            <ButtonLink href={contact.email} variant="inverse">
              Email {site.contactEmail}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </div>
  );
}
