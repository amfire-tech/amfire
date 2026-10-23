import Image from "next/image";
import Link from "next/link";
import { CaseStudyCard } from "@/components/case-study-card";
import { Arrow, ButtonLink, CheckList, Chip, Container, Eyebrow, buttonClass } from "@/components/ui";
import { SERVICES, SERVICE_DETAILS } from "@/knowledge/catalog";
import { CASE_STUDIES, type CaseStudy } from "@/knowledge/case-studies";

function ExternalIcon() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 3h6v6M17 3l-8 8M14 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function CaseStudyView({ study }: { study: CaseStudy }) {
  const others = CASE_STUDIES.filter((c) => c.slug !== study.slug);
  const host = new URL(study.url).host.replace(/^www\./, "");

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="bg-brand absolute -top-40 -right-40 -z-10 size-[28rem] rounded-full opacity-[0.10] blur-3xl" />
        <Container className="pt-10 pb-10 sm:pt-16">
          <Link href="/work" className="text-sm text-muted hover:text-fg">
            ← All work
          </Link>
          <div className="mt-6">
            <Eyebrow>
              Case study · {SERVICES[study.path].name} · {study.sector}
            </Eyebrow>
          </div>
          <h1 className="mt-5 max-w-4xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{study.title}</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">{study.summary}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a href={study.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "lg")}>
              Visit {host} <ExternalIcon />
            </a>
            <ButtonLink href={`/start?goal=${SERVICE_DETAILS[study.path].goal}`} size="lg">
              Build something like this <Arrow />
            </ButtonLink>
          </div>
        </Container>
        <Container>
          <div className="relative aspect-[1200/630] overflow-hidden rounded-[1.5rem] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)] ring-1 ring-line">
            <Image src={study.cover} alt={study.coverAlt} fill priority sizes="(min-width: 1152px) 1104px, 100vw" className="object-cover" />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] bg-line ring-1 ring-line lg:grid-cols-4">
            {study.facts.map((f) => (
              <div key={f.label} className="bg-surface p-4 sm:p-6">
                <dt className="sr-only">{f.label}</dt>
                <dd className="text-2xl font-semibold tracking-tight sm:text-3xl">{f.value}</dd>
                <dd className="mt-1 text-sm text-muted">{f.label}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-14">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">The brief</h2>
            <p className="mt-4 text-lg leading-relaxed text-fg/85">{study.brief}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">What we built</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {study.built.map((group, i) => (
                <div key={group.title} className="rounded-card bg-surface p-5 ring-1 ring-line sm:p-6">
                  <span className="text-brand text-sm font-bold">0{i + 1}</span>
                  <h3 className="mt-2 font-semibold">{group.title}</h3>
                  <div className="mt-4 text-sm">
                    <CheckList items={group.items} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {study.ongoing && (
            <section className="rounded-card bg-subtle p-6 ring-1 ring-line">
              <h2 className="text-sm font-semibold tracking-widest text-muted uppercase">What&apos;s happening now</h2>
              <p className="mt-2 text-lg">{study.ongoing}</p>
            </section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card bg-surface p-6 ring-1 ring-line">
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">Client</p>
            <p className="mt-2 font-medium">{study.client}</p>
            <p className="mt-6 text-xs font-semibold tracking-widest text-muted uppercase">Engagement</p>
            <p className="mt-2 font-medium">{study.engagement}</p>
            <p className="mt-6 text-xs font-semibold tracking-widest text-muted uppercase">Timeline</p>
            <p className="mt-2 font-medium">{study.timeline}</p>
            <p className="mt-6 text-xs font-semibold tracking-widest text-muted uppercase">Built with</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {study.stack.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
            <a
              href={study.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline"
            >
              See it live at {host} <ExternalIcon />
            </a>
          </div>
          <div className="relative overflow-hidden rounded-card bg-ink p-6 text-white">
            <div aria-hidden className="bg-brand absolute -top-16 -right-16 size-40 rounded-full opacity-30 blur-2xl" />
            <p className="relative font-semibold">Want something like this?</p>
            <p className="relative mt-1 text-sm text-white/70">Tell us your problem — you talk to the people who built {study.client}.</p>
            <ButtonLink href={`/start?goal=${SERVICE_DETAILS[study.path].goal}`} className="relative mt-5 w-full">
              Book a free demo <Arrow />
            </ButtonLink>
          </div>
        </aside>
      </Container>

      {others.length > 0 && (
        <section className="border-t border-line bg-subtle">
          <Container className="py-12 sm:py-16">
            <h2 className="text-2xl font-semibold tracking-tight">More of our work</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {others.map((c) => (
                <CaseStudyCard key={c.slug} study={c} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
