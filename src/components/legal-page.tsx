import type { ReactNode } from "react";
import { Container, Eyebrow } from "./ui";

/** A plain, readable layout for the privacy policy and terms. */
export function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro: ReactNode; children: ReactNode }) {
  return (
    <Container className="max-w-3xl py-12 sm:py-20">
      <Eyebrow>Last updated {updated}</Eyebrow>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
      <div className="mt-5 text-lg text-muted">{intro}</div>
      <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-fg/85 [&_a]:font-medium [&_a]:text-fg [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-fg [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </Container>
  );
}
