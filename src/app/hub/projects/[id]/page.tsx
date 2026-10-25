import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Card, CardTitle, EmptyState, Notice, PageHeader, ProgressBar, StatusBadge, formatDate, formatDateTime, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { isUuid } from "@/lib/ids";
import { requireActor } from "@/lib/session";
import { getClientProject } from "@/server/projects";
import { changeRequestAction, completeChecklistAction, decideChangeAction, feedbackAction, requestMilestoneChangesAction } from "../../actions";
import { ApproveMilestoneButton, SupportRequestForm } from "./client-forms";

export const metadata = { title: "Project" };

export default async function HubProjectPage({ params }: PageProps<"/hub/projects/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const actor = await requireActor(`/hub/projects/${id}`);
  const data = await getClientProject(await getDb(), actor, id);
  if (!data) notFound();
  const { project, milestones, tasks, updates, requests, progress, changeRequests, feedback, checklist } = data;
  const toRate = milestones.filter((m) => m.status === "done" && !feedback.some((f) => f.milestoneId === m.id)).slice(-1);
  const needed = checklist.filter((c) => c.status === "open");
  const sent = checklist.filter((c) => c.status === "done");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hub/projects" className="hover:underline">
            ← Projects
          </Link>
        }
        title={project.name}
        description={`Started ${formatDate(project.startedAt)}`}
      />

      {/* Progress, from real milestone records */}
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Progress</h2>
          <span className="text-sm text-muted">
            {progress.done} of {progress.total} milestones approved
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar value={progress.percent} label="Project progress" />
        </div>
        <p className="mt-3 text-sm">
          {project.status === "completed"
            ? "All milestones are complete."
            : progress.current
              ? <>Current milestone: <strong>{progress.current.title}</strong></>
              : "No milestones yet."}
        </p>
      </Card>

      {/* The one obvious next action */}
      {progress.awaitingApproval.map((full) => {
        return (
          <Card key={full.id} className="ring-2 ring-flame">
            <p className="text-sm font-medium text-muted">Waiting for your approval</p>
            <h2 className="mt-1 text-lg font-semibold">{full.title}</h2>
            <p className="mt-1 text-fg/80">{full.description}</p>
            <p className="mt-2 text-sm text-muted">Approving confirms this milestone is complete. It will then be invoiced as agreed in your proposal.</p>
            <div className="mt-4">
              <ApproveMilestoneButton projectId={project.id} milestoneId={full.id} title={full.title} />
            </div>
            <details className="mt-4 border-t border-line pt-4">
              <summary className="cursor-pointer text-sm font-medium">Not quite right? Request changes</summary>
              <div className="mt-3">
                <ActionForm action={requestMilestoneChangesAction.bind(null, project.id, full.id)} submitLabel="Send back with changes">
                  <label htmlFor={`fb-text-${full.id}`} className="sr-only">
                    What should we change?
                  </label>
                  <textarea
                    id={`fb-text-${full.id}`}
                    name="feedback"
                    rows={3}
                    required
                    minLength={5}
                    className={inputClass}
                    placeholder="The report should also show sales by salesperson…"
                  />
                </ActionForm>
              </div>
            </details>
          </Card>
        );
      })}

      {needed.length > 0 && (
        <Card className="ring-2 ring-flame">
          <h2 className="font-semibold">What we need from you</h2>
          <p className="mt-0.5 text-sm text-muted">The work continues as soon as these arrive. Please don&apos;t paste passwords here — tell us and we&apos;ll share a safe way.</p>
          <ul className="mt-4 space-y-4">
            {needed.map((c) => (
              <li key={c.id} className="rounded-xl p-4 ring-1 ring-line">
                <p className="font-medium">{c.title}</p>
                {c.detail && <p className="mt-0.5 text-sm text-fg/80">{c.detail}</p>}
                {c.dueDate && <p className="mt-0.5 text-xs text-muted">If possible by {formatDate(c.dueDate)}</p>}
                <div className="mt-3">
                  <ActionForm action={completeChecklistAction.bind(null, project.id, c.id)} submitLabel="Mark as done" size="sm" inline>
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`note-${c.id}`} className="sr-only">
                        Note
                      </label>
                      <input id={`note-${c.id}`} name="note" maxLength={1000} className={`${inputClass} !py-2`} placeholder="How you sent it (optional)" />
                    </div>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {progress.blocked.map((m) => (
        <Notice key={m.id} tone="warning" title={`Blocked: ${m.title}`}>
          {m.blockerNote}
        </Notice>
      ))}

      {changeRequests
        .filter((c) => c.status === "estimated")
        .map((c) => (
          <Card key={c.id} className="ring-2 ring-flame">
            <p className="text-sm font-medium text-muted">Estimate for your change</p>
            <p className="mt-1 whitespace-pre-wrap">{c.description}</p>
            <p className="mt-2 font-semibold">
              {formatMoney(c.estimateAmount ?? 0, project.currency)} + GST · about {c.estimateWeeks} week{c.estimateWeeks === 1 ? "" : "s"}
            </p>
            {c.estimateNote && <p className="mt-1 text-sm text-muted">{c.estimateNote}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionForm action={decideChangeAction.bind(null, project.id, c.id, true)} submitLabel="Accept and add to project" variant="primary" />
              <ActionForm action={decideChangeAction.bind(null, project.id, c.id, false)} submitLabel="No thanks" variant="ghost" />
            </div>
          </Card>
        ))}

      {toRate.map((m) => (
        <Card key={m.id}>
          <p className="text-sm font-medium text-muted">How did we do?</p>
          <h2 className="mt-1 font-semibold">{m.title}</h2>
          <ActionForm action={feedbackAction.bind(null, project.id, m.id)} submitLabel="Send rating" className="mt-3">
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Rating from 1 to 5</legend>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cursor-pointer rounded-full px-3 py-1.5 text-sm ring-1 ring-line has-[:checked]:bg-fg has-[:checked]:text-page">
                  <input type="radio" name="rating" value={n} required className="sr-only" />
                  {"★".repeat(n)}
                </label>
              ))}
            </fieldset>
            <label htmlFor={`fb-${m.id}`} className="sr-only">
              Comment
            </label>
            <textarea id={`fb-${m.id}`} name="comment" rows={2} placeholder="Anything we could do better? (optional)" className={inputClass} />
          </ActionForm>
        </Card>
      ))}

      <Card>
        <CardTitle>Milestones</CardTitle>
        <ol className="space-y-5">
          {milestones.map((m) => {
            const mTasks = tasks.filter((t) => t.milestoneId === m.id);
            return (
              <li key={m.id} className="flex gap-4">
                <span
                  aria-hidden
                  className={`mt-1.5 size-3 shrink-0 rounded-full ${m.status === "done" ? "bg-brand" : m.status === "blocked" ? "bg-danger" : "bg-line"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{m.title}</p>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {m.status === "done" ? `Approved ${formatDate(m.completedAt)}` : `Planned for ${formatDate(m.dueDate)}`}
                  </p>
                  {mTasks.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {mTasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-2">
                          <span aria-hidden>{t.status === "done" ? "✓" : "·"}</span>
                          <span className={t.status === "done" ? "text-muted line-through" : undefined}>{t.title}</span>
                          {t.status !== "done" && t.status !== "todo" && <StatusBadge status={t.status} />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Updates from AMFIRE</CardTitle>
          {updates.length === 0 ? (
            <EmptyState title="No updates yet." />
          ) : (
            <ul className="space-y-4">
              {updates.map((u) => (
                <li key={u.id} className="border-l-2 border-flame pl-4">
                  <p className="text-xs text-muted">{formatDateTime(u.createdAt)}</p>
                  <p className="mt-1 whitespace-pre-wrap">{u.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {sent.length > 0 && (
          <Card>
            <CardTitle>Sent to AMFIRE</CardTitle>
            <ul className="space-y-2 text-sm">
              {sent.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span aria-hidden className="text-success">
                    ✓
                  </span>
                  <span>
                    {c.title}
                    <span className="text-muted"> · {formatDate(c.doneAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card>
          <CardTitle>Ask for a change</CardTitle>
          <p className="-mt-2 mb-3 text-sm text-muted">Describe what you’d like added or changed. We’ll reply with a price and timeline before any work starts.</p>
          <ActionForm action={changeRequestAction.bind(null, project.id)} submitLabel="Send request">
            <label htmlFor="cr-description" className="sr-only">
              The change
            </label>
            <textarea id="cr-description" name="description" rows={3} required minLength={10} className={inputClass} placeholder="Add a monthly sales report by salesperson" />
          </ActionForm>
          {changeRequests.length > 0 && (
            <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              {changeRequests.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3">
                  <span className="line-clamp-2">{c.description}</span>
                  <StatusBadge status={c.status === "submitted" ? "open" : c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>Talk to a person</CardTitle>
          <SupportRequestForm orgId={project.orgId} projectId={project.id} />
          {requests.length > 0 && (
            <ul className="mt-6 space-y-2 border-t border-line pt-4 text-sm">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  <span className="truncate">{r.subject}</span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
