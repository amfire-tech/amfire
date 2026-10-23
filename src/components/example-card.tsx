import Link from "next/link";
import type { Example } from "@/knowledge/examples";
import { SERVICES } from "@/knowledge/catalog";
import { Arrow, Chip } from "./ui";

export function ExampleCard({ example }: { example: Example }) {
  return (
    <Link
      href={`/work/${example.slug}`}
      className="group flex h-full flex-col rounded-card bg-surface p-6 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] hover:ring-fg/25"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold tracking-wide text-muted uppercase">{SERVICES[example.path].name}</span>
        <span className="text-muted">
          {example.industry} · {example.city}
        </span>
      </div>
      <h3 className="mt-3 text-lg leading-snug font-semibold">{example.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted">{example.situation}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {example.stack.slice(0, 3).map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
      <span className="mt-auto flex items-center gap-1.5 pt-5 text-sm font-medium">
        See how it works <Arrow className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
