// The Friday email to each client: what got done this week, what's next, and
// anything waiting on them. Built from their records (no AI), so every date
// and amount is exact. Sent at most once a week per client.

import { and, desc, eq, gte } from "drizzle-orm";
import type { DB } from "@/db";
import { changeRequests, checklistItems, invoices, milestones, organizations, projects, projectUpdates } from "@/db/schema";
import { formatMoney } from "@/knowledge/pricing";
import { weekKey } from "./agents/team";
import { notifyClient } from "./client-notify";
import { isOverdue } from "./money";
import { projectProgress } from "./projects";

const DAY = 24 * 60 * 60 * 1000;
const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** The digest for one client, or null when there's nothing worth an email. */
export async function composeClientDigest(db: DB, orgId: string, now = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const [ps, ms, items, invs, crs, ups] = await Promise.all([
    db.select().from(projects).where(eq(projects.orgId, orgId)),
    db.select().from(milestones).where(eq(milestones.orgId, orgId)),
    db.select().from(checklistItems).where(and(eq(checklistItems.orgId, orgId), eq(checklistItems.status, "open"))),
    db.select().from(invoices).where(and(eq(invoices.orgId, orgId), eq(invoices.status, "sent"))),
    db.select().from(changeRequests).where(and(eq(changeRequests.orgId, orgId), eq(changeRequests.status, "estimated"))),
    db.select().from(projectUpdates).where(and(eq(projectUpdates.orgId, orgId), gte(projectUpdates.createdAt, weekAgo))).orderBy(desc(projectUpdates.createdAt)),
  ]);

  const sections: string[] = [];
  const active = ps.filter((p) => p.status === "active" || ms.some((m) => m.projectId === p.id && m.completedAt && m.completedAt >= weekAgo));
  for (const p of active) {
    const pm = ms.filter((m) => m.projectId === p.id).sort((a, b) => a.position - b.position);
    const progress = projectProgress(pm);
    const done = pm.filter((m) => m.completedAt && m.completedAt >= weekAgo);
    const next = pm.find((m) => m.status !== "done" && m.id !== progress.current?.id);
    sections.push(
      [
        `${p.name} — ${progress.done} of ${progress.total} milestones done (${progress.percent}%)`,
        done.length ? `• Completed this week: ${done.map((m) => m.title).join(", ")}` : null,
        progress.current ? `• Now working on: ${progress.current.title}${progress.current.dueDate ? ` (planned for ${date(progress.current.dueDate)})` : ""}` : null,
        next ? `• Next: ${next.title}` : null,
        ...ups.filter((u) => u.projectId === p.id).slice(0, 1).map((u) => `• Latest update: ${u.body.length > 240 ? `${u.body.slice(0, 239)}…` : u.body}`),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const waiting = [
    ...ms.filter((m) => m.status === "awaiting_approval").map((m) => `• Review and approve “${m.title}”`),
    ...items.map((it) => `• Send us: ${it.title}${it.dueDate ? ` (by ${date(it.dueDate)})` : ""}`),
    ...crs.map((c) => `• Decide on the price for your change: ${c.description.slice(0, 60)}${c.description.length > 60 ? "…" : ""}`),
    ...invs.map((i) => `• Pay invoice ${i.number} — ${formatMoney(i.total, i.currency)}${isOverdue(i, now) ? " (overdue)" : i.dueAt ? `, due ${date(i.dueAt)}` : ""}`),
  ];

  if (sections.length === 0 && waiting.length === 0) return null;
  const lines = [...sections, ...(waiting.length ? [`Waiting on you:\n${waiting.join("\n")}`] : ["Nothing is waiting on you this week."])];
  const project = active[0] ?? ps[0];
  return {
    subject: waiting.length ? `Your week with AMFIRE — ${waiting.length} thing${waiting.length === 1 ? "" : "s"} waiting on you` : "Your week with AMFIRE",
    lines: [`Here's where things stand this week.`, ...lines],
    path: project ? `/hub/projects/${project.id}` : "/hub",
    action: "Open your Client Hub",
  };
}

/** Sends this week's digest to every client with something to report. Safe to run more than once a week. */
export async function sendClientDigests(db: DB, now = new Date()) {
  // Clients with at least one project; composeClientDigest skips those with nothing to say.
  const withWork = await db
    .select({ orgId: projects.orgId })
    .from(projects)
    .innerJoin(organizations, eq(organizations.id, projects.orgId))
    .where(eq(organizations.kind, "client"));
  const candidates = [...new Set(withWork.map((r) => r.orgId))];
  let sent = 0;
  for (const orgId of candidates) {
    const digest = await composeClientDigest(db, orgId, now);
    if (!digest) continue;
    const r = await notifyClient(db, orgId, digest, { dedupeKey: `digest:${orgId}:${weekKey(now)}` });
    sent += r.sent;
  }
  return { clients: candidates.length, sent };
}
