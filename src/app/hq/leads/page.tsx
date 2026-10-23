import Link from "next/link";
import { ScorePill } from "@/components/hq";
import { EmptyState, PageHeader, StatusBadge, Table, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { GOALS, URGENCY, labelFor } from "@/knowledge/catalog";
import { requireStaffActor } from "@/lib/session";
import { listLeads } from "@/server/hq";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const actor = await requireStaffActor();
  const leads = await listLeads(await getDb(), actor);

  return (
    <div className="space-y-6">
      <PageHeader title="Leads" description="Every discovery submission, with its next action." />
      {leads.length === 0 ? (
        <EmptyState title="No enquiries yet.">
          Submissions from <Link href="/start" className="underline">the discovery form</Link> appear here.
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
                  <th>Goal</th>
                  <th>Timing</th>
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
                    <td>{labelFor(GOALS, l.goal)}</td>
                    <td>{labelFor(URGENCY, l.urgency)}</td>
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
