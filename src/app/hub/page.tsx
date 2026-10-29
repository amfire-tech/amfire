import Link from "next/link";
import { ButtonLink, Card, EmptyState, Notice, PageHeader, ProgressBar, StatusBadge, formatDate } from "@/components/ui";
import { contact } from "@/config/site";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { requireClientActor } from "@/lib/session";
import { getClientActivity, getClientOverview, getClientTodo } from "@/server/portal";
import { ActivityList } from "./activity-list";
import { Concierge } from "./concierge";

export const metadata = { title: "Home" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function HubHome() {
  const actor = await requireClientActor("/hub");

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

  const db = await getDb();
  const [overview, todo, activity] = await Promise.all([getClientOverview(db, actor), getClientTodo(db, actor), getClientActivity(db, actor, 5)]);
  const firstThings = [
    ...todo.approvals.map((a) => ({ key: a.milestone.id, label: `Review “${a.milestone.title}”`, sub: a.projectName })),
    ...todo.needed.map((n) => ({ key: n.item.id, label: `Send us: ${n.item.title}`, sub: n.projectName })),
    ...todo.proposals.map((p) => ({ key: p.proposal.id, label: `Decide on your proposal`, sub: p.proposal.title })),
    ...todo.estimates.map((e) => ({ key: e.change.id, label: "Decide on a change price", sub: e.projectName })),
    ...todo.invoices.map((i) => ({ key: i.invoice.id, label: `Pay ${i.invoice.number} · ${formatMoney(i.invoice.total, i.invoice.currency)}`, sub: i.overdue ? "Overdue" : `Due ${formatDate(i.invoice.dueAt)}` })),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={overview?.orgName}
        title={`${greeting()}, ${actor.name.split(" ")[0]}`}
        description={todo.count ? `${todo.count} thing${todo.count === 1 ? " needs" : "s need"} you. Everything else is in hand.` : "Nothing needs you right now. We'll email you when something does."}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Concierge orgId={actor.clientOrgIds[0]} />

        <Card className={todo.count ? "ring-2 ring-flame" : undefined}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">Needs you</h2>
            {todo.count > 0 && (
              <Link href="/hub/todo" className="text-sm font-medium underline underline-offset-4">
                See all {todo.count}
              </Link>
            )}
          </div>
          {firstThings.length === 0 ? (
            <p className="mt-3 text-sm text-muted">All caught up.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {firstThings.slice(0, 4).map((t) => (
                <li key={t.key}>
                  <Link href="/hub/todo" className="block rounded-xl bg-subtle px-3 py-2.5 hover:ring-1 hover:ring-line">
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-muted">{t.sub}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="projects" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="projects" className="text-lg font-semibold">
            Your projects
          </h2>
          <Link href="/hub/projects" className="text-sm text-muted underline-offset-4 hover:underline">
            All projects
          </Link>
        </div>
        {!overview || overview.projects.length === 0 ? (
          <EmptyState title="No projects yet.">A project starts as soon as you accept a proposal.</EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {overview.projects.slice(0, 4).map(({ project: p, progress }) => (
              <Link key={p.id} href={`/hub/projects/${p.id}`} className="group rounded-card bg-surface p-5 ring-1 ring-line hover:ring-fg/30">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold group-hover:underline">{p.name}</p>
                  <StatusBadge status={progress.blocked.length ? "blocked" : p.status} />
                </div>
                <div className="mt-4">
                  <ProgressBar value={progress.percent} label={`${p.name} progress`} />
                </div>
                <p className="mt-2 text-sm text-muted">
                  {progress.done} of {progress.total} milestones done
                  {progress.current ? ` · Now: ${progress.current.title}` : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent" className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recent" className="text-lg font-semibold">
            Recent activity
          </h2>
          <Link href="/hub/activity" className="text-sm text-muted underline-offset-4 hover:underline">
            Everything
          </Link>
        </div>
        <ActivityList items={activity} />
      </section>

      {todo.proposals.length > 0 && (
        <Notice title="A proposal is waiting for your decision">
          <ButtonLink href={`/hub/proposals/${todo.proposals[0].proposal.id}`} size="sm" className="mt-2">
            Review proposal
          </ButtonLink>
        </Notice>
      )}
    </div>
  );
}
