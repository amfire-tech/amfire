import Image from "next/image";
import { FOUNDERS } from "@/config/founders";
import { Container } from "./ui";

/** The founder, in their own words: a face and a name behind amfire. Hidden while no founder has a note. */
export function FounderNote({ className }: { className?: string }) {
  const founder = FOUNDERS.find((f) => f.note);
  if (!founder) return null;
  return (
    <section aria-label="From the founder" className={className}>
      <Container className="py-14 sm:py-20">
        <figure className="grid items-center gap-8 rounded-card bg-surface p-6 ring-1 ring-line sm:p-10 lg:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-4 lg:flex-col lg:items-start">
            {founder.photo && (
              <Image src={founder.photo} alt={founder.name} width={256} height={256} sizes="160px" className="size-24 rounded-2xl object-cover sm:size-40" />
            )}
            <figcaption>
              <p className="font-semibold">{founder.name}</p>
              <p className="text-sm text-muted">{founder.role}, amfire</p>
              {founder.linkedin && (
                <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm font-semibold underline-offset-4 hover:underline">
                  LinkedIn →
                </a>
              )}
            </figcaption>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <blockquote className="text-xl leading-snug font-medium tracking-tight text-balance sm:text-2xl">“{founder.note}”</blockquote>
            {founder.video && (
              <video
                className="aspect-[9/16] w-full max-w-[14rem] rounded-2xl bg-ink object-cover ring-1 ring-line"
                src={founder.video.src}
                poster={founder.video.poster}
                controls
                playsInline
                preload="none"
                aria-label={`${founder.name} introduces amfire`}
              />
            )}
          </div>
        </figure>
      </Container>
    </section>
  );
}
