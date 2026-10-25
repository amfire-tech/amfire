import Link from "next/link";
import { ButtonLink, Card, EmptyState, InvoiceBadge, Notice, PageHeader, ProgressBar, StatusBadge, formatDate } from "@/components/ui";
import { contact } from "@/config/site";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { requireActor } from "@/lib/session";
import { isOverdue } from "@/server/money";
import { getClientHome } from "@/server/projects";
import { proposalTotal } from "@/server/proposals";
import { Concierge } from "./concierge";

export const metadata = { title: "Home" };

export default async function HubHome() {
  const actor = await requireActor("/hub");
  const { projects, proposals, invoices, needed } = await getClientHome(await getDb(), actor);

  if (actor.clientOrgIds.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Hello, ${actor.name.split(" ")[0]}`} />
        {actor.internalRole ? (
          <Notice title="You're signed in as AMFIRE staff">
            The Client Hub is for clients. <Link href="/hq" className="font-medium underline">Go to AMFIRE HQ</Link>.
          </Notice>
        ) : (
          <EmptyState title="Nothing here yet.">
            Your proposals and projects will appear here. Questions?{" "}
            <a href={contact.whatsapp()} target="_blank" rel="noopener noreferrer" className="underline">
              WhatsApp
            </a>
            ,{" "}
            <a href={contact.call} className="underline">
              call
            </a>{" "}
            or{" "}
            <a href={contact.email} className="underline">
              email us
            </a>
            .
          </EmptyState>
        )}
      </div>
    );
  }

  const awaiting = proposals.filter((p) => p.status === "sent");
  const approvals = projects.flatMap((p) => p.progress.awaitingApproval.map((m) => ({ project: p, milestone: m })));
  const unpaid = invoices.filter((i) => i.status === "sent");
  const decisions = awaiting.length + approvals.length + unpaid.length + needed.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hello, ${actor.name.split(" ")[0]}`}
        description={decisions ? `${decisions} thing${decisions === 1 ? " is" : "s are"} waiting for you.` : "You're all caught up."}
      />

      <Concierge orgId={actor.clientOrgIds[0]} />

      {decisions > 0 && (
        <section aria-labelledby="decisions" className="space-y-3">
          <h2 id="decisions" className="text-lg font-semibold">
            Waiting for your decision
          </h2>
          {awaiting.map((p) => (
            <Card key={p.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">Proposal · {formatMoney(proposalTotal(p), p.currency)}</p>
                <p className="font-semibold">{p.title}</p>
              </div>
              <ButtonLink href={`/hub/proposals/${p.id}`}>Review proposal</ButtonLink>
            </Card>
          ))}
          {approvals.map(({ project, milestone }) => (
            <Card key={milestone.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">Milestone ready for approval · {project.name}</p>
                <p className="font-semibold">{milestone.title}</p>
              </div>
              <ButtonLink href={`/hub/projects/${project.id}`}>Review and approve</ButtonLink>
            </Card>
          ))}
          {needed.map((c) => (
            <Card key={c.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">
                  We need from you · {projects.find((p) => p.id === c.projectId)?.name ?? "your project"}
                </p>
                <p className="font-semibold">{c.title}</p>
              </div>
              <ButtonLink href={`/hub/projects/${c.projectId}`}>Send and mark done</ButtonLink>
            </Card>
          ))}
          {unpaid.map((i) => (
            <Card key={i.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-muted">
                  Invoice {i.number} · {isOverdue(i) ? "overdue" : `due ${formatDate(i.dueAt)}`}
                </p>
                <p className="font-semibold">
                  {i.title} · {formatMoney(i.total, i.currency)}
                </p>
              </div>
              <ButtonLink href={`/hub/invoices/${i.id}`}>View and pay</ButtonLink>
            </Card>
          ))}
        </section>
      )}

      <section aria-labelledby="projects" className="space-y-3">
        <h2 id="projects" className="text-lg font-semibold">
          Projects
        </h2>
        {projects.length === 0 ? (
          <EmptyState title="No projects yet.">A project starts as soon as you accept a proposal.</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/hub/projects/${p.id}`} className="group rounded-card bg-surface p-6 ring-1 ring-line hover:ring-fg/30">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold group-hover:underline">{p.name}</p>
                  <StatusBadge status={p.progress.blocked.length ? "blocked" : p.status} />
                </div>
                <div className="mt-4">
                  <ProgressBar value={p.progress.percent} label={`${p.name} progress`} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {p.progress.done} of {p.progress.total} milestones complete
                  {p.progress.current ? ` · Now: ${p.progress.current.title}` : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {invoices.length > 0 && (
        <section aria-labelledby="invoices" className="space-y-3">
          <h2 id="invoices" className="text-lg font-semibold">
            Invoices
          </h2>
          <ul className="divide-y divide-line rounded-card bg-surface ring-1 ring-line">
            {invoices.map((i) => (
              <li key={i.id}>
                <Link href={`/hub/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-subtle/60">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {i.number} · {i.title}
                    </span>
                    <span className="text-sm text-muted">{formatMoney(i.total, i.currency)}</span>
                  </span>
                  <InvoiceBadge status={i.status} overdue={isOverdue(i)} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {proposals.some((p) => p.status !== "sent") && (
        <section aria-labelledby="history" className="space-y-3">
          <h2 id="history" className="text-lg font-semibold">
            Past proposals
          </h2>
          <ul className="divide-y divide-line rounded-card bg-surface ring-1 ring-line">
            {proposals
              .filter((p) => p.status !== "sent")
              .map((p) => (
                <li key={p.id}>
                  <Link href={`/hub/proposals/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-subtle/60">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.title}</span>
                      <span className="text-sm text-muted">Decided {formatDate(p.decidedAt)}</span>
                    </span>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
