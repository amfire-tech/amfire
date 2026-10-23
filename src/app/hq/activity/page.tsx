import { EmptyState, PageHeader, Table, formatDateTime } from "@/components/ui";
import { getDb } from "@/db";
import { requireStaffActor } from "@/lib/session";
import { listAuditEvents } from "@/server/hq";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const actor = await requireStaffActor();
  const rows = await listAuditEvents(await getDb(), actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="Audit history: who changed what, and when. The last 100 events." />
      {rows.length === 0 ? (
        <EmptyState title="No activity yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ event, actorName }) => (
              <tr key={event.id}>
                <td className="whitespace-nowrap">{formatDateTime(event.createdAt)}</td>
                <td>{actorName ?? <span className="text-muted">System / visitor</span>}</td>
                <td className="font-mono text-xs">{event.action}</td>
                <td className="text-muted">{event.subjectType}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
