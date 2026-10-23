export function ScorePill({ score }: { score: number }) {
  const band = score >= 60 ? "Strong" : score >= 35 ? "Possible" : "Low";
  return (
    <span className="shrink-0 rounded-full bg-subtle px-2.5 py-0.5 text-xs font-medium" title="Rule-based score — a suggestion, not a decision">
      {band} · {score}
    </span>
  );
}
