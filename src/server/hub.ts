// Client Hub extras: change requests, "what we need from you", milestone
// feedback and the project assistant. Every client-side function checks the
// actor's organisation.

import { and, asc, desc, eq, inArray, max } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  agentRuns,
  changeRequests,
  checklistItems,
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
import { afterResponse, notifyClient } from "./client-notify";
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
  const [project] = await db.select({ name: projects.name, currency: projects.currency }).from(projects).where(eq(projects.id, cr.projectId));
  await afterResponse(() =>
    notifyClient(db, cr.orgId, {
      subject: `Price for your change: ${cr.description.slice(0, 50)}${cr.description.length > 50 ? "…" : ""}`,
      lines: [
        `We've priced the change you asked for on ${project?.name ?? "your project"}: ${formatMoney(cr.estimateAmount ?? 0, project?.currency ?? "INR")} + GST, about ${cr.estimateWeeks} week${cr.estimateWeeks === 1 ? "" : "s"}.`,
        ...(cr.estimateNote ? [cr.estimateNote] : []),
        "Nothing starts until you accept it in your Client Hub.",
      ],
      path: `/hub/projects/${cr.projectId}`,
      action: "Accept or decline",
    }),
  );
  return cr;
}

// --- What we need from you -----------------------------------------------------------

export const ChecklistInput = z.object({
  title: z.string().trim().min(3, "Say what you need in a few words.").max(200),
  detail: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null)
    .optional(),
  dueDate: z.union([z.literal("").transform(() => null), z.coerce.date()]).optional(),
});

/** Staff ask the client for something the work needs (logins, data, content); the client is emailed. */
export async function addChecklistItem(db: DB, actor: Actor | null, projectId: string, input: z.input<typeof ChecklistInput>) {
  assertStaff(actor);
  const data = ChecklistInput.parse(input);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new CrmError("Project not found.");
  const [item] = await db
    .insert(checklistItems)
    .values({ projectId, orgId: project.orgId, title: data.title, detail: data.detail ?? null, dueDate: data.dueDate ?? null, createdBy: actor.userId })
    .returning();
  await audit(db, { actorId: actor.userId, orgId: project.orgId, action: "checklist.requested", subjectType: "checklist_item", subjectId: item.id });
  await afterResponse(() =>
    notifyClient(db, project.orgId, {
      subject: `We need something from you: ${item.title}`,
      lines: [
        `To keep ${project.name} moving, we need: ${item.title}.`,
        ...(item.detail ? [item.detail] : []),
        ...(item.dueDate ? [`If possible, by ${item.dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.`] : []),
        "Please don't send passwords by email — reply and we'll share a safe way.",
      ],
      path: `/hub/projects/${projectId}`,
      action: "Mark it done here",
    }),
  );
  return item;
}

export const ChecklistDoneInput = z.object({
  note: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null)
    .optional(),
});

/** The client ticks an item off, optionally saying how they sent it. */
export async function completeChecklistItem(db: DB, actor: Actor | null, itemId: string, input: z.input<typeof ChecklistDoneInput> = {}) {
  const data = ChecklistDoneInput.parse(input);
  const [item] = await db.select().from(checklistItems).where(eq(checklistItems.id, itemId));
  if (!item) throw new AccessDenied();
  assertClientOrg(actor, item.orgId);
  const [done] = await db
    .update(checklistItems)
    .set({ status: "done", clientNote: data.note ?? null, doneBy: actor.userId, doneAt: new Date() })
    .where(and(eq(checklistItems.id, itemId), eq(checklistItems.status, "open")))
    .returning();
  if (!done) throw new CrmError("This has already been marked done.");
  await audit(db, { actorId: actor.userId, orgId: item.orgId, action: "checklist.done_by_client", subjectType: "checklist_item", subjectId: item.id });
  return done;
}

/** Staff reopen an item if what arrived wasn't what was needed. */
export async function reopenChecklistItem(db: DB, actor: Actor | null, itemId: string) {
  assertStaff(actor);
  const [item] = await db
    .update(checklistItems)
    .set({ status: "open", doneAt: null, doneBy: null })
    .where(eq(checklistItems.id, itemId))
    .returning();
  if (!item) throw new CrmError("Item not found.");
  return item;
}

export async function deleteChecklistItem(db: DB, actor: Actor | null, itemId: string) {
  assertStaff(actor);
  await db.delete(checklistItems).where(eq(checklistItems.id, itemId));
}

// --- Milestone review ------------------------------------------------------------------

export const MilestoneFeedbackInput = z.object({
  feedback: z.string().trim().min(5, "Tell us what to change.").max(2000),
});

/** Instead of approving, the client sends a milestone back with what to change. */
export async function requestMilestoneChanges(db: DB, actor: Actor | null, milestoneId: string, input: z.input<typeof MilestoneFeedbackInput>) {
  const data = MilestoneFeedbackInput.parse(input);
  const [m] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
  if (!m) throw new AccessDenied();
  assertClientOrg(actor, m.orgId);
  const [updated] = await db
    .update(milestones)
    .set({ status: "in_progress", readyAt: null, clientFeedback: data.feedback, clientFeedbackAt: new Date() })
    .where(and(eq(milestones.id, milestoneId), eq(milestones.status, "awaiting_approval")))
    .returning();
  if (!updated) throw new CrmError("This milestone isn't waiting for your review.");
  await audit(db, {
    actorId: actor.userId,
    orgId: m.orgId,
    action: "milestone.changes_requested_by_client",
    subjectType: "milestone",
    subjectId: m.id,
    data: { feedback: data.feedback },
  });
  return updated;
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

export type ConciergeAnswer = { answer: string; links: { label: string; href: string }[]; handedOff: boolean; engine?: "ai" | "rules" };
export type ConciergeTurn = { q: string; a: string };

const Answer = z.object({ answer: z.string().min(1).max(1500), canAnswer: z.boolean(), refs: z.array(z.string()).max(6).catch([]) });

export const ConciergeHistory = z
  .array(z.object({ q: z.string().max(500), a: z.string().max(1500) }))
  .max(4)
  .catch([]);

/** Everything the assistant may know: this organisation's own records, nothing else. */
async function orgSnapshot(db: DB, orgId: string) {
  const [ps, ms, invs, ups, crs, items] = await Promise.all([
    db.select().from(projects).where(eq(projects.orgId, orgId)),
    db.select().from(milestones).where(eq(milestones.orgId, orgId)).orderBy(asc(milestones.position)),
    db.select().from(invoices).where(and(eq(invoices.orgId, orgId), inArray(invoices.status, ["sent", "paid"]))),
    db.select().from(projectUpdates).where(eq(projectUpdates.orgId, orgId)).orderBy(desc(projectUpdates.createdAt)).limit(8),
    db.select().from(changeRequests).where(eq(changeRequests.orgId, orgId)),
    db.select().from(checklistItems).where(eq(checklistItems.orgId, orgId)),
  ]);
  return { ps, ms, invs, ups, crs, items };
}

const date = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "not set");

const CONCIERGE_SYSTEM = `You are AMFIRE's project assistant inside a client's Client Hub. Answer the client's question using only their records in <data>: their projects, milestones, invoices, updates, change requests and the things AMFIRE needs from them.
- Be brief, warm and clear, in the language the client writes in (English, Hindi or Hinglish).
- Use dates and amounts exactly as given. Never invent dates, prices, promises or features.
- If the records don't answer it (or it's a request for work, a complaint, or anything needing a person), set canAnswer to false and say someone from AMFIRE will reply within one working day.
- In "refs", list the refs (P1, I2…) of records you used. Never write those refs in the answer itself; name things the way the client knows them (project name, invoice number).
${DATA_RULE}`;

/**
 * Answers a client's question from their own records. AMFIRE AI answers first,
 * remembering the last few questions; without it, rules answer the common
 * questions. Anything the records can't answer goes to a person.
 */
export async function askConcierge(
  db: DB,
  actor: Actor | null,
  orgId: string,
  question: string,
  history: ConciergeTurn[] = [],
): Promise<ConciergeAnswer> {
  assertClientOrg(actor, orgId);
  const q = z.string().trim().min(3, "Type a question.").max(500).parse(question);
  const s = await orgSnapshot(db, orgId);
  const unpaid = s.invs.filter((i) => i.status === "sent");
  const project = s.ps.find((p) => p.status === "active") ?? s.ps[0];
  const ms = project ? s.ms.filter((m) => m.projectId === project.id) : [];
  const progress = projectProgress(ms);
  const projectLink = project ? [{ label: project.name, href: `/hub/projects/${project.id}` }] : [];
  const handOff: ConciergeAnswer = {
    answer: "I can't answer that from your project records. Send it to a person on your project page and AMFIRE will reply within one working day.",
    links: projectLink,
    handedOff: true,
  };

  if (await canUseAi(db, "concierge")) {
    const [run] = await db
      .insert(agentRuns)
      .values({ role: "concierge", engine: "gemini", subjectType: "organization", subjectId: orgId, input: { question: q }, triggeredBy: actor.userId })
      .returning();
    try {
      const refs = new Map<string, { label: string; href: string }>();
      s.ps.forEach((p, i) => refs.set(`P${i + 1}`, { label: p.name, href: `/hub/projects/${p.id}` }));
      s.invs.forEach((inv, i) => refs.set(`I${i + 1}`, { label: inv.number, href: `/hub/invoices/${inv.id}` }));
      const { output, usage } = await generateJson(
        Answer,
        {
          type: "object",
          properties: { answer: { type: "string" }, canAnswer: { type: "boolean" }, refs: { type: "array", items: { type: "string" } } },
          required: ["answer", "canAnswer", "refs"],
        },
        CONCIERGE_SYSTEM,
        {
          today: date(new Date()),
          question: q,
          earlier_in_this_conversation: ConciergeHistory.parse(history),
          projects: s.ps.map((p, i) => ({ ref: `P${i + 1}`, name: p.name, status: p.status, started: date(p.startedAt) })),
          milestones: s.ms.map((m) => ({
            project: `P${s.ps.findIndex((p) => p.id === m.projectId) + 1}`,
            title: m.title,
            what_you_get: m.description,
            status: m.status === "awaiting_approval" ? "waiting for your approval" : m.status,
            planned: date(m.dueDate),
            completed: m.completedAt ? date(m.completedAt) : null,
            blocker: m.blockerNote,
          })),
          invoices: s.invs.map((inv, i) => ({ ref: `I${i + 1}`, number: inv.number, for: inv.title, total: formatMoney(inv.total, inv.currency), status: isOverdue(inv) ? "overdue" : inv.status, due: date(inv.dueAt) })),
          updates_from_amfire: s.ups.map((u) => ({ date: date(u.createdAt), text: u.body })),
          change_requests: s.crs.map((c) => ({ description: c.description, status: c.status, price: c.estimateAmount != null ? formatMoney(c.estimateAmount, project?.currency ?? "INR") : null })),
          what_amfire_needs_from_you: s.items.map((it) => ({ item: it.title, detail: it.detail, status: it.status, by: it.dueDate ? date(it.dueDate) : null })),
        },
      );
      await db
        .update(agentRuns)
        .set({ status: "succeeded", output, model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costMicroUsd: usage.costMicroUsd, finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
      if (!output.canAnswer) return { ...handOff, answer: output.answer, engine: "ai" };
      const links = [...new Set(output.refs)].flatMap((r) => (refs.has(r) ? [refs.get(r)!] : []));
      // Safety net if a ref slips into the text anyway: "invoice I1 (AMF-2026-0001)" → "invoice AMF-2026-0001".
      const answer = output.answer
        .replace(/\s*\((?:[PI]\d+(?:,\s*)?)+\)/g, "")
        .replace(/\b[PI]\d+\s*\(([^)]+)\)/g, "$1")
        .replace(/\b([PI]\d+)\b/g, (ref) => refs.get(ref)?.label ?? ref);
      return { answer, links: links.length ? links : projectLink, handedOff: false, engine: "ai" };
    } catch (err) {
      await db
        .update(agentRuns)
        .set({ status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
    }
  }

  const openItems = s.items.filter((it) => it.status === "open");
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
            waiting.length || blocked.length || openItems.length
              ? [
                  waiting.length ? `Waiting for your approval: ${waiting.map((m) => `“${m.title}”`).join(", ")}.` : null,
                  openItems.length ? `We need from you: ${openItems.map((it) => it.title).join("; ")}.` : null,
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
      if (a) return { ...a, engine: "rules" };
    }
  }
  return handOff;
}
