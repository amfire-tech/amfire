import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/knowledge/case-studies";
import { Arrow } from "./ui";

/** A delivered client project: image, who it is for, what we built, and three facts. Quiet, no card chrome. */
export function CaseStudyCard({ study, priority }: { study: CaseStudy; priority?: boolean }) {
  return (
    <Link href={`/work/${study.slug}`} className="group flex h-full flex-col">
      <div className="relative aspect-[1200/630] overflow-hidden rounded-md bg-subtle ring-1 ring-line">
        <Image
          src={study.cover}
          alt={study.coverAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 560px, 100vw"
          className="object-cover transition duration-700 group-hover:scale-[1.015]"
        />
      </div>
      <p className="mt-6 text-[13px] font-medium tracking-[0.12em] text-muted uppercase">
        {study.client} · In daily use
      </p>
      <h3 className="mt-3 text-2xl leading-snug font-medium tracking-tight">{study.title}</h3>
      <p className="mt-3 text-[17px] leading-relaxed text-muted">{study.summary}</p>
      <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
        {study.facts.slice(0, 3).map((f) => (
          <div key={f.label} className="flex flex-col-reverse">
            <dt className="mt-1 text-sm text-muted">{f.label}</dt>
            <dd className="font-mono text-2xl leading-tight">{f.value}</dd>
          </div>
        ))}
      </dl>
      <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[15px] font-medium">
        Read the case study <Arrow className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
