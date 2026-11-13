import type { Metadata } from "next";
import Link from "next/link";
import { EmberField } from "@/components/ember-field";
import { FreeDemoSection } from "@/components/free-demo";
import { JsonLd } from "@/components/json-ld";
import { Arrow, Container, ConversationButton, Eyebrow } from "@/components/ui";
import { FOUNDERS, FOUNDERS_PROMISE } from "@/config/founders";
import { breadcrumbJsonLd, serviceJsonLd } from "@/config/structured-data";

// For manufacturers, built from the approved spec 10 (14 Nov 2026, docs/seo/manufacturing-pune-spec.html,
// https://claude.ai/artifact/8utidk5hspPCCT2Q7LqJnC). Services stays industry-free and does not link
// here; plant owners arrive from search, outreach, the Business Profile, the footer and one line on
// the homepage. Orange marks only where an order waits. Every figure on the phone is an example, and
// the proof section shows only what is real today (the demo plant and Skillship).

const DESCRIPTION =
  "Systems that carry an order from enquiry to payment across sales, planning, stores, dispatch and accounts, inside the software your plant already uses.";

export const metadata: Metadata = {
  title: "Process automation and AI agents for manufacturers",
  description: DESCRIPTION,
  alternates: { canonical: "/manufacturing" },
};

const H2 = "text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-balance sm:text-[2.75rem]";
const LEDE = "text-lg leading-[1.55] text-muted sm:text-xl";
const LABEL = "text-[13px] font-medium tracking-[0.12em] text-muted uppercase";

/** The order's real sequence, so the stages are numbered. The question is the owner speaking, so it is set in italic. */
const STAGES = [
  {
    name: "Enquiry to quote",
    question: "Has that quote gone out yet?",
    waits: "The enquiry waits for whoever can price it, with drawings, rates and a senior approval still to chase.",
    measure: "Hours to quote, quotes won",
  },
  {
    name: "Order to plan",
    question: "Can we take this order and still ship the others on time?",
    waits: "The plan lives in one person’s head or one spreadsheet, so every new order means a meeting.",
    measure: "Orders confirmed with a date the same day",
  },
  {
    name: "Material and job work",
    question: "Do we have the steel? Where is the job-work lot?",
    waits: "Stock is checked by walking to the store, and job work is tracked by phone.",
    measure: "Shortages caught before a machine stops",
  },
  {
    name: "Dispatch",
    question: "When will it actually ship?",
    waits: "Sales promises a date, the shop floor discovers it, and the customer calls at six in the evening.",
    measure: "On time in full, “where is my order” calls",
  },
  {
    name: "Invoice to payment",
    question: "Who owes us what, and since when?",
    waits: "Invoices go out late, follow-up depends on someone remembering, and short payments surface weeks later.",
    measure: "Days to get paid, overdue share",
  },
];

const QUESTIONS = [
  {
    q: "Is this an ERP?",
    a: "No. An ERP records what happened. We build what moves work between people: the follow-ups, approvals and updates your ERP leaves to email and phone calls. It works alongside the ERP you have, or without one.",
  },
  { q: "We don’t have an ERP. Can we still start?", a: "Yes. Many plants run on accounting software, spreadsheets and WhatsApp. We start from what you use." },
  {
    q: "Will the shop floor actually use it?",
    a: "We build it with the people who will use it, on the phones and tablets they already carry, and in the language they work in.",
  },
  { q: "How soon will something be live?", a: "The first system goes live in weeks, not months, in the part of the plant that costs you most." },
  {
    q: "How is it priced?",
    a: "The Operations Review has a fixed fee that counts towards the build. Each build is priced in a written proposal before work starts, and paid milestone by milestone.",
  },
];

export default function ManufacturingPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "For manufacturers", path: "/manufacturing" }])} />
      <JsonLd
        data={serviceJsonLd({ path: "/manufacturing", name: "Process automation for manufacturers", serviceType: "Business process automation", description: DESCRIPTION, audience: "Manufacturers" })}
      />

      {/* 1 · Opening: the blind spot every plant owner knows, with the light ember glow behind it. */}
      <section className="relative isolate overflow-hidden">
        <EmberField variant="light" />
        <Container className="flex flex-col items-center pt-[clamp(3.5rem,10vh,7rem)] pb-20 text-center sm:pb-24">
          <Eyebrow>For manufacturers</Eyebrow>
          <h1 className="mt-[clamp(1rem,2.5vh,1.5rem)] max-w-[15em] text-[length:clamp(2.5rem,min(4.2vw,8vh),3.5rem)] leading-[1.04] font-medium tracking-[-0.04em] text-balance">
            Your machines are measured to the minute. The work between your teams isn’t.
          </h1>
          <p className={`mt-[clamp(1.25rem,3.5vh,2.5rem)] max-w-[36rem] text-balance ${LEDE}`}>
            Quotes that go out the same day. Orders entered once. Dispatch dates you can promise. Payments that arrive without chasing. That is what we build and run,
            inside the software your plant already uses.
          </p>
          <div className="mt-[clamp(1.5rem,4vh,2.5rem)] flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-8">
            <ConversationButton size="lg" className="w-full sm:w-auto" />
            <Link href="/services" className="inline-flex items-center gap-1.5 py-2 text-[15px] font-medium underline-offset-[6px] hover:underline">
              See the live demo <Arrow />
            </Link>
          </div>
        </Container>
      </section>

      {/* 2 · Where an order waits: the owner's question, where it waits (orange), what we measure. */}
      <section className="border-t border-line">
        <Container className="py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Where an order waits</Eyebrow>
            <h2 className={`mt-5 ${H2}`}>Five places an order waits between enquiry and payment.</h2>
            <p className={`mt-6 ${LEDE}`}>Each team in a plant does its own job well. The days are lost when work passes from one team to the next.</p>
          </div>
          <ol className="mt-14 border-t border-line">
            {STAGES.map((s, i) => (
              <li key={s.name} className="grid gap-4 border-b border-line py-8 md:grid-cols-[19rem_minmax(0,1fr)_14rem] md:gap-10">
                <div>
                  <p className="font-mono text-[13px] text-fg">0{i + 1}</p>
                  <h3 className="mt-3 text-2xl font-medium tracking-tight">{s.name}</h3>
                  <p className="mt-2 font-serif text-xl leading-snug italic">“{s.question}”</p>
                </div>
                <p className="max-w-xl border-l-2 border-ember pl-4 text-[17px] leading-relaxed text-muted md:mt-8">{s.waits}</p>
                <div className="md:mt-8 md:text-right">
                  <p className={LABEL}>We measure</p>
                  <p className="mt-1 text-[15px]">{s.measure}</p>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 3 · The morning after: what he is really buying, as one calm message. Every figure is an example. */}
      <section className="border-t border-line bg-subtle">
        <Container className="flex flex-col items-center py-24 text-center sm:py-32">
          <h2 className={`max-w-[16em] ${H2}`}>One message with your tea. The rest already handled.</h2>
          <figure className="mt-12 w-full max-w-sm rounded-[2rem] border border-line bg-page p-4 text-left shadow-[0_30px_60px_-40px_rgba(11,11,12,0.25)] sm:p-5">
            <figcaption className="pb-3 text-center text-[13px] text-muted">Your company · every morning, 7:30</figcaption>
            <ul className="grid gap-2 text-[15px] leading-snug">
              <li className="rounded-xl border border-line bg-surface px-3.5 py-2.5">Good morning. Here is yesterday.</li>
              <li className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <span className="font-medium">Dispatched on time:</span> 18 of 19. One left a day late; the customer was told before they asked.
              </li>
              <li className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <span className="font-medium">Money in:</span> 4 payments. One customer paid less than billed; the reason is checked and raised with them.
              </li>
              <li className="rounded-xl border border-line bg-surface px-3.5 py-2.5">
                <span className="font-medium">Needs you:</span> a new price for a regular customer, after steel went up.
                <span className="mt-2.5 flex gap-2" aria-hidden>
                  <span className="rounded-md border border-line px-2.5 py-1 text-[13px] font-medium">Approve</span>
                  <span className="rounded-md border border-line px-2.5 py-1 text-[13px] font-medium">Call me</span>
                </span>
              </li>
            </ul>
            <p className="mt-3 text-center text-[13px] tracking-[0.08em] text-muted uppercase">Example message</p>
          </figure>
        </Container>
      </section>

      {/* 4 · Works with what you have. The one place on the site that names software (approved 14 Nov). */}
      <section className="border-t border-line">
        <Container className="flex flex-col items-center py-24 text-center sm:py-32">
          <h2 className={`max-w-[16em] ${H2}`}>Built around the software you already run.</h2>
          <p className={`mt-6 max-w-[38rem] text-balance ${LEDE}`}>
            Tally, SAP Business One, Zoho or whichever accounting software or ERP you run, your Excel sheets, email, WhatsApp and the tablets on the shop floor. We
            connect what you have and add only what the work needs. If something should be replaced, we show you the numbers first.
          </p>
        </Container>
      </section>

      {/* 5 · What we can show you today: only what is real. The first plant case replaces the demo row. */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <h2 className={`text-center ${H2}`}>What we can show you today.</h2>
          <ul className="mt-14 border-t border-fg/15">
            <li className="grid gap-3 border-b border-fg/15 py-8 md:grid-cols-[19rem_minmax(0,1fr)_12rem] md:gap-10">
              <h3 className="text-2xl font-medium tracking-tight">A plant run by agents</h3>
              <p className="max-w-xl text-[17px] leading-relaxed text-muted">
                Halden Precision, a demo company we built: 240 people, two plants, eleven agents at work. Marked as a demo everywhere it appears.
              </p>
              <Link href="/services" className="inline-flex items-center gap-1.5 self-start text-[15px] font-medium underline-offset-[6px] hover:underline md:justify-self-end">
                See it <Arrow />
              </Link>
            </li>
            <li className="grid gap-3 border-b border-fg/15 py-8 md:grid-cols-[19rem_minmax(0,1fr)_12rem] md:gap-10">
              <h3 className="text-2xl font-medium tracking-tight">A complex system in daily use</h3>
              <p className="max-w-xl text-[17px] leading-relaxed text-muted">Skillship’s platform: five roles, 93 screens, more than 380 automated tests, live in schools today.</p>
              <Link
                href="/work/skillship"
                className="inline-flex items-center gap-1.5 self-start text-[15px] font-medium underline-offset-[6px] hover:underline md:justify-self-end"
              >
                Read the case study <Arrow />
              </Link>
            </li>
          </ul>
          {FOUNDERS.length > 0 && (
            <figure className="mx-auto mt-16 max-w-3xl text-center">
              <blockquote className="font-serif text-[1.6rem] leading-[1.3] text-balance italic sm:text-[2rem]">“{FOUNDERS_PROMISE}”</blockquote>
              <figcaption className="mt-6 text-[15px] text-muted">{FOUNDERS.map((f) => f.name).join(" and ")}</figcaption>
            </figure>
          )}
        </Container>
      </section>

      {/* 6 · Start with one order: the call is worth something by itself. */}
      <section className="border-t border-line">
        <Container className="flex flex-col items-center py-24 text-center sm:py-32">
          <h2 className={`max-w-[16em] ${H2}`}>Bring one recent order.</h2>
          <p className={`mt-6 max-w-[36rem] text-balance ${LEDE}`}>
            Thirty minutes with the two of us. We walk that order through your company with you, from enquiry to payment, and show where it waited and what that cost.
            You leave with the drawing, whether or not we work together.
          </p>
        </Container>
      </section>

      {/* 7 · Questions plant owners ask: the searches, in the owner's words, each answered in its first sentence. */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <h2 className={`text-center ${H2}`}>Questions plant owners ask us.</h2>
          <dl className="mt-12 grid gap-x-16 border-t border-fg/15 md:grid-cols-2">
            {QUESTIONS.map((item) => (
              <div key={item.q} className="border-b border-fg/15 py-8">
                <dt className="text-xl leading-snug font-medium tracking-tight">{item.q}</dt>
                <dd className="mt-3 text-[17px] leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* 8 · Close */}
      <FreeDemoSection />
    </>
  );
}
