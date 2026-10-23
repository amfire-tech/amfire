import Link from "next/link";
import type { ReactNode } from "react";
import { Card, EmptyState, PageHeader, StatusBadge, formatDate, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { GOALS, URGENCY, labelFor } from "@/knowledge/catalog";
import { requireStaffActor } from "@/lib/session";
import { ScorePill } from "@/components/hq";
import { getOverview } from "@/server/hq";

export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  const actor = await requireStaffActor();
  const o = await getOverview(await getDb(), actor);

  const sections: { title: string; hint: string; items: { key: string; href: string; primary: ReactNode; secondary: ReactNode; aside?: ReactNode }[] }[] = [
    {
      title: "New enquiries to review",
      hint: "Read the answers, then qualify or decline.",
      items: o.newLeads.map((l) => ({
        key: l.id,
        href: `/hq/leads/${l.id}`,
        primary: `${l.name} · ${l.company}`,
        secondary: `${labelFor(GOALS, l.goal)} · ${labelFor(URGENCY, l.urgency)} · ${timeAgo(l.createdAt)}`,
        aside: <ScorePill score={l.qualificationScore} />,
      })),
    },
    {
      title: "Recommendations to review",
      hint: "Proposed by the Solution Architect for qualified leads. Accept by drafting a proposal.",
      items: o.recsToReview.map(({ rec, lead }) => ({
        key: rec.id,
        href: `/hq/leads/${lead.id}`,
        primary: rec.headline,
        secondary: `${lead.company} · ${rec.path} · ${rec.size}`,
      })),
    },
    {
      title: "Proposal drafts to finish",
      hint: "Edit, check pricing and approve.",
      items: o.drafts.map((p) => ({
        key: p.id,
        href: `/hq/proposals/${p.id}`,
        primary: p.title,
        secondary: `Last edited ${timeAgo(p.updatedAt)}`,
      })),
    },
    {
      title: "Clients asked for changes",
      hint: "Read their note and create a revised proposal.",
      items: o.changesRequested.map(({ proposal }) => ({
        key: proposal.id,
        href: `/hq/proposals/${proposal.id}`,
        primary: proposal.title,
        secondary: proposal.clientNote ?? "",
      })),
    },
    {
      title: "Blocked milestones",
      hint: "Clients can see these blockers and their explanation.",
      items: o.blocked.map(({ milestone, project }) => ({
        key: milestone.id,
        href: `/hq/projects/${project.id}`,
        primary: `${project.name} — ${milestone.title}`,
        secondary: milestone.blockerNote ?? "",
      })),
    },
    {
      title: "Overdue milestones",
      hint: "Past their due date and not yet with the client for approval.",
      items: o.overdue.map(({ milestone, project }) => ({
        key: milestone.id,
        href: `/hq/projects/${project.id}`,
        primary: `${project.name} — ${milestone.title}`,
        secondary: `Due ${formatDate(milestone.dueDate)}`,
        aside: <StatusBadge status={milestone.status} />,
      })),
    },
    {
      title: "Open client requests",
      hint: "A person should reply to each of these.",
      items: o.openRequests.map(({ request, org }) => ({
        key: request.id,
        href: request.projectId ? `/hq/projects/${request.projectId}` : "/hq/projects",
        primary: `${org.name}: ${request.subject}`,
        secondary: `${timeAgo(request.createdAt)}`,
      })),
    },
    {
      title: "Failed agent runs",
      hint: "Each failure fell back safely; check whether anything needs a retry.",
      items: o.failedRuns.map((r) => ({
        key: r.id,
        href: r.subjectType === "lead" ? `/hq/leads/${r.subjectId}` : "/hq/agents",
        primary: `${r.role} (${r.engine})`,
        secondary: r.error ?? "",
      })),
    },
  ];

  const active = sections.filter((s) => s.items.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Needs your attention"
        description={
          <>
            Only exceptions and decisions appear here.{" "}
            {o.awaitingClient.length > 0 && (
              <span>
                {o.awaitingClient.length} proposal{o.awaitingClient.length === 1 ? " is" : "s are"} with clients awaiting a decision.
              </span>
            )}
          </>
        }
      />

      {active.length === 0 ? (
        <EmptyState title="Nothing needs a decision right now.">New enquiries, blockers and client requests will appear here.</EmptyState>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {active.map((s) => (
            <Card key={s.title}>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-semibold">{s.title}</h2>
                <span className="bg-brand rounded-full px-2 py-0.5 text-xs font-semibold text-ink">{s.items.length}</span>
              </div>
              <p className="-mt-2 mb-3 text-sm text-muted">{s.hint}</p>
              <ul className="-mx-2 divide-y divide-line">
                {s.items.slice(0, 6).map((item) => (
                  <li key={item.key}>
                    <Link href={item.href} className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-subtle">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.primary}</span>
                        <span className="block truncate text-sm text-muted">{item.secondary}</span>
                      </span>
                      {item.aside}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
