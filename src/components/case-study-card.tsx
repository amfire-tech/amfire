import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/knowledge/case-studies";
import { Arrow } from "./ui";

/** A delivered client project. Visually stronger than ExampleCard, since it is real. */
export function CaseStudyCard({ study, priority }: { study: CaseStudy; priority?: boolean }) {
  return (
    <Link
      href={`/work/${study.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-surface ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] hover:ring-fg/25"
    >
      <div className="relative aspect-[1200/630] overflow-hidden border-b border-line bg-subtle">
        <Image
          src={study.cover}
          alt={study.coverAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-cover transition duration-500 group-hover:scale-[1.02]"
        />
        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
          <span aria-hidden className="size-1.5 rounded-full bg-[#16a34a]" />
          Live · client project
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
          {study.client} · {study.sector}
        </p>
        <h3 className="mt-2 text-xl leading-snug font-semibold">{study.title}</h3>
        <p className="mt-2 text-sm text-muted">{study.summary}</p>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
          {study.facts.slice(0, 3).map((f) => (
            <div key={f.label}>
              <dt className="sr-only">{f.label}</dt>
              <dd className="text-lg font-semibold">{f.value}</dd>
              <dd className="text-xs text-muted">{f.label}</dd>
            </div>
          ))}
        </dl>
        <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-semibold">
          Read the case study <Arrow className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
