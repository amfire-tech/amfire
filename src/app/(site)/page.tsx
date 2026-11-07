import type { Metadata } from "next";
import Link from "next/link";
import { AutomateDemo } from "@/components/demos/automate-demo";
import { HireVsAmfire } from "@/components/demos/hire-vs-amfire";
import { ModeShowcase } from "@/components/demos/mode-showcase";
import { CaseStudyCard } from "@/components/case-study-card";
import { DepartmentShowcase } from "@/components/departments";
import { FounderNote } from "@/components/founder-note";
import { ExampleCard } from "@/components/example-card";
import { FreeDemoSection } from "@/components/free-demo";
import { GiftIcon } from "@/components/demo-offer";
import { JourneyVideo } from "@/components/journey-video";
import { StoryTabs } from "@/components/story-tabs";
import { Arrow, ButtonLink, CheckList, Container, Eyebrow, SectionHeading, SwipeRow } from "@/components/ui";
import { FREE_DEMO, INDUSTRIES, SERVICES, SERVICE_DETAILS, TOOLS, TOOLS_GLOBAL, type ServicePathId } from "@/knowledge/catalog";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { EXAMPLES } from "@/knowledge/examples";
import { ForCurrency, Money } from "@/components/currency";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { SOLUTION_COUNT } from "@/knowledge/solutions";

import { HIRING } from "@/knowledge/catalog";
import { site } from "@/config/site";

/** Salaries for a developer, a digital marketer and a social media person, per month. */
const THREE_HIRES = { INR: 3 * HIRING.salary.INR.fresher * 100, USD: 3 * HIRING.salary.USD.fresher * 100 };

const PATHS = Object.keys(SERVICES) as ServicePathId[];

// The browser tab and search results show this title.
const TITLE = "amfire - Streamlined workflow";
const DESCRIPTION =
  "Custom software, WhatsApp-to-Tally and GST automation, and a managed website, SEO and IT team for one monthly fee — for Indian businesses. Book a free 30-minute demo.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
};

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
        <Container className="grid items-center gap-10 pt-10 pb-12 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-12 lg:pt-16">
          <div>
            {/* Visitors outside India (shown prices in dollars) get the international pitch; no flash, it's the same currency switch. */}
            <Eyebrow>
              <ForCurrency currency="INR">Technology partner for Indian businesses</ForCurrency>
              <ForCurrency currency="USD">AI automation partner for growing businesses</ForCurrency>
            </Eyebrow>
            <h1 className="mt-5 text-[2.35rem] leading-[1.06] font-semibold tracking-tight text-balance min-[400px]:text-[2.6rem] sm:text-6xl">
              Build what&apos;s missing. Run what matters. <span className="text-brand">Automate the rest.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:mt-6 sm:text-lg">
              <ForCurrency currency="INR">
                Tell us your business problem. We build the software for it, run everything online for you, and automate the work
                that eats your team&apos;s day — so you can focus on your business.
              </ForCurrency>
              <ForCurrency currency="USD">
                Tell us where your business loses time. We build the AI agents and software that fix it, run them for you, and
                automate the work that eats your team&apos;s day — from a team that delivers while you sleep.
              </ForCurrency>
            </p>
            <Link href="/solutions" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
              Explore {SOLUTION_COUNT} AI solutions <Arrow />
            </Link>
            <div className="mt-8 flex flex-col gap-2 sm:mt-9 sm:flex-row sm:items-center sm:gap-3">
              <ButtonLink href="/start" size="lg" className="w-full sm:w-auto">
                {FREE_DEMO.cta} <Arrow />
              </ButtonLink>
              <Link href="#departments" className="inline-flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-semibold underline-offset-4 hover:underline">
                See what we automate, department by department
              </Link>
            </div>
            <Link
              href="/start"
              className="bg-brand shine mt-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-ink shadow-[0_10px_30px_-12px_rgba(255,69,58,0.8)] sm:mt-4 sm:inline-flex sm:rounded-full"
            >
              <GiftIcon className="shrink-0" />
              <span>
                Book a free demo and get <strong className="font-bold">flat <Money amounts={DEMO_OFFER.amount} /> off</strong> any plan.
              </span>
            </Link>
          </div>
          <ModeShowcase />
        </Container>

      </section>

      {/* Tools: Indian visitors see Tally, GST and UPI; everyone else the tools they use. */}
      {([["INR", TOOLS], ["USD", TOOLS_GLOBAL]] as const).map(([currency, tools]) => (
        <section
          key={currency}
          data-currency-only={currency}
          aria-label="Works with the tools you already use"
          className="border-y border-line bg-subtle py-5 sm:py-6"
        >
          <Container className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <p className="shrink-0 text-xs font-semibold tracking-widest text-muted uppercase">Works with what you use</p>
            <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
                {[...tools, ...tools].map((t, i) => (
                  <li key={i} aria-hidden={i >= tools.length} className="rounded-full bg-surface px-4 py-1.5 text-sm font-medium whitespace-nowrap ring-1 ring-line">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      ))}

      {/* Visitors outside India: the white-label partner path for agencies. */}
      <section data-currency-only="USD" aria-label="For marketing agencies">
        <Container className="pt-10 sm:pt-14">
          <Link
            href="/agencies"
            className="group flex flex-col gap-3 rounded-card bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8"
          >
            <span>
              <span className="block text-xs font-semibold tracking-[0.2em] text-flame uppercase">Run a marketing agency or coaching program?</span>
              <span className="mt-2 block text-xl font-semibold tracking-tight sm:text-2xl">We&apos;re the AI build team behind your brand. You keep the client and the margin.</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold group-hover:underline">
              How white-label works <Arrow />
            </span>
          </Link>
        </Container>
      </section>

      {/* Delivered work — real proof before illustrative stories */}
      <section>
        <Container className="py-14 sm:py-24">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Our work"
              title="Live projects, built by amfire"
              description="From an AI platform used by schools to a premium website for a smart-garden brand — open them and see for yourself."
            />
            <Link href="/work" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
              All our work <Arrow />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:mt-12 lg:grid-cols-2">
            {CASE_STUDIES.map((c) => (
              <CaseStudyCard key={c.slug} study={c} />
            ))}
          </div>
        </Container>
      </section>

      <DepartmentShowcase />

      <FounderNote />

      {/* Owner stories (Indian businesses) */}
      <section id="stories" data-currency-only="INR" className="scroll-mt-20 border-y border-line bg-subtle">
        <Container className="py-14 sm:py-24">
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
        <Container className="py-14 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
            <div>
              <Eyebrow>Operate · your tech team, without hiring</Eyebrow>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Why hire an IT team when you can have a technology partner?
              </h2>
              <p className="mt-4 text-muted">
                A developer, a digital marketer and someone for social media can cost <Money amounts={THREE_HIRES} /> or more a month. amfire manages your
                website, email, software, social media, SEO, online marketing and lead follow-up — for one monthly fee.
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
            <HireVsAmfire />
          </div>
        </Container>
      </section>

      {/* Live demo: WhatsApp to Tally, for Indian visitors */}
      <section data-currency-only="INR" className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute top-1/3 -right-40 size-[30rem] rounded-full opacity-20 blur-3xl" />
        <Container className="relative grid gap-8 py-14 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12">
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

      {/* Examples from Indian businesses */}
      <section data-currency-only="INR">
        <Container className="py-14 sm:py-24">
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
          <SwipeRow className="mt-8 sm:mt-12">
            {featured.map((e) => (
              <ExampleCard key={e.slug} example={e} />
            ))}
          </SwipeRow>
        </Container>
      </section>

      {/* How it works — the real client journey on video */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-line bg-subtle">
        <Container className="py-14 sm:py-24">
          <SectionHeading
            eyebrow="How it works"
            title="See exactly what happens after you book a demo"
            description="The real client journey on amfire, from booking a free demo to approving milestones and receiving your finished project in the Client Hub."
          />
          <div className="mt-10">
            <JourneyVideo />
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] bg-line ring-1 ring-line sm:mt-10 lg:grid-cols-3">
            {TRANSPARENCY.map((t) => (
              <div key={t.term} className="bg-surface p-4 sm:p-6">
                <dt className="text-[11px] font-semibold tracking-widest text-muted uppercase sm:text-xs">{t.term}</dt>
                <dd className="mt-1.5 text-sm font-medium sm:mt-2 sm:text-base">{t.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Industries (India) */}
      <section data-currency-only="INR" className="border-t border-line">
        <Container className="py-12 sm:py-16">
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
