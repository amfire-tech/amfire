import Link from "next/link";
import type { ServiceStory as Story } from "@/knowledge/catalog";
import { Arrow, cx } from "./ui";

/**
 * A business owner's story in four beats: the problem, what they tried,
 * what AMFIRE did, and what changed. Illustrative, and labelled as such.
 */
export function ServiceStory({ story, compact }: { story: Story; compact?: boolean }) {
  const beats = [
    { label: "The problem", body: story.problem, tone: "problem" as const },
    { label: "What they tried", body: story.tried, tone: "neutral" as const },
    { label: "How AMFIRE helps", body: story.amfire, tone: "amfire" as const },
    { label: "What changed", body: story.result, tone: "result" as const },
  ];

  return (
    <div className="overflow-hidden rounded-[1.5rem] bg-surface ring-1 ring-line">
      <div className="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest text-muted uppercase">
            Example story · {story.owner}, {story.where}
          </p>
          <blockquote className="mt-3 text-xl leading-snug font-medium text-balance sm:text-2xl">{story.quote}</blockquote>
        </div>
        {!compact && (
          <Link href={`/work/${story.exampleSlug}`} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
            Read the full example <Arrow />
          </Link>
        )}
      </div>
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
        {beats.map((b, i) => (
          <li
            key={b.label}
            className={cx(
              "relative flex gap-4 border-line p-5 sm:block sm:p-7",
              i > 0 && "border-t sm:border-t-0",
              i % 2 === 1 && "sm:border-l",
              i >= 2 && "sm:border-t lg:border-t-0",
              i === 2 && "lg:border-l",
              b.tone === "amfire" && "bg-ink text-white",
            )}
          >
            <span
              className={cx(
                "grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                b.tone === "amfire" ? "bg-brand text-ink" : b.tone === "result" ? "bg-success/15 text-success" : "bg-subtle text-muted ring-1 ring-line",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className={cx("mt-1.5 text-xs font-semibold tracking-widest uppercase sm:mt-4", b.tone === "amfire" ? "text-white/60" : "text-muted")}>{b.label}</p>
              <p className={cx("mt-1.5 text-sm leading-relaxed sm:mt-2", b.tone === "amfire" ? "text-white/90" : "text-fg/85")}>{b.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
