import type { Metadata } from "next";
import { ButtonLink, Container, buttonClass } from "@/components/ui";
import { contact } from "@/config/site";

export const metadata: Metadata = {
  title: "Partner Programme for CA Firms",
  alternates: { canonical: "/partners" },
  description:
    "For chartered accountants in Pune and across India: free WhatsApp AI sessions for your clients, cleaner books at the source, and 10% of what referred clients pay in their first year.",
};

const BENEFITS = [
  {
    title: "Cleaner books, less chasing",
    body: "We automate how your clients take orders, send bills and collect payments, so what reaches you is complete and on time instead of WhatsApp photos at month-end.",
  },
  {
    title: "A free session for your clients",
    body: "We run a 45-minute session for your clients on Meta's new free WhatsApp AI and simple automation. Your firm hosts; we teach. Your clients see you as the firm that keeps them ahead.",
  },
  {
    title: "10% of year-one payments",
    body: "Every business you refer through your own link is credited to your firm. You receive 10% of what they pay amfire in their first year, paid monthly as they pay.",
  },
];

const STEPS = [
  { title: "A 15-minute meeting", body: "We understand your client base and the problems you see most: billing, GST data, collections, enquiries." },
  { title: "Your referral link", body: "Your firm gets its own link. Anyone who books a free demo through it is credited to you, and you can see the count anytime." },
  { title: "We look after your clients", body: "Free problem-finding call, written proposal, delivery in milestones. We never give tax or accounting advice; that stays with you." },
];

export default function PartnersPage() {
  const wa = contact.whatsapp("Hi amfire, I'm a CA and I'd like to know more about the partner programme.");
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-12 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-signal uppercase">For chartered accountants</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">Your clients get modern. You get cleaner books.</h1>
          <p className="mt-4 max-w-2xl text-lg text-fg/70">
            amfire sets up software, WhatsApp AI and automation for small businesses. CA firms partner with us to give their clients a head start, and earn from every
            referral.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              Talk to us on WhatsApp
            </a>
            <a href={contact.call} className={buttonClass("secondary")}>
              Call us
            </a>
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-card bg-surface p-6 ring-1 ring-line">
              <h2 className="text-lg font-semibold">{b.title}</h2>
              <p className="mt-2 text-fg/75">{b.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-16 text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <p className="text-sm font-semibold text-muted">Step {i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-fg/75">{s.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-card bg-fg p-8 text-page sm:p-10">
          <h2 className="text-2xl font-semibold">Start with a 15-minute conversation</h2>
          <p className="mt-2 max-w-2xl text-page/75">No contract to sign first. If it isn’t useful for your clients, we’ll say so.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              WhatsApp amfire
            </a>
            <ButtonLink href="/how-we-work" variant="secondary">
              How we work with clients
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
