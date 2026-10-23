import type { Metadata } from "next";
import { CaseStudyCard } from "@/components/case-study-card";
import { Container, Eyebrow, SectionHeading } from "@/components/ui";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { EXAMPLES } from "@/knowledge/examples";
import { ExamplesBrowser } from "./examples-browser";

export const metadata: Metadata = {
  title: "Our Work — Client Case Studies and Examples",
  alternates: { canonical: "/work" },
  description:
    "Live projects AMFIRE has delivered — Skillship's AI school platform and MyGreenHome's website — plus examples of how Build, Operate and Automate work for Indian businesses.",
};

export default function WorkPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-12 sm:py-20">
          <Eyebrow>Our work</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Real projects, <span className="text-brand">live today</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            Software we have designed, built and launched for our clients — open them and use them yourself.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {CASE_STUDIES.map((c, i) => (
              <CaseStudyCard key={c.slug} study={c} priority={i === 0} />
            ))}
          </div>
        </Container>
      </section>
      <section className="border-t border-line bg-subtle">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Examples"
            title="What Build, Operate and Automate look like in Indian businesses"
            description={`${EXAMPLES.length} illustrative engagements based on situations common across India. They show how we work — they are not client case studies.`}
          />
          <div className="mt-10">
            <ExamplesBrowser examples={EXAMPLES} />
          </div>
        </Container>
      </section>
    </>
  );
}
