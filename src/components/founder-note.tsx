import Image from "next/image";
import { FOUNDERS } from "@/config/founders";
import { Container, Eyebrow } from "./ui";

/**
 * A founder, in their own words, for partner pages. Same look as the homepage's
 * founders note: centred, serif quote, portrait in black and white (every founder
 * photo on the site is greyscale so they read as one set). Hidden while no founder has a note.
 */
export function FounderNote({ className }: { className?: string }) {
  const founder = FOUNDERS.find((f) => f.note);
  if (!founder) return null;
  return (
    <section aria-label="From the founder" className={className ?? "border-t border-line bg-subtle"}>
      <Container className="py-24 sm:py-32">
        <figure className="mx-auto flex max-w-4xl flex-col items-center text-center">
          {founder.photo && (
            <Image src={founder.photo} alt={founder.name} width={240} height={240} sizes="96px" className="size-24 rounded-full object-cover grayscale" />
          )}
          <Eyebrow className="mt-8">From the founder</Eyebrow>
          <blockquote className="mt-6 font-serif text-[1.6rem] leading-[1.3] text-balance italic sm:text-[2.25rem] sm:leading-[1.25]">“{founder.note}”</blockquote>
          <figcaption className="mt-8">
            <span className="font-medium">{founder.name}</span>
            <span className="ml-3 text-[15px] text-muted">{founder.role}, amfire</span>
            {founder.linkedin && (
              <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" className="ml-4 text-[15px] font-medium underline-offset-4 hover:underline">
                LinkedIn
              </a>
            )}
          </figcaption>
        </figure>
      </Container>
    </section>
  );
}
