import type { Metadata } from "next";
import Image from "next/image";
import { Arrow, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { FOUNDERS, type Founder } from "@/config/founders";

export const metadata: Metadata = {
  title: "About Us — Founders and Principles",
  description: "Meet the people behind amfire, a technology partner for Indian businesses that want simple, reliable software, automation and IT.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  { title: "One obvious next step", body: "Every conversation, proposal and update ends with a clear next action." },
  { title: "Plain language first", body: "We talk about orders, payments and customers — not frameworks and acronyms." },
  { title: "Transparency over theatre", body: "You see real status, real approvals and real blockers. Never invented progress." },
  { title: "AI assists, people decide", body: "AI helps us work faster. Prices, approvals and anything consequential stay with people." },
  { title: "Built for India", body: "Tally, GST, UPI, WhatsApp, Hindi and regional languages, low-cost Android phones — designed in from day one." },
  { title: "A person is always there", body: "You can talk to a real person, correct a misunderstanding or ask for help at any time." },
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function FounderCard({ founder }: { founder: Founder }) {
  return (
    <article className="flex flex-col gap-5 rounded-card bg-surface p-6 ring-1 ring-line sm:flex-row sm:p-7">
      {founder.photo ? (
        <Image src={founder.photo} alt={founder.name} width={256} height={256} sizes="128px" className="size-28 shrink-0 rounded-2xl object-cover sm:size-32" />
      ) : (
        <span aria-hidden className="bg-brand grid size-28 shrink-0 place-items-center rounded-2xl text-3xl font-semibold text-ink sm:size-32">
          {initials(founder.name)}
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-xl font-semibold tracking-tight">{founder.name}</h3>
        <p className="text-brand mt-0.5 text-sm font-semibold">{founder.role}</p>
        <p className="mt-3 text-sm text-muted">{founder.bio}</p>
        {founder.linkedin && (
          <a
            href={founder.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
            {founder.name.split(" ")[0]} on LinkedIn
          </a>
        )}
      </div>
    </article>
  );
}

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-12 sm:py-24">
          <Eyebrow>About amfire</Eyebrow>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            A technology partner with a <span className="text-brand">remarkably simple</span> way of working.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            amfire helps Indian businesses build the software they need, operate the systems they depend on and automate the work
            that slows them down. We combine careful engineering with AI-assisted tooling — and keep people in charge of every
            decision that matters.
          </p>
        </Container>
      </section>
      {FOUNDERS.length > 0 && (
        <section aria-labelledby="founders" className="border-t border-line">
          <Container className="py-14 sm:py-20">
            <Eyebrow>The people behind amfire</Eyebrow>
            <h2 id="founders" className="mt-3 text-3xl font-semibold tracking-tight">
              You work with {FOUNDERS.length > 1 ? "the founders" : "a founder"} — directly.
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              No sales layer and no hand-offs to strangers. The people who listen to your problem are the people responsible for solving it.
            </p>
            <div className={FOUNDERS.length > 1 ? "mt-10 grid gap-5 lg:grid-cols-2" : "mt-10 max-w-3xl"}>
              {FOUNDERS.map((f) => (
                <FounderCard key={f.name} founder={f} />
              ))}
            </div>
          </Container>
        </section>
      )}
      <section className="border-y border-line bg-subtle">
        <Container className="py-14 sm:py-20">
          <h2 className="text-3xl font-semibold tracking-tight">What we believe</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <div key={p.title} className="rounded-card bg-surface p-6 ring-1 ring-line">
                <span className="text-brand text-sm font-bold">0{i + 1}</span>
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
      <section className="relative overflow-hidden bg-ink text-white">
        <div aria-hidden className="bg-brand absolute -bottom-32 left-1/3 h-72 w-[36rem] rounded-full opacity-25 blur-3xl" />
        <Container className="relative flex flex-col items-start gap-6 py-14 sm:py-20 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight">Let&apos;s make your business simpler to run.</h2>
          <ButtonLink href="/start" size="lg">
            Book a free demo <Arrow />
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
