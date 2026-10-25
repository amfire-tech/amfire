import type { ReactNode } from "react";
import { formatMoney } from "@/knowledge/pricing";
import { sourceLabel } from "@/lib/attribution";
import { cx } from "./ui";

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

/** How an agent run's engine is shown: the AI provider is never named in the product. */
export function engineLabel(engine: string) {
  return engine === "gemini" ? "AMFIRE AI" : engine === "rules" ? "Rules" : engine;
}

/** Error text from the AI provider, with the provider's and model's names replaced. */
export function cleanAiText(text: string | null | undefined) {
  return text?.replace(/(models\/)?gemini[\w.-]*/gi, "AMFIRE AI").replace(/google|generativelanguage[\w.]*/gi, "AI service") ?? null;
}

/** Amounts in more than one currency, e.g. "₹1,20,000 + $500". */
export function Money({ amounts, empty = formatMoney(0) }: { amounts: Record<string, number>; empty?: string }) {
  const parts = Object.entries(amounts).filter(([, v]) => v);
  if (parts.length === 0) return <>{empty}</>;
  return <>{parts.map(([cur, v]) => formatMoney(v, cur)).join(" + ")}</>;
}

export function StatTile({ label, children, hint, tone }: { label: string; children: ReactNode; hint?: ReactNode; tone?: "bad" | "good" }) {
  return (
    <div className="rounded-card bg-surface p-4 ring-1 ring-line sm:p-5">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className={cx("mt-1.5 text-2xl font-semibold tracking-tight", tone === "bad" && "text-danger", tone === "good" && "text-success")}>{children}</p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function HealthPill({ band, score }: { band: "healthy" | "watch" | "at risk"; score: number }) {
  const tones = {
    healthy: "bg-[#ecfdf3] text-[#05603a]",
    watch: "bg-[#fff6ed] text-[#9a3412]",
    "at risk": "bg-[#fef3f2] text-[#b42318]",
  };
  return <span className={cx("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", tones[band])}>{band} · {score}</span>;
}

/** "AI" marker for anything written or suggested by an agent. */
export function AgentTag({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-fg px-2 py-0.5 text-[11px] font-medium tracking-wide text-page uppercase">
      <span aria-hidden className="bg-brand size-1.5 rounded-full" />
      {role.replace(/_/g, " ")}
    </span>
  );
}
