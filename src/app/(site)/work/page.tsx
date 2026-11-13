import type { Metadata } from "next";
import { CaseStudyCard } from "@/components/case-study-card";
import { FreeDemoSection } from "@/components/free-demo";
import { Container, Eyebrow } from "@/components/ui";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd } from "@/config/structured-data";

// Real client work only. The illustrative examples were retired on 7 Nov 2026:
// next to real projects they suggested we had few clients, and none fit the buyer.

export const metadata: Metadata = {
  title: "Our work",
  alternates: { canonical: "/work" },
  description:
    "Real client systems amfire has designed and built, live today: Skillship's platform for schools and MyGreenHome's website.",
};

export default function WorkPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Work", path: "/work" }])} />
      <section>
        <Container className="pt-[clamp(3.5rem,10vh,7rem)] pb-24 sm:pb-32">
          <div className="flex flex-col items-center text-center">
            <Eyebrow>Our work</Eyebrow>
            <h1 className="mt-[clamp(1rem,2.5vh,1.5rem)] max-w-[13em] text-[length:clamp(2.75rem,min(4.6vw,8.5vh),3.75rem)] leading-[1.03] font-medium tracking-[-0.04em] text-balance sm:leading-[1.02]">
              Systems in daily use, built by amfire.
            </h1>
            <p className="mt-[clamp(1.25rem,3.5vh,2.5rem)] max-w-[36rem] text-lg leading-[1.55] text-balance text-muted sm:text-xl">
              Every project here is a real client system, live today. Open them
              and see for yourself.
            </p>
          </div>
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
