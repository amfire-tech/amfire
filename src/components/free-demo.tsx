import { FREE_DEMO } from "@/knowledge/catalog";
import { EmberField } from "./ember-field";
import { Arrow, ButtonLink, Container } from "./ui";

/**
 * The one closing invitation used on every page. Centred, like the homepage cover, so
 * the site opens and closes on the same axis: heading, line, then the button, with the
 * ember glow rising behind the button.
 */
export function FreeDemoSection({ goal, title, body, cta }: { goal?: string; title?: string; body?: string; cta?: string }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <EmberField />
      <Container className="flex flex-col items-center py-[clamp(5rem,14vh,8rem)] text-center">
        <h2 className="max-w-[12em] text-[length:clamp(2.5rem,min(4.4vw,8vh),3.5rem)] leading-[1.05] font-medium tracking-[-0.035em] text-balance">
          {title ?? "Tell us where work gets stuck."}
        </h2>
        <p className="mt-6 max-w-xl text-lg leading-[1.55] text-balance text-white/65 sm:text-xl">{body ?? FREE_DEMO.summary}</p>
        <ButtonLink href={goal ? `/start?goal=${goal}` : "/start"} size="lg" className="mt-10 w-full sm:w-auto">
          {cta ?? FREE_DEMO.cta} <Arrow />
        </ButtonLink>
      </Container>
    </section>
  );
}
