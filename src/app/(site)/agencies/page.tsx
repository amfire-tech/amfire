import type { Metadata } from "next";
import Link from "next/link";
import { FreeDemoSection } from "@/components/free-demo";
import { Arrow, ButtonLink, CheckList, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { AGENCY_PARTNER } from "@/knowledge/catalog";
import { DEPARTMENTS, SOLUTION_COUNT } from "@/knowledge/solutions";

export const metadata: Metadata = {
  title: "White-Label AI for Marketing Agencies and Coaches",
  description:
    "Your AI build team, under your brand. Chat and voice agents, lead follow-up, automations and AI search visibility built for your clients — you keep the client and the margin.",
  alternates: { canonical: "/agencies" },
};

const CALL_HREF = `/start?goal=${AGENCY_PARTNER.goal}`;

/** The systems agencies resell most, picked from the catalogue by title. */
const RESELL = ["Speed-to-lead engine", "AI chat agent", "AI voice receptionist", "AI search visibility", "Reviews and reputation", "Owner's morning brief"];
const resell = RESELL.map((title) => DEPARTMENTS.flatMap((d) => d.solutions).find((s) => s.title === title)).filter((s) => s !== undefined);

const PROBLEMS = [
  { title: "Your clients are asking for AI", body: "Chatbots, voice agents, faster follow-up, showing up in ChatGPT. If you can't offer it, someone else will." },
  { title: "Hiring an AI engineer is a big bet", body: "Good ones cost six figures a year, and you'd need steady work to keep them busy." },
  { title: "Tools still need someone to build", body: "Platforms give you the parts. Someone still has to design, connect, test and maintain every system." },
];

const STEPS = [
  { title: "You brief us", body: "Fifteen minutes, or forward the client's request. We come back with the system, a fixed price and a timeline." },
  { title: "We build under your brand", body: "In your accounts or your client's, with your name on it. Most systems are live in 7–10 days." },
  { title: "You sell it", body: "Set your own price. We can join the sales call as your tech team and bring a working demo." },
  { title: "We run it every month", body: "Monitoring, fixes and improvements, with a report you can forward. You bill your client." },
];

const PROMISES = [
  "Overnight delivery: our team is in India, so your brief at 6pm is worked on while you sleep",
  "A written update every working day, and a short video for anything complex",
  "Fixed prices in writing before we start — no hourly surprises",
  "Your client stays yours: we never contact them without you, in writing",
  "Accounts, code and data in your or your client's name from day one",
  "Senior engineering: we built Skillship's AI school platform — 93 screens and 380+ automated tests",
];

const FAQ = [
  {
    q: "Will my client know you exist?",
    a: "Only if you want them to. We work under your brand, in your tools, and join calls as your team. Our partner agreement includes a non-solicit clause both ways.",
  },
  {
    q: "What does it cost?",
    a: "Partner prices sit below our public prices, so you keep the margin and set your own price. We share the partner rate card on the call, with your margin worked out for your first client.",
  },
  {
    q: "Which tools do you build on?",
    a: "Whatever your clients already use: GoHighLevel, HubSpot, Zoho, Shopify, Google Workspace, WhatsApp, Twilio and custom code where it's needed. If you run GoHighLevel, we build inside your account.",
  },
  {
    q: "How do you handle client data?",
    a: "Client data stays in their accounts or yours. We get the access a build needs, never keep copies, and hand everything back when the work ends.",
  },
  {
    q: "What about time zones?",
    a: "We overlap with US mornings for calls, and the rest of our day is your night — so work moves while you sleep. Replies within one working day, usually much faster.",
  },
  {
    q: "What if the first system doesn't work?",
    a: "We agree in writing what it should do. If it doesn't do that within 30 days of going live, we keep fixing it at no cost until it does.",
  },
];

export default function AgenciesPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="bg-brand absolute -top-40 -right-40 -z-10 size-[28rem] rounded-full opacity-[0.12] blur-3xl" />
        <Container className="py-12 sm:py-20">
          <Eyebrow>For marketing agencies and coaches</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Your AI build team. Your brand. <span className="text-brand">Built while you sleep.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Your clients want AI. We build it under your name — chat and voice agents, lead follow-up, automations and AI search visibility — and you keep the client
            and the margin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={CALL_HREF} size="lg">
              {AGENCY_PARTNER.cta} <Arrow />
            </ButtonLink>
            <ButtonLink href="/solutions" variant="secondary" size="lg">
              See what you can resell
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="pb-16 sm:pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-[1.5rem] bg-surface p-6 ring-1 ring-line">
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </Container>

      <section className="bg-subtle">
        <Container className="py-16 sm:py-24">
          <SectionHeading eyebrow="How white-label works" title="You own the client. We do the building." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[1.5rem] bg-surface p-6 ring-1 ring-line">
                <span className="text-brand text-sm font-bold">0{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <Container className="py-16 sm:py-24">
        <SectionHeading
          eyebrow="What you can resell"
          title="The systems your clients ask for most."
          description={`These six sell themselves to local and service businesses. The full catalogue has ${SOLUTION_COUNT} systems, and we build custom too.`}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resell.map((s) => (
            <div key={s.title} className="rounded-[1.5rem] bg-surface p-6 ring-1 ring-line">
              <h3 className="text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.does}</p>
            </div>
          ))}
        </div>
        <Link href="/solutions#catalogue" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
          See all {SOLUTION_COUNT} systems <Arrow />
        </Link>
      </Container>

      <section className="bg-subtle">
        <Container className="grid gap-10 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Why a team in India" title="Agency quality, delivered overnight." />
            <div className="mt-8">
              <CheckList items={PROMISES} />
            </div>
          </div>
          <div className="shine relative self-start overflow-hidden rounded-card bg-ink p-6 text-white sm:p-8">
            <div aria-hidden className="bg-brand absolute -top-24 -right-24 size-64 rounded-full opacity-30 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.2em] text-flame uppercase">Founding partners · until 31 January 2027</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Your first client build at half price.</h2>
              <p className="mt-3 text-white/75">
                We&apos;re taking on our first ten partners. Founding partners get their first client build at 50% off, partner pricing on everything after it,
                and us on the sales call to help close it.
              </p>
              <p className="mt-3 text-sm text-white/60">If it doesn&apos;t do what we agreed within 30 days of going live, we keep fixing it at no cost.</p>
              <ButtonLink href={CALL_HREF} variant="inverse" size="lg" className="mt-6">
                {AGENCY_PARTNER.cta} <Arrow />
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-16 sm:py-24">
        <SectionHeading eyebrow="Questions" title="What partners ask first." />
        <div className="mt-8 divide-y divide-line rounded-[1.5rem] bg-surface ring-1 ring-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5 sm:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span aria-hidden className="text-muted transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>

      <FreeDemoSection
        goal={AGENCY_PARTNER.goal}
        cta={AGENCY_PARTNER.cta}
        title="Find out what you could resell this month."
        body={AGENCY_PARTNER.summary}
      />
    </>
  );
}
