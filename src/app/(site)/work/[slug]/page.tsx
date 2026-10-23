import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExampleCard } from "@/components/example-card";
import { Arrow, ButtonLink, CheckList, Chip, Container, Eyebrow, Notice, cx } from "@/components/ui";
import { SERVICES, SERVICE_DETAILS } from "@/knowledge/catalog";
import { EXAMPLES, exampleBySlug, examplesFor } from "@/knowledge/examples";

export function generateStaticParams() {
  return EXAMPLES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const e = exampleBySlug((await params).slug);
  return e ? { title: e.title, description: e.situation } : {};
}

export default async function ExamplePage({ params }: PageProps<"/work/[slug]">) {
  const example = exampleBySlug((await params).slug);
  if (!example) notFound();
  const related = examplesFor(example.path).filter((e) => e.slug !== example.slug);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-14 sm:py-18">
          <Link href="/work" className="text-sm text-muted hover:text-fg">
            ← All examples
          </Link>
          <div className="mt-6">
            <Eyebrow>
              {SERVICES[example.path].name} · {example.industry} · {example.city}
            </Eyebrow>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">{example.title}</h1>
          <p className="mt-4 text-muted">{example.profile}</p>
          <div className="mt-6 max-w-2xl">
            <Notice>Illustrative example based on a common situation — not a client case study.</Notice>
          </div>
        </Container>
      </section>

      <Container className="grid gap-12 pb-20 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-14">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">The situation</h2>
            <p className="mt-4 text-lg leading-relaxed text-fg/85">{example.situation}</p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {example.pains.map((p) => (
                <li key={p} className="rounded-xl bg-subtle p-4 text-sm ring-1 ring-line">
                  {p}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">What we&apos;d put in place</h2>
            <p className="mt-4 text-lg leading-relaxed text-fg/85">{example.solution}</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">How it works, step by step</h2>
            <ol className="relative mt-8 space-y-6 border-l-2 border-line pl-8">
              {example.flow.map((f, i) => (
                <li key={f.step} className="relative">
                  <span
                    aria-hidden
                    className={cx(
                      "absolute top-0 -left-[45px] grid size-7 place-items-center rounded-full text-xs font-bold",
                      f.human ? "bg-fg text-page" : "bg-brand text-ink",
                    )}
                  >
                    {i + 1}
                  </span>
                  <p className="font-semibold">
                    {f.step}
                    {f.human && (
                      <span className="ml-2 rounded-full bg-[#fff6ed] px-2 py-0.5 align-middle text-[10px] font-semibold text-[#9a3412] uppercase dark:bg-[#3a1d0a] dark:text-[#fdba74]">
                        A person decides
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted">{f.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">What changes</h2>
            <div className="mt-6">
              <CheckList items={example.changes} />
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card bg-surface p-6 ring-1 ring-line">
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">Engagement</p>
            <p className="mt-2 font-medium">{example.engagement}</p>
            <p className="mt-6 text-xs font-semibold tracking-widest text-muted uppercase">Tools involved</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {example.stack.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
            <p className="mt-6 text-xs font-semibold tracking-widest text-muted uppercase">What we&apos;d measure</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {example.measures.map((m) => (
                <li key={m}>• {m}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">We agree a baseline with you first, so results are measured — not claimed.</p>
          </div>
          <div className="relative overflow-hidden rounded-card bg-ink p-6 text-white">
            <div aria-hidden className="bg-brand absolute -top-16 -right-16 size-40 rounded-full opacity-30 blur-2xl" />
            <p className="relative font-semibold">Have a similar problem?</p>
            <p className="relative mt-1 text-sm text-white/70">Tell us about it — a person replies with a clear next step.</p>
            <ButtonLink href={`/start?goal=${SERVICE_DETAILS[example.path].goal}`} className="relative mt-5 w-full">
              Book a free demo <Arrow />
            </ButtonLink>
          </div>
        </aside>
      </Container>

      {related.length > 0 && (
        <section className="border-t border-line bg-subtle">
          <Container className="py-16">
            <h2 className="text-2xl font-semibold tracking-tight">More {SERVICES[example.path].name} examples</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {related.map((e) => (
                <ExampleCard key={e.slug} example={e} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
