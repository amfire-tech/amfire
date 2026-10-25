import Link from "next/link";
import { Money, SourceChip, StatTile } from "@/components/hq";
import { PageHeader, formatDate, statusLabel, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { requireStaffActor } from "@/lib/session";
import { STAGE_PROBABILITY, getPipeline } from "@/server/crm";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const actor = await requireStaffActor();
  const p = await getPipeline(await getDb(), actor);
  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description={
          <>
            Cards move by themselves as things happen: a booking or a lead you add lands in <strong>New</strong>; clicking “Qualify lead” moves it to{" "}
            <strong>Qualified</strong>; sending the proposal moves it to <strong>Proposal sent</strong>; the client accepting in their Hub moves it to{" "}
            <strong>Won</strong>. “Mark as lost” on a lead takes it off. A deal’s value is what you set on the lead, or its latest proposal total.
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Open pipeline">
          <Money amounts={p.openValue} />
        </StatTile>
        <StatTile label="Weighted" hint="Value × chance of winning at each stage">
          <Money amounts={p.weightedValue} />
        </StatTile>
        <StatTile label="Win rate" hint={`${p.lostCount} lost so far`}>
          {p.winRate == null ? "—" : `${p.winRate}%`}
        </StatTile>
        <StatTile label="Follow-ups due" tone={p.followUpsDue.length ? "bad" : undefined}>
          {p.followUpsDue.length}
        </StatTile>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        <div className="grid min-w-[880px] grid-cols-4 gap-4">
          {p.stages.map((s) => (
            <section key={s.stage} aria-labelledby={`stage-${s.stage}`} className="rounded-card bg-surface/60 p-3 ring-1 ring-line">
              <div className="mb-3 px-1">
                <h2 id={`stage-${s.stage}`} className="flex items-center justify-between font-semibold">
                  {statusLabel(s.stage)} <span className="text-sm font-normal text-muted">{s.deals.length}</span>
                </h2>
                <p className="text-sm text-muted">
                  <Money amounts={s.total} /> · {Math.round(STAGE_PROBABILITY[s.stage] * 100)}% likely
                </p>
              </div>
              <ul className="space-y-2">
                {s.deals.slice(0, 25).map(({ lead, value, currency }) => {
                  const due = lead.nextFollowUpAt && lead.nextFollowUpAt <= now;
                  return (
                    <li key={lead.id}>
                      <Link href={`/hq/leads/${lead.id}`} className="block rounded-xl bg-surface p-3 ring-1 ring-line hover:ring-fg/30">
                        <p className="truncate font-medium">{lead.company}</p>
                        <p className="truncate text-xs text-muted">
                          {lead.name} · {timeAgo(lead.createdAt)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-semibold">{value ? formatMoney(value, currency) : "No value yet"}</span>
                          <SourceChip source={lead.source} />
                        </div>
                        {lead.nextFollowUpAt && (
                          <p className={due ? "mt-1.5 text-xs font-medium text-danger" : "mt-1.5 text-xs text-muted"}>
                            Follow up {formatDate(lead.nextFollowUpAt)}
                          </p>
                        )}
                      </Link>
                    </li>
                  );
                })}
                {s.deals.length === 0 && <li className="px-1 py-4 text-sm text-muted">Nothing here.</li>}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
