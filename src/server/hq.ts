// Read models for AMFIRE HQ. The overview surfaces exceptions and decisions,
// not routine activity.

import { and, asc, desc, eq, inArray, isNull, lt, ne } from "drizzle-orm";
import type { DB } from "@/db";
import {
  agentRuns,
  auditEvents,
  leads,
  milestones,
  organizations,
  projects,
  proposals,
  recommendations,
  supportRequests,
  users,
} from "@/db/schema";
import { assertStaff, type Actor } from "./access";
import { projectProgress } from "./projects";

export async function getOverview(db: DB, actor: Actor | null) {
  assertStaff(actor);
  const now = new Date();
  const [newLeads, recsToReview, drafts, awaitingClient, changesRequested, blocked, overdue, openRequests, failedRuns] =
    await Promise.all([
      db.select().from(leads).where(isNull(leads.reviewedAt)).orderBy(desc(leads.qualificationScore)),
      db
        .select({ rec: recommendations, lead: leads })
        .from(recommendations)
        .innerJoin(leads, eq(leads.id, recommendations.leadId))
        .where(and(eq(recommendations.status, "proposed"), eq(leads.status, "qualified")))
        .orderBy(desc(recommendations.createdAt)),
      db.select().from(proposals).where(eq(proposals.status, "draft")).orderBy(desc(proposals.updatedAt)),
      db.select().from(proposals).where(eq(proposals.status, "sent")).orderBy(asc(proposals.sentAt)),
      db
        .select({ proposal: proposals })
        .from(proposals)
        .innerJoin(leads, eq(leads.id, proposals.leadId))
        .where(and(eq(proposals.status, "declined"), ne(leads.status, "won"), ne(leads.status, "lost"))),
      db
        .select({ milestone: milestones, project: projects })
        .from(milestones)
        .innerJoin(projects, eq(projects.id, milestones.projectId))
        .where(eq(milestones.status, "blocked")),
      db
        .select({ milestone: milestones, project: projects })
        .from(milestones)
        .innerJoin(projects, eq(projects.id, milestones.projectId))
        .where(and(lt(milestones.dueDate, now), inArray(milestones.status, ["not_started", "in_progress", "blocked"]))),
      db
        .select({ request: supportRequests, org: organizations })
        .from(supportRequests)
        .innerJoin(organizations, eq(organizations.id, supportRequests.orgId))
        .where(eq(supportRequests.status, "open"))
        .orderBy(asc(supportRequests.createdAt)),
      db.select().from(agentRuns).where(eq(agentRuns.status, "failed")).orderBy(desc(agentRuns.startedAt)).limit(5),
    ]);

  return { newLeads, recsToReview, drafts, awaitingClient, changesRequested, blocked, overdue, openRequests, failedRuns };
}

export async function listLeads(db: DB, actor: Actor | null) {
  assertStaff(actor);
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getProposalForStaff(db: DB, actor: Actor | null, proposalId: string) {
  assertStaff(actor);
  const [row] = await db
    .select({ proposal: proposals, lead: leads })
    .from(proposals)
    .innerJoin(leads, eq(leads.id, proposals.leadId))
    .where(eq(proposals.id, proposalId));
  return row ?? null;
}

export async function listProjects(db: DB, actor: Actor | null) {
  assertStaff(actor);
  const [ps, ms] = await Promise.all([
    db
      .select({ project: projects, org: organizations })
      .from(projects)
      .innerJoin(organizations, eq(organizations.id, projects.orgId))
      .orderBy(desc(projects.createdAt)),
    db.select().from(milestones),
  ]);
  return ps.map(({ project, org }) => ({
    project,
    org,
    progress: projectProgress(ms.filter((m) => m.projectId === project.id)),
  }));
}

export async function listAgentRuns(db: DB, actor: Actor | null) {
  assertStaff(actor);
  return db.select().from(agentRuns).orderBy(desc(agentRuns.startedAt)).limit(100);
}

export async function listAuditEvents(db: DB, actor: Actor | null) {
  assertStaff(actor);
  return db
    .select({ event: auditEvents, actorName: users.name })
    .from(auditEvents)
    .leftJoin(users, eq(users.id, auditEvents.actorId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(100);
}
