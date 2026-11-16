import type { demoVisits } from "@/db/schema";
import { Chip } from "@/components/ui";
import { formatIst } from "@/knowledge/outreach";
import { describeAction, viewLabel } from "@/server/demo-visits";
import { WEB_PROPOSALS } from "@/sites/proposals";

// How one visit to the live demo reads in HQ: when, how long, from where, which
// modules they opened and what they did. Shared by the prospect page and the
// Demo visits list.

type Visit = typeof demoVisits.$inferSelect;

export function duration(seconds: number) {
  if (seconds < 5) return "a few seconds";
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m >= 10 || !s ? `${m} min` : `${m} min ${s} s`;
}

/** Where they came from, in a few words. */
export function sourceOf(v: Visit) {
  if (v.prospectId) return "Personal link";
  const utm = [v.utmSource, v.utmCampaign].filter(Boolean).join(" · ");
  if (utm) return utm;
  if (v.referrer) return v.referrer;
  return v.page === "services" ? "Services page" : v.page === "proposal" ? "Proposal link" : v.page === "ovdemo" ? "Demo link" : "Direct";
}

/** How warm the visit is: a decision approved or a booking click is hot; a minute of looking is warm. */
export function heatOf(v: Visit): { label: string; className: string } | null {
  if (v.actions.includes("unlocked")) return { label: "Unlocked with your link", className: "!bg-[#ecfdf3] !text-[#05603a]" };
  if (v.actions.includes("hi") || v.actions.includes("unlock")) return { label: "Opened WhatsApp", className: "!bg-[#ecfdf3] !text-[#05603a]" };
  if (v.actions.includes("cta")) return { label: "Clicked to talk", className: "!bg-[#ecfdf3] !text-[#05603a]" };
  if (v.actions.some((a) => a.startsWith("approve:"))) return { label: "Approved a decision", className: "!bg-[#ecfdf3] !text-[#05603a]" };
  if (v.activeSeconds >= 120 || v.views.length >= 4) return { label: "Explored", className: "!bg-[#eff8ff] !text-[#175cd3]" };
  if (v.activeSeconds < 15) return { label: "Bounced", className: "!bg-[#f2f4f7] !text-[#475467]" };
  return null;
}

/** Seconds on each proposal page or demo module, from the "dwell:<where>-<seconds>" reports. */
function dwellOf(v: Visit) {
  return v.actions
    .map((a) => /^dwell:(.+)-(\d+)$/.exec(a))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ where: m[1].replace(/^ov-/, "ov:"), seconds: Number(m[2]) }))
    .sort((a, b) => a.where.localeCompare(b.where));
}

export function VisitDetails({ v, showWhen = true }: { v: Visit; showWhen?: boolean }) {
  const heat = heatOf(v);
  const actions = v.actions.filter((a) => !a.startsWith("dwell:") && !a.startsWith("at:")).map(describeAction);
  const dwell = dwellOf(v);
  const at = v.actions.find((a) => a.startsWith("at:"));
  const max = Math.max(1, ...dwell.map((d) => d.seconds));
  return (
    <div className="space-y-1.5 text-sm">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {v.viewerName ? (
          <span className="font-semibold">{v.viewerName}</span>
        ) : (
          (v.page === "proposal" || v.page === "ovdemo") && <span className="text-muted italic">No name given</span>
        )}
        {showWhen && <span className="font-medium">{formatIst(v.startedAt)}</span>}
        <span className="text-muted">{duration(v.activeSeconds)} on screen</span>
        <span className="text-muted">· {[v.device, v.city].filter(Boolean).join(", ") || "unknown device"}</span>
        <span className="text-muted">· {sourceOf(v)}</span>
        {heat && <Chip className={heat.className}>{heat.label}</Chip>}
      </p>
      {v.views.length > 0 && (
        <p className="text-muted">
          Looked at: <span className="text-fg/85">{v.views.map(viewLabel).join(" → ")}</span>
        </p>
      )}
      {(v.page === "proposal" || v.page === "ovdemo") && <p className="text-muted">{v.page === "proposal" ? "OpticVyu proposal" : "OpticVyu demo"}{at ? ` · stopped at ${viewLabel(at.slice(3).replace(/^ov-/, "ov:"))}` : ""}</p>}
      {dwell.length > 0 && (
        <div className="space-y-1 pt-1">
          {dwell.map((d) => (
            <div key={d.where} className="grid grid-cols-[minmax(0,16rem)_minmax(0,1fr)_3.5rem] items-center gap-2 text-xs">
              <span className="truncate text-fg/85">{viewLabel(d.where)}</span>
              <span className="h-1.5 rounded-full bg-subtle">
                <span className="block h-full rounded-full bg-fg/70" style={{ width: `${(d.seconds / max) * 100}%` }} />
              </span>
              <span className="text-right text-muted tabular-nums">{duration(d.seconds)}</span>
            </div>
          ))}
        </div>
      )}
      {actions.length > 0 && (
        <ul className="list-inside list-disc text-fg/85">
          {actions.slice(0, 8).map((a) => (
            <li key={a}>{a}</li>
          ))}
          {actions.length > 8 && <li className="text-muted">and {actions.length - 8} more</li>}
        </ul>
      )}
    </div>
  );
}

/**
 * Everything one prospect did across all their visits to a proposal and its demo: who opened it
 * (the names they typed), how many times, total time on screen, and where that time went.
 */
export function EngagementSummary({ visits }: { visits: Visit[] }) {
  const groups = [
    { page: "proposal", title: "Proposal", unit: "pages" },
    { page: "ovdemo", title: "Demo", unit: "screens" },
  ]
    .map((g) => {
      const vs = visits.filter((v) => v.page === g.page);
      const total = vs.reduce((n, v) => n + v.activeSeconds, 0);
      const by = new Map<string, number>();
      for (const v of vs) for (const d of dwellOf(v)) by.set(d.where, (by.get(d.where) ?? 0) + d.seconds);
      const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
      const seen = vs.length ? Math.max(...vs.map((v) => v.views.length)) : 0;
      return { ...g, vs, total, top, seen };
    })
    .filter((g) => g.vs.length > 0);
  if (!groups.length) return <p className="text-muted">Not opened yet.</p>;

  const names = [...new Set(visits.filter((v) => v.page === "proposal" || v.page === "ovdemo").map((v) => v.viewerName).filter((n): n is string => !!n))];
  const last = visits.reduce((a, v) => (v.lastSeenAt > a ? v.lastSeenAt : a), visits[0].lastSeenAt);
  return (
    <div className="space-y-3">
      <p>
        <span className="text-muted">Opened by </span>
        {names.length ? <span className="font-semibold">{names.join(", ")}</span> : <span className="text-muted italic">no name given yet</span>}
        <span className="text-muted"> · last seen {formatIst(last)}</span>
      </p>
      {groups.map((g) => {
        const max = Math.max(1, ...g.top.map(([, s]) => s));
        return (
          <div key={g.page} className="rounded-xl bg-subtle p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-medium">{g.title}</p>
              <p className="text-xs text-muted tabular-nums">
                {g.vs.length} {g.vs.length === 1 ? "open" : "opens"} · {duration(g.total)} in total
                {g.page === "proposal" && g.seen ? ` · read ${g.seen} of ${WEB_PROPOSALS[0]?.pages.length ?? g.seen} pages` : ""}
              </p>
            </div>
            {g.top.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted">Most time on</p>
                {g.top.map(([where, sec]) => (
                  <div key={where} className="grid grid-cols-[minmax(0,1fr)_5rem_3.75rem] items-center gap-2 text-xs">
                    <span className="truncate text-fg/85">{viewLabel(where)}</span>
                    <span className="h-1.5 rounded-full bg-surface">
                      <span className="block h-full rounded-full bg-fg/70" style={{ width: `${(sec / max) * 100}%` }} />
                    </span>
                    <span className="text-right text-muted tabular-nums">{duration(sec)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
