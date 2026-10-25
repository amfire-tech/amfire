// Client Hub extras: change requests, milestone feedback and the project
// concierge. Every client-side function checks the actor's organisation.

import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  agentRuns,
  changeRequests,
  invoices,
  milestoneFeedback,
  milestones,
  projects,
  projectUpdates,
} from "@/db/schema";
import { formatMoney } from "@/knowledge/pricing";
import { AccessDenied, assertClientOrg, assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { CrmError } from "./crm";
import { canUseAi, DATA_RULE, generateJson } from "./agents/llm";
import { isOverdue } from "./money";
import { projectProgress } from "./projects";

const DAY = 24 * 60 * 60 * 1000;

// --- Change requests ----------------------------------------------------------------

export const ChangeRequestInput = z.object({
  description: z.string().trim().min(10, "Describe the change in a sentence or two.").max(4000),
});

export async function createChangeRequest(db: DB, actor: Actor | null, projectId: string, input: z.input<typeof ChangeRequestInput>) {
  const data = ChangeRequestInput.parse(input);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new AccessDenied();
  assertClientOrg(actor, project.orgId);
  const [cr] = await db.insert(changeRequests).values({ orgId: project.orgId, projectId, authorId: actor.userId, description: data.description }).returning();
  await audit(db, { actorId: actor.userId, orgId: project.orgId, action: "change.requested", subjectType: "change_request", subjectId: cr.id });
  return cr;
}

export const EstimateInput = z.object({
  amount: z.coerce.number().min(0, "Enter a price (0 if it's free)."),
  weeks: z.coerce.number().int().min(1).max(52),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || undefined)
    .optional(),
});

/** Staff price a change; `amount` in major units. Pricing is always a person's decision. */
export async function estimateChange(db: DB, actor: Actor | null, changeId: string, input: z.input<typeof EstimateInput>) {
  assertStaff(actor);
  const data = EstimateInput.parse(input);
  const [cr] = await db
    .update(changeRequests)
    .set({
      status: "estimated",
      estimateAmount: Math.round(data.amount * 100),
      estimateWeeks: data.weeks,
      estimateNote: data.note ?? null,
      estimatedBy: actor.userId,
      estimatedAt: new Date(),
    })
    .where(and(eq(changeRequests.id, changeId), eq(changeRequests.status, "submitted")))
    .returning();
  if (!cr) throw new CrmError("This change has already been estimated.");
  await audit(db, { actorId: actor.userId, orgId: cr.orgId, action: "change.estimated", subjectType: "change_request", subjectId: cr.id, data });
  return cr;
}

/** The client accepts (a new milestone is added to the project) or declines an estimate. */
export async function decideChange(db: DB, actor: Actor | null, changeId: string, accept: boolean) {
  const [cr] = await db.select().from(changeRequests).where(eq(changeRequests.id, changeId));
  if (!cr) throw new AccessDenied();
  assertClientOrg(actor, cr.orgId);
  return db.transaction(async (tx) => {
    const now = new Date();
    const [decided] = await tx
      .update(changeRequests)
      .set({ status: accept ? "accepted" : "declined", decidedAt: now })
      .where(and(eq(changeRequests.id, changeId), eq(changeRequests.status, "estimated")))
      .returning();
    if (!decided) throw new CrmError("This estimate is no longer waiting for a decision.");
    if (accept) {
      const [{ last }] = await tx.select({ last: max(milestones.position) }).from(milestones).where(eq(milestones.projectId, cr.projectId));
      const [m] = await tx
        .insert(milestones)
        .values({
          projectId: cr.projectId,
          orgId: cr.orgId,
          position: (last ?? -1) + 1,
          title: `Change: ${cr.description.replace(/\s+/g, " ").slice(0, 60)}${cr.description.length > 60 ? "…" : ""}`,
          description: cr.description,
          amount: cr.estimateAmount ?? 0,
          dueDate: new Date(now.getTime() + (cr.estimateWeeks ?? 1) * 7 * DAY),
        })
        .returning();
      await tx.update(changeRequests).set({ milestoneId: m.id }).where(eq(changeRequests.id, cr.id));
      // A completed project with new work is active again.
      await tx.update(projects).set({ status: "active" }).where(eq(projects.id, cr.projectId));
    }
    await audit(tx, { actorId: actor.userId, orgId: cr.orgId, action: accept ? "change.accepted" : "change.declined", subjectType: "change_request", subjectId: cr.id });
    return decided;
  });
}

// --- Feedback ----------------------------------------------------------------------------

export const FeedbackInput = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  comment: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => v || undefined)
    .optional(),
});

export async function leaveFeedback(db: DB, actor: Actor | null, milestoneId: string, input: z.input<typeof FeedbackInput>) {
  const data = FeedbackInput.parse(input);
  const [m] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
  if (!m) throw new AccessDenied();
  assertClientOrg(actor, m.orgId);
  if (m.status !== "done") throw new CrmError("You can rate a milestone once it's approved.");
  const [fb] = await db
    .insert(milestoneFeedback)
    .values({ milestoneId, orgId: m.orgId, projectId: m.projectId, authorId: actor.userId, rating: data.rating, comment: data.comment ?? null })
    .onConflictDoNothing({ target: milestoneFeedback.milestoneId })
    .returning();
  if (!fb) throw new CrmError("Thanks — this milestone already has your rating.");
  await audit(db, { actorId: actor.userId, orgId: m.orgId, action: "feedback.left", subjectType: "milestone", subjectId: milestoneId, data: { rating: data.rating } });
  return fb;
}

// --- Concierge -----------------------------------------------------------------------------

export type ConciergeAnswer = { answer: string; links: { label: string; href: string }[]; handedOff: boolean };

const Answer = z.object({ answer: z.string().min(1).max(1200), canAnswer: z.boolean() });

/** Everything the concierge may know: this organisation's own records, nothing else. */
async function orgSnapshot(db: DB, orgId: string) {
  const [ps, ms, invs, ups, crs] = await Promise.all([
    db.select().from(projects).where(eq(projects.orgId, orgId)),
    db.select().from(milestones).where(eq(milestones.orgId, orgId)).orderBy(asc(milestones.position)),
    db.select().from(invoices).where(and(eq(invoices.orgId, orgId), inArray(invoices.status, ["sent", "paid"]))),
    db.select().from(projectUpdates).where(eq(projectUpdates.orgId, orgId)).orderBy(desc(projectUpdates.createdAt)).limit(5),
    db.select().from(changeRequests).where(eq(changeRequests.orgId, orgId)),
  ]);
  return { ps, ms, invs, ups, crs };
}

const date = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "not set");

/**
 * Answers a client's question from their own records. Rules handle the common
 * questions; Gemini (if configured) handles the rest from the same records.
 * Anything it can't answer from the records is handed to a person.
 */
export async function askConcierge(db: DB, actor: Actor | null, orgId: string, question: string): Promise<ConciergeAnswer> {
  assertClientOrg(actor, orgId);
  const q = z.string().trim().min(3, "Type a question.").max(500).parse(question);
  const s = await orgSnapshot(db, orgId);
  const unpaid = s.invs.filter((i) => i.status === "sent");
  const project = s.ps.find((p) => p.status === "active") ?? s.ps[0];
  const ms = project ? s.ms.filter((m) => m.projectId === project.id) : [];
  const progress = projectProgress(ms);
  const projectLink = project ? [{ label: project.name, href: `/hub/projects/${project.id}` }] : [];

  const intents: [RegExp, () => ConciergeAnswer | null][] = [
    [
      /\b(pay|paid|invoice|bill|due|amount|owe|gst|upi)\b/i,
      () => ({
        answer: unpaid.length
          ? `You have ${unpaid.length} unpaid invoice${unpaid.length > 1 ? "s" : ""}: ${unpaid.map((i) => `${i.number} for ${formatMoney(i.total, i.currency)}, due ${date(i.dueAt)}${isOverdue(i) ? " (overdue)" : ""}`).join("; ")}. You can pay by UPI from the invoice page.`
          : "You have no unpaid invoices. Thank you!",
        links: unpaid.map((i) => ({ label: i.number, href: `/hub/invoices/${i.id}` })),
        handedOff: false,
      }),
    ],
    [
      /\b(approve|approval|waiting|need from me|my side|review|blocked|stuck)\b/i,
      () => {
        if (!project) return null;
        const waiting = progress.awaitingApproval;
        const blocked = progress.blocked;
        return {
          answer:
            waiting.length || blocked.length
              ? [
                  waiting.length ? `Waiting for your approval: ${waiting.map((m) => `“${m.title}”`).join(", ")}.` : null,
                  blocked.length ? `Blocked: ${blocked.map((m) => `${m.title} — ${m.blockerNote}`).join("; ")}.` : null,
                ]
                  .filter(Boolean)
                  .join(" ")
              : "Nothing is waiting on you right now. We'll let you know when a milestone is ready for review.",
          links: projectLink,
          handedOff: false,
        };
      },
    ],
    [
      /\b(when|ready|finish|done|deadline|date|how long|launch|live|status|progress|update)\b/i,
      () => {
        if (!project) return null;
        const remaining = ms.filter((m) => m.status !== "done");
        const last = remaining[remaining.length - 1];
        return {
          answer:
            project.status === "completed"
              ? `${project.name} is complete: all ${progress.total} milestones are approved.`
              : `${project.name} is ${progress.percent}% done (${progress.done} of ${progress.total} milestones approved). ${progress.current ? `Now working on “${progress.current.title}”, planned for ${date(progress.current.dueDate)}.` : ""}${last && last.id !== progress.current?.id ? ` The last milestone, “${last.title}”, is planned for ${date(last.dueDate)}.` : ""}${s.ups[0] ? ` Latest update (${date(s.ups[0].createdAt)}): ${s.ups[0].body.slice(0, 200)}` : ""}`,
          links: projectLink,
          handedOff: false,
        };
      },
    ],
  ];

  for (const [re, fn] of intents) {
    if (re.test(q)) {
      const a = fn();
      if (a) return a;
    }
  }

  if (await canUseAi(db, "concierge")) {
    const [run] = await db
      .insert(agentRuns)
      .values({ role: "concierge", engine: "gemini", subjectType: "organization", subjectId: orgId, input: { question: q }, triggeredBy: actor.userId })
      .returning();
    try {
      const { output, usage } = await generateJson(
        Answer,
        { type: "object", properties: { answer: { type: "string" }, canAnswer: { type: "boolean" } }, required: ["answer", "canAnswer"] },
        `You answer a client's question about their own projects with AMFIRE, using only the records in <data>. Be brief and friendly. If the records don't contain the answer, set canAnswer to false and say a person from AMFIRE will reply. Never invent dates, prices or promises. ${DATA_RULE}`,
        {
          question: q,
          projects: s.ps.map((p) => ({ name: p.name, status: p.status })),
          milestones: s.ms.map((m) => ({ title: m.title, status: m.status, planned: date(m.dueDate), blocker: m.blockerNote })),
          invoices: s.invs.map((i) => ({ number: i.number, total: formatMoney(i.total, i.currency), status: i.status, due: date(i.dueAt) })),
          updates: s.ups.map((u) => ({ date: date(u.createdAt), text: u.body })),
          change_requests: s.crs.map((c) => ({ description: c.description, status: c.status })),
        },
      );
      await db
        .update(agentRuns)
        .set({ status: "succeeded", output, model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costMicroUsd: usage.costMicroUsd, finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
      if (output.canAnswer) return { answer: output.answer, links: projectLink, handedOff: false };
    } catch (err) {
      await db
        .update(agentRuns)
        .set({ status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
    }
  }

  return {
    answer: "I can't answer that from your project records. Send it to a person below and AMFIRE will reply within one working day.",
    links: [],
    handedOff: true,
  };
}
