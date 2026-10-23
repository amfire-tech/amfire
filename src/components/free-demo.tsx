import { FREE_DEMO } from "@/knowledge/catalog";
import { Arrow, ButtonLink, CheckList, Container } from "./ui";

/** The one primary call to action used across the site. */
export function FreeDemoSection({ goal, title, body }: { goal?: string; title?: string; body?: string }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div aria-hidden className="bg-brand absolute -bottom-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl" />
      <Container className="relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">Free · no obligation</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title ?? "Not sure where to start? Book a free demo."}</h2>
          <p className="mt-4 max-w-xl text-white/70">{body ?? FREE_DEMO.summary}</p>
          <ButtonLink href={goal ? `/start?goal=${goal}` : "/start"} size="lg" className="mt-8">
            {FREE_DEMO.cta} <Arrow />
          </ButtonLink>
        </div>
        <div className="rounded-2xl bg-white/5 p-6 text-sm text-white/85 ring-1 ring-white/10">
          <CheckList items={FREE_DEMO.points} />
        </div>
      </Container>
    </section>
  );
}
