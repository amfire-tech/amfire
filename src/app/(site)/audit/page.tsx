import type { Metadata } from "next";
import { FreeDemoSection } from "@/components/free-demo";
import { Arrow, ButtonLink, CheckList, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { LEAD_AUDIT } from "@/knowledge/catalog";

export const metadata: Metadata = {
  // An outreach tool, linked only from /agencies: kept out of search results.
  robots: { index: false, follow: true },
  title: "Free Lead Response Audit: How Fast Does Your Business Answer?",
  description:
    "We enquire at up to three businesses the way a real customer would and report how fast they answered, what they missed and what it costs. Free, within 48 hours. For owners and agencies.",
  alternates: { canonical: "/audit" },
};

const HREF = `/start?goal=${LEAD_AUDIT.goal}`;

const STEPS = [
  { title: "You name the businesses", body: "Up to three: your own, or three of your clients'. Two minutes on our form." },
  { title: "We enquire like a customer", body: "A real enquiry by web form, phone and chat, at a normal time, with a normal question." },
  { title: "We time everything", body: "When they first answered, whether anyone followed up, and what they missed." },
  { title: "You get the report", body: "Within 48 hours: the numbers for each business, what slow replies cost, and the fix." },
];

const FINDINGS = [
  { stat: "Minutes, not hours", body: "Buyers who enquire usually go with whoever answers first. Every hour of waiting hands the sale to a competitor." },
  { stat: "Nights and weekends", body: "Many enquiries arrive when nobody is at the desk. We test those too, because that's where most leads go cold." },
  { stat: "One follow-up", body: "A single polite follow-up recovers a share of the leads that never replied. Most businesses never send it." },
];

export default function AuditPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="grid gap-10 py-12 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <Eyebrow>Free · within 48 hours</Eyebrow>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              How fast does your business <span className="text-brand">really</span> answer a new customer?
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">{LEAD_AUDIT.summary}</p>
            <ButtonLink href={HREF} size="lg" className="mt-8">
              {LEAD_AUDIT.cta} <Arrow />
            </ButtonLink>
          </div>
          <div className="rounded-card bg-ink p-6 text-white sm:p-8">
            <p className="text-[13px] font-medium tracking-[0.12em] text-white/55 uppercase">What you get</p>
            <div className="mt-4 text-sm text-white/85">
              <CheckList items={[...LEAD_AUDIT.points]} />
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-subtle">
        <Container className="py-16 sm:py-24">
          <SectionHeading eyebrow="How it works" title="A mystery shopper for your enquiries." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[1.5rem] bg-surface p-6 ring-1 ring-line">
                <span className="text-brand text-sm font-bold">0{i + 1}</span>
                <h2 className="mt-2 text-lg font-semibold">{s.title}</h2>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow="What we look for" title="Where the leads leak." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FINDINGS.map((f) => (
            <div key={f.stat} className="rounded-[1.5rem] bg-surface p-6 ring-1 ring-line">
              <h3 className="text-xl font-semibold tracking-tight">{f.stat}</h3>
              <p className="mt-2 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-[1.5rem] p-6 ring-1 ring-line sm:p-8">
          <h3 className="text-xl font-semibold tracking-tight">Run an agency?</h3>
          <p className="mt-2 max-w-3xl text-muted">
            Run it on three of your clients. The report comes unbranded so you can put your name on it and take it to them. It&apos;s the easiest way to start the
            conversation about AI follow-up. If they want the fix, we build it under your brand.
          </p>
        </div>
      </Container>

      <FreeDemoSection goal={LEAD_AUDIT.goal} cta={LEAD_AUDIT.cta} title="Find out what your enquiries are really getting." body={LEAD_AUDIT.summary} />
    </>
  );
}
