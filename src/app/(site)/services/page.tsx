import type { Metadata } from "next";
import Link from "next/link";
import { FreeDemoSection } from "@/components/free-demo";
import { Arrow, CheckList, Container, Eyebrow } from "@/components/ui";
import { SERVICES, SERVICE_DETAILS, type ServicePathId } from "@/knowledge/catalog";

export const metadata: Metadata = {
  title: "Software Development, Managed IT & Automation Services",
  description:
    "Build, Operate and Automate — custom software for your problem, a managed tech and marketing team without hiring, and manual work like Tally entry done automatically.",
  alternates: { canonical: "/services" },
};

const PATHS = Object.keys(SERVICES) as ServicePathId[];

export default function ServicesPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-12 sm:py-20">
          <Eyebrow>Services</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Three ways to help. <span className="text-brand">One partner</span> for all of them.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Build the software you need, let us run everything online for you, and automate the work that slows your team down.
            Most businesses start with one — and grow from there.
          </p>
        </Container>
      </section>
      <Container className="grid gap-5 pb-20 lg:grid-cols-3">
        {PATHS.map((p, i) => (
          <article key={p} className="flex flex-col rounded-[1.5rem] bg-surface p-7 ring-1 ring-line">
            <span className="text-brand text-sm font-bold">0{i + 1}</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">{SERVICES[p].name}</h2>
            <p className="mt-1 text-sm font-medium text-muted">{SERVICES[p].tagline}</p>
            <p className="mt-5 font-medium">{SERVICES[p].promise}</p>
            <p className="mt-5 text-sm font-semibold">This is for you if…</p>
            <div className="mt-3 text-sm">
              <CheckList items={SERVICE_DETAILS[p].signs.slice(0, 3)} />
            </div>
            <Link href={`/services/${p}`} className="mt-auto inline-flex items-center gap-1.5 pt-8 text-sm font-semibold">
              Explore {SERVICES[p].name} <Arrow />
            </Link>
          </article>
        ))}
      </Container>
      <FreeDemoSection title="Not sure which one you need? That's what the free demo is for." />
    </>
  );
}
