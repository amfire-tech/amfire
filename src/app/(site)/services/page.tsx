import type { Metadata } from "next";
import { FreeDemoSection } from "@/components/free-demo";
import { OpsDemo } from "@/components/ops-demo/ops-demo";
import { Container, ConversationButton, Eyebrow } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd } from "@/config/structured-data";

// Services, version 3 (approved 12 Nov 2026; mock in docs/premium-rebuild/9-services-v3.html,
// https://claude.ai/artifact/7x8ynXR4o26oKixLZxWn9t). Product-led and short: the system itself
// is the hero, then three bands a visitor can take in while scrolling. No industry is named;
// every company recognises itself through its departments. About 170 words of copy.

export const metadata: Metadata = {
  title: "Services",
  alternates: { canonical: "/services" },
  description:
    "amfire designs, builds and runs agent systems across your company, from the first enquiry to the final payment. Your people approve what matters.",
};

const START = "/start";

const PRINCIPLES = [
  { key: "Context", title: "It knows your company.", body: "Built on your processes, records and rules. Never a generic chatbot." },
  { key: "Orchestration", title: "It runs the whole job.", body: "Carries work across departments, from start to finish." },
  { key: "Accountability", title: "It answers to your people.", body: "Every action logged and explained. People approve what matters." },
];

const DEPARTMENTS = [
  { name: "Sales", outcome: "Every enquiry answered in minutes." },
  { name: "Customer support", outcome: "Customers answered, day and night." },
  { name: "Operations", outcome: "Orders entered once. Delays seen early." },
  { name: "Purchase", outcome: "Material ordered before it runs out." },
  { name: "Accounts", outcome: "Paid faster. Every deduction explained." },
  { name: "People", outcome: "Hiring and onboarding that run themselves." },
  { name: "Leadership", outcome: "One brief each morning. Only your decisions." },
  { name: "Your systems", outcome: "Your tools connected. Nothing typed twice." },
];

const STEPS = [
  { title: "Diagnose", body: "We map how work moves through your company and what it costs.", when: "About two weeks" },
  { title: "Deploy", body: "The first agent system goes live inside the tools you already use.", when: "Weeks, not months" },
  { title: "Run and expand", body: "We run it, measure it, and extend it one department at a time.", when: "For as long as it pays back" },
];

const TRUST = ["Runs inside your systems", "Your data stays yours", "Every action on record", "A person approves what matters"];

const H2 = "mt-3 max-w-[18em] text-[length:clamp(1.7rem,2.6vw,2.25rem)] leading-[1.1] font-medium tracking-[-0.03em] text-balance";
const BAND = "border-t border-line py-[clamp(4rem,10vh,6.5rem)]";

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Services", path: "/services" }])} />
      {/* 1 · The statement, then the system itself. */}
      <section className="relative isolate overflow-x-clip">
        <div
          aria-hidden
          className="absolute top-[-10%] left-1/2 -z-10 h-[80%] w-[min(1100px,120vw)] -translate-x-1/2 bg-[radial-gradient(45%_50%_at_50%_30%,rgba(232,72,42,0.08),transparent_70%)]"
        />
        <Container className="flex flex-col items-center pt-[clamp(1.75rem,6vh,4.5rem)] text-center">
          <Eyebrow>Services</Eyebrow>
          <h1 className="mt-3.5 max-w-[13em] text-[length:clamp(2.4rem,min(5vw,8.6vh),4.2rem)] leading-none font-medium tracking-[-0.045em] text-balance">
            Agents run the work. Your people make the calls.
          </h1>
          <p className="mt-[clamp(0.75rem,2.2vh,1.25rem)] max-w-[34rem] text-[length:clamp(1.08rem,1.5vw,1.25rem)] leading-normal text-balance text-muted">
            We design, build and run agent systems across your company, from the first enquiry to the final payment.
          </p>
          <ConversationButton href={START} size="lg" className="mt-[clamp(1rem,3vh,1.75rem)] w-full sm:w-auto" />
          <div className="mt-[clamp(1.75rem,5.5vh,3.5rem)] w-full pb-[clamp(3.5rem,9vh,6rem)]">
            <OpsDemo locked track={{ page: "services", startOnLoad: false }} />
            <p className="mt-3.5 text-[13px] text-muted">A demo company with illustrative figures. Yours is built around how your company works.</p>
          </div>
        </Container>
      </section>

      {/* 2 · What makes it serious. */}
      <section className={BAND}>
        <Container>
          <Eyebrow>How it is built</Eyebrow>
          <h2 className={H2}>Built for companies that can&rsquo;t afford mistakes.</h2>
          <ol className="mt-10 grid border-t border-fg md:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <li
                key={p.key}
                className="flex flex-col gap-2.5 pt-6 pb-1 max-md:[&:not(:first-child)]:mt-6 max-md:[&:not(:first-child)]:border-t max-md:[&:not(:first-child)]:border-line md:pr-8 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-line md:[&:not(:first-child)]:pl-8"
              >
                <span className="font-mono text-[13px] tracking-[0.04em] text-muted">
                  {String(i + 1).padStart(2, "0")} · {p.key}
                </span>
                <h3 className="text-[length:clamp(1.2rem,1.6vw,1.4rem)] leading-[1.2] font-medium tracking-[-0.02em]">{p.title}</h3>
                <p className="max-w-[22rem] text-[15px] leading-relaxed text-muted">{p.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* 3 · What it does, department by department. */}
      <section className={`${BAND} bg-subtle`}>
        <Container>
          <Eyebrow>What changes</Eyebrow>
          <h2 className={H2}>One system. Every department.</h2>
          <ul className="mt-10 grid border-t border-line md:grid-cols-2 md:gap-x-14">
            {DEPARTMENTS.map((d) => (
              <li key={d.name} className="flex flex-col gap-1 border-b border-line py-4">
                <span className="flex items-center gap-2.5 text-[13px] font-medium tracking-[0.12em] text-muted uppercase">
                  <span aria-hidden className="size-1.5 rounded-full bg-success" />
                  {d.name}
                </span>
                <span className="text-[length:clamp(1.05rem,1.3vw,1.2rem)] leading-[1.35] tracking-[-0.01em]">{d.outcome}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 4 · How we take responsibility. */}
      <section className={BAND}>
        <Container>
          <Eyebrow>How we work</Eyebrow>
          <h2 className={H2}>We take responsibility for the result.</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2.5 md:pr-8">
                <span className="flex items-center gap-3.5 font-mono text-[13px] text-muted">
                  {String(i + 1).padStart(2, "0")}
                  {i < STEPS.length - 1 && <span aria-hidden className="h-px flex-1 bg-line max-md:hidden" />}
                </span>
                <h3 className="mt-1 text-[1.25rem] font-medium tracking-[-0.02em]">{s.title}</h3>
                <p className="max-w-[20rem] text-[15px] leading-relaxed text-muted">{s.body}</p>
                <span className="text-sm font-medium">{s.when}</span>
              </li>
            ))}
          </ol>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6 text-[14px]">
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-2.5">
                <span aria-hidden className="h-px w-3.5 bg-fg" />
                {t}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 5 · The shared close. */}
      <FreeDemoSection body="Thirty minutes with the founders. You leave knowing where agents would pay back first." />
    </>
  );
}
