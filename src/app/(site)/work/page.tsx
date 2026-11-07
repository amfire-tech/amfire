import type { Metadata } from "next";
import { CaseStudyCard } from "@/components/case-study-card";
import { FreeDemoSection } from "@/components/free-demo";
import { Container, Eyebrow } from "@/components/ui";
import { CASE_STUDIES } from "@/knowledge/case-studies";

// Real client work only. The illustrative examples were retired on 7 Nov 2026:
// next to real projects they suggested we had few clients, and none fit the buyer.

export const metadata: Metadata = {
  title: "Our work",
  alternates: { canonical: "/work" },
  description: "Real client systems amfire has designed and built, live today: Skillship's platform for schools and MyGreenHome's website.",
};

export default function WorkPage() {
  return (
    <>
      <section>
        <Container className="pt-20 pb-24 sm:pt-28 sm:pb-32">
          <Eyebrow>Our work</Eyebrow>
          <h1 className="mt-6 max-w-[13em] text-[2.75rem] leading-[1.03] font-medium tracking-[-0.04em] text-balance sm:text-6xl sm:leading-[1.02]">
            Systems in daily use, built by amfire.
          </h1>
          <p className="mt-8 max-w-[33rem] text-lg leading-[1.55] text-pretty text-muted sm:mt-10 sm:text-xl">
            Every project here is a real client system, live today. Open them and see for yourself.
          </p>
          <div className="mt-16 grid gap-10 sm:mt-20 lg:grid-cols-2 lg:gap-12">
            {CASE_STUDIES.map((c, i) => (
              <CaseStudyCard key={c.slug} study={c} priority={i === 0} />
            ))}
          </div>
        </Container>
      </section>
      <FreeDemoSection body="A 30-minute conversation with the founders about how your company runs today. If we are not the right fit, we will tell you." />
    </>
  );
}
