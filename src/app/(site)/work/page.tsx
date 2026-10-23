import type { Metadata } from "next";
import { Container, Eyebrow } from "@/components/ui";
import { EXAMPLES } from "@/knowledge/examples";
import { ExamplesBrowser } from "./examples-browser";

export const metadata: Metadata = {
  title: "Examples",
  description: "How Build, Operate and Automate work for Indian businesses — illustrative examples across industries.",
};

export default function WorkPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Container className="py-16 sm:py-20">
          <Eyebrow>Examples</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            What Build, Operate and Automate look like <span className="text-brand">in Indian businesses</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            {EXAMPLES.length} illustrative engagements based on situations common across India. They show how we work — they are not
            client case studies. Verified case studies will be published with each client&apos;s approval.
          </p>
        </Container>
      </section>
      <Container className="pb-20">
        <ExamplesBrowser examples={EXAMPLES} />
      </Container>
    </>
  );
}
