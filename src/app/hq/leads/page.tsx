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
      )}
    </div>
  );
}
