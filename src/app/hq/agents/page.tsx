import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AgentTag, cleanAiText, engineLabel } from "@/components/hq";
import { Card, EmptyState, PageHeader, StatusBadge, Table, formatDateTime, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { requireStaffActor } from "@/lib/session";
import { aiConfigured } from "@/server/agents/solution-architect";
import { latestSignals, teamSettings } from "@/server/agents/team";
import { approvalStats } from "@/server/brain";
import { listAgentRuns } from "@/server/hq";
import { briefEmails, briefEmailsSaved, emailConfigured, whatsappConfigured } from "@/server/notify";
import { desc } from "drizzle-orm";
import { addBriefEmailAction, emailBriefAction, removeBriefEmailAction, runTeamAction, sendClientDigestsAction, updateAgentSettingAction } from "../actions";

export const metadata = { title: "AI team" };

const SEVERITY_DOT = { critical: "bg-danger", warn: "bg-[#f79009]", info: "bg-line" } as Record<string, string>;

export default async function AgentsPage() {
  const actor = await requireStaffActor();
  const db = await getDb();
  const [team, latest, stats, runs, sent, recipients, recipientsSaved] = await Promise.all([
    teamSettings(db),
    latestSignals(db),
    approvalStats(db),
    listAgentRuns(db, actor),
    db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(6),
    briefEmails(db),
    briefEmailsSaved(db),
  ]);
  const totalCost = runs.reduce((s, r) => s + (r.costMicroUsd ?? 0), 0) / 1_000_000;
  const isOwner = actor.internalRole === "owner";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Your AI team"
        description={
          <>
            Seven agents, each watching one part of the business. They share what they find, draft everything, and send nothing without you.{" "}
            {aiConfigured()
              ? "amfire AI is on: drafts are rewritten in your voice and the brief gets a summary."
              : "amfire AI is off, so agents use their rules and templates — everything still works."}
          </>
        }
        actions={<ActionForm action={runTeamAction} submitLabel="Run the team now" pendingLabel="Team is working…" size="sm" />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Last run: {latest.run ? `${formatDateTime(latest.run.startedAt)} (${latest.run.triggeredBy ? "by hand" : "scheduled"})` : "never"} · scheduled every morning at
          8:00 IST · brief by email {emailConfigured() && recipients.length ? `to ${recipients.join(", ")}` : "off"}, WhatsApp {whatsappConfigured() ? "on" : "off"}.
        </p>
        {isOwner && emailConfigured() && (
          <div className="flex flex-wrap gap-2">
            <ActionForm action={emailBriefAction} submitLabel="Email me today's brief" size="sm" variant="ghost" pendingLabel="Sending…" />
            <ActionForm action={sendClientDigestsAction} submitLabel="Send clients' weekly emails now" size="sm" variant="ghost" pendingLabel="Sending…" />
          </div>
        )}
      </div>

      {isOwner && (
        <Card>
          <h2 className="font-semibold">Morning brief by email</h2>
          <p className="text-sm text-muted">
            Every address here gets the 8:00 IST brief. New-demo &ldquo;call now&rdquo; alerts go to the first one.
            {!recipientsSaved && recipients.length > 0 && " This address comes from the server settings until you add one here."}
            {!emailConfigured() && " Email sending isn't set up yet (RESEND_API_KEY and NOTIFY_FROM_EMAIL), so nothing goes out."}
          </p>
          {recipients.length > 0 && (
            <ul className="mt-3 divide-y divide-line rounded-lg border border-line text-sm">
              {recipients.map((email) => (
                <li key={email} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span>{email}</span>
                  {recipients.length > 1 && (
                    <ActionForm action={removeBriefEmailAction.bind(null, email)} submitLabel="Remove" size="sm" variant="ghost" pendingLabel="Removing…" inline />
                  )}
                </li>
              ))}
            </ul>
          )}
          <ActionForm key={recipients.join()} action={addBriefEmailAction} submitLabel="Add email" size="sm" pendingLabel="Adding…" inline className="mt-3">
            <div>
              <label htmlFor="brief-email" className="block text-sm font-medium">
                New address
              </label>
              <input id="brief-email" name="email" type="email" required placeholder="name@example.com" className={`${inputClass} mt-1.5 sm:!w-72`} />
            </div>
          </ActionForm>
        </Card>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {team.map((t) => {
          const mine = latest.signals.filter((s) => s.role === t.role);
          const s = stats.get(t.role);
          const unchangedRate = s && s.approved ? Math.round((s.unchanged / s.approved) * 100) : null;
          return (
            <Card key={t.role} className={t.enabled ? undefined : "opacity-60"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <AgentTag role={t.role} />
                  <h2 className="mt-2 font-semibold">{t.name}</h2>
                  <p className="text-sm text-muted">{t.job}</p>
                </div>
                {!t.enabled && <StatusBadge status="paused" />}
              </div>

              {s && (
                <p className="mt-3 text-sm">
                  You approved {s.approved}
                  {unchangedRate != null && ` (${unchangedRate}% unchanged)`} and dismissed {s.rejected}.
                  {unchangedRate != null && s.approved >= 10 && unchangedRate >= 90 && (
                    <span className="text-success"> Its drafts rarely need edits — you can trust it with more.</span>
                  )}
                </p>
              )}

              <div className="mt-3">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">Latest findings</p>
                {mine.length === 0 ? (
                  <p className="mt-1 text-sm text-muted">Nothing to report.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5 text-sm">
                    {mine.slice(0, 5).map((sig) => {
                      const href = typeof (sig.data as { href?: unknown } | null)?.href === "string" ? (sig.data as { href: string }).href : sig.leadId ? `/hq/leads/${sig.leadId}` : null;
                      return (
                        <li key={sig.id} className="flex gap-2">
                          <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${SEVERITY_DOT[sig.severity] ?? "bg-line"}`} />
                          {href ? (
                            <Link href={href} className="hover:underline">
                              {sig.summary}
                            </Link>
                          ) : (
                            <span>{sig.summary}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {isOwner && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer text-muted">Settings</summary>
                  <div className="mt-3">
                    <ActionForm action={updateAgentSettingAction.bind(null, t.role)} submitLabel="Save" size="sm" inline>
                      <label className="flex items-center gap-2 pb-2.5">
                        <input type="checkbox" name="enabled" defaultChecked={t.enabled} className="accent-signal" /> Active
                      </label>
                      <div>
                        <label htmlFor={`budget-${t.role}`} className="block text-sm font-medium">
                          AI budget per day (USD)
                        </label>
                        <input
                          id={`budget-${t.role}`}
                          name="budget"
                          type="number"
                          step="0.05"
                          min={0}
                          max={100}
                          defaultValue={t.dailyBudgetMicroUsd / 1_000_000}
                          className={`${inputClass} mt-1.5 sm:!w-32`}
                        />
                      </div>
                    </ActionForm>
                  </div>
                </details>
              )}
            </Card>
          );
        })}
      </div>

      {sent.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Brief deliveries</h2>
          <Table>
            <thead>
              <tr>
                <th>When</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {sent.map((n) => (
                <tr key={n.id}>
                  <td>{formatDateTime(n.createdAt)}</td>
                  <td className="capitalize">{n.channel}</td>
                  <td>{n.status}</td>
                  <td className="text-muted">{n.error ?? n.recipient ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Every run</h2>
        <p className="text-sm text-muted">
          Every agent invocation with its engine, outcome and cost. Cost of the last {runs.length} runs: ${totalCost.toFixed(4)}.
        </p>
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
                  <td>{engineLabel(r.engine)}</td>
                  <td>
                    <StatusBadge status={r.status} />
                    {r.error && (
                      <div className="mt-1 max-w-xs truncate text-xs text-danger" title={cleanAiText(r.error) ?? undefined}>
                        {cleanAiText(r.error)}
                      </div>
                    )}
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
                    ) : r.subjectType === "company" ? (
                      "Team run"
                    ) : (
                      r.subjectType
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
