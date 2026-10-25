import Link from "next/link";
import { HealthPill, Money } from "@/components/hq";
import { EmptyState, PageHeader, Table, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { requireStaffActor } from "@/lib/session";
import { listClients } from "@/server/crm";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
  const actor = await requireStaffActor();
  const clients = await listClients(await getDb(), actor);
  // Riskiest first: that's where attention pays off.
  clients.sort((a, b) => a.health.score - b.health.score);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Every client with what they've paid, what they owe and how the relationship is going. Lowest health first."
      />
      {clients.length === 0 ? (
        <EmptyState title="No clients yet.">A lead becomes a client when you send their first proposal.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Health</th>
              <th>Paid to date</th>
              <th>Outstanding</th>
              <th>Monthly plan</th>
              <th>Projects</th>
              <th>Last contact</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.org.id} className="hover:bg-subtle/60">
                <td>
                  <Link href={`/hq/clients/${c.org.id}`} className="font-medium underline-offset-4 hover:underline">
                    {c.org.name}
                  </Link>
                </td>
                <td title={c.health.reasons.join("\n") || "No issues"}>
                  <HealthPill band={c.health.band} score={c.health.score} />
                </td>
                <td>
                  <Money amounts={c.revenue} />
                </td>
                <td className={Object.keys(c.outstanding).length ? "font-medium" : "text-muted"}>
                  <Money amounts={c.outstanding} empty="—" />
                </td>
                <td>
                  <Money amounts={c.mrr} empty="—" />
                </td>
                <td>
                  {c.activeProjects} active
                  {c.completedProjects > 0 && <div className="text-xs text-muted">{c.completedProjects} completed</div>}
                </td>
                <td className="text-muted">{c.lastContact ? timeAgo(c.lastContact) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
