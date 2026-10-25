import { and, asc, desc, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  changeRequests,
  invoices,
  milestoneFeedback,
  milestones,
  projectUpdates,
  projects,
  proposals,
  supportRequests,
  tasks,
  type Milestone,
} from "@/db/schema";
import { AccessDenied, assertClientOrg, assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { createMilestoneInvoice } from "./money";

export class ProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectError";
  }
}

// --- Progress: derived only from real milestone records ----------------------

export function projectProgress<M extends Pick<Milestone, "status" | "title" | "blockerNote" | "position">>(ms: M[]) {
  const ordered = [...ms].sort((a, b) => a.position - b.position);
  const done = ordered.filter((m) => m.status === "done").length;
  return {
    done,
    total: ordered.length,
    percent: ordered.length ? Math.round((done / ordered.length) * 100) : 0,
    current: ordered.find((m) => m.status !== "done") ?? null,
    blocked: ordered.filter((m) => m.status === "blocked"),
    awaitingApproval: ordered.filter((m) => m.status === "awaiting_approval"),
  };
}

// --- Staff (HQ) ---------------------------------------------------------------

export const MilestoneUpdate = z
  .object({
    status: z.enum(["not_started", "in_progress", "awaiting_approval", "blocked"]),
    blockerNote: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.status !== "blocked" || (v.blockerNote && v.blockerNote.length >= 5), {
    message: "Explain the blocker in plain language so the client knows what is needed.",
    path: ["blockerNote"],
  });

/**
 * Staff move milestones forward. "done" is deliberately not allowed here:
 * a milestone is only complete when the client approves it in the Hub.
 */
export async function updateMilestone(db: DB, actor: Actor | null, milestoneId: string, input: z.infer<typeof MilestoneUpdate>) {
  assertStaff(actor);
  const data = MilestoneUpdate.parse(input);
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(milestones).where(eq(milestones.id, milestoneId));
    if (!current) throw new ProjectError("Milestone not found");
    if (current.status === "done") throw new ProjectError("This milestone has been approved by the client and is closed.");
    const [m] = await tx
      .update(milestones)
      .set({
        status: data.status,
        blockerNote: data.status === "blocked" ? data.blockerNote! : null,
        readyAt: data.status === "awaiting_approval" ? (current.status === "awaiting_approval" ? current.readyAt : new Date()) : null,
      })
      .where(eq(milestones.id, milestoneId))
      .returning();
    await audit(tx, {
      actorId: actor.userId,
      orgId: m.orgId,
      action: "milestone.status_changed",
      subjectType: "milestone",
      subjectId: m.id,
      data: { from: current.status, to: m.status, blockerNote: m.blockerNote },
    });
    return m;
  });
}

export async function addTask(db: DB, actor: Actor | null, milestoneId: string, title: string, clientVisible: boolean) {
  assertStaff(actor);
  const clean = z.string().trim().min(2).max(300).parse(title);
  const [m] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
  if (!m) throw new ProjectError("Milestone not found");
  const [task] = await db
    .insert(tasks)
    .values({ projectId: m.projectId, milestoneId, orgId: m.orgId, title: clean, clientVisible })
    .returning();
  return task;
}

export async function setTaskStatus(db: DB, actor: Actor | null, taskId: string, status: "todo" | "doing" | "blocked" | "done") {
  assertStaff(actor);
  const [task] = await db.update(tasks).set({ status }).where(eq(tasks.id, taskId)).returning();
  if (!task) throw new ProjectError("Task not found");
  return task;
}

export async function postProjectUpdate(db: DB, actor: Actor | null, projectId: string, body: string) {
  assertStaff(actor);
  const clean = z.string().trim().min(3).max(4000).parse(body);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new ProjectError("Project not found");
  return db.transaction(async (tx) => {
    const [u] = await tx.insert(projectUpdates).values({ projectId, orgId: project.orgId, authorId: actor.userId, body: clean }).returning();
    await audit(tx, { actorId: actor.userId, orgId: project.orgId, action: "project.update_posted", subjectType: "project", subjectId: projectId });
    return u;
  });
}

export async function resolveSupportRequest(db: DB, actor: Actor | null, requestId: string) {
  assertStaff(actor);
  await db.update(supportRequests).set({ status: "resolved", resolvedAt: new Date() }).where(eq(supportRequests.id, requestId));
}

export async function getProjectForStaff(db: DB, actor: Actor | null, projectId: string) {
  assertStaff(actor);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return null;
  const [ms, ts, ups, reqs, crs] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.position)),
    db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.createdAt)),
    db.select().from(projectUpdates).where(eq(projectUpdates.projectId, projectId)).orderBy(desc(projectUpdates.createdAt)),
    db.select().from(supportRequests).where(eq(supportRequests.projectId, projectId)).orderBy(desc(supportRequests.createdAt)),
    db.select().from(changeRequests).where(eq(changeRequests.projectId, projectId)).orderBy(desc(changeRequests.createdAt)),
  ]);
  return { project, milestones: ms, tasks: ts, updates: ups, requests: reqs, changeRequests: crs };
}

// --- Client Hub (always scoped to the actor's organisations) -------------------

export async function getClientHome(db: DB, actor: Actor | null) {
  if (!actor || actor.clientOrgIds.length === 0) return { projects: [], proposals: [], invoices: [] };
  const orgIds = actor.clientOrgIds;
  const [ps, props, ms, invs] = await Promise.all([
    db.select().from(projects).where(inArray(projects.orgId, orgIds)).orderBy(desc(projects.createdAt)),
    db
      .select()
      .from(proposals)
      .where(and(inArray(proposals.clientOrgId, orgIds), inArray(proposals.status, ["sent", "accepted", "declined"])))
      .orderBy(desc(proposals.sentAt)),
    db.select().from(milestones).where(inArray(milestones.orgId, orgIds)),
    // Drafts are internal until the owner sends them.
    db
      .select()
      .from(invoices)
      .where(and(inArray(invoices.orgId, orgIds), inArray(invoices.status, ["sent", "paid"])))
      .orderBy(desc(invoices.issuedAt)),
  ]);
  return {
    invoices: invs,
    proposals: props,
    projects: ps.map((p) => ({ ...p, progress: projectProgress(ms.filter((m) => m.projectId === p.id)) })),
  };
}

export async function getClientProject(db: DB, actor: Actor | null, projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || !actor?.clientOrgIds.includes(project.orgId)) return null;
  const [ms, ts, ups, reqs, crs, fb] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.position)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.projectId, projectId), eq(tasks.clientVisible, true)))
      .orderBy(asc(tasks.createdAt)),
    db.select().from(projectUpdates).where(eq(projectUpdates.projectId, projectId)).orderBy(desc(projectUpdates.createdAt)),
    db.select().from(supportRequests).where(eq(supportRequests.projectId, projectId)).orderBy(desc(supportRequests.createdAt)),
    db.select().from(changeRequests).where(eq(changeRequests.projectId, projectId)).orderBy(desc(changeRequests.createdAt)),
    db.select().from(milestoneFeedback).where(eq(milestoneFeedback.projectId, projectId)),
  ]);
  return {
    project,
    milestones: ms,
    tasks: ts,
    updates: ups,
    requests: reqs,
    changeRequests: crs,
    feedback: fb,
    progress: projectProgress(ms),
  };
}

export async function clientApproveMilestone(db: DB, actor: Actor | null, milestoneId: string) {
  const [m] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
  if (!m) throw new ProjectError("Milestone not found");
  assertClientOrg(actor, m.orgId);
  return db.transaction(async (tx) => {
    const [approved] = await tx
      .update(milestones)
      .set({ status: "done", approvedBy: actor.userId, completedAt: new Date(), blockerNote: null })
      .where(and(eq(milestones.id, milestoneId), eq(milestones.status, "awaiting_approval")))
      .returning();
    if (!approved) throw new ProjectError("This milestone is not waiting for your approval.");

    const remaining = await tx
      .select({ id: milestones.id })
      .from(milestones)
      .where(and(eq(milestones.projectId, m.projectId), inArray(milestones.status, ["not_started", "in_progress", "awaiting_approval", "blocked"])));
    if (remaining.length === 0) {
      await tx.update(projects).set({ status: "completed" }).where(eq(projects.id, m.projectId));
    }
    // "It will then be invoiced as agreed": a draft for the owner to send.
    await createMilestoneInvoice(tx, m.id);
    await audit(tx, { actorId: actor.userId, orgId: m.orgId, action: "milestone.approved_by_client", subjectType: "milestone", subjectId: m.id });
    return approved;
  });
}

export const SupportRequestInput = z.object({
  subject: z.string().trim().min(3, "Add a short subject.").max(200),
  body: z.string().trim().min(5, "Tell us a bit more.").max(4000),
});

export async function createSupportRequest(
  db: DB,
  actor: Actor | null,
  orgId: string,
  projectId: string | null,
  input: z.infer<typeof SupportRequestInput>,
) {
  assertClientOrg(actor, orgId);
  const data = SupportRequestInput.parse(input);
  if (projectId) {
    const [p] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!p || p.orgId !== orgId) throw new AccessDenied();
  }
  return db.transaction(async (tx) => {
    const [r] = await tx.insert(supportRequests).values({ orgId, projectId, authorId: actor.userId, ...data }).returning();
    await audit(tx, { actorId: actor.userId, orgId, action: "support.requested", subjectType: "support_request", subjectId: r.id });
    return r;
  });
}
