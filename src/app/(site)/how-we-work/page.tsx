import type { Metadata } from "next";
import { FreeDemoSection } from "@/components/free-demo";
import { Container, Eyebrow } from "@/components/ui";

// How we work, built from the approved spec (https://claude.ai/artifact/4u9XJvBPhngqpYNqAFae7o).
// The homepage says what we do; this page says what it is like to work with us.
// It answers three questions in order: what will happen, what it asks of the team,
// and the hard questions. The stages share their names and promises with the
// homepage, in more depth. No orange: nothing here is a stuck point.

export const metadata: Metadata = {
  title: "How we work",
  alternates: { canonical: "/how-we-work" },
  description:
    "Every amfire engagement follows four stages: understand, measure, build and run, with a written agreement and your approval at each step.",
};

/** A real sequence, so the stages are numbered. Time promises approved by the founders on 7 Nov 2026. */
const STAGES = [
  {
    name: "Understand",
    body: "We sit with each team and map how work and money actually move: who passes what to whom, where it waits, where it is typed in again.",
    get: "A map of your company, drawn with your team.",
    need: "A few hours with each team lead.",
  },
  {
    name: "Measure",
    body: "From your own records we measure how long work takes, how often it is redone and how long payments take, then what those delays cost.",
    get: "The Operations Review: your map, your starting point, what the delays cost, and the one place we recommend starting.",
    need: "Access to the records, under NDA.",
  },
  {
    name: "Build",
    body: "We build for the one problem that costs you most, with the people who will use it, in milestones you approve before each one is invoiced.",
    get: "A working system you own, with its documentation. Progress is in your Client Hub any time.",
    need: "One person who can make decisions, about an hour a week.",
  },
  {
    name: "Run",
    body: "We stay. We look after it, improve it as your company changes, and report every month what changed against where you started.",
    get: "A monthly report against your starting point, and one team to call.",
    need: "Your feedback.",
  },
];

const QUESTIONS = [
  {
    q: "Do we have to replace the software we use?",
    a: "No. We build around the tools you already have and connect them. We suggest replacing something only when keeping it costs more than changing it, and we show you the numbers first.",
  },
  {
    q: "How much of my team’s time will this take?",
    a: "A few hours with each team lead during the review. During the build, one person who can make decisions, for about an hour a week.",
  },
  {
    q: "Who owns what you build?",
    a: "You do, once it is paid for: the code, designs and content made for you. Wherever possible it runs in accounts in your name.",
  },
  {
    q: "How is it priced?",
    a: "The Operations Review has a fixed fee, which counts towards the build if you continue. Each build is priced in a written proposal before any work starts, and paid milestone by milestone after you approve the work.",
  },
  {
    q: "Is our information safe with you?",
    a: "It is used only for your work and kept separate from other clients’. We sign your NDA, or ours, before you share anything.",
  },
];

const LABEL = "text-[13px] font-medium tracking-[0.12em] text-muted uppercase";

export default function HowWeWorkPage() {
  return (
    <>
      {/* 1 · Opening */}
      <section>
        <Container className="flex flex-col items-center pt-[clamp(3.5rem,10vh,7rem)] pb-20 text-center sm:pb-24">
          <Eyebrow>How we work</Eyebrow>
          <h1 className="mt-[clamp(1rem,2.5vh,1.5rem)] max-w-[13em] text-[length:clamp(2.75rem,min(4.6vw,8.5vh),3.75rem)] leading-[1.03] font-medium tracking-[-0.04em] text-balance sm:leading-[1.02]">
            We understand your company before we build anything.
          </h1>
          <p className="mt-[clamp(1.25rem,3.5vh,2.5rem)] max-w-[36rem] text-lg leading-[1.55] text-balance text-muted sm:text-xl">
            Every engagement follows the same four stages, with a written agreement and your approval at each step. Here is what happens, how long it takes, and what you
            get.
          </p>
        </Container>
      </section>

      {/* 2 · The four stages: name · what happens · what you get and what we need */}
      {/* The list's own top line is the divider from the opening, so the section adds no border or top padding. */}
      <section>
        <Container className="pb-24 sm:pb-32">
          <ol>
            {STAGES.map((s, i) => (
              <li
                key={s.name}
                className="grid gap-4 border-b border-line py-10 first:border-t md:grid-cols-[13rem_minmax(0,1fr)_17rem] md:gap-10 lg:grid-cols-[15rem_minmax(0,1fr)_19rem]"
              >
                <div>
                  <p className="font-mono text-[13px] text-fg">0{i + 1}</p>
                  <h2 className="mt-3 text-2xl font-medium tracking-tight">{s.name}</h2>
                </div>
                <p className="max-w-xl text-[17px] leading-relaxed text-muted md:pt-8">{s.body}</p>
                <dl className="grid gap-4 md:pt-8">
                  <div>
                    <dt className={LABEL}>You get</dt>
                    <dd className="mt-1 text-[15px] leading-relaxed">{s.get}</dd>
                  </div>
                  <div>
                    <dt className={LABEL}>We need</dt>
                    <dd className="mt-1 text-[15px] leading-relaxed">{s.need}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-2xl text-[17px] leading-relaxed">
            Understand and Measure take about two weeks together. The Operations Review is a paid engagement, and its fee counts towards the build if you go ahead.
          </p>
        </Container>
      </section>

      {/* 3 · The hard questions, open rather than hidden behind clicks */}
      <section className="border-t border-line bg-subtle">
        <Container className="py-24 sm:py-32">
          <Eyebrow className="text-center">Questions leaders ask us</Eyebrow>
          <dl className="mt-10 grid gap-x-16 border-t border-fg/15 md:grid-cols-2">
            {QUESTIONS.map((item) => (
              <div key={item.q} className="border-b border-fg/15 py-8">
                <dt className="text-xl leading-snug font-medium tracking-tight">{item.q}</dt>
                <dd className="mt-3 text-[17px] leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* 4 · Close */}
      <FreeDemoSection />
    </>
  );
}
