import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, PageHeader, StatusBadge, buttonClass, formatDate, formatDateTime, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { GOALS, URGENCY, labelFor } from "@/knowledge/catalog";
import { sourceLabel } from "@/lib/attribution";
import { requireStaffActor } from "@/lib/session";
import { AgentTag, ScorePill, cleanAiText, engineLabel } from "@/components/hq";
import { latestBrief } from "@/server/agents/team";
import { listInbox, readyToSend } from "@/server/brain";
import { getOverview } from "@/server/hq";
import { runTeamAction } from "./actions";
import { ApprovalCard } from "./approval-card";

export const metadata = { title: "Today" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

export default async function TodayPage() {
  const actor = await requireStaffActor();
  const db = await getDb();
  const [o, latest, inbox, toSend] = await Promise.all([getOverview(db, actor), latestBrief(db), listInbox(db, actor), readyToSend(db, actor)]);
  const brief = latest?.brief;

  const sections: { title: string; hint: string; items: { key: string; href: string; primary: ReactNode; secondary: ReactNode; aside?: ReactNode }[] }[] = [
    {
      title: "New enquiries to review",
      hint: "Read the answers, then qualify or decline.",
      items: o.newLeads.map((l) => ({
        key: l.id,
        href: `/hq/leads/${l.id}`,
        primary: `${l.name} · ${l.company}`,
        secondary: `${sourceLabel(l.source)} · ${labelFor(GOALS, l.goal)} · ${labelFor(URGENCY, l.urgency)} · ${timeAgo(l.createdAt)}`,
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
        primary: `${r.role.replace(/_/g, " ")} (${engineLabel(r.engine)})`,
        secondary: cleanAiText(r.error) ?? "",
      })),
    },
  ];

  const active = sections.filter((s) => s.items.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Good ${greeting()}, ${actor.name.split(" ")[0]}`}
        description="Your AI team checks the business every morning at 8:00. Read the brief, clear the inbox, done."
        actions={<ActionForm action={runTeamAction} submitLabel="Run the team now" pendingLabel="Team is working…" size="sm" />}
      />

      <Card className="ring-2 ring-fg/10">
        {!brief ? (
          <EmptyState title="No brief yet.">Press “Run the team now” and your first brief appears here in a few seconds.</EmptyState>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <AgentTag role="chief_of_staff" /> <span>Brief · {formatDateTime(brief.createdAt)}</span>
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-tight">{brief.headline}</h2>
              {brief.body.narrative && <p className="mt-2 text-fg/80">{brief.body.narrative}</p>}
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {brief.body.sections.map((s) => (
                <div key={s.title}>
                  <h3 className="text-xs font-medium tracking-wide text-muted uppercase">{s.title}</h3>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {s.lines.map((l, i) => (
                      <li key={i}>
                        {l.href ? (
                          <Link href={l.href} className="underline-offset-4 hover:underline">
                            {l.text}
                          </Link>
                        ) : (
                          l.text
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {brief.body.teamActivity.length > 0 && (
              <div className="rounded-xl bg-subtle px-4 py-3 text-sm">
                <p className="font-medium">What the team did</p>
                <ul className="mt-1 space-y-0.5 text-fg/80">
                  {brief.body.teamActivity.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {toSend.length > 0 && (
        <section aria-labelledby="to-send" className="space-y-3">
          <h2 id="to-send" className="text-lg font-semibold">
            Approved — tap to send
          </h2>
          <ul className="divide-y divide-line rounded-card bg-surface ring-1 ring-line">
            {toSend.map(({ approval: a, link }) => (
              <li key={a.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.title}</span>
                  <span className="block truncate text-sm text-muted">{a.finalText ?? a.draft}</span>
                </span>
                <a href={link} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm", "shrink-0")}>
                  {a.channel === "linkedin" ? "Open LinkedIn" : a.channel === "email" ? "Open email" : "Open WhatsApp"} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="inbox" className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="inbox" className="text-lg font-semibold">
            Decision inbox {inbox.length > 0 && <span className="bg-brand ml-1 rounded-full px-2 py-0.5 text-xs font-semibold text-ink">{inbox.length}</span>}
          </h2>
          <span className="text-sm text-muted">Every draft is ready to send. Approve, edit or dismiss.</span>
        </div>
        {inbox.length === 0 ? (
          <EmptyState title="Inbox zero.">When an agent wants something sent or done, it appears here with the draft written.</EmptyState>
        ) : (
          <div className="grid items-start gap-4 xl:grid-cols-2">
            {inbox.map((a) => (
              <ApprovalCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      <h2 className="text-lg font-semibold">
        Needs your attention{" "}
        {o.awaitingClient.length > 0 && (
          <span className="text-sm font-normal text-muted">
            · {o.awaitingClient.length} proposal{o.awaitingClient.length === 1 ? " is" : "s are"} with clients awaiting a decision
          </span>
        )}
      </h2>

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
