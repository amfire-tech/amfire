import Link from "next/link";
import { AutomateDemo } from "@/components/demos/automate-demo";
import { HireVsAmfire } from "@/components/demos/hire-vs-amfire";
import { ModeShowcase } from "@/components/demos/mode-showcase";
import { ExampleCard } from "@/components/example-card";
import { FreeDemoSection } from "@/components/free-demo";
import { GiftIcon } from "@/components/demo-offer";
import { JourneyVideo } from "@/components/journey-video";
import { PricingSection } from "@/components/pricing-section";
import { StoryTabs } from "@/components/story-tabs";
import { Arrow, ButtonLink, CheckList, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { FREE_DEMO, HIRING, INDUSTRIES, SERVICES, SERVICE_DETAILS, TOOLS, type ServicePathId } from "@/knowledge/catalog";
import { EXAMPLES } from "@/knowledge/examples";
import { Money } from "@/components/currency";
import { DEMO_OFFER, STARTING_PRICE } from "@/knowledge/pricing";

/** Salaries for a developer, a digital marketer and a social media person, per month. */
const THREE_HIRES = { INR: 3 * HIRING.salary.INR.fresher * 100, USD: 3 * HIRING.salary.USD.fresher * 100 };
import { site } from "@/config/site";

const PATHS = Object.keys(SERVICES) as ServicePathId[];

const TRANSPARENCY = [
  { term: "We're available", value: site.availability.hours },
  { term: "First response", value: `We reply ${site.availability.firstResponse}` },
  { term: "Free demo", value: `${site.availability.demoLength}, no obligation` },
  { term: "You pay", value: "Only for work you have approved" },
  { term: "Your Client Hub", value: "Progress, decisions and updates — any time" },
  { term: "Talk to a person", value: "One point of contact, every step of the way" },
];

export default function HomePage() {
  const featured = PATHS.flatMap((p) => EXAMPLES.filter((e) => e.path === p).slice(0, 2));
  const stories = PATHS.map((p) => ({ path: p, name: SERVICES[p].name, tagline: SERVICES[p].tagline, story: SERVICE_DETAILS[p].story }));

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="bg-brand absolute -top-40 -left-40 -z-10 size-[28rem] rounded-full opacity-[0.12] blur-3xl" />
        <Container className="grid items-center gap-12 pt-14 pb-12 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <Eyebrow>Technology partner for Indian businesses</Eyebrow>
            <h1 className="mt-5 text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
              Build what&apos;s missing. Run what matters. <span className="text-brand">Automate the rest.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">
              Tell us your business problem. We build the software for it, run everything online for you, and automate the work
              that eats your team&apos;s day — so you can focus on your business.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="/start" size="lg">
                {FREE_DEMO.cta} <Arrow />
              </ButtonLink>
              <Link href="#stories" className="inline-flex items-center gap-1.5 px-2 py-3 text-sm font-semibold underline-offset-4 hover:underline">
                See how it works for businesses like yours
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted">
              <GiftIcon className="text-signal" />
              <span>
                Book a free demo and get <strong className="font-semibold text-fg">flat <Money amounts={DEMO_OFFER.amount} /> off</strong> any plan.
              </span>
            </p>
          </div>
          <ModeShowcase />
        </Container>

      </section>

      {/* Tools */}
      <section aria-label="Works with the tools you already use" className="border-y border-line bg-subtle py-6">
        <Container className="flex flex-col items-center gap-4 sm:flex-row">
          <p className="shrink-0 text-xs font-semibold tracking-widest text-muted uppercase">Works with what you use</p>
          <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
              {[...TOOLS, ...TOOLS].map((t, i) => (
                <li key={i} aria-hidden={i >= TOOLS.length} className="rounded-full bg-surface px-4 py-1.5 text-sm font-medium whitespace-nowrap ring-1 ring-line">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* Owner stories */}
      <section id="stories" className="scroll-mt-20 border-y border-line bg-subtle">
        <Container className="py-20 sm:py-24">
          <SectionHeading
            eyebrow="Stories"
            title="What this looks like for a business like yours"
            description="Illustrative stories based on situations common across Indian businesses."
          />
          <div className="mt-10">
            <StoryTabs stories={stories} />
          </div>
        </Container>
      </section>

      {/* Operate: cost of hiring */}
      <section>
        <Container className="py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <Eyebrow>Operate · your tech team, without hiring</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Why hire an IT team when you can have a technology partner?
              </h2>
              <p className="mt-4 text-muted">
                A developer, a digital marketer and someone for social media can cost <Money amounts={THREE_HIRES} /> or more a month. AMFIRE manages your
                website, email, software, social media, SEO and online marketing — for one monthly fee.
              </p>
              <div className="mt-6 text-sm">
                <CheckList
                  items={[
                    "One partner for everything on the internet",
                    "Always updated on new technology — including AI agents",
                    "You focus on your core business; we handle the rest",
                  ]}
                />
              </div>
            </div>
            <div className="lg:pb-2">
              <Link href="/services/operate" className="inline-flex items-center gap-1.5 text-sm font-semibold">
                What Operate includes <Arrow />
              </Link>
            </div>
          </div>
          <div className="mt-10">
            <HireVsAmfire startingPrice={STARTING_PRICE.operate} />
          </div>
        </Container>
      </section>

      <PricingSection />

      {/* Live demo */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute top-1/3 -right-40 size-[30rem] rounded-full opacity-20 blur-3xl" />
        <Container className="relative grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <Eyebrow className="text-white/60">Automate · try it yourself</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A WhatsApp order, posted to Tally — with a person in charge.</h2>
            <p className="mt-4 text-white/70">
              Follow an order from a Surat fabric wholesaler: read from WhatsApp, checked against stock and credit, approved by the
              owner, posted to TallyPrime with the e-invoice, and confirmed back to the customer.
            </p>
            <Link href="/services/automate" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold">
              More about Automate <Arrow />
            </Link>
          </div>
          <div className="text-fg">
            <AutomateDemo />
          </div>
        </Container>
      </section>

      {/* Examples */}
      <section>
        <Container className="py-20 sm:py-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Examples"
              title="More examples from Indian businesses"
              description="Illustrative engagements — from Surat to Ludhiana to Chennai."
            />
            <Link href="/work" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
              All {EXAMPLES.length} examples <Arrow />
            </Link>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => (
              <ExampleCard key={e.slug} example={e} />
            ))}
          </div>
        </Container>
      </section>

      {/* How it works — the real client journey on video */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-line bg-subtle">
        <Container className="py-20 sm:py-24">
          <SectionHeading
            eyebrow="How it works"
            title="See exactly what happens after you book a demo"
            description="The real client journey on AMFIRE, from booking a free demo to approving milestones and receiving your finished project in the Client Hub."
          />
          <div className="mt-10">
            <JourneyVideo />
          </div>
          <dl className="mt-10 grid gap-px overflow-hidden rounded-[1.5rem] bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3">
            {TRANSPARENCY.map((t) => (
              <div key={t.term} className="bg-surface p-6">
                <dt className="text-xs font-semibold tracking-widest text-muted uppercase">{t.term}</dt>
                <dd className="mt-2 font-medium">{t.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Industries */}
      <section className="border-t border-line">
        <Container className="py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Built around how Indian industries actually work</h2>
            <Link href="/industries" className="inline-flex items-center gap-1.5 text-sm font-semibold">
              Industries <Arrow />
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => (
              <li key={i.name}>
                <Link href="/industries" className="inline-flex rounded-full bg-surface px-4 py-2 text-sm ring-1 ring-line hover:ring-fg/30">
                  {i.name}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <FreeDemoSection />
    </>
  );
}
