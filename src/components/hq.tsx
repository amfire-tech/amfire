import { sourceLabel } from "@/lib/attribution";

export function SourceChip({ source }: { source: string }) {
  return (
    <span
      className={
        source === "unknown"
          ? "shrink-0 rounded-full px-2.5 py-0.5 text-xs text-muted ring-1 ring-line"
          : "shrink-0 rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium ring-1 ring-line"
      }
    >
      {sourceLabel(source)}
    </span>
  );
}

export function ScorePill({ score }: { score: number }) {
  const band = score >= 60 ? "Strong" : score >= 35 ? "Possible" : "Low";
  return (
    <span className="shrink-0 rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium" title="Rule-based score — a suggestion, not a decision">
      {band} · {score}
    </span>
  );
}
