import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EmberField } from "@/components/ember-field";
import { FlowLine } from "@/components/flow-line";
import { FreeDemoSection } from "@/components/free-demo";
import { JsonLd } from "@/components/json-ld";
import { Arrow, Container, ConversationButton, Eyebrow } from "@/components/ui";
import { FOUNDERS, FOUNDERS_PROMISE } from "@/config/founders";
import { site } from "@/config/site";
import { websiteJsonLd } from "@/config/structured-data";
import { CASE_STUDIES } from "@/knowledge/case-studies";

// Homepage, built from the approved spec (https://claude.ai/artifact/38tzFL5QhwHXtW4RWNBJoq).
// Seven screens, in the order a careful buyer asks: is this serious, do they get my
// problem, how do they work, can they deliver, what would they do for me, who are
// they, is it safe. Copy rules: plain words a busy MD reads once, nothing tied to one
// country, nothing we can't prove, calm, and nothing any other agency could say.
// The vocabulary is four words: work moves, gets stuck, the owner chases, and sees.
// Orange means "stuck" and nothing else. Mono is for figures only. No text under 13px.

const TITLE = "amfire · Operations engineering";
const DESCRIPTION = site.description;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
};

/** Promises already in our terms (see /terms: payment, ownership, confidentiality). */
const SAFETY = [
  { title: "You own what we build", body: "Code, designs and content made for you are yours once paid." },
  { title: "Confidential by default", body: "Your information is used only for your work. We sign your NDA, or ours." },
  { title: "Scope fixed in writing", body: "Nothing starts until you approve the proposal." },
  { title: "Paid on approval", body: "Each milestone is invoiced only after you sign it off." },
];

const BETWEEN_TEAMS = [
  { from: "Sales", to: "Accounts", body: "A quote sits in someone’s inbox while the customer waits." },
  { from: "Orders", to: "Dispatch", body: "The same order is typed in again by three different people." },
  { from: "Accounts", to: "You", body: "You hear about a late payment at month end, when it is already late." },
];

const METHOD = [
  { title: "Understand", body: "We sit with each team and see how work actually moves today, step by step." },
  { title: "Measure", body: "We record where things stand: how long work takes, how often it is redone, how long payments take. Nothing is promised before this." },
  { title: "Build", body: "We build for the one problem that costs you most, with the people who will use it, connected to the tools you already have." },
  { title: "Run", body: "We stay. We look after it, improve it, and show you what changed against where you started." },
];

/** Named after the stages in the drawing, so the page keeps one picture. */
const STARTING_POINTS = [
  { name: "Enquiry to sale", body: "Every enquiry answered quickly and followed up until it is won or closed.", measure: "Reply time, enquiries won" },
  { name: "Order to delivery", body: "An order entered once, and visible to everyone who needs it.", measure: "Re-entry, errors, delivery time" },
  { name: "Invoice to payment", body: "Invoices raised on time and payments followed up without anyone having to remember.", measure: "Days to get paid" },
  { name: "Your view of the company", body: "One screen, every morning: what is stuck, with whom, and for how long.", measure: "Time spent chasing updates" },
];

const H2 = "text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-balance sm:text-[2.75rem]";
const LEDE = "text-lg leading-[1.55] text-muted sm:text-xl";

export default function HomePage() {
  const [lead, ...rest] = CASE_STUDIES;

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      {/* 1 · First screen: a centred cover. One axis down the middle balances the page on wide
          screens; a faint ember field with grain moves behind it so the paper is never flat. */}
      <section>
        <div className="relative isolate flex min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden">
          <EmberField variant="light" />
          <Container className="flex flex-col items-center py-[clamp(2.5rem,6vh,5rem)] text-center">
            <Eyebrow>{site.tagline}</Eyebrow>
            <h1 className="mt-[clamp(1rem,2.5vh,1.5rem)] max-w-[13.5em] text-[length:clamp(2.75rem,min(5.6vw,10.5vh),4.75rem)] leading-[1.02] font-medium tracking-[-0.04em] text-balance sm:leading-none">
              A company that runs without you chasing it.
            </h1>
            <p className={`mt-[clamp(1.25rem,3.5vh,2.5rem)] max-w-[36rem] text-balance ${LEDE}`}>
              We build systems around how your company works, so your team keeps moving and you are free to lead its growth.
            </p>
            <div className="mt-[clamp(1.5rem,4vh,2.5rem)] flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-8">
              <ConversationButton size="lg" className="w-full sm:w-auto" />
              <Link href="/how-we-work" className="inline-flex items-center gap-1.5 py-2 text-[15px] font-medium underline-offset-[6px] hover:underline">
                How we work <Arrow />
              </Link>
            </div>
            {/* The promises belong to the hero: a quiet centred line under the buttons. */}
            <ul className="mt-[clamp(1.5rem,5vh,4rem)] grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] text-muted sm:flex sm:flex-wrap sm:justify-center sm:gap-x-10 sm:text-sm" aria-label="Working with us">
              {SAFETY.map((s) => (
                <li key={s.title} className="flex items-center justify-center gap-2 sm:gap-2.5">
                  <span aria-hidden className="size-1 shrink-0 rounded-full bg-fg/50" />
                  {s.title}
                </li>
              ))}
            </ul>
          </Container>
        </div>
        {/* The drawing gets its own band, set apart by one hairline. */}
        <div className="border-t border-line">
          <Container className="py-20 sm:py-24">
            <Eyebrow className="text-center">How work moves through a company</Eyebrow>
            <FlowLine className="mt-10" />
          </Container>
        </div>
      </section>

      {/* 2 · Point of view */}
      <section className="border-t border-line">
        <Container className="py-24 sm:py-32">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20">
            <div>
              <Eyebrow>Where work gets stuck</Eyebrow>
              <h2 className={`mt-5 ${H2}`}>Work rarely gets stuck inside a team. It gets stuck between teams.</h2>
              <p className={`mt-6 max-w-md ${LEDE}`}>
                Each team does its own job well. The delays happen when work passes from one team to the next, and nobody owns that moment.
              </p>
            </div>
            <div className="lg:pt-2">
              <ul className="border-t border-line">
                {BETWEEN_TEAMS.map((b) => (
                  <li key={b.from} className="grid gap-2 border-b border-line py-7 sm:grid-cols-[11rem_1fr] sm:gap-8">
                    <p className="pt-1 text-[13px] font-medium tracking-[0.12em] text-muted uppercase">
                      {b.from} <span className="text-ember">→</span> {b.to}
                    </p>
                    <p className="text-lg leading-snug tracking-tight sm:text-xl">{b.body}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted">Patterns we look for in every company we study.</p>
            </div>
          </div>
        </Container>
      </section>

      {/* 3 · How we work */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <Eyebrow>How we work</Eyebrow>
              <h2 className={`mt-5 ${H2}`}>Understand first. Build second. Stay after.</h2>
            </div>
            <Link href="/how-we-work" className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] hover:underline">
              More on how we work <Arrow />
            </Link>
          </div>
          <ol className="mt-14 grid border-t border-fg/15 sm:grid-cols-2 lg:grid-cols-4">
            {METHOD.map((m, i) => (
              <li key={m.title} className="border-b border-fg/15 py-8 sm:pr-8 lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-8">
                <p className="font-mono text-[13px] text-fg">0{i + 1}</p>
                <h3 className="mt-4 text-2xl font-medium tracking-tight">{m.title}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-muted">{m.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 4 · Our work */}
      <section className="bg-ink text-white">
        <Container className="py-24 sm:py-32">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <Eyebrow className="text-white/55">Our work</Eyebrow>
              <h2 className={`mt-5 ${H2}`}>Systems in daily use, built by amfire.</h2>
            </div>
            <Link href="/work" className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium text-white/80 underline-offset-[6px] hover:text-white hover:underline">
              All work <Arrow />
            </Link>
          </div>

          {lead && (
            <Link href={`/work/${lead.slug}`} className="group mt-14 grid gap-10 border-t border-white/15 pt-10 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
              <div className="relative aspect-[1200/630] overflow-hidden rounded-md bg-white/5 ring-1 ring-white/10">
                <Image src={lead.cover} alt={lead.coverAlt} fill sizes="(min-width: 1024px) 620px, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.015]" />
              </div>
              <div className="flex flex-col">
                <p className="text-[13px] font-medium tracking-[0.12em] text-white/55 uppercase">
                  {lead.client} · {lead.sector}
                </p>
                <h3 className="mt-4 text-2xl leading-snug font-medium tracking-tight sm:text-3xl">{lead.title}</h3>
                <p className="mt-4 text-[17px] leading-relaxed text-white/65">{lead.summary}</p>
                <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/15 pt-6">
                  {lead.facts.map((f) => (
                    <div key={f.label} className="flex flex-col-reverse">
                      <dt className="mt-1 text-sm text-white/60">{f.label}</dt>
                      <dd className="font-mono text-[1.75rem] leading-tight text-white">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                <span className="mt-8 inline-flex items-center gap-1.5 text-[15px] font-medium">
                  Read the case study <Arrow className="transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          )}

          {/* Further cases as quiet rows under the same hairline as the lead case, not boxed cards. */}
          {rest.length > 0 && (
            <ul className="mt-14 border-t border-white/15">
              {rest.map((c) => (
                <li key={c.slug} className="border-b border-white/15">
                  <Link href={`/work/${c.slug}`} className="group flex items-center gap-6 py-7">
                    <div className="relative hidden aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-sm ring-1 ring-white/10 sm:block">
                      <Image src={c.cover} alt="" fill sizes="112px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium tracking-[0.12em] text-white/55 uppercase">{c.client}</p>
                      <p className="mt-2 text-xl leading-snug tracking-tight">{c.title}</p>
                    </div>
                    <span className="hidden shrink-0 items-center gap-1.5 text-[15px] text-white/70 group-hover:text-white sm:inline-flex">
                      Read the case study <Arrow className="transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      {/* 5 · Where we usually start */}
      <section>
        <Container className="py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Where we usually start</Eyebrow>
            <h2 className={`mt-5 ${H2}`}>Four places companies lose the most time.</h2>
          </div>
          <ul className="mt-14 border-t border-line">
            {STARTING_POINTS.map((p) => (
              <li key={p.name} className="grid gap-3 border-b border-line py-8 md:grid-cols-[17rem_1fr_15rem] md:gap-10">
                <h3 className="text-2xl font-medium tracking-tight">{p.name}</h3>
                <p className="max-w-xl text-[17px] leading-relaxed text-muted">{p.body}</p>
                <div className="md:text-right">
                  <p className="text-[13px] font-medium tracking-[0.12em] text-muted uppercase">We measure</p>
                  <p className="mt-1 text-[15px]">{p.measure}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 6 · From the founders: accountability, signed by both. Faces live on /about. */}
      {FOUNDERS.length > 0 && (
        <section className="border-t border-line bg-subtle">
          <Container className="py-24 sm:py-32">
            <figure className="mx-auto max-w-4xl text-center">
              <Eyebrow>From the founders</Eyebrow>
              <blockquote className="mt-8 font-serif text-[1.75rem] leading-[1.3] text-balance italic sm:text-[2.5rem] sm:leading-[1.25]">“{FOUNDERS_PROMISE}”</blockquote>
              <figcaption className="mt-10 flex flex-col items-center gap-3">
                <span>
                  <span className="font-medium">{FOUNDERS.map((f) => f.name).join(" and ")}</span>
                  <span className="ml-3 text-[15px] text-muted">{FOUNDERS.length > 1 ? "Founders" : "Founder"}, amfire</span>
                </span>
                <Link href="/about" className="inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] hover:underline">
                  Meet the founders <Arrow />
                </Link>
              </figcaption>
            </figure>
          </Container>
        </section>
      )}

      {/* 7 · Working with us, then the close */}
      <section className="border-t border-line">
        <Container className="py-24 sm:py-32">
          <Eyebrow className="text-center">Working with us</Eyebrow>
          <dl className="mt-8 grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {SAFETY.map((s) => (
              <div key={s.title} className="border-b border-line py-7 sm:pr-8 lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-8">
                <dt className="text-lg font-medium tracking-tight">{s.title}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* The shared closing invitation: same words on every page. */}
      <FreeDemoSection />
    </>
  );
}
