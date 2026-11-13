import type { Metadata } from "next";
import Link from "next/link";
import { CalBooking } from "@/components/cal-booking";
import { FounderNote } from "@/components/founder-note";
import { FreeDemoSection } from "@/components/free-demo";
import { Arrow, ButtonLink, CheckList, Container, Eyebrow } from "@/components/ui";
import { site } from "@/config/site";
import { AGENCY_PARTNER, LEAD_AUDIT } from "@/knowledge/catalog";
import { DEPARTMENTS } from "@/knowledge/solutions";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd } from "@/config/structured-data";

export const metadata: Metadata = {
  title: "White-label AI automation for agencies",
  description:
    "Your AI build team under your brand: voice and chat agents, speed-to-lead follow-up and automations for your clients. You keep the client and the margin.",
  alternates: { canonical: "/agencies" },
};

const CALL_HREF = `/start?goal=${AGENCY_PARTNER.goal}`;
/** With the partner calendar set up, every call button scrolls to it; otherwise it opens the booking form. */
const BOOK_HREF = site.booking.partner ? "#book" : CALL_HREF;

/** The four systems agencies resell most, picked from the catalogue by title. Fewer choices, faster yes. */
const RESELL = ["Speed-to-lead engine", "AI voice receptionist", "Reviews and reputation", "AI search visibility"];
const resell = RESELL.map((title) => DEPARTMENTS.flatMap((d) => d.solutions).find((s) => s.title === title)).filter((s) => s !== undefined);

const PROBLEMS = [
  { title: "Your clients are asking for AI", body: "Chatbots, voice agents, faster follow-up, showing up in ChatGPT. If you can't offer it, someone else will." },
  { title: "Hiring an AI engineer is a big bet", body: "Good ones cost six figures a year, and you'd need steady work to keep them busy." },
  { title: "Tools still need someone to build", body: "Platforms give you the parts. Someone still has to design, connect, test and maintain every system." },
];

const STEPS = [
  { title: "You brief us", body: "Fifteen minutes, or forward the client's request. Or start with a free Lead Response Audit of three of your clients to show them the gap." },
  { title: "We build under your brand", body: "In your accounts or your client's, with your name on it. Most systems are live in 7–10 days." },
  { title: "You sell it", body: "Set your own price. We can join the sales call as your tech team and bring a working demo." },
  { title: "We run it every month", body: "Monitoring, fixes and improvements, with a report you can forward. You bill your client." },
];

const PROMISES = [
  "Follow-the-sun delivery: a brief sent at 6 pm your time shows progress by your next morning",
  "Live on calls during US mornings, 9 AM to 1 PM Eastern",
  "A written update every working day, and a short video for anything complex",
  "Fixed prices in writing before we start — no hourly surprises",
  "Senior engineering: we built Skillship's AI school platform — 93 screens and 380+ automated tests",
];

/** What agencies fear most about white-label: losing the client. Each line is a promise in the partner agreement. */
const CLIENTS_STAY_YOURS = [
  { title: "We never contact your clients", body: "Not without you, not after the project, not ever. A non-solicit clause both ways, in writing." },
  { title: "Your brand, not ours", body: "Our name appears nowhere your client can see: not in the product, the emails or the reports." },
  { title: "Their accounts, from day one", body: "Everything lives in your or your client's accounts. You can walk away with all of it at any time." },
  { title: "No copies of their data", body: "We get the access a build needs, keep no copies, and hand back every login when the work ends." },
  { title: "NDA before the first brief", body: "Ask for it and we sign yours, or send ours, before you share a single client detail." },
  { title: "You set the price", body: "Partner rates are private and sit well below what we charge direct, so your markup is always protected." },
];

const FAQ = [
  {
    q: "Will my client know you exist?",
    a: "Only if you want them to. We work under your brand, in your tools, and join calls as your team. Our partner agreement includes a non-solicit clause both ways.",
  },
  {
    q: "What does it cost?",
    a: "Partner rates sit well below what we charge businesses directly, so you keep the margin and set your own price. We share the partner rate card on the call, with your margin worked out for your first client.",
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
    a: "We overlap with US mornings for calls, and the rest of our day is your night, so work keeps moving between your working days. Replies within one working day, usually much faster.",
  },
  {
    q: "What if the first system doesn't work?",
    a: "We agree in writing what it should do. If it doesn't do that within 30 days of going live, we keep fixing it at no cost until it does.",
  },
];

// Look and feel follow the rest of the site (7 Nov 2026): centred openings, ruled rows
// instead of cards, no orange accents, labels in 13px Geist, open answers instead of
// accordions. The words are unchanged for now; a copy spec for this page comes next.

const H2 = "text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-balance sm:text-[2.75rem]";
const LEDE = "text-lg leading-[1.55] text-muted sm:text-xl";
/** A cell in a ruled grid: a hairline under each item, dividers between columns on wide screens. */
const CELL = "border-b border-fg/15 py-8 sm:pr-8";

function Intro({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className={`mt-5 ${H2}`}>{title}</h2>
      {description && <p className={`mt-6 ${LEDE}`}>{description}</p>}
    </div>
  );
}

export default function AgenciesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "For agencies", path: "/agencies" }])} />
      {/* Opening */}
      <section>
        <Container className="flex flex-col items-center pt-[clamp(3.5rem,10vh,7rem)] pb-20 text-center sm:pb-24">
          <Eyebrow>For marketing agencies and coaches</Eyebrow>
          <h1 className="mt-[clamp(1rem,2.5vh,1.5rem)] max-w-[14em] text-[length:clamp(2.75rem,min(4.6vw,8.5vh),3.75rem)] leading-[1.03] font-medium tracking-[-0.04em] text-balance sm:leading-[1.02]">
            Your AI build team. Your brand. Delivered under your name.
          </h1>
          <p className={`mt-[clamp(1.25rem,3.5vh,2.5rem)] max-w-[38rem] text-balance ${LEDE}`}>
            Your clients want AI. We build it under your name — chat and voice agents, lead follow-up, automations and AI search visibility — and you keep the client
            and the margin.
          </p>
          <div className="mt-[clamp(1.5rem,4vh,2.5rem)] flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-8">
            <ButtonLink href={BOOK_HREF} size="lg" className="w-full sm:w-auto">
              {AGENCY_PARTNER.cta} <Arrow />
            </ButtonLink>
            <Link href="/audit" className="inline-flex items-center gap-1.5 py-2 text-[15px] font-medium underline-offset-[6px] hover:underline">
              Free audit of 3 of your clients <Arrow />
            </Link>
          </div>
        </Container>
      </section>

      {/* The problem, in three ruled columns */}
      <section>
        <Container className="pb-24 sm:pb-32">
          <ul className="grid border-t border-fg/15 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <li key={p.title} className={`${CELL} md:border-b-0 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:pl-8`}>
                <h2 className="text-xl leading-snug font-medium tracking-tight">{p.title}</h2>
                <p className="mt-3 text-[17px] leading-relaxed text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* How white-label works: a real sequence, so numbered */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <Intro eyebrow="How white-label works" title="You own the client. We do the building." />
          <ol className="mt-14 grid border-t border-fg/15 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className={`${CELL} lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-8`}>
                <p className="font-mono text-[13px] text-fg">0{i + 1}</p>
                <h3 className="mt-4 text-xl font-medium tracking-tight">{s.title}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* What you can resell */}
      <section className="border-t border-line">
        <Container className="py-24 sm:py-32">
          <Intro
            eyebrow="What you can resell"
            title="The systems your clients ask for most."
            description="Four systems that sell themselves to local and service businesses. If a client needs something else, we build it custom."
          />
          <ul className="mt-14 grid border-t border-fg/15 sm:grid-cols-2 lg:grid-cols-4">
            {resell.map((s) => (
              <li key={s.title} className={`${CELL} lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-8`}>
                <h3 className="text-xl font-medium tracking-tight">{s.title}</h3>
                <p className="mt-3 text-[17px] leading-relaxed text-muted">{s.does}</p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-center">
            <Link href={`/start?goal=${LEAD_AUDIT.goal}`} className="inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] hover:underline">
              Not sure which one a client needs? Start with a free Lead Response Audit <Arrow />
            </Link>
          </p>
        </Container>
      </section>

      {/* Your clients stay yours */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <Intro eyebrow="Your clients stay yours" title="We build behind your brand. We never step in front of it." />
          <dl className="mt-14 grid gap-x-12 border-t border-fg/15 sm:grid-cols-2 lg:grid-cols-3">
            {CLIENTS_STAY_YOURS.map((c) => (
              <div key={c.title} className="border-b border-fg/15 py-8">
                <dt className="text-xl font-medium tracking-tight">{c.title}</dt>
                <dd className="mt-3 text-[17px] leading-relaxed text-muted">{c.body}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Team and the founding partner offer */}
      <section className="border-t border-line">
        <Container className="grid gap-12 py-24 sm:py-32 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Why a team in India</Eyebrow>
            <h2 className={`mt-5 ${H2}`}>Agency quality, on your clock.</h2>
            <ul className="mt-10 border-t border-line">
              {PROMISES.map((p) => (
                <li key={p} className="border-b border-line py-5 text-[17px] leading-relaxed">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="self-start rounded-md bg-ink p-8 text-white sm:p-10">
            <p className="text-[13px] font-medium tracking-[0.12em] text-white/55 uppercase">Founding partners · until 31 January 2027</p>
            <h2 className="mt-4 text-[1.75rem] leading-[1.15] font-medium tracking-[-0.025em] text-balance sm:text-[2.25rem]">Your first client build at half price.</h2>
            <p className="mt-5 text-[17px] leading-relaxed text-white/70">
              We&apos;re taking on our first ten partners. Founding partners get their first client build at 50% off, partner pricing on everything after it, and
              us on the sales call to help close it.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-white/55">If it doesn&apos;t do what we agreed within 30 days of going live, we keep fixing it at no cost.</p>
            <ButtonLink href={BOOK_HREF} size="lg" className="mt-8 w-full sm:w-auto">
              {AGENCY_PARTNER.cta} <Arrow />
            </ButtonLink>
          </div>
        </Container>
      </section>

      <FounderNote />

      {/* Questions, open rather than hidden behind clicks */}
      <section className="border-t border-line">
        <Container className="py-24 sm:py-32">
          <Intro eyebrow="Questions" title="What partners ask first." />
          <dl className="mt-14 grid gap-x-16 border-t border-fg/15 md:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q} className="border-b border-fg/15 py-8">
                <dt className="text-xl leading-snug font-medium tracking-tight">{f.q}</dt>
                <dd className="mt-3 text-[17px] leading-relaxed text-muted">{f.a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {site.booking.partner ? (
        <section id="book" aria-labelledby="book-title" className="scroll-mt-20 border-t border-line bg-subtle">
          <Container className="grid gap-10 py-24 sm:py-32 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
            <div>
              <Eyebrow>15 minutes · free</Eyebrow>
              <h2 id="book-title" className={`mt-5 ${H2}`}>
                Find out what you could resell this month.
              </h2>
              <p className={`mt-6 ${LEDE}`}>{AGENCY_PARTNER.summary}</p>
              <div className="mt-8 text-[15px]">
                <CheckList items={[...AGENCY_PARTNER.points]} />
              </div>
              <p className="mt-8 text-[15px] text-muted">
                Times show in your own time zone. Rather send a brief first?{" "}
                <Link href={CALL_HREF} className="font-medium text-fg underline underline-offset-4">
                  Use the form
                </Link>
                .
              </p>
            </div>
            <CalBooking calLink={site.booking.partner} kind="partner" />
          </Container>
        </section>
      ) : (
        <FreeDemoSection
          goal={AGENCY_PARTNER.goal}
          cta={AGENCY_PARTNER.cta}
          title="Find out what you could resell this month."
          body={AGENCY_PARTNER.summary}
        />
      )}
    </>
  );
}
