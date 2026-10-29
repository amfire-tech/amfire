import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  changeRequests,
  checklistItems,
  invoices,
  leads,
  milestoneFeedback,
  milestones,
  organizations,
  projectUpdates,
  projects,
  proposals,
  subscriptions,
  supportRequests,
  tasks,
  type Milestone,
} from "@/db/schema";
import { AccessDenied, assertClientOrg, assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { afterResponse, notifyClient } from "./client-notify";
import { createMilestoneInvoice, recordPastPayment } from "./money";

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
  }).then(async (m) => {
    if (m.status === "awaiting_approval") {
      const [project] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, m.projectId));
      await afterResponse(() =>
        notifyClient(db, m.orgId, {
          subject: `Ready for your review: ${m.title}`,
          lines: [`“${m.title}” on ${project?.name ?? "your project"} is ready for your review.`, "Please take a look and approve it, or tell us what to change, in your Client Hub."],
          path: `/hub/projects/${m.projectId}`,
          action: "Review it here",
        }),
      );
    }
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
  const update = await db.transaction(async (tx) => {
    const [u] = await tx.insert(projectUpdates).values({ projectId, orgId: project.orgId, authorId: actor.userId, body: clean }).returning();
    await audit(tx, { actorId: actor.userId, orgId: project.orgId, action: "project.update_posted", subjectType: "project", subjectId: projectId });
    return u;
  });
  await afterResponse(() =>
    notifyClient(db, project.orgId, {
      subject: `Update on ${project.name}`,
      lines: [clean],
      path: `/hub/projects/${projectId}`,
      action: "See your project",
    }),
  );
  return update;
}

export async function resolveSupportRequest(db: DB, actor: Actor | null, requestId: string) {
  assertStaff(actor);
  await db.update(supportRequests).set({ status: "resolved", resolvedAt: new Date() }).where(eq(supportRequests.id, requestId));
}

export async function getProjectForStaff(db: DB, actor: Actor | null, projectId: string) {
  assertStaff(actor);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return null;
  const [ms, ts, ups, reqs, crs, items] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(asc(milestones.position)),
    db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.createdAt)),
    db.select().from(projectUpdates).where(eq(projectUpdates.projectId, projectId)).orderBy(desc(projectUpdates.createdAt)),
    db.select().from(supportRequests).where(eq(supportRequests.projectId, projectId)).orderBy(desc(supportRequests.createdAt)),
    db.select().from(changeRequests).where(eq(changeRequests.projectId, projectId)).orderBy(desc(changeRequests.createdAt)),
    db.select().from(checklistItems).where(eq(checklistItems.projectId, projectId)).orderBy(asc(checklistItems.createdAt)),
  ]);
  return { project, milestones: ms, tasks: ts, updates: ups, requests: reqs, changeRequests: crs, checklist: items };
}

export const MilestoneInput = z.object({
  title: z.string().trim().min(3, "Give the milestone a short title.").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || "")
    .optional(),
  dueDate: z.union([z.literal("").transform(() => null), z.coerce.date()]).optional(),
  /** Major units (₹ or $); invoiced when the client approves the milestone. */
  amount: z.union([z.literal("").transform(() => 0), z.coerce.number().min(0)]).optional(),
});

export async function addMilestone(db: DB, actor: Actor | null, projectId: string, input: z.input<typeof MilestoneInput>) {
  assertStaff(actor);
  const data = MilestoneInput.parse(input);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new ProjectError("Project not found");
  return db.transaction(async (tx) => {
    const [{ last }] = await tx.select({ last: max(milestones.position) }).from(milestones).where(eq(milestones.projectId, projectId));
    const [m] = await tx
      .insert(milestones)
      .values({
        projectId,
        orgId: project.orgId,
        position: (last ?? -1) + 1,
        title: data.title,
        description: data.description ?? "",
        dueDate: data.dueDate ?? null,
        amount: Math.round((data.amount ?? 0) * 100),
      })
      .returning();
    if (project.status === "completed") await tx.update(projects).set({ status: "active" }).where(eq(projects.id, projectId));
    await audit(tx, { actorId: actor.userId, orgId: project.orgId, action: "milestone.added", subjectType: "milestone", subjectId: m.id });
    return m;
  });
}

/** First goal for each service, so a project added by hand reads like a booking. */
const GOAL_FOR_PATH = { build: "customer-portal", automate: "reduce-manual-work", operate: "keep-running" } as const;

export const OutsideProjectInput = z
  .object({
    orgId: z.union([z.literal("").transform(() => undefined), z.uuid()]).optional(),
    clientName: z
      .string()
      .trim()
      .max(160)
      .transform((v) => v || undefined)
      .optional(),
    contactName: z.string().trim().min(1, "Add the client contact's name.").max(120),
    contactEmail: z
      .union([z.literal(""), z.email("Enter a valid email, or leave it empty.").trim().toLowerCase()])
      .transform((v) => v || null)
      .optional(),
    contactPhone: z
      .string()
      .trim()
      .max(20)
      .transform((v) => v.replace(/[\s-]/g, "") || null)
      .optional(),
    source: z.enum(["linkedin", "referral", "whatsapp", "call", "email", "instagram", "facebook", "event", "google", "direct", "other"]).default("referral"),
    businessType: z.string().trim().max(120).default("Something else"),
    name: z.string().trim().min(3, "Give the project a name.").max(200),
    description: z.string().trim().max(2000).default(""),
    path: z.enum(["build", "operate", "automate"]),
    status: z.enum(["active", "completed"]),
    startedAt: z.coerce.date({ error: "Choose the start date." }),
    endedAt: z.union([z.literal("").transform(() => undefined), z.coerce.date()]).optional(),
    amount: z.union([z.literal("").transform(() => undefined), z.coerce.number().positive()]).optional(),
    currency: z.enum(["INR", "USD"]).default("INR"),
    paidInFull: z.boolean().default(false),
  })
  .refine((d) => d.orgId || d.clientName, { message: "Choose a client or type a new client's name.", path: ["clientName"] })
  .refine((d) => d.status !== "completed" || d.endedAt, { message: "Add the end date for a completed project.", path: ["endedAt"] })
  .refine((d) => !d.endedAt || d.endedAt >= d.startedAt, { message: "The end date is before the start date.", path: ["endedAt"] });

/**
 * A project that didn't start from a proposal in HQ — a past project, or work
 * agreed outside — with its client, contact and (optionally) the money received.
 */
export async function addOutsideProject(db: DB, actor: Actor | null, input: z.input<typeof OutsideProjectInput>) {
  assertStaff(actor);
  const d = OutsideProjectInput.parse(input);
  return db.transaction(async (tx) => {
    let orgId = d.orgId;
    if (!orgId) {
      const [org] = await tx.insert(organizations).values({ name: d.clientName!, kind: "client" }).returning();
      orgId = org.id;
    }
    const [org] = await tx.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org || org.kind !== "client") throw new ProjectError("Client not found");

    // The contact is kept as a won lead, which is where agents look for whom to message.
    const [existingLead] = await tx.select().from(leads).where(eq(leads.clientOrgId, orgId)).limit(1);
    if (!existingLead) {
      await tx.insert(leads).values({
        publicRef: randomBytes(12).toString("base64url"),
        status: "won",
        name: d.contactName,
        email: d.contactEmail ?? null,
        phone: d.contactPhone ?? null,
        company: org.name,
        goal: GOAL_FOR_PATH[d.path],
        businessType: d.businessType,
        urgency: "month",
        problem: d.description || d.name,
        currency: d.currency,
        source: d.source,
        sourceNote: "Added in HQ with an existing project",
        reviewedAt: d.startedAt,
        clientOrgId: orgId,
        createdAt: d.startedAt,
      });
    }

    const [project] = await tx
      .insert(projects)
      .values({ orgId, name: d.name, status: d.status, currency: d.currency, startedAt: d.startedAt, createdAt: d.startedAt })
      .returning();
    const minor = d.amount ? Math.round(d.amount * 100) : 0;
    if (d.status === "completed") {
      await tx.insert(milestones).values({
        projectId: project.id,
        orgId,
        position: 0,
        title: "Delivered",
        description: d.description,
        dueDate: d.endedAt!,
        status: "done",
        amount: minor,
        completedAt: d.endedAt!,
      });
    }
    if (d.paidInFull && minor > 0) {
      await recordPastPayment(tx, {
        orgId,
        projectId: project.id,
        title: `${d.name} — paid in full`,
        amount: minor,
        currency: d.currency,
        paidAt: d.endedAt ?? d.startedAt,
        recordedBy: actor.userId,
      });
    }
    await audit(tx, { actorId: actor.userId, orgId, action: "project.added", subjectType: "project", subjectId: project.id, data: { status: d.status } });
    return project;
  });
}

// --- Client Hub (always scoped to the actor's organisations) -------------------

export async function getClientHome(db: DB, actor: Actor | null) {
  if (!actor || actor.clientOrgIds.length === 0) return { projects: [], proposals: [], invoices: [], needed: [] };
  const orgIds = actor.clientOrgIds;
  const [ps, props, ms, invs, needed] = await Promise.all([
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
    db
      .select()
      .from(checklistItems)
      .where(and(inArray(checklistItems.orgId, orgIds), eq(checklistItems.status, "open")))
      .orderBy(asc(checklistItems.createdAt)),
  ]);
  return {
    needed,
    invoices: invs,
    proposals: props,
    projects: ps.map((p) => ({ ...p, progress: projectProgress(ms.filter((m) => m.projectId === p.id)) })),
  };
}

export async function getClientProject(db: DB, actor: Actor | null, projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || !actor?.clientOrgIds.includes(project.orgId)) return null;
  const [ms, ts, ups, reqs, crs, fb, items] = await Promise.all([
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
    db.select().from(checklistItems).where(eq(checklistItems.projectId, projectId)).orderBy(asc(checklistItems.createdAt)),
  ]);
  return {
    checklist: items,
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
      .set({ status: "done", approvedBy: actor.userId, completedAt: new Date(), blockerNote: null, clientFeedback: null })
      .where(and(eq(milestones.id, milestoneId), eq(milestones.status, "awaiting_approval")))
      .returning();
    if (!approved) throw new ProjectError("This milestone is not waiting for your approval.");

    const remaining = await tx
      .select({ id: milestones.id })
      .from(milestones)
      .where(and(eq(milestones.projectId, m.projectId), inArray(milestones.status, ["not_started", "in_progress", "awaiting_approval", "blocked"])));
    // A project on a monthly plan stays open: next month's work is added as new milestones.
    const [plan] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(and(eq(subscriptions.projectId, m.projectId), eq(subscriptions.status, "active")))
      .limit(1);
    if (remaining.length === 0 && !plan) {
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
