import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { HealthPill, Money, StatTile } from "@/components/hq";
import { Card, CardTitle, EmptyState, Field, ProgressBar, StatusBadge, formatDate, inputClass, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { isUuid } from "@/lib/ids";
import { requireStaffActor } from "@/lib/session";
import { getClientAccount } from "@/server/crm";
import { createInvoiceAction, createSubscriptionAction, setSubscriptionStatusAction } from "../../actions";
import { ConversationsCard, DossierCard } from "../../crm-panels";
import { InvoiceList } from "../../money/invoice-list";

export const metadata = { title: "Client" };

export default async function ClientPage({ params }: PageProps<"/hq/clients/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const actor = await requireStaffActor();
  const a = await getClientAccount(await getDb(), actor, id);
  if (!a) notFound();
  const currency = a.projects[0]?.project.currency ?? a.leads[0]?.currency ?? "INR";
  const avgRating = a.feedback.length ? a.feedback.reduce((s, f) => s + f.rating, 0) / a.feedback.length : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/clients" className="hover:underline">
            ← Clients
          </Link>
        }
        title={a.org.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <HealthPill band={a.health.band} score={a.health.score} />
            {a.leads.map((l) => (
              <Link key={l.id} href={`/hq/leads/${l.id}`} className="underline underline-offset-4">
                {l.name}
              </Link>
            ))}
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Paid to date">
          <Money amounts={a.revenue} />
        </StatTile>
        <StatTile label="Outstanding" tone={Object.keys(a.outstanding).length ? "bad" : undefined}>
          <Money amounts={a.outstanding} />
        </StatTile>
        <StatTile label="Monthly plan">
          <Money amounts={a.mrr} empty="None" />
        </StatTile>
        <StatTile label="Rating" hint={`${a.hours} hours logged`}>
          {avgRating == null ? "—" : `${avgRating.toFixed(1)} / 5`}
        </StatTile>
      </div>

      {a.health.reasons.length > 0 && (
        <Card>
          <CardTitle>Why the health score is {a.health.score}</CardTitle>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {a.health.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Projects</CardTitle>
          {a.projects.length === 0 ? (
            <EmptyState title="No projects yet." />
          ) : (
            <ul className="space-y-4">
              {a.projects.map(({ project, progress }) => (
                <li key={project.id}>
                  <Link href={`/hq/projects/${project.id}`} className="flex items-center justify-between gap-3 font-medium hover:underline">
                    {project.name} <StatusBadge status={project.status} />
                  </Link>
                  <div className="mt-2">
                    <ProgressBar value={progress.percent} label={`${project.name} progress`} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {progress.done} of {progress.total} milestones approved
                  </p>
                </li>
              ))}
            </ul>
          )}
          {a.changeRequests.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">Change requests</p>
              <ul className="space-y-2 text-sm">
                {a.changeRequests.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3">
                    <Link href={`/hq/projects/${c.projectId}`} className="line-clamp-2 hover:underline">
                      {c.description}
                    </Link>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Monthly plans</CardTitle>
          {a.subscriptions.length > 0 && (
            <ul className="mb-5 space-y-3">
              {a.subscriptions.map((s) => (
                <li key={s.id} className="rounded-xl bg-subtle p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-sm text-muted">
                        {formatMoney(s.amount, s.currency)} a month · next invoice {formatDate(s.nextInvoiceAt)}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <div className="mt-2 flex gap-2">
                    {s.status === "active" && (
                      <ActionForm action={setSubscriptionStatusAction.bind(null, s.id, "paused")} submitLabel="Pause" size="sm" variant="ghost" />
                    )}
                    {s.status === "paused" && (
                      <ActionForm action={setSubscriptionStatusAction.bind(null, s.id, "active")} submitLabel="Resume" size="sm" variant="ghost" />
                    )}
                    {s.status !== "cancelled" && (
                      <ActionForm action={setSubscriptionStatusAction.bind(null, s.id, "cancelled")} submitLabel="Cancel plan" size="sm" variant="ghost" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Add a monthly plan</summary>
            <div className="mt-3">
              <ActionForm action={createSubscriptionAction.bind(null, { orgId: a.org.id, projectId: a.projects[0]?.project.id })} submitLabel="Add plan">
                <Field label="Plan name" htmlFor="sub-title">
                  <input id="sub-title" name="title" required defaultValue={`${a.org.name} — Operate plan`} className={inputClass} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Monthly amount" htmlFor="sub-amount" hint="Before GST">
                    <input id="sub-amount" name="amount" type="number" min={1} required className={inputClass} />
                  </Field>
                  <Field label="Currency" htmlFor="sub-currency">
                    <select id="sub-currency" name="currency" defaultValue={currency} className={inputClass}>
                      <option value="INR">₹ INR</option>
                      <option value="USD">$ USD</option>
                    </select>
                  </Field>
                  <Field label="First invoice" htmlFor="sub-start">
                    <input id="sub-start" name="startsAt" type="date" className={inputClass} />
                  </Field>
                </div>
              </ActionForm>
            </div>
          </details>
        </Card>
      </div>

      <Card>
        <CardTitle>Invoices</CardTitle>
        <InvoiceList rows={a.invoices.map((invoice) => ({ invoice, orgName: a.org.name }))} hideClient />
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Create a one-off invoice</summary>
          <div className="mt-3">
            <ActionForm action={createInvoiceAction.bind(null, { orgId: a.org.id, currency })} submitLabel="Create draft" inline>
              <Field label="For" htmlFor="inv-title">
                <input id="inv-title" name="title" required className={`${inputClass} sm:!w-72`} placeholder="Extra report design" />
              </Field>
              <Field label={`Amount (${currency}, before GST)`} htmlFor="inv-amount">
                <input id="inv-amount" name="amount" type="number" min={1} required className={`${inputClass} sm:!w-40`} />
              </Field>
            </ActionForm>
          </div>
        </details>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ConversationsCard target={{ orgId: a.org.id, leadId: a.leads[0]?.id }} items={a.interactions} />
        <DossierCard subject={{ type: "organization", id: a.org.id }} facts={a.facts} />
      </div>

      {a.feedback.length > 0 && (
        <Card>
          <CardTitle>Feedback</CardTitle>
          <ul className="space-y-3">
            {a.feedback.map((f) => (
              <li key={f.id}>
                <p className="font-medium">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</p>
                {f.comment && <p className="text-sm">{f.comment}</p>}
                <p className="text-xs text-muted">{formatDate(f.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
