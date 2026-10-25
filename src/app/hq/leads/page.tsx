import Link from "next/link";
import type { ReactNode } from "react";
import { ScorePill, SourceChip } from "@/components/hq";
import { ButtonLink, EmptyState, PageHeader, StatusBadge, Table, cx, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { GOALS, URGENCY, labelFor } from "@/knowledge/catalog";
import { LEAD_SOURCES, sourceLabel } from "@/lib/attribution";
import { requireStaffActor } from "@/lib/session";
import { listLeads } from "@/server/hq";

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: PageProps<"/hq/leads">) {
  const actor = await requireStaffActor();
  const { source: rawSource } = await searchParams;
  const source = LEAD_SOURCES.find((s) => s.id === rawSource)?.id;
  const { leads, bySource } = await listLeads(await getDb(), actor, { source });
  const total = bySource.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Every enquiry with where it came from and its next action."
        actions={<ButtonLink href={source ? `/hq/leads/new?source=${source}` : "/hq/leads/new"}>Add a lead</ButtonLink>}
      />

      {bySource.length > 0 && (
        <nav aria-label="Filter by source" className="flex flex-wrap gap-2">
          <FilterLink href="/hq/leads" active={!source}>
            All · {total}
          </FilterLink>
          {bySource.map((r) => (
            <FilterLink key={r.source} href={`/hq/leads?source=${r.source}`} active={source === r.source}>
              {sourceLabel(r.source)} · {r.total}
              {r.won > 0 && <span className="text-success"> ({r.won} won)</span>}
            </FilterLink>
          ))}
        </nav>
      )}

      {leads.length === 0 ? (
        <EmptyState title={source ? `No leads from ${sourceLabel(source)} yet.` : "No enquiries yet."}>
          Bookings from <Link href="/start" className="underline">the discovery form</Link> appear here, or{" "}
          <Link href="/hq/leads/new" className="underline">add one by hand</Link>.
        </EmptyState>
      ) : (
        <>
          {/* Phones: one tappable card per lead. */}
          <ul className="space-y-3 sm:hidden">
            {leads.map((l) => (
              <li key={l.id}>
                <Link href={`/hq/leads/${l.id}`} className="block rounded-card bg-surface p-4 ring-1 ring-line active:bg-subtle">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{l.company}</p>
                      <p className="text-xs text-muted">
                        {l.name} · {timeAgo(l.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="mt-2 text-sm">{labelFor(GOALS, l.goal)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <ScorePill score={l.qualificationScore} />
                    <SourceChip source={l.source} />
                    <span>{labelFor(URGENCY, l.urgency)}</span>
                  </div>
                  {l.nextAction && <p className="mt-2 text-sm text-muted">Next: {l.nextAction}</p>}
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
            <Table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Source</th>
                  <th>Goal</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Next action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-subtle/60">
                    <td>
                      <Link href={`/hq/leads/${l.id}`} className="font-medium underline-offset-4 hover:underline">
                        {l.company}
                      </Link>
                      <div className="text-xs text-muted">
                        {l.name} · {timeAgo(l.createdAt)}
                      </div>
                    </td>
                    <td>
                      <SourceChip source={l.source} />
                      {(l.utmCampaign || l.sourceNote) && (
                        <div className="mt-1 max-w-40 truncate text-xs text-muted" title={l.sourceNote ?? l.utmCampaign ?? undefined}>
                          {l.sourceNote ?? l.utmCampaign}
                        </div>
                      )}
                    </td>
                    <td>
                      {labelFor(GOALS, l.goal)}
                      <div className="text-xs text-muted">{labelFor(URGENCY, l.urgency)}</div>
                    </td>
                    <td>
                      <ScorePill score={l.qualificationScore} />
                    </td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="text-muted">{l.nextAction ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "rounded-full px-3 py-1.5 text-sm ring-1 ring-line",
        active ? "bg-fg font-medium text-page ring-fg" : "bg-surface text-fg/80 hover:bg-subtle",
      )}
    >
      {children}
    </Link>
  );
}
