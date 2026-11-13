import type { demoVisits } from "@/db/schema";
import { Chip } from "@/components/ui";
import { formatIst } from "@/knowledge/outreach";
import { describeAction, viewLabel } from "@/server/demo-visits";

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
  return v.page === "services" ? "Services page" : "Direct";
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

export function VisitDetails({ v, showWhen = true }: { v: Visit; showWhen?: boolean }) {
  const heat = heatOf(v);
  const actions = v.actions.map(describeAction);
  return (
    <div className="space-y-1.5 text-sm">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
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
