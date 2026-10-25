import Link from "next/link";
import { Card, EmptyState, PageHeader, ProgressBar, StatusBadge, formatDate } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { requireActor } from "@/lib/session";
import { getClientHome } from "@/server/projects";
import { proposalTotal } from "@/server/proposals";

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const actor = await requireActor("/hub/projects");
  const { projects, proposals } = await getClientHome(await getDb(), actor);

  return (
    <div className="space-y-8">
      <PageHeader title="Projects" description="Every project with its progress, and every proposal we've sent you." />

      {projects.length === 0 ? (
        <EmptyState title="No projects yet.">A project starts as soon as you accept a proposal.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/hub/projects/${p.id}`} className="group rounded-card bg-surface p-5 ring-1 ring-line hover:ring-fg/30">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold group-hover:underline">{p.name}</p>
                <StatusBadge status={p.progress.blocked.length ? "blocked" : p.status} />
              </div>
              <p className="mt-1 text-xs text-muted">Started {formatDate(p.startedAt)}</p>
              <div className="mt-4">
                <ProgressBar value={p.progress.percent} label={`${p.name} progress`} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {p.progress.done} of {p.progress.total} milestones done
                {p.progress.current ? ` · Now: ${p.progress.current.title}` : ""}
              </p>
            </Link>
          ))}
        </div>
      )}

      {proposals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Proposals</h2>
          <Card className="p-0 sm:p-0">
            <ul className="divide-y divide-line">
              {proposals.map((p) => (
                <li key={p.id}>
                  <Link href={`/hub/proposals/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-subtle/60">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.title}</span>
                      <span className="text-sm text-muted">
                        {formatMoney(proposalTotal(p), p.currency)} · {p.status === "sent" ? `sent ${formatDate(p.sentAt)}` : `decided ${formatDate(p.decidedAt)}`}
                      </span>
                    </span>
                    <StatusBadge status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}
