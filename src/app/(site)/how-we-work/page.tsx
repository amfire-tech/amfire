import type { Metadata } from "next";
import { ButtonLink, Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "How We Work — Discovery, Milestones and Approvals",
  alternates: { canonical: "/how-we-work" },
  description: "Discovery, scope, delivery, approvals and support — what to expect when you work with AMFIRE.",
};

const STAGES = [
  {
    title: "Discovery",
    body: "You tell us the problem in your own words. We ask only the follow-up questions that matter at this stage, and a person reviews every enquiry.",
  },
  {
    title: "Recommendation",
    body: "We suggest a starting point — Build, Operate or Automate — and list the assumptions behind it, so you can correct anything we have misunderstood.",
  },
  {
    title: "Scope and price",
    body: "You receive a written proposal: what is included, what isn't, milestones, price and terms. Nothing is agreed until you approve it.",
  },
  {
    title: "Delivery",
    body: "Work happens in milestones. Your Client Hub shows what is in progress, what is blocked and why, and what is waiting for your decision.",
  },
  {
    title: "Approvals",
    body: "A milestone is only complete when you approve it. Changes to scope are agreed in writing before work starts.",
  },
  {
    title: "Support",
    body: "After launch we can keep things running, fix issues and suggest improvements. You can always reach a real person.",
  },
];

const PROMISES = [
  { title: "Real progress only", body: "Progress comes from real milestones and tasks — never estimates dressed up as status." },
  { title: "AI that assists, people who decide", body: "We use AI to prepare work faster. Recommendations, prices and commitments are reviewed by a person." },
  { title: "Your data stays yours", body: "Each client's information is kept separate and only shared with the tools needed to do the work." },
];

export default function HowWeWorkPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-12 sm:py-20">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">How we work</h1>
          <p className="mt-4 max-w-2xl text-lg text-fg/70">Clear steps, written agreements and a shared place to see exactly where things stand.</p>
        </Container>
      </section>
      <Container className="py-12 sm:py-16">
        <ol className="relative grid gap-10 border-l border-line pl-8 sm:pl-10">
          {STAGES.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="bg-brand absolute top-1 -left-[41px] grid size-5 place-items-center rounded-full ring-4 ring-page sm:-left-[49px]" aria-hidden />
              <p className="text-sm font-semibold text-muted">Step {i + 1}</p>
              <h2 className="mt-1 text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 max-w-2xl text-fg/75">{s.body}</p>
            </li>
          ))}
        </ol>
      </Container>
      <section className="bg-ink text-white">
        <Container className="py-12 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight">What you can count on</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {PROMISES.map((p) => (
              <div key={p.title} className="rounded-card bg-white/5 p-6 ring-1 ring-white/10">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-white/70">{p.body}</p>
              </div>
            ))}
          </div>
          <ButtonLink href="/start" size="lg" className="mt-10">
            Book a free demo
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
