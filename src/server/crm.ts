// Relationships: the pipeline, client accounts, conversations and the dossier
// of facts every agent reads before drafting anything.

import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  changeRequests,
  interactions,
  invoices,
  leads,
  memories,
  milestoneFeedback,
  milestones,
  organizations,
  payments,
  projects,
  projectUpdates,
  proposals,
  subscriptions,
  supportRequests,
  timeEntries,
  type Invoice,
  type Lead,
  type Milestone,
} from "@/db/schema";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { isOverdue, mrr } from "./money";
import { projectProgress } from "./projects";
import { proposalTotal } from "./proposals";

export class CrmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrmError";
  }
}

const DAY = 24 * 60 * 60 * 1000;

// --- Conversations ---------------------------------------------------------------

export const INTERACTION_KINDS = [
  { id: "call", label: "Call" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "email", label: "Email" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "meeting", label: "Meeting" },
  { id: "note", label: "Note" },
] as const;

export const InteractionInput = z.object({
  kind: z.enum(["call", "whatsapp", "email", "linkedin", "meeting", "note"]),
  direction: z.enum(["in", "out"]).optional(),
  summary: z.string().trim().min(3, "Write what was said or agreed.").max(4000),
});

export async function logInteraction(
  db: DB,
  actor: Actor | null,
  target: { leadId?: string; orgId?: string },
  input: z.input<typeof InteractionInput>,
) {
  assertStaff(actor);
  const data = InteractionInput.parse(input);
  if (!target.leadId && !target.orgId) throw new CrmError("Choose a lead or client.");
  let orgId = target.orgId ?? null;
  if (target.leadId && !orgId) {
    const [lead] = await db.select({ clientOrgId: leads.clientOrgId }).from(leads).where(eq(leads.id, target.leadId));
    if (!lead) throw new CrmError("Lead not found.");
    orgId = lead.clientOrgId;
  }
  const [row] = await db
    .insert(interactions)
    .values({
      leadId: target.leadId ?? null,
      orgId,
      kind: data.kind,
      direction: data.kind === "note" ? null : (data.direction ?? "out"),
      summary: data.summary,
      authorId: actor.userId,
    })
    .returning();
  if (target.leadId) await db.update(leads).set({ updatedAt: new Date() }).where(eq(leads.id, target.leadId));
  return row;
}

export const DealInput = z.object({
  dealValue: z.union([z.literal("").transform(() => null), z.coerce.number().nonnegative().transform((v) => Math.round(v * 100))]),
  nextFollowUpAt: z.union([z.literal("").transform(() => null), z.coerce.date()]),
});

/** Staff set what a deal is worth (in major units) and when to follow up. */
export async function updateDeal(db: DB, actor: Actor | null, leadId: string, input: z.input<typeof DealInput>) {
  assertStaff(actor);
  const data = DealInput.parse(input);
  const [lead] = await db
    .update(leads)
    .set({ dealValue: data.dealValue, nextFollowUpAt: data.nextFollowUpAt, updatedAt: new Date() })
    .where(eq(leads.id, leadId))
    .returning();
  if (!lead) throw new CrmError("Lead not found.");
  await audit(db, { actorId: actor.userId, action: "lead.deal_updated", subjectType: "lead", subjectId: leadId, data });
  return lead;
}

export async function setLeadOutcome(db: DB, actor: Actor | null, leadId: string, outcome: "lost") {
  assertStaff(actor);
  const [lead] = await db
    .update(leads)
    .set({ status: outcome, nextAction: null, nextFollowUpAt: null, updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), inArray(leads.status, ["new", "qualified", "proposal_sent"])))
    .returning();
  if (!lead) throw new CrmError("Only open deals can be marked lost.");
  await audit(db, { actorId: actor.userId, action: `lead.${outcome}`, subjectType: "lead", subjectId: leadId });
  return lead;
}

// --- Billing details ---------------------------------------------------------------------

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .optional();

export const BillingInput = z.object({
  billingName: optional(200),
  billingAddress: optional(500),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => v || null)
    .pipe(z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "That doesn't look like a GSTIN (15 characters, e.g. 27ABCDE1234F1Z5).").nullable())
    .optional(),
  state: optional(60),
});

/** What's printed on the client's tax invoices. Applies to invoices sent from now on. */
export async function updateBilling(db: DB, actor: Actor | null, orgId: string, input: z.input<typeof BillingInput>) {
  assertStaff(actor);
  const data = BillingInput.parse(input);
  const [org] = await db.update(organizations).set(data).where(and(eq(organizations.id, orgId), eq(organizations.kind, "client"))).returning();
  if (!org) throw new CrmError("Client not found.");
  await audit(db, { actorId: actor.userId, orgId, action: "org.billing_updated", subjectType: "organization", subjectId: orgId });
  return org;
}

export async function listClientOrgs(db: DB, actor: Actor | null) {
  assertStaff(actor);
  return db.select().from(organizations).where(eq(organizations.kind, "client")).orderBy(organizations.name);
}

// --- Dossier ---------------------------------------------------------------------------

export const FactInput = z.object({ fact: z.string().trim().min(3, "Write the fact in a few words.").max(500) });

export async function addFact(
  db: DB,
  actor: Actor | null,
  subject: { type: "lead" | "organization"; id: string },
  input: z.input<typeof FactInput>,
  supersedes?: string,
) {
  assertStaff(actor);
  const data = FactInput.parse(input);
  return db.transaction(async (tx) => {
    const [m] = await tx
      .insert(memories)
      .values({
        subjectType: subject.type,
        subjectId: subject.id,
        fact: data.fact,
        source: actor.internalRole,
        createdBy: actor.userId,
      })
      .returning();
    if (supersedes) {
      await tx
        .update(memories)
        .set({ supersededBy: m.id })
        .where(and(eq(memories.id, supersedes), eq(memories.subjectType, subject.type), eq(memories.subjectId, subject.id)));
    }
    return m;
  });
}

export async function retireFact(db: DB, actor: Actor | null, memoryId: string) {
  assertStaff(actor);
  // Kept for history; a fact that is no longer true supersedes itself.
  await db.update(memories).set({ supersededBy: memoryId }).where(eq(memories.id, memoryId));
}

/** Current facts (not superseded) for a lead and, if it became a client, its organisation. */
export async function currentFacts(db: Pick<DB, "select">, subjects: { type: "lead" | "organization"; id: string }[]) {
  if (subjects.length === 0) return [];
  return db
    .select()
    .from(memories)
    .where(
      and(
        isNull(memories.supersededBy),
        or(...subjects.map((s) => and(eq(memories.subjectType, s.type), eq(memories.subjectId, s.id)))),
      ),
    )
    .orderBy(desc(memories.createdAt));
}

// --- Pipeline -----------------------------------------------------------------------------

/** Rough likelihood of winning at each stage, for the weighted pipeline. */
export const STAGE_PROBABILITY: Record<string, number> = { new: 0.1, qualified: 0.3, proposal_sent: 0.6, won: 1, lost: 0, disqualified: 0 };
export const PIPELINE_STAGES = ["new", "qualified", "proposal_sent", "won"] as const;

export function dealValueOf(lead: Pick<Lead, "dealValue">, latestProposal?: Parameters<typeof proposalTotal>[0] | null) {
  if (lead.dealValue != null) return lead.dealValue;
  return latestProposal ? proposalTotal(latestProposal) : 0;
}

export async function getPipeline(db: DB, actor: Actor | null) {
  assertStaff(actor);
  const [ls, props] = await Promise.all([
    db.select().from(leads).where(inArray(leads.status, ["new", "qualified", "proposal_sent", "won", "lost"])).orderBy(desc(leads.updatedAt)),
    db.select().from(proposals).orderBy(desc(proposals.createdAt)),
  ]);
  const deals = ls.map((lead) => {
    const latest = props.find((p) => p.leadId === lead.id) ?? null;
    return { lead, value: dealValueOf(lead, latest), currency: latest?.currency ?? lead.currency };
  });
  const open = deals.filter((d) => ["new", "qualified", "proposal_sent"].includes(d.lead.status));
  const closed = deals.filter((d) => d.lead.status === "won" || d.lead.status === "lost");
  const sum = (rows: typeof deals, weight = false) =>
    rows.reduce<Record<string, number>>((acc, d) => {
      acc[d.currency] = (acc[d.currency] ?? 0) + Math.round(d.value * (weight ? STAGE_PROBABILITY[d.lead.status] : 1));
      return acc;
    }, {});
  const won = closed.filter((d) => d.lead.status === "won");
  return {
    stages: PIPELINE_STAGES.map((stage) => {
      const rows = deals.filter((d) => d.lead.status === stage);
      return { stage, deals: rows, total: sum(rows) };
    }),
    lostCount: closed.length - won.length,
    openValue: sum(open),
    weightedValue: sum(open, true),
    winRate: closed.length ? Math.round((won.length / closed.length) * 100) : null,
    followUpsDue: open.filter((d) => d.lead.nextFollowUpAt && d.lead.nextFollowUpAt <= new Date()),
  };
}

// --- Account health ---------------------------------------------------------------------------

export type HealthInput = {
  invoices: Pick<Invoice, "status" | "dueAt">[];
  milestones: Pick<Milestone, "status">[];
  openRequestAges: number[]; // days
  lastContactDays: number | null;
  awaitingApprovalDays: number[]; // days each milestone has waited
  ratings: number[];
  hasActiveWork: boolean;
};

/** A transparent 0–100 score with its reasons, like the lead score. */
export function healthScore(input: HealthInput, now = new Date()) {
  let score = 100;
  const reasons: string[] = [];
  const overdue = input.invoices.filter((i) => isOverdue(i, now)).length;
  if (overdue) {
    score -= 30;
    reasons.push(`${overdue} overdue invoice${overdue > 1 ? "s" : ""} (−30)`);
  }
  if (input.openRequestAges.some((d) => d >= 2)) {
    score -= 20;
    reasons.push("A client request has waited 2+ days (−20)");
  }
  if (input.milestones.some((m) => m.status === "blocked")) {
    score -= 15;
    reasons.push("A milestone is blocked (−15)");
  }
  if (input.awaitingApprovalDays.some((d) => d >= 5)) {
    score -= 15;
    reasons.push("Work has waited 5+ days for the client's approval (−15)");
  }
  if (input.hasActiveWork && (input.lastContactDays == null || input.lastContactDays >= 21)) {
    score -= 10;
    reasons.push("No conversation in 3 weeks (−10)");
  }
  if (input.ratings.length) {
    const avg = input.ratings.reduce((s, r) => s + r, 0) / input.ratings.length;
    if (avg < 3.5) {
      score -= 20;
      reasons.push(`Average rating ${avg.toFixed(1)} of 5 (−20)`);
    }
  }
  score = Math.max(0, score);
  return { score, band: score >= 75 ? "healthy" : score >= 50 ? "watch" : "at risk", reasons } as const;
}

async function accountData(db: DB, orgIds: string[]) {
  if (orgIds.length === 0) {
    return { invs: [], pays: [], ms: [], reqs: [], ints: [], fb: [], subs: [], ps: [], ups: [] };
  }
  const [invs, pays, ms, reqs, ints, fb, subs, ps, ups] = await Promise.all([
    db.select().from(invoices).where(inArray(invoices.orgId, orgIds)).orderBy(desc(invoices.createdAt)),
    db.select().from(payments).where(inArray(payments.orgId, orgIds)),
    db.select().from(milestones).where(inArray(milestones.orgId, orgIds)),
    db.select().from(supportRequests).where(inArray(supportRequests.orgId, orgIds)),
    db.select().from(interactions).where(inArray(interactions.orgId, orgIds)).orderBy(desc(interactions.occurredAt)),
    db.select().from(milestoneFeedback).where(inArray(milestoneFeedback.orgId, orgIds)),
    db.select().from(subscriptions).where(inArray(subscriptions.orgId, orgIds)),
    db.select().from(projects).where(inArray(projects.orgId, orgIds)).orderBy(desc(projects.createdAt)),
    db.select().from(projectUpdates).where(inArray(projectUpdates.orgId, orgIds)).orderBy(desc(projectUpdates.createdAt)),
  ]);
  return { invs, pays, ms, reqs, ints, fb, subs, ps, ups };
}

type AccountData = Awaited<ReturnType<typeof accountData>>;

function summarise(orgId: string, d: AccountData, now: Date) {
  const mine = <T extends { orgId: string | null }>(rows: T[]) => rows.filter((r) => r.orgId === orgId);
  const invs = mine(d.invs);
  const ms = mine(d.ms);
  const ints = mine(d.ints);
  const ups = mine(d.ups);
  const lastContact = [ints[0]?.occurredAt, ups[0]?.createdAt].filter(Boolean).sort((a, b) => +b! - +a!)[0] ?? null;
  const days = (t: Date) => Math.floor((now.getTime() - t.getTime()) / DAY);
  const health = healthScore(
    {
      invoices: invs,
      milestones: ms,
      openRequestAges: mine(d.reqs)
        .filter((r) => r.status === "open")
        .map((r) => days(r.createdAt)),
      lastContactDays: lastContact ? days(lastContact) : null,
      awaitingApprovalDays: ms.filter((m) => m.status === "awaiting_approval" && m.readyAt).map((m) => days(m.readyAt!)),
      ratings: mine(d.fb).map((f) => f.rating),
      hasActiveWork: mine(d.ps).some((p) => p.status === "active") || mine(d.subs).some((s) => s.status === "active"),
    },
    now,
  );
  const revenue = mine(d.pays).reduce<Record<string, number>>((acc, p) => {
    const cur = invs.find((i) => i.id === p.invoiceId)?.currency ?? "INR";
    acc[cur] = (acc[cur] ?? 0) + p.amount;
    return acc;
  }, {});
  const outstanding = invs
    .filter((i) => i.status === "sent")
    .reduce<Record<string, number>>((acc, i) => ((acc[i.currency] = (acc[i.currency] ?? 0) + i.total), acc), {});
  return {
    health,
    revenue,
    outstanding,
    mrr: mrr(mine(d.subs)),
    activeProjects: mine(d.ps).filter((p) => p.status === "active").length,
    completedProjects: mine(d.ps).filter((p) => p.status === "completed").length,
    lastContact,
  };
}

export async function listClients(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const orgs = await db.select().from(organizations).where(eq(organizations.kind, "client")).orderBy(organizations.name);
  const data = await accountData(
    db,
    orgs.map((o) => o.id),
  );
  return orgs.map((org) => ({ org, ...summarise(org.id, data, now) }));
}

export async function getClientAccount(db: DB, actor: Actor | null, orgId: string, now = new Date()) {
  assertStaff(actor);
  const [org] = await db.select().from(organizations).where(and(eq(organizations.id, orgId), eq(organizations.kind, "client")));
  if (!org) return null;
  const data = await accountData(db, [orgId]);
  const [ls, crs, time] = await Promise.all([
    db.select().from(leads).where(eq(leads.clientOrgId, orgId)),
    db.select().from(changeRequests).where(eq(changeRequests.orgId, orgId)).orderBy(desc(changeRequests.createdAt)),
    db.select().from(timeEntries).where(eq(timeEntries.orgId, orgId)),
  ]);
  const facts = await currentFacts(db, [{ type: "organization", id: orgId }, ...ls.map((l) => ({ type: "lead" as const, id: l.id }))]);
  const leadInteractions = ls.length
    ? await db.select().from(interactions).where(inArray(interactions.leadId, ls.map((l) => l.id)))
    : [];
  const allInteractions = [...data.ints, ...leadInteractions.filter((i) => !data.ints.some((x) => x.id === i.id))].sort(
    (a, b) => +b.occurredAt - +a.occurredAt,
  );
  return {
    org,
    ...summarise(orgId, data, now),
    leads: ls,
    projects: data.ps.map((p) => ({ project: p, progress: projectProgress(data.ms.filter((m) => m.projectId === p.id)) })),
    invoices: data.invs,
    subscriptions: data.subs,
    interactions: allInteractions,
    feedback: data.fb,
    changeRequests: crs,
    facts,
    hours: Math.round(time.reduce((s, t) => s + t.minutes, 0) / 6) / 10,
  };
}

/** Lead detail extras: conversations and the dossier. */
export async function getLeadCrm(db: DB, actor: Actor | null, lead: Lead) {
  assertStaff(actor);
  const [ints, facts] = await Promise.all([
    db
      .select()
      .from(interactions)
      .where(lead.clientOrgId ? or(eq(interactions.leadId, lead.id), eq(interactions.orgId, lead.clientOrgId)) : eq(interactions.leadId, lead.id))
      .orderBy(desc(interactions.occurredAt)),
    currentFacts(db, [{ type: "lead", id: lead.id }, ...(lead.clientOrgId ? [{ type: "organization" as const, id: lead.clientOrgId }] : [])]),
  ]);
  return { interactions: ints, facts };
}

/** Hours logged on a project and the effective hourly rate from money collected. */
export async function getProjectEconomics(db: DB, actor: Actor | null, projectId: string) {
  assertStaff(actor);
  const [time, invs] = await Promise.all([
    db.select().from(timeEntries).where(eq(timeEntries.projectId, projectId)).orderBy(desc(timeEntries.workedOn)),
    db.select().from(invoices).where(eq(invoices.projectId, projectId)).orderBy(desc(invoices.createdAt)),
  ]);
  const invoiceIds = invs.map((i) => i.id);
  const pays = invoiceIds.length ? await db.select().from(payments).where(inArray(payments.invoiceId, invoiceIds)) : [];
  const minutes = time.reduce((s, t) => s + t.minutes, 0);
  // Collected before tax: scale each payment by its invoice's subtotal share.
  const collected = pays.reduce((s, p) => {
    const inv = invs.find((i) => i.id === p.invoiceId)!;
    return s + Math.round((p.amount * inv.subtotal) / inv.total);
  }, 0);
  return {
    time,
    invoices: invs,
    hours: Math.round(minutes / 6) / 10,
    collected,
    effectiveRate: minutes > 0 ? Math.round(collected / (minutes / 60)) : null,
  };
}
