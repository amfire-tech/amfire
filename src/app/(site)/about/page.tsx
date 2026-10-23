import type { Metadata } from "next";
import { Arrow, ButtonLink, Container, Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description: "AMFIRE is a technology partner for Indian businesses that want simple, reliable software.",
};

const PRINCIPLES = [
  { title: "One obvious next step", body: "Every conversation, proposal and update ends with a clear next action." },
  { title: "Plain language first", body: "We talk about orders, payments and customers — not frameworks and acronyms." },
  { title: "Transparency over theatre", body: "You see real status, real approvals and real blockers. Never invented progress." },
  { title: "AI assists, people decide", body: "AI helps us work faster. Prices, approvals and anything consequential stay with people." },
  { title: "Built for India", body: "Tally, GST, UPI, WhatsApp, Hindi and regional languages, low-cost Android phones — designed in from day one." },
  { title: "A person is always there", body: "You can talk to a real person, correct a misunderstanding or ask for help at any time." },
];

export default function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-12 sm:py-24">
          <Eyebrow>About AMFIRE</Eyebrow>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            A technology partner with a <span className="text-brand">remarkably simple</span> way of working.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            AMFIRE helps Indian businesses build the software they need, operate the systems they depend on and automate the work
            that slows them down. We combine careful engineering with AI-assisted tooling — and keep people in charge of every
            decision that matters.
          </p>
        </Container>
      </section>
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
