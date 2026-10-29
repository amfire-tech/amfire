import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/action-form";
import { ButtonLink, Card, EmptyState, InvoiceBadge, PageHeader, formatDate, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { requireClientActor } from "@/lib/session";
import { getClientTodo } from "@/server/portal";
import { completeChecklistAction, decideChangeAction } from "../actions";
import { ApproveMilestoneButton } from "../projects/[id]/client-forms";

export const metadata = { title: "To-do" };

function Group({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default async function TodoPage() {
  const actor = await requireClientActor("/hub/todo");
  const t = await getClientTodo(await getDb(), actor);

  return (
    <div className="space-y-8">
      <PageHeader
        title="To-do"
        description={t.count ? `${t.count} thing${t.count === 1 ? "" : "s"} waiting on you. Each one keeps your project moving.` : "You're all caught up."}
      />
      {t.count === 0 && <EmptyState title="Nothing needs you right now.">We’ll email you as soon as something does.</EmptyState>}

      {t.approvals.length > 0 && (
        <Group title="Review and approve" hint="Finished work waiting for your OK. Not quite right? Open it and request changes.">
          {t.approvals.map(({ milestone: m, projectName }) => (
            <Card key={m.id} className="space-y-3">
              <div>
                <p className="text-xs text-muted">{projectName}</p>
                <p className="font-semibold">{m.title}</p>
                {m.description && <p className="mt-1 text-sm text-fg/80">{m.description}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ApproveMilestoneButton projectId={m.projectId} milestoneId={m.id} title={m.title} />
                <Link href={`/hub/projects/${m.projectId}`} className="text-sm underline underline-offset-4">
                  Review or request changes
                </Link>
              </div>
            </Card>
          ))}
        </Group>
      )}

      {t.needed.length > 0 && (
        <Group title="What we need from you" hint="Please don’t paste passwords here — tell us and we’ll share a safe way.">
          {t.needed.map(({ item: c, projectName }) => (
            <Card key={c.id} className="space-y-3">
              <div>
                <p className="text-xs text-muted">
                  {projectName}
                  {c.dueDate && ` · by ${formatDate(c.dueDate)}`}
                </p>
                <p className="font-semibold">{c.title}</p>
                {c.detail && <p className="mt-1 text-sm text-fg/80">{c.detail}</p>}
              </div>
              <ActionForm action={completeChecklistAction.bind(null, c.projectId, c.id)} submitLabel="Mark as done" size="sm" inline>
                <div className="min-w-0 flex-1">
                  <label htmlFor={`todo-note-${c.id}`} className="sr-only">
                    Note
                  </label>
                  <input id={`todo-note-${c.id}`} name="note" maxLength={1000} className={`${inputClass} !py-2`} placeholder="How you sent it (optional)" />
                </div>
              </ActionForm>
            </Card>
          ))}
        </Group>
      )}

      {t.proposals.length > 0 && (
        <Group title="Proposals to decide" hint="Scope, milestones, price and timeline. Nothing starts until you accept.">
          {t.proposals.map(({ proposal: p, total }) => (
            <Card key={p.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-sm text-muted">{formatMoney(total, p.currency)}</p>
              </div>
              <ButtonLink href={`/hub/proposals/${p.id}`}>Review proposal</ButtonLink>
            </Card>
          ))}
        </Group>
      )}

      {t.estimates.length > 0 && (
        <Group title="Change prices to decide" hint="Accepting adds the change to your project as a new milestone.">
          {t.estimates.map(({ change: c, projectName, currency }) => (
            <Card key={c.id} className="space-y-3">
              <div>
                <p className="text-xs text-muted">{projectName}</p>
                <p className="whitespace-pre-wrap">{c.description}</p>
                <p className="mt-1 font-semibold">
                  {formatMoney(c.estimateAmount ?? 0, currency)} + GST · about {c.estimateWeeks} week{c.estimateWeeks === 1 ? "" : "s"}
                </p>
                {c.estimateNote && <p className="text-sm text-muted">{c.estimateNote}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionForm action={decideChangeAction.bind(null, c.projectId, c.id, true)} submitLabel="Accept" variant="primary" size="sm" />
                <ActionForm action={decideChangeAction.bind(null, c.projectId, c.id, false)} submitLabel="No thanks" variant="ghost" size="sm" />
              </div>
            </Card>
          ))}
        </Group>
      )}

      {t.invoices.length > 0 && (
        <Group title="Invoices to pay" hint="Pay by UPI from the invoice page, or download it as a PDF.">
          {t.invoices.map(({ invoice: i, overdue }) => (
            <Card key={i.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs text-muted">
                  {i.number} <InvoiceBadge status={i.status} overdue={overdue} />
                </p>
                <p className="font-semibold">{formatMoney(i.total, i.currency)}</p>
                <p className="text-sm text-muted">
                  {i.title} · due {formatDate(i.dueAt)}
                </p>
              </div>
              <ButtonLink href={`/hub/invoices/${i.id}`}>View and pay</ButtonLink>
            </Card>
          ))}
        </Group>
      )}
    </div>
  );
}
