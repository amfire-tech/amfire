import Link from "next/link";
import { OPPORTUNITY_MAP } from "@/knowledge/catalog";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { DEPARTMENTS } from "@/knowledge/solutions";
import { Money } from "./currency";
import { Arrow, ButtonLink, Container, SectionHeading } from "./ui";

// AI across the whole business, department by department: how amfire works with
// a company (map it, build it, run it) and what it builds in each department.
// Each department shows its product video once one is made (Department.video).

const METHOD = [
  { title: "Map it", body: "We sit with each department and find where the hours go. You get a ranked list of what to automate first, free." },
  { title: "Build it", body: "We build the systems around how your team already works, in your tools, with a person approving what matters." },
  { title: "Run it", body: "We stay. We monitor, fix and improve every system each month, and show you what it saved." },
];

export function DepartmentShowcase() {
  return (
    <section id="departments" className="scroll-mt-20 border-y border-line bg-subtle">
      <Container className="py-14 sm:py-24">
        <SectionHeading
          eyebrow="AI across your whole business"
          title="Not one more AI tool. AI working in every department."
          description="Most businesses try a chatbot and stop there. We look at how each department really runs, then build and run the systems that take the busywork out, one department at a time."
        />

        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {METHOD.map((m, i) => (
            <li key={m.title} className="rounded-[1.5rem] bg-surface p-6 ring-1 ring-line">
              <span className="text-brand text-sm font-bold">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm text-muted">{m.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DEPARTMENTS.map((d) => (
            <article key={d.id} className="flex flex-col overflow-hidden rounded-[1.5rem] bg-surface ring-1 ring-line">
              {d.video && (
                <video
                  className="aspect-video w-full bg-ink object-cover"
                  src={d.video.src}
                  poster={d.video.poster}
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="none"
                  aria-label={`${d.name}: a short demo of the systems at work`}
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold">{d.name}</h3>
                <p className="mt-1.5 text-sm text-muted">{d.problem}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {d.solutions.map((s) => (
                    <li key={s.title} className="flex items-start gap-2">
                      <span aria-hidden className="bg-brand mt-2 size-1.5 shrink-0 rounded-full" />
                      <span>
                        {s.title}
                        {s.demo && <span className="ml-1.5 rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-muted ring-1 ring-line">live demo</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href={`/solutions#${d.id}`} className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold underline-offset-4 hover:underline">
                  See what it does <Arrow />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href={`/start?goal=${OPPORTUNITY_MAP.goal}`} size="lg">
            {OPPORTUNITY_MAP.cta} <Arrow />
          </ButtonLink>
          <p className="text-sm text-muted">
            Within 48 hours, free. Book the call and get <strong className="text-fg">flat <Money amounts={DEMO_OFFER.amount} /> off</strong> whatever you start with.
          </p>
        </div>
      </Container>
    </section>
  );
}
