// The Client Hub's views: what's waiting on the client, billing, activity,
// support conversations and their team. Every function is scoped to the
// actor's own client organisations.

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  changeRequests,
  checklistItems,
  invoices,
  memberships,
  milestones,
  organizations,
  payments,
  projects,
  projectUpdates,
  proposals,
  subscriptions,
  supportMessages,
  supportRequests,
  users,
} from "@/db/schema";
import { AccessDenied, assertClientOrg, assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { afterResponse, notifyClient } from "./client-notify";
import { CrmError } from "./crm";
import { isOverdue } from "./money";
import { projectProgress } from "./projects";
import { proposalTotal } from "./proposals";

function orgsOf(actor: Actor | null) {
  return actor?.clientOrgIds ?? [];
}

// --- To-do: everything waiting on the client ----------------------------------------

export async function getClientTodo(db: DB, actor: Actor | null) {
  const orgIds = orgsOf(actor);
  if (orgIds.length === 0) return { approvals: [], needed: [], proposals: [], estimates: [], invoices: [], count: 0 };
  const [ms, ps, items, props, crs, invs] = await Promise.all([
    db.select().from(milestones).where(and(inArray(milestones.orgId, orgIds), eq(milestones.status, "awaiting_approval"))),
    db.select().from(projects).where(inArray(projects.orgId, orgIds)),
    db.select().from(checklistItems).where(and(inArray(checklistItems.orgId, orgIds), eq(checklistItems.status, "open"))).orderBy(asc(checklistItems.createdAt)),
    db.select().from(proposals).where(and(inArray(proposals.clientOrgId, orgIds), eq(proposals.status, "sent"))),
    db.select().from(changeRequests).where(and(inArray(changeRequests.orgId, orgIds), eq(changeRequests.status, "estimated"))),
    db.select().from(invoices).where(and(inArray(invoices.orgId, orgIds), eq(invoices.status, "sent"))).orderBy(asc(invoices.dueAt)),
  ]);
  const projectName = (id: string) => ps.find((p) => p.id === id)?.name ?? "your project";
  const result = {
    approvals: ms.map((m) => ({ milestone: m, projectName: projectName(m.projectId) })),
    needed: items.map((i) => ({ item: i, projectName: projectName(i.projectId) })),
    proposals: props.map((p) => ({ proposal: p, total: proposalTotal(p) })),
    estimates: crs.map((c) => ({ change: c, projectName: projectName(c.projectId), currency: ps.find((p) => p.id === c.projectId)?.currency ?? "INR" })),
    invoices: invs.map((i) => ({ invoice: i, overdue: isOverdue(i) })),
  };
  return { ...result, count: ms.length + items.length + props.length + crs.length + invs.length };
}

// --- Billing -------------------------------------------------------------------------

export async function getClientBilling(db: DB, actor: Actor | null) {
  const orgIds = orgsOf(actor);
  if (orgIds.length === 0) return { invoices: [], subscriptions: [], paid: {}, outstanding: {} };
  const [invs, subs, pays] = await Promise.all([
    db.select().from(invoices).where(and(inArray(invoices.orgId, orgIds), inArray(invoices.status, ["sent", "paid"]))).orderBy(desc(invoices.issuedAt)),
    db.select().from(subscriptions).where(and(inArray(subscriptions.orgId, orgIds), inArray(subscriptions.status, ["active", "paused"]))),
    db.select().from(payments).where(inArray(payments.orgId, orgIds)),
  ]);
  const add = (acc: Record<string, number>, cur: string, v: number) => ((acc[cur] = (acc[cur] ?? 0) + v), acc);
  const paid = pays.reduce<Record<string, number>>((acc, p) => add(acc, invs.find((i) => i.id === p.invoiceId)?.currency ?? "INR", p.amount), {});
  const outstanding = invs.filter((i) => i.status === "sent").reduce<Record<string, number>>((acc, i) => add(acc, i.currency, i.total), {});
  return { invoices: invs.map((i) => ({ invoice: i, overdue: isOverdue(i) })), subscriptions: subs, paid, outstanding };
}

// --- Activity: one timeline of everything that happened ----------------------------------

export type ActivityItem = { at: Date; kind: "update" | "milestone" | "invoice" | "payment" | "proposal" | "change" | "item"; title: string; detail?: string; href?: string };

export async function getClientActivity(db: DB, actor: Actor | null, limit = 60): Promise<ActivityItem[]> {
  const orgIds = orgsOf(actor);
  if (orgIds.length === 0) return [];
  const [ps, ups, ms, invs, pays, props, crs, items] = await Promise.all([
    db.select().from(projects).where(inArray(projects.orgId, orgIds)),
    db.select().from(projectUpdates).where(inArray(projectUpdates.orgId, orgIds)).orderBy(desc(projectUpdates.createdAt)).limit(limit),
    db.select().from(milestones).where(inArray(milestones.orgId, orgIds)),
    db.select().from(invoices).where(and(inArray(invoices.orgId, orgIds), inArray(invoices.status, ["sent", "paid"]))),
    db.select().from(payments).where(inArray(payments.orgId, orgIds)),
    db.select().from(proposals).where(and(inArray(proposals.clientOrgId, orgIds), inArray(proposals.status, ["sent", "accepted", "declined"]))),
    db.select().from(changeRequests).where(inArray(changeRequests.orgId, orgIds)),
    db.select().from(checklistItems).where(inArray(checklistItems.orgId, orgIds)),
  ]);
  const name = (id: string | null) => ps.find((p) => p.id === id)?.name ?? "your project";
  const events: ActivityItem[] = [
    ...ups.map((u) => ({ at: u.createdAt, kind: "update" as const, title: `Update on ${name(u.projectId)}`, detail: u.body, href: `/hub/projects/${u.projectId}` })),
    ...ms.filter((m) => m.completedAt).map((m) => ({ at: m.completedAt!, kind: "milestone" as const, title: `Milestone completed: ${m.title}`, detail: name(m.projectId), href: `/hub/projects/${m.projectId}` })),
    ...ms.filter((m) => m.readyAt).map((m) => ({ at: m.readyAt!, kind: "milestone" as const, title: `Ready for your review: ${m.title}`, detail: name(m.projectId), href: `/hub/projects/${m.projectId}` })),
    ...invs.filter((i) => i.issuedAt).map((i) => ({ at: i.issuedAt!, kind: "invoice" as const, title: `Invoice ${i.number}${i.isRecord ? " (record)" : ""}`, detail: i.title, href: `/hub/invoices/${i.id}` })),
    ...pays.map((p) => {
      const inv = invs.find((i) => i.id === p.invoiceId);
      return { at: p.receivedAt, kind: "payment" as const, title: `Payment received${inv ? ` for ${inv.number}` : ""}`, href: inv ? `/hub/invoices/${inv.id}` : undefined };
    }),
    ...props.filter((p) => p.sentAt).map((p) => ({ at: p.sentAt!, kind: "proposal" as const, title: `Proposal: ${p.title}`, href: `/hub/proposals/${p.id}` })),
    ...props.filter((p) => p.decidedAt).map((p) => ({ at: p.decidedAt!, kind: "proposal" as const, title: p.status === "accepted" ? `You accepted “${p.title}”` : `You asked for changes to “${p.title}”`, href: `/hub/proposals/${p.id}` })),
    ...crs.map((c) => ({ at: c.estimatedAt ?? c.createdAt, kind: "change" as const, title: c.estimatedAt ? "Your change request was priced" : "You asked for a change", detail: c.description, href: `/hub/projects/${c.projectId}` })),
    ...items.map((i) => ({ at: i.doneAt ?? i.createdAt, kind: "item" as const, title: i.doneAt ? `You sent: ${i.title}` : `We asked for: ${i.title}`, href: `/hub/projects/${i.projectId}` })),
  ];
  return events.sort((a, b) => +b.at - +a.at).slice(0, limit);
}

// --- Home ----------------------------------------------------------------------------

export async function getClientOverview(db: DB, actor: Actor | null) {
  const orgIds = orgsOf(actor);
  if (orgIds.length === 0) return null;
  const [ps, ms, orgs] = await Promise.all([
    db.select().from(projects).where(inArray(projects.orgId, orgIds)).orderBy(desc(projects.startedAt)),
    db.select().from(milestones).where(inArray(milestones.orgId, orgIds)),
    db.select().from(organizations).where(inArray(organizations.id, orgIds)),
  ]);
  return {
    orgName: orgs[0]?.name ?? "",
    projects: ps.map((p) => ({ project: p, progress: projectProgress(ms.filter((m) => m.projectId === p.id)) })),
  };
}

// --- Support conversations ----------------------------------------------------------------

export async function listClientRequests(db: DB, actor: Actor | null) {
  const orgIds = orgsOf(actor);
  if (orgIds.length === 0) return [];
  const [reqs, ps] = await Promise.all([
    db.select().from(supportRequests).where(inArray(supportRequests.orgId, orgIds)).orderBy(desc(supportRequests.createdAt)),
    db.select({ id: projects.id, name: projects.name }).from(projects).where(inArray(projects.orgId, orgIds)),
  ]);
  const msgs = reqs.length
    ? await db.select().from(supportMessages).where(inArray(supportMessages.requestId, reqs.map((r) => r.id))).orderBy(asc(supportMessages.createdAt))
    : [];
  return reqs.map((r) => ({ request: r, projectName: ps.find((p) => p.id === r.projectId)?.name ?? null, messages: msgs.filter((m) => m.requestId === r.id) }));
}

/** Every request for staff, open first, with its conversation. */
export async function listRequestsForStaff(db: DB, actor: Actor | null) {
  assertStaff(actor);
  const reqs = await db
    .select({ request: supportRequests, orgName: organizations.name, projectName: projects.name })
    .from(supportRequests)
    .innerJoin(organizations, eq(organizations.id, supportRequests.orgId))
    .leftJoin(projects, eq(projects.id, supportRequests.projectId))
    .orderBy(desc(supportRequests.createdAt))
    .limit(200);
  const msgs = reqs.length
    ? await db.select().from(supportMessages).where(inArray(supportMessages.requestId, reqs.map((r) => r.request.id))).orderBy(asc(supportMessages.createdAt))
    : [];
  return reqs
    .map((r) => ({ ...r, messages: msgs.filter((m) => m.requestId === r.request.id) }))
    .sort((a, b) => (a.request.status === b.request.status ? 0 : a.request.status === "open" ? -1 : 1));
}

export const MessageInput = z.object({ body: z.string().trim().min(2, "Write a message.").max(4000) });

/**
 * A reply on a support request, from the client or from AMFIRE. A staff reply
 * emails the client; a client reply reopens a resolved request.
 */
export async function replyToRequest(db: DB, actor: Actor | null, requestId: string, input: z.input<typeof MessageInput>, opts: { resolve?: boolean } = {}) {
  const data = MessageInput.parse(input);
  const [req] = await db.select().from(supportRequests).where(eq(supportRequests.id, requestId));
  if (!req) throw new AccessDenied();
  const fromStaff = !!actor?.internalRole;
  if (!fromStaff) assertClientOrg(actor, req.orgId);
  const msg = await db.transaction(async (tx) => {
    const [m] = await tx.insert(supportMessages).values({ requestId, orgId: req.orgId, authorId: actor!.userId, fromStaff, body: data.body }).returning();
    const status = fromStaff ? (opts.resolve ? "resolved" : req.status) : "open";
    await tx
      .update(supportRequests)
      .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
      .where(eq(supportRequests.id, requestId));
    await audit(tx, { actorId: actor!.userId, orgId: req.orgId, action: fromStaff ? "support.replied" : "support.client_replied", subjectType: "support_request", subjectId: requestId });
    return m;
  });
  if (fromStaff) {
    await afterResponse(() =>
      notifyClient(db, req.orgId, {
        subject: `Re: ${req.subject}`,
        lines: [data.body],
        path: "/hub/support",
        action: "See the conversation",
      }),
    );
  }
  return msg;
}

// --- Team ----------------------------------------------------------------------------------

async function roleIn(db: Pick<DB, "select">, actor: Actor, orgId: string) {
  const [m] = await db.select({ role: memberships.role }).from(memberships).where(and(eq(memberships.userId, actor.userId), eq(memberships.orgId, orgId)));
  return m?.role ?? null;
}

export async function getTeam(db: DB, actor: Actor | null, orgId: string) {
  assertClientOrg(actor, orgId);
  const [members, myRole] = await Promise.all([
    db
      .select({ userId: users.id, name: users.name, email: users.email, role: memberships.role, since: memberships.createdAt })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.orgId, orgId), inArray(memberships.role, ["client_admin", "client_member"])))
      .orderBy(asc(memberships.createdAt)),
    roleIn(db, actor, orgId),
  ]);
  return { members, canManage: myRole === "client_admin" };
}

export const InviteInput = z.object({
  name: z.string().trim().min(1, "Add their name.").max(120),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(200),
  role: z.enum(["client_admin", "client_member"]).default("client_member"),
});

/** A client admin adds a colleague, who can then sign in to the Hub with their own email. */
export async function inviteTeammate(db: DB, actor: Actor | null, orgId: string, input: z.input<typeof InviteInput>) {
  assertClientOrg(actor, orgId);
  if ((await roleIn(db, actor, orgId)) !== "client_admin") throw new AccessDenied("Only your account's admins can invite people.");
  const data = InviteInput.parse(input);
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(users).where(eq(users.email, data.email));
    const user = existing ?? (await tx.insert(users).values({ email: data.email, name: data.name }).returning())[0];
    const [already] = await tx.select().from(memberships).where(and(eq(memberships.userId, user.id), eq(memberships.orgId, orgId)));
    if (already) throw new CrmError("They're already on your team.");
    await tx.insert(memberships).values({ userId: user.id, orgId, role: data.role });
    await audit(tx, { actorId: actor.userId, orgId, action: "team.invited", subjectType: "user", subjectId: user.id, data: { role: data.role } });
    return user;
  });
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId));
  await afterResponse(async () => {
    const { emailConfigured, sendEmail } = await import("./notify");
    const { site } = await import("@/config/site");
    if (!emailConfigured()) return;
    await sendEmail({
      to: data.email,
      subject: `${actor.name} added you to ${org?.name ?? "their"} Client Hub at amfire`,
      text: `Hi ${data.name.split(" ")[0]},\n\n${actor.name} added you to ${org?.name ?? "their"} Client Hub, where you can follow projects, approvals and invoices with amfire.\n\nTo sign in, open ${site.url}/login, enter this email address and choose "Email link": we'll email you a one-time sign-in link.\n\n— amfire`,
    }).catch(() => {});
  });
  return result;
}

export async function removeTeammate(db: DB, actor: Actor | null, orgId: string, userId: string) {
  assertClientOrg(actor, orgId);
  if ((await roleIn(db, actor, orgId)) !== "client_admin") throw new AccessDenied("Only your account's admins can remove people.");
  if (userId === actor.userId) throw new CrmError("You can't remove yourself.");
  await db.delete(memberships).where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  await audit(db, { actorId: actor.userId, orgId, action: "team.removed", subjectType: "user", subjectId: userId });
}
