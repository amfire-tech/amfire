import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/forms";
import {
  Card,
  CardTitle,
  EmptyState,
  Field,
  Notice,
  PageHeader,
  ProgressBar,
  StatusBadge,
  formatDate,
  formatDateTime,
  inputClass,
} from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { isUuid } from "@/lib/ids";
import { requireStaffActor } from "@/lib/session";
import { getProjectEconomics } from "@/server/crm";
import { getProjectForStaff, projectProgress } from "@/server/projects";
import { addMilestoneAction, addTaskAction, estimateChangeAction, logTimeAction, resolveRequestAction, setTaskStatusAction } from "../../actions";
import { InvoiceList } from "../../money/invoice-list";
import { MilestoneForm } from "./milestone-form";
import { UpdateForm } from "./update-form";

const TASK_STATUSES = [
  { value: "todo", label: "To do" },
  { value: "doing", label: "Doing" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export const metadata = { title: "Project" };

export default async function HqProjectPage({ params }: PageProps<"/hq/projects/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const actor = await requireStaffActor();
  const db = await getDb();
  const data = await getProjectForStaff(db, actor, id);
  if (!data) notFound();
  const { project, milestones, tasks, updates, requests, changeRequests } = data;
  const econ = await getProjectEconomics(db, actor, id);
  const progress = projectProgress(milestones);
  const path = `/hq/projects/${project.id}`;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/projects" className="hover:underline">
            ← Projects
          </Link>
        }
        title={project.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <span>
              {progress.done} of {progress.total} milestones approved by the client ·{" "}
              <Link href={`/hq/clients/${project.orgId}`} className="underline underline-offset-4">
                client account
              </Link>
            </span>
          </span>
        }
      />
      <ProgressBar value={progress.percent} label="Project progress" />

      {requests.some((r) => r.status === "open") && (
        <Card>
          <CardTitle>Open client requests</CardTitle>
          <ul className="space-y-3">
            {requests
              .filter((r) => r.status === "open")
              .map((r) => (
                <li key={r.id} className="rounded-xl bg-subtle p-4">
                  <p className="font-medium">{r.subject}</p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{r.body}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">{formatDateTime(r.createdAt)}</span>
                    <form action={resolveRequestAction.bind(null, path, r.id)}>
                      <SubmitButton variant="secondary" size="sm">
                        Mark resolved
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle>Milestones</CardTitle>
        <Notice>Milestones are completed only when the client approves them in their Hub. Set “Ready for client approval” when the work is done.</Notice>
        <ol className="mt-5 space-y-4">
          {milestones.map((m) => {
            const mTasks = tasks.filter((t) => t.milestoneId === m.id);
            return (
              <li key={m.id} className="rounded-xl p-4 ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {m.position + 1}. {m.title}
                    </p>
                    <p className="text-sm text-muted">
                      Due {formatDate(m.dueDate)} · {formatMoney(m.amount, project.currency)}
                    </p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                {m.status === "done" ? (
                  <p className="mt-2 text-sm text-muted">
                    {m.approvedBy ? "Approved by the client" : "Completed"} {formatDate(m.completedAt)}.
                  </p>
                ) : (
                  <MilestoneForm projectId={project.id} milestoneId={m.id} status={m.status} blockerNote={m.blockerNote} />
                )}

                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">Tasks</p>
                  {mTasks.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {mTasks.map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className={t.status === "done" ? "text-muted line-through" : undefined}>
                            {t.title}
                            {!t.clientVisible && <span className="ml-2 rounded bg-subtle px-1.5 py-0.5 text-xs text-muted">internal</span>}
                          </span>
                          <form action={setTaskStatusAction.bind(null, project.id, t.id)} className="flex items-center gap-2">
                            <label className="sr-only" htmlFor={`task-${t.id}`}>
                              Status for {t.title}
                            </label>
                            <select id={`task-${t.id}`} name="status" defaultValue={t.status} className={`${inputClass} !w-32 !py-1.5 text-sm`}>
                              {TASK_STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <SubmitButton variant="ghost" size="sm">
                              Set
                            </SubmitButton>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.status !== "done" && (
                    <form action={addTaskAction.bind(null, project.id, m.id)} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="sr-only" htmlFor={`new-task-${m.id}`}>
                        New task
                      </label>
                      <input id={`new-task-${m.id}`} name="title" placeholder="Add a task" required minLength={2} className={`${inputClass} !py-2`} />
                      <label className="flex items-center gap-2 text-sm whitespace-nowrap text-muted">
                        <input type="checkbox" name="internal" className="accent-signal" /> Internal only
                      </label>
                      <SubmitButton variant="secondary" size="sm">
                        Add
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <details className="mt-5 border-t border-line pt-4 text-sm">
          <summary className="cursor-pointer font-medium">Add a milestone</summary>
          <div className="mt-3">
            <ActionForm action={addMilestoneAction.bind(null, project.id)} submitLabel="Add milestone">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <Field label="Title" htmlFor="ms-title">
                    <input id="ms-title" name="title" required className={inputClass} placeholder="Admin dashboard" />
                  </Field>
                </div>
                <Field label="Planned for" htmlFor="ms-due" optional>
                  <input id="ms-due" name="dueDate" type="date" className={inputClass} />
                </Field>
                <Field label={`Amount (${project.currency})`} htmlFor="ms-amount" hint="Invoiced when the client approves it">
                  <input id="ms-amount" name="amount" type="number" min={0} step="any" className={inputClass} />
                </Field>
              </div>
              <Field label="What the client gets" htmlFor="ms-desc" optional>
                <textarea id="ms-desc" name="description" rows={2} className={inputClass} />
              </Field>
            </ActionForm>
          </div>
        </details>
      </Card>

      <Card>
        <CardTitle>Updates</CardTitle>
        <UpdateForm projectId={project.id} />
        {updates.length === 0 ? (
          <div className="mt-5">
            <EmptyState title="No updates yet." />
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {updates.map((u) => (
              <li key={u.id} className="border-l-2 border-flame pl-4">
                <p className="text-xs text-muted">{formatDateTime(u.createdAt)}</p>
                <p className="mt-1 whitespace-pre-wrap">{u.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {changeRequests.length > 0 && (
        <Card>
          <CardTitle>Change requests</CardTitle>
          <ul className="space-y-4">
            {changeRequests.map((c) => (
              <li key={c.id} className="rounded-xl p-4 ring-1 ring-line">
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap">{c.description}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 text-xs text-muted">Asked {formatDateTime(c.createdAt)}</p>
                {c.status === "submitted" ? (
                  <div className="mt-3 border-t border-line pt-3">
                    <ActionForm action={estimateChangeAction.bind(null, c.id)} submitLabel="Send estimate to client" inline>
                      <Field label={`Price (${project.currency}, before GST)`} htmlFor={`cr-amount-${c.id}`}>
                        <input id={`cr-amount-${c.id}`} name="amount" type="number" min={0} required className={`${inputClass} sm:!w-36`} />
                      </Field>
                      <Field label="Weeks" htmlFor={`cr-weeks-${c.id}`}>
                        <input id={`cr-weeks-${c.id}`} name="weeks" type="number" min={1} max={52} required defaultValue={1} className={`${inputClass} sm:!w-24`} />
                      </Field>
                      <Field label="Note for the client" htmlFor={`cr-note-${c.id}`} optional>
                        <input id={`cr-note-${c.id}`} name="note" className={`${inputClass} sm:!w-72`} />
                      </Field>
                    </ActionForm>
                  </div>
                ) : (
                  c.estimateAmount != null && (
                    <p className="mt-2 text-sm">
                      Estimate: {formatMoney(c.estimateAmount, project.currency)} · {c.estimateWeeks} week{c.estimateWeeks === 1 ? "" : "s"}
                      {c.estimateNote && <span className="text-muted"> · {c.estimateNote}</span>}
                    </p>
                  )
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Time and earnings</CardTitle>
          <dl className="mb-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted">Hours</dt>
              <dd className="text-lg font-semibold">{econ.hours}</dd>
            </div>
            <div>
              <dt className="text-muted">Collected</dt>
              <dd className="text-lg font-semibold">{formatMoney(econ.collected, project.currency)}</dd>
            </div>
            <div>
              <dt className="text-muted">Per hour</dt>
              <dd className="text-lg font-semibold">{econ.effectiveRate == null ? "—" : formatMoney(econ.effectiveRate, project.currency)}</dd>
            </div>
          </dl>
          <ActionForm action={logTimeAction.bind(null, project.id)} submitLabel="Log time" inline>
            <Field label="Hours" htmlFor="time-hours">
              <input id="time-hours" name="hours" type="number" step="0.25" min={0.25} max={24} required className={`${inputClass} sm:!w-24`} />
            </Field>
            <Field label="On what" htmlFor="time-note" optional>
              <input id="time-note" name="note" className={`${inputClass} sm:!w-56`} />
            </Field>
          </ActionForm>
          {econ.time.length > 0 && (
            <ul className="mt-4 space-y-1 text-sm text-muted">
              {econ.time.slice(0, 5).map((t) => (
                <li key={t.id}>
                  {Math.round(t.minutes / 6) / 10} h · {formatDate(t.workedOn)}
                  {t.note && ` · ${t.note}`}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle>Invoices</CardTitle>
          <InvoiceList rows={econ.invoices.map((invoice) => ({ invoice, orgName: "" }))} hideClient />
        </Card>
      </div>
    </div>
  );
}
