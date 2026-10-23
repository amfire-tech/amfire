import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AutomateDemo } from "@/components/demos/automate-demo";
import { BuildDemo } from "@/components/demos/build-demo";
import { HireVsAmfire } from "@/components/demos/hire-vs-amfire";
import { OperateDemo } from "@/components/demos/operate-demo";
import { SavingsCalculator } from "@/components/demos/savings-calculator";
import { ForCurrency } from "@/components/currency";
import { ExampleCard } from "@/components/example-card";
import { JsonLd } from "@/components/json-ld";
import { PricingSection } from "@/components/pricing-section";
import { ServiceStory } from "@/components/service-story";
import { Arrow, ButtonLink, CheckList, Container, Eyebrow, SectionHeading, SwipeRow } from "@/components/ui";
import { serviceJsonLd } from "@/config/structured-data";
import { FREE_DEMO, SERVICES, SERVICE_DETAILS, type ServicePathId } from "@/knowledge/catalog";
import { examplesFor } from "@/knowledge/examples";
import { STARTING_PRICE } from "@/knowledge/pricing";

const PATHS = Object.keys(SERVICES) as ServicePathId[];
const isPath = (p: string): p is ServicePathId => (PATHS as string[]).includes(p);

const DEMOS: Record<ServicePathId, { title: string; body: string; demo: ReactNode }> = {
  build: {
    title: "Try a dealer app we could build for you",
    body: "Switch to Hindi, add items within the dealer's credit limit, place the order and follow it to delivery.",
    demo: <BuildDemo />,
  },
  operate: {
    title: "See how we look after your systems",
    body: "Simulate Diwali traffic hitting an online store and see monitoring, quick response and client updates working together.",
    demo: <OperateDemo />,
  },
  automate: {
    title: "Follow a WhatsApp order into Tally",
    body: "Step through an order from a Surat wholesaler — including the moment a person has to approve it.",
    demo: <AutomateDemo />,
  },
};

// Page titles written for search: what the service is called by people looking for it.
const SEO_TITLES: Record<ServicePathId, string> = {
  build: "Custom Software & App Development for Businesses",
  operate: "Managed IT, Website, SEO & Digital Marketing — Monthly Plan",
  automate: "Business Automation — WhatsApp Orders to Tally, GST & Payments",
};

export function generateStaticParams() {
  return PATHS.map((path) => ({ path }));
}

export async function generateMetadata({ params }: PageProps<"/services/[path]">): Promise<Metadata> {
  const { path } = await params;
  if (!isPath(path)) return {};
  return {
    title: SEO_TITLES[path],
    description: `${SERVICE_DETAILS[path].headline} ${SERVICES[path].description}`,
    alternates: { canonical: `/services/${path}` },
  };
}

export default async function ServicePage({ params }: PageProps<"/services/[path]">) {
  const { path } = await params;
  if (!isPath(path)) notFound();
  const service = SERVICES[path];
  const detail = SERVICE_DETAILS[path];
  const examples = examplesFor(path);
  const demo = DEMOS[path];
  const others = PATHS.filter((p) => p !== path);
  const cta = `/start?goal=${detail.goal}`;

  return (
    <>
      <JsonLd data={serviceJsonLd(path, SEO_TITLES[path])} />
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Container className="grid gap-8 py-12 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">
          <div>
            <Eyebrow>
              {service.name} · {service.tagline}
            </Eyebrow>
            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl">{detail.headline}</h1>
            <p className="mt-6 max-w-xl text-lg text-muted">{detail.persona}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={cta} size="lg">
                {FREE_DEMO.cta} <Arrow />
              </ButtonLink>
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-surface p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.4)] ring-1 ring-line sm:p-7">
            <p className="text-sm font-semibold">This is for you if…</p>
            <div className="mt-4">
              <CheckList items={detail.signs} />
            </div>
          </div>
        </Container>
      </section>

      {/* The story */}
      <section className="border-y border-line bg-subtle">
        <Container className="py-14 sm:py-20">
          <SectionHeading eyebrow="A story you might recognise" title={`How ${service.name} works for a real business problem`} />
          <div className="mt-10">
            <ServiceStory story={detail.story} />
          </div>
        </Container>
      </section>

      {/* Free offer */}
      <section>
        <Container className="py-12 sm:py-16">
          <div className="relative overflow-hidden rounded-[1.5rem] p-6 ring-2 ring-flame sm:p-10">
            <div aria-hidden className="bg-brand absolute -top-24 -right-24 size-64 rounded-full opacity-15 blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1.4fr_auto] lg:items-center">
              <div>
                <p className="text-brand text-xs font-bold tracking-[0.2em] uppercase">Free</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{detail.offerTitle}</h2>
                <p className="mt-3 max-w-2xl text-muted">{detail.offer}</p>
              </div>
              <ButtonLink href={cta} size="lg">
                {FREE_DEMO.cta} <Arrow />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* What you get */}
      <section className="border-y border-line bg-subtle">
        <Container className="py-14 sm:py-20">
          <SectionHeading eyebrow="What's included" title={detail.deliverablesTitle} description={service.description} />
          <div className="mt-8 grid gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {detail.deliverables.map((d, i) => (
              <div key={d.title} className="flex gap-4 rounded-card bg-surface p-4 ring-1 ring-line sm:block sm:p-6">
                <span className="text-brand shrink-0 pt-0.5 text-sm font-bold">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold sm:mt-3">{d.title}</h3>
                  <p className="mt-1 text-sm text-muted sm:mt-2">{d.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Operate: hiring comparison · Automate: manual work cost */}
      {path === "operate" && (
        <section>
          <Container className="py-14 sm:py-20">
            <SectionHeading
              eyebrow="Hire a team or partner with AMFIRE?"
              title="Compare the cost of an in-house tech team"
              description={
                <>
                  <ForCurrency currency="INR">A fresher costs around ₹25,000 a month, an experienced person ₹40,000–45,000</ForCurrency>
                  <ForCurrency currency="USD">A junior hire costs around $4,000 a month, an experienced one $6,000–8,000</ForCurrency> — and
                  most businesses need two or three. Here&apos;s how that compares with AMFIRE.
                </>
              }
            />
            <div className="mt-10">
              <HireVsAmfire startingPrice={STARTING_PRICE.operate} />
            </div>
          </Container>
        </section>
      )}
      {path === "automate" && (
        <section>
          <Container className="py-14 sm:py-20">
            <SectionHeading
              eyebrow="Quick estimate"
              title="What is this manual work costing you today?"
              description="Move the sliders to match one repetitive task — order entry, payment follow-ups, reconciliation."
            />
            <div className="mt-10">
              <SavingsCalculator />
            </div>
          </Container>
        </section>
      )}

      {/* Steps */}
      <section className={path === "build" ? "" : "border-t border-line"}>
        <Container className="py-14 sm:py-20">
          <SectionHeading eyebrow="How it works" title={`Working with us on ${service.name}`} />
          <ol className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {detail.steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 rounded-card bg-surface p-4 ring-1 ring-line sm:block sm:p-6">
                <span className="bg-brand grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold text-ink">{i + 1}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold sm:mt-4">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted sm:mt-1.5">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Demo */}
      <section id="demo" className="scroll-mt-20 border-t border-line bg-subtle">
        <Container className="py-14 sm:py-20">
          <SectionHeading eyebrow="Interactive demo" title={demo.title} description={demo.body} />
          <div className="mt-10">{demo.demo}</div>
        </Container>
      </section>

      {/* Examples */}
      <section>
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Examples"
            title={`${service.name} in Indian businesses`}
            description="Illustrative engagements based on common situations — not client case studies."
          />
          <SwipeRow className="mt-8 sm:mt-10">
            {examples.map((e) => (
              <ExampleCard key={e.slug} example={e} />
            ))}
          </SwipeRow>
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-t border-line">
        <Container className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Questions owners ask</h2>
            <p className="mt-3 text-muted">Anything else? Ask us during your free demo.</p>
            <div className="mt-8 grid gap-3">
              {others.map((p) => (
                <Link key={p} href={`/services/${p}`} className="group rounded-2xl bg-surface p-5 ring-1 ring-line hover:ring-fg/30">
                  <p className="text-xs font-semibold tracking-widest text-muted uppercase">{SERVICES[p].name}</p>
                  <p className="mt-1 font-medium">{SERVICES[p].tagline}</p>
                </Link>
              ))}
            </div>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {detail.faqs.map((f) => (
              <details key={f.q} className="group py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="text-xl text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="pb-4 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Pricing — always last */}
      <PricingSection only={path} />
    </>
  );
}
