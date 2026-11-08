import type { Metadata } from "next";
import Link from "next/link";
import { FreeDemoSection } from "@/components/free-demo";
import { CONVERSATION_CTA } from "@/components/site-header";
import { TeamRail } from "@/components/team-rail";
import { Arrow, Container, ConversationButton, Eyebrow } from "@/components/ui";
import { caseStudyBySlug } from "@/knowledge/case-studies";

// Services, built from the approved spec (docs/premium-rebuild/6-services-spec.html,
// https://claude.ai/artifact/NL7VMyB9Mg4SkdpAePfYSS). The page is built so every visitor
// sees their own problem: it opens with questions a leader asks, explains the four ways
// work gets stuck (so a problem that isn't listed is still clearly ours), then lists what
// we build by team. Everything not listed goes to one door: Start a conversation.
// Spoken words are Newsreader italic; orange marks only the four ways work gets stuck.

export const metadata: Metadata = {
  title: "Services",
  alternates: { canonical: "/services" },
  description:
    "What amfire builds for sales, customer service, orders and delivery, accounts, hiring and leadership, and why work gets stuck in every company.",
};

const START = "/start";

/** The questions a leader asks; each links to the team that answers it. */
const QUESTIONS = [
  { q: "Did anyone call that customer back?", team: "sales" },
  { q: "Why is this order still not out?", team: "orders-and-delivery" },
  { q: "Has that payment come in yet?", team: "accounts" },
  { q: "Can someone send me the latest numbers?", team: "leadership" },
  { q: "Who was supposed to handle this?", team: "across-teams" },
  { q: "Why am I only hearing about this now?", team: "leadership" },
];

const WAYS = [
  { name: "It waits", see: "A request sits in someone’s inbox until they get to it.", build: "Replies and next steps that start the moment work arrives." },
  { name: "It’s typed in twice", see: "The same details entered again by the next team, with new mistakes.", build: "Information entered once and shared with every team that needs it." },
  { name: "It has to be chased", see: "Something moves only when a person remembers to push it.", build: "Follow-ups that run on schedule until the job is done." },
  { name: "It isn’t seen", see: "You find out when it is already late.", build: "One view of what is stuck, with whom, and for how long." },
];

type Team = { id: string; name: string; asks: string; systems: { title: string; body: string; demo?: boolean }[]; measure: string };

/** `demo` marks systems we can show working today. Keep it honest. */
const TEAMS: Team[] = [
  {
    id: "sales",
    name: "Sales",
    asks: "Did anyone call that customer back?",
    systems: [
      { title: "Every enquiry answered", body: "From your website, phone and messages, answered within minutes, qualified and booked into the right calendar." },
      { title: "Follow-up until there is a decision", body: "Each lead followed up on a schedule until it is won or closed. None goes quiet." },
      { title: "Quotes the same day", body: "A call or conversation turned into a quote in your format, ready to check and send." },
      { title: "A pipeline that fills itself in", body: "Notes, next steps and sales reports updated from calls and emails." },
    ],
    measure: "Reply time, enquiries won, time to quote",
  },
  {
    id: "customer-service",
    name: "Customer service",
    asks: "Why do we answer the same question fifty times a day?",
    systems: [
      { title: "Answers on every channel", body: "Customers answered on WhatsApp and your website from your own information, and passed to a person when they should be.", demo: true },
      { title: "Every call picked up", body: "Day or night, with a short summary sent to the right person." },
      { title: "An inbox that sorts itself", body: "Emails and tickets sorted, replies drafted, urgent ones raised at once." },
    ],
    measure: "First reply time, missed calls, questions resolved without a person",
  },
  {
    id: "orders-and-delivery",
    name: "Orders and delivery",
    asks: "Why is this order still not out?",
    systems: [
      { title: "Orders entered once", body: "Orders from email or messages checked against stock and credit, entered into your system and confirmed to the customer.", demo: true },
      { title: "Documents read for you", body: "Invoices, purchase orders and forms turned into clean data in the systems you already use." },
      { title: "Scheduling and dispatch", body: "Bookings, reminders, routes and missed-appointment follow-up that run on their own." },
      { title: "Reports from the field", body: "Updates from sites, vans or branches collected in one place, not retyped every evening." },
    ],
    measure: "Re-entry, errors, delivery time",
  },
  {
    id: "accounts",
    name: "Accounts",
    asks: "Has that payment come in yet?",
    systems: [
      { title: "Invoices raised on time", body: "Raised when the work is delivered, not when someone remembers." },
      { title: "Payments followed up", body: "Polite reminders with a way to pay, escalating on schedule, matched when the money arrives." },
      { title: "Books kept ready", body: "Bank and invoice records sorted into entries your accountant can use." },
    ],
    measure: "Days to get paid, amount overdue, time to close the month",
  },
  {
    id: "hiring-and-people",
    name: "Hiring and people",
    asks: "Can someone show the new joiner how we do this?",
    systems: [
      { title: "Hiring that screens itself", body: "Applications read, a short test sent, interviews booked with the strongest candidates." },
      { title: "New joiners set up in order", body: "Documents, training and access for every new person, step by step." },
      { title: "Answers without asking you", body: "Your team asks the company’s own procedures and files instead of asking you." },
    ],
    measure: "Time to hire, time until a new joiner is productive",
  },
  {
    id: "leadership",
    name: "Leadership",
    asks: "Why am I only hearing about this now?",
    systems: [
      { title: "A morning brief", body: "One message each day: sales, problems, and the decisions waiting for you." },
      { title: "One screen for the numbers", body: "Figures from every tool in one place, always current." },
      { title: "Meetings that turn into action", body: "Notes, owners and deadlines from every meeting, and followed up." },
    ],
    measure: "Time spent chasing updates, decisions waiting on you",
  },
  {
    id: "across-teams",
    name: "Across teams",
    asks: "Why don’t our systems talk to each other?",
    systems: [
      { title: "Your tools, connected", body: "Software that doesn’t talk to each other, connected so information is entered once." },
      { title: "Processes that run end to end", body: "A process with many steps and many owners, run your way, with your people approving what matters." },
      { title: "Apps, portals and platforms", body: "For your customers, partners or team, when what you need doesn’t exist as a product.", demo: true },
    ],
    measure: "Agreed with you in the Operations Review",
  },
];

const H2 = "text-[2rem] leading-[1.1] font-medium tracking-[-0.025em] text-balance sm:text-[2.75rem]";
const LEDE = "text-lg leading-[1.55] text-muted sm:text-xl";
const LABEL = "text-[13px] font-medium tracking-[0.12em] text-muted uppercase";

export default function ServicesPage() {
  const skillship = caseStudyBySlug("skillship");
  const greenhome = caseStudyBySlug("mygreenhome");
  // Only figures that are already published in the case studies, plus the two working demos.
  type Proof = { figure?: string; title: string; body: string; href?: string };
  const proof = ([
    skillship && {
      figure: skillship.facts[0]?.value,
      title: "A platform built from scratch",
      body: `Screens across five dashboards, each role with its own view, built for ${skillship.client}.`,
      href: `/work/${skillship.slug}`,
    },
    greenhome && {
      figure: greenhome.facts.find((f) => f.label.includes("launch"))?.value,
      title: "A website that sells",
      body: `From first build to launch for ${greenhome.client}, with a home tour and tools that make the case.`,
      href: `/work/${greenhome.slug}`,
    },
    {
      figure: "2",
      title: "Systems we show working",
      body: "Customers answered from your own information, and orders entered once. Both shown in the first conversation.",
    },
  ] as (Proof | undefined)[]).filter((p): p is Proof => Boolean(p));

  return (
    <>
      {/* 1 · Opening: their words before ours. Each question jumps to the team that answers it. */}
      <section>
        <Container className="flex flex-col items-center pt-[clamp(2rem,6vh,5rem)] pb-[clamp(2.5rem,7vh,6rem)] text-center">
          <Eyebrow>Services</Eyebrow>
          <h1 className="mt-[clamp(0.75rem,2vh,1.25rem)] max-w-[18em] text-[length:clamp(2.5rem,min(4.4vw,8.2vh),3.75rem)] leading-[1.03] font-medium tracking-[-0.04em] text-balance">
            Which of these did you ask this week?
          </h1>
          <ul className="mt-[clamp(1.5rem,4vh,2.75rem)] grid w-full max-w-5xl border-t border-line text-left sm:grid-cols-2 lg:grid-cols-3">
            {QUESTIONS.map((item) => (
              <li
                key={item.q}
                className="border-b border-line sm:max-lg:even:border-l lg:[&:not(:nth-child(3n+1))]:border-l"
              >
                <a href={`#${item.team}`} className="group flex h-full flex-col justify-between gap-3 px-1 py-4 transition-colors hover:bg-subtle sm:px-5 sm:py-[clamp(0.75rem,2vh,1.25rem)]">
                  <span className="font-serif text-[1.3rem] leading-[1.25] italic">“{item.q}”</span>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-muted group-hover:text-fg">
                    {TEAMS.find((t) => t.id === item.team)?.name} <Arrow className="size-3.5" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className={`mt-[clamp(1.25rem,3.5vh,2.25rem)] max-w-[38rem] text-balance ${LEDE}`}>
            Each one means work waited, was typed in twice, had to be chased, or stayed out of sight. We build the systems that answer these questions, so you stop
            having to ask them.
          </p>
          <div className="mt-[clamp(1.25rem,3.5vh,2.25rem)] flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-8">
            <ConversationButton href={START} size="lg" className="w-full sm:w-auto" />
            <Link href={START} className="inline-flex items-center gap-1.5 py-2 text-[15px] font-medium underline-offset-[6px] hover:underline">
              Not on the list? Tell us yours <Arrow />
            </Link>
          </div>
        </Container>
      </section>

      {/* 2 · The four ways work gets stuck: the lens that makes an unlisted problem ours too. */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <div className="max-w-2xl">
            <Eyebrow>Why it happens</Eyebrow>
            <h2 className={`mt-5 ${H2}`}>Work gets stuck in four ways, in every company.</h2>
            <p className={`mt-6 ${LEDE}`}>
              What you sell and how big you are change the details, not the pattern. These are the four things we look for when we study a company.
            </p>
          </div>
          <ul className="mt-14 grid border-t border-fg/15 sm:grid-cols-2 lg:grid-cols-4">
            {WAYS.map((w) => (
              <li
                key={w.name}
                className="flex flex-col border-b border-fg/15 py-8 sm:pr-8 sm:max-lg:even:border-l sm:max-lg:even:pl-8 lg:border-b-0 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-8"
              >
                <h3 className="flex items-baseline gap-3 text-2xl font-medium tracking-tight">
                  <span aria-hidden className="size-[7px] shrink-0 -translate-y-[3px] rounded-full bg-ember" />
                  {w.name}
                </h3>
                <p className="mt-3 text-[17px] leading-relaxed text-muted">{w.see}</p>
                <div className="mt-auto pt-6">
                  <p className="border-t border-fg/10 pt-4 text-[13px] font-medium tracking-[0.12em] text-muted uppercase">We build</p>
                  <p className="mt-1 text-[15px] leading-relaxed">{w.build}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-4 border-t border-fg/15 pt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
            <p className="max-w-2xl text-xl leading-snug tracking-tight">
              If your problem is one of these four, we can build for it, whether or not it appears on this page.
            </p>
            <Link href={START} className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] hover:underline">
              {CONVERSATION_CTA} <Arrow />
            </Link>
          </div>
        </Container>
      </section>

      {/* 3 · Find your team: the list, grouped by the team that feels the problem first. */}
      <section className="border-t border-line">
        <Container className="py-24 sm:py-32">
          <div className="max-w-2xl">
            <Eyebrow>What we build</Eyebrow>
            <h2 className={`mt-5 ${H2}`}>Find your team.</h2>
            <p className={`mt-6 ${LEDE}`}>The systems companies ask us for most, listed by the team that feels the problem first. Most companies start with one.</p>
          </div>
          <div className="mt-14 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-14">
            <TeamRail teams={TEAMS.map(({ id, name }) => ({ id, name }))} elseHref={START} />
            <div>
              {TEAMS.map((t) => (
                <article
                  key={t.id}
                  id={t.id}
                  className="grid scroll-mt-24 gap-x-10 gap-y-6 border-t border-line pt-8 pb-12 last:border-b md:grid-cols-[minmax(0,1fr)_12rem]"
                >
                  <div className="md:col-span-2">
                    <h3 className="text-[1.75rem] font-medium tracking-[-0.02em]">{t.name}</h3>
                    <p className="mt-2 font-serif text-[1.35rem] leading-snug italic">“{t.asks}”</p>
                  </div>
                  <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                    {t.systems.map((s) => (
                      <li key={s.title}>
                        <p className="text-[17px] font-medium">{s.title}</p>
                        <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.body}</p>
                        {s.demo && (
                          <p className="mt-2 inline-flex items-center gap-2 text-[13px]">
                            <span aria-hidden className="size-1.5 rounded-full bg-success" />
                            Ready to show you
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <p className={LABEL}>We measure</p>
                    <p className="mt-1 text-[15px] leading-relaxed">{t.measure}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* 4 · Proof: only figures already published, and the demos we can show. */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <div className="max-w-2xl">
            <Eyebrow>In daily use</Eyebrow>
            <h2 className={`mt-5 ${H2}`}>Built by amfire, working today.</h2>
          </div>
          <ul className="mt-14 grid border-t border-fg/15 lg:grid-cols-3">
            {proof.map((p) => (
              <li key={p.title} className="border-b border-fg/15 py-8 lg:border-b-0 lg:pr-8 lg:[&:not(:first-child)]:border-l lg:[&:not(:first-child)]:pl-8">
                <p className="font-mono text-[2rem] leading-none">{p.figure}</p>
                <h3 className="mt-4 text-xl font-medium tracking-tight">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
                {p.href && (
                  <Link href={p.href} className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-medium underline-offset-[6px] hover:underline">
                    Read the case study <Arrow />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 5 · The shared close: one door for everything else. */}
      <FreeDemoSection />
    </>
  );
}
