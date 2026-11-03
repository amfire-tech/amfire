import type { Metadata } from "next";
import Link from "next/link";
import { Money } from "@/components/currency";
import { FreeDemoSection } from "@/components/free-demo";
import { Arrow, ButtonLink, CheckList, Container, Eyebrow, SectionHeading, cx } from "@/components/ui";
import { OPPORTUNITY_MAP, SERVICES } from "@/knowledge/catalog";
import { AI_PACKAGE_PRICE, CARE_PLAN, STARTING_PRICE, type Priced } from "@/knowledge/pricing";
import { DEPARTMENTS, SOLUTION_COUNT } from "@/knowledge/solutions";

export const metadata: Metadata = {
  title: "AI Automation Solutions — Agents, Workflows and Custom AI",
  description:
    "Every AI system a business needs, by department: sales, customer service, marketing, operations, finance, HR and management — fixed prices, or custom. Start with a free AI Opportunity Map.",
  alternates: { canonical: "/solutions" },
};

const MAP_HREF = `/start?goal=${OPPORTUNITY_MAP.goal}`;

const PACKAGES: { name: string; body: string; price: Priced | null; from?: boolean; monthly?: boolean; highlight?: boolean }[] = [
  { name: "AI Opportunity Map", body: "Where AI saves you the most, with a price and timeline for each. Within 48 hours.", price: null, highlight: true },
  { name: "One AI system", body: "Any single system from the catalogue, built around your process and live in about two weeks.", price: STARTING_PRICE.automate, from: true },
  { name: "AI agent", body: "A chat, voice, outbound or company-brain agent trained on your business.", price: AI_PACKAGE_PRICE.agent, from: true },
  { name: "AI operating system", body: "Three to five connected systems, a company brain and your morning brief.", price: AI_PACKAGE_PRICE.system, from: true },
  { name: "Care", body: "We monitor, fix and improve the systems we built, with a monthly report.", price: CARE_PLAN, monthly: true },
  { name: "Operate", body: "Your whole tech and marketing team, AI included, for one monthly fee.", price: STARTING_PRICE.operate, from: true, monthly: true },
];

export default function SolutionsPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-12 sm:py-20">
          <Eyebrow>AI solutions</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Every AI system your business needs. <span className="text-brand">Built and run by amfire.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Pick from {SOLUTION_COUNT} ready-to-build systems below, or tell us what you need and we build it. Not sure where AI fits yet? Start with a free AI Opportunity Map.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={MAP_HREF} size="lg">
              {OPPORTUNITY_MAP.cta} <Arrow />
            </ButtonLink>
            <ButtonLink href="#catalogue" variant="secondary" size="lg">
              Browse the catalogue
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* The free way in */}
      <Container>
        <div className="shine relative overflow-hidden rounded-card bg-ink p-6 text-white sm:p-10">
          <div aria-hidden className="bg-brand absolute -top-24 -right-24 size-72 rounded-full opacity-30 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-flame uppercase">Free · within 48 hours</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{OPPORTUNITY_MAP.title}</h2>
              <p className="mt-4 text-white/75">{OPPORTUNITY_MAP.summary}</p>
              <ButtonLink href={MAP_HREF} variant="inverse" size="lg" className="mt-7">
                Get my free map <Arrow />
              </ButtonLink>
            </div>
            <div className="rounded-2xl bg-white/5 p-6 text-sm text-white/85 ring-1 ring-white/10">
              <CheckList items={[...OPPORTUNITY_MAP.points]} />
            </div>
          </div>
        </div>
      </Container>

      {/* The catalogue */}
      <Container id="catalogue" className="scroll-mt-24 py-16 sm:py-24">
        <SectionHeading
          eyebrow="The catalogue"
          title="Find your problem. We have the system for it."
          description="Grouped by the part of your business it helps. Every system is built around how you already work, and your people stay in charge of the decisions that matter."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {DEPARTMENTS.map((d) => (
            <article key={d.id} id={d.id} className="scroll-mt-24 rounded-[1.5rem] bg-surface p-6 ring-1 ring-line sm:p-7">
              <h3 className="text-2xl font-semibold tracking-tight">{d.name}</h3>
              <p className="mt-1 text-sm text-muted">{d.problem}</p>
              <ul className="mt-5 grid gap-3">
                {d.solutions.map((s) => (
                  <li key={s.title} className="rounded-xl bg-subtle p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{s.title}</span>
                      {s.demo && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Demo ready</span>}
                      <Link href={`/services/${s.path}`} className="ml-auto text-xs font-medium text-muted hover:text-fg">
                        {SERVICES[s.path].name}
                      </Link>
                    </div>
                    <p className="mt-1 text-sm text-fg/75">{s.does}</p>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-4 rounded-[1.5rem] p-6 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Need something that isn&apos;t on the list?</h3>
            <p className="mt-1 text-sm text-muted">Most of our work is custom. Describe the problem in your own words and we&apos;ll tell you how we&apos;d solve it.</p>
          </div>
          <ButtonLink href="/start?goal=not-sure" variant="secondary" className="shrink-0">
            Describe your problem <Arrow />
          </ButtonLink>
        </div>
      </Container>

      {/* Packages */}
      <section className="bg-subtle">
        <Container className="py-16 sm:py-24">
          <SectionHeading
            eyebrow="Packages"
            title="Fixed prices, agreed before we start."
            description="Every price is fixed in writing before any work begins, and you pay milestone by milestone after you approve the work."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PACKAGES.map((p) => (
              <div key={p.name} className={cx("flex flex-col rounded-[1.5rem] p-6 ring-1", p.highlight ? "bg-ink text-white ring-ink" : "bg-surface ring-line")}>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className={cx("mt-1 text-sm", p.highlight ? "text-white/70" : "text-muted")}>{p.body}</p>
                <p className="mt-auto pt-6 text-2xl font-semibold tracking-tight">
                  {p.price ? (
                    <>
                      {p.from && <span className={cx("mr-1 text-sm font-normal", p.highlight ? "text-white/60" : "text-muted")}>from</span>}
                      <Money amounts={p.price} />
                      {p.monthly && <span className={cx("text-sm font-normal", p.highlight ? "text-white/60" : "text-muted")}> /month</span>}
                    </>
                  ) : (
                    <span className="text-flame">Free</span>
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            Bigger custom software starts from <Money amounts={STARTING_PRICE.build} /> and is quoted after a free session.{" "}
            <Link href="/services" className="font-medium text-fg underline underline-offset-4">
              See how Build, Operate and Automate work
            </Link>
            .
          </p>
        </Container>
      </section>

      <FreeDemoSection
        goal={OPPORTUNITY_MAP.goal}
        cta={OPPORTUNITY_MAP.cta}
        title="Find out where AI pays off in your business — free."
        body={OPPORTUNITY_MAP.summary}
      />
    </>
  );
}
