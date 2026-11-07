import { FREE_DEMO } from "@/knowledge/catalog";
import { Arrow, ButtonLink, Container } from "./ui";

/** The one closing call to action used across the site: a quiet invitation to talk. */
export function FreeDemoSection({ goal, title, body, cta }: { goal?: string; title?: string; body?: string; cta?: string }) {
  return (
    <section className="bg-ink text-white">
      <Container className="flex flex-col gap-10 py-24 sm:py-28 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-4xl leading-[1.05] font-medium tracking-[-0.035em] text-balance sm:text-5xl">{title ?? "Tell us where work gets stuck."}</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">{body ?? FREE_DEMO.summary}</p>
        </div>
        <ButtonLink href={goal ? `/start?goal=${goal}` : "/start"} size="lg" className="shrink-0">
          {cta ?? FREE_DEMO.cta} <Arrow />
        </ButtonLink>
      </Container>
    </section>
  );
}
