import Link from "next/link";
import { EmptyState, PageHeader, StatusBadge, Table, formatDateTime } from "@/components/ui";
import { getDb } from "@/db";
import { requireStaffActor } from "@/lib/session";
import { aiConfigured } from "@/server/agents/solution-architect";
import { listAgentRuns } from "@/server/hq";

export const metadata = { title: "Agent runs" };

export default async function AgentsPage() {
  const actor = await requireStaffActor();
  const runs = await listAgentRuns(await getDb(), actor);
  const totalCost = runs.reduce((s, r) => s + (r.costMicroUsd ?? 0), 0) / 1_000_000;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent runs"
        description={
          <>
            Every agent invocation with its engine, outcome and cost. Agents propose; people approve.{" "}
            {aiConfigured() ? "Gemini is configured." : "Gemini is not configured — the rules engine is used."} Cost of the
            last {runs.length} runs: ${totalCost.toFixed(4)}.
          </>
        }
      />
      {runs.length === 0 ? (
        <EmptyState title="No agent runs yet." />
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Started</th>
              <th>Role</th>
              <th>Engine</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Tokens / cost</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap">{formatDateTime(r.startedAt)}</td>
                <td>{r.role.replace(/_/g, " ")}</td>
                <td>
                  {r.engine}
                  {r.model && <div className="text-xs text-muted">{r.model}</div>}
                </td>
                <td>
                  <StatusBadge status={r.status} />
                  {r.error && <div className="mt-1 max-w-xs truncate text-xs text-danger" title={r.error}>{r.error}</div>}
                </td>
                <td>{r.finishedAt ? `${((+r.finishedAt - +r.startedAt) / 1000).toFixed(1)} s` : "—"}</td>
                <td>
                  {r.inputTokens != null ? (
                    <>
                      {r.inputTokens + (r.outputTokens ?? 0)} tokens
                      <div className="text-xs text-muted">${((r.costMicroUsd ?? 0) / 1_000_000).toFixed(4)}</div>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {r.subjectType === "lead" ? (
                    <Link href={`/hq/leads/${r.subjectId}`} className="underline-offset-4 hover:underline">
                      Lead
                    </Link>
                  ) : (
                    r.subjectType
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
