import type { Metadata } from "next";
import Link from "next/link";
import { Arrow, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { INDUSTRIES, SERVICES } from "@/knowledge/catalog";
import { EXAMPLES } from "@/knowledge/examples";

export const metadata: Metadata = {
  title: "Software & Automation for Manufacturing, Distribution, Textiles and More",
  alternates: { canonical: "/industries" },
  description: "Common problems AMFIRE helps solve across Indian industries — manufacturing, distribution, textiles, D2C, healthcare, education and more.",
};

export default function IndustriesPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-12 sm:py-20">
          <Eyebrow>Industries</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            The problems are familiar. <span className="text-brand">The fix fits your industry.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Here are situations common in each industry. Don&apos;t see yours? We work across industries — tell us what&apos;s slowing you down.
          </p>
        </Container>
      </section>
      <Container className="grid gap-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {INDUSTRIES.map((ind) => {
          const examples = EXAMPLES.filter((e) => (ind.examples as readonly string[]).includes(e.slug));
          return (
            <article key={ind.name} className="flex min-w-0 flex-col rounded-card bg-surface p-6 ring-1 ring-line">
              <span aria-hidden className="bg-brand h-1 w-8 rounded-full" />
              <h2 className="mt-4 text-lg font-semibold">{ind.name}</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {ind.problems.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
              {examples.length > 0 && (
                <div className="mt-auto space-y-1.5 pt-6">
                  {examples.map((e) => (
                    <Link key={e.slug} href={`/work/${e.slug}`} className="flex min-w-0 items-baseline gap-2 py-1 text-sm font-medium hover:underline">
                      <span className="shrink-0 text-xs text-muted uppercase">{SERVICES[e.path].name}</span>
                      <span>{e.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </Container>
      <section className="bg-ink text-white">
        <Container className="flex flex-col items-start gap-6 py-12 sm:py-16 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight">Your industry isn&apos;t listed? The approach is the same — start with the problem.</h2>
          <ButtonLink href="/start" size="lg">
            Book a free demo <Arrow />
          </ButtonLink>
        </Container>
      </section>
    </>
  );
}
