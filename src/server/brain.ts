// The decision inbox: approving, editing and rejecting what agents suggest.
// Approving is the only way anything an agent drafted reaches a client.

import { and, desc, eq, gte, inArray } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  agentSettings,
  approvals,
  draftEdits,
  interactions,
  invoices,
  leads,
  organizations,
  payments,
  subscriptions,
  users,
  type Approval,
  type Invoice,
} from "@/db/schema";
import { site } from "@/config/site";
import { formatMoney } from "@/knowledge/pricing";
import { sourceLabel } from "@/lib/attribution";
import { assertOwner, assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { CrmError } from "./crm";
import { mrr, sendInvoice } from "./money";
import { emailConfigured, sendEmail } from "./notify";
import { postProjectUpdate } from "./projects";

export async function listInbox(db: DB, actor: Actor | null) {
  assertStaff(actor);
  return db.select().from(approvals).where(eq(approvals.status, "pending")).orderBy(desc(approvals.createdAt));
}

export async function recentDecisions(db: DB, actor: Actor | null, limit = 10) {
  assertStaff(actor);
  return db
    .select()
    .from(approvals)
    .where(inArray(approvals.status, ["approved", "rejected"]))
    .orderBy(desc(approvals.decidedAt))
    .limit(limit);
}

/** wa.me wants digits with the country code; Indian 10-digit numbers get +91. */
export function whatsappLink(phone: string, text: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const MESSAGE_KINDS = new Set(["whatsapp", "email"]);

/** The link that finishes an approved message by hand: WhatsApp, LinkedIn, or an email draft when email isn't set up. */
export function sendLink(a: Pick<Approval, "channel" | "recipient">, text: string) {
  if (a.channel === "linkedin") return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
  if (a.channel === "whatsapp" && a.recipient) return whatsappLink(a.recipient, text);
  if (a.channel === "email" && a.recipient && !emailConfigured()) {
    return `mailto:${a.recipient}?subject=${encodeURIComponent("amfire")}&body=${encodeURIComponent(text)}`;
  }
  return undefined;
}

// --- Invoices to clients ---------------------------------------------------------------------

/** The person to send a client's invoices to: the lead the client came from. */
export async function invoiceContact(db: Pick<DB, "select">, orgId: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.clientOrgId, orgId)).orderBy(leads.createdAt).limit(1);
  return lead ?? null;
}

export function invoiceMessage(inv: Pick<Invoice, "id" | "number" | "title" | "total" | "currency" | "dueAt">, name: string, ownerFirstName = "AMFIRE") {
  const due = inv.dueAt ? ` It's due on ${inv.dueAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}.` : "";
  const sign = ownerFirstName.toUpperCase() === "AMFIRE" ? "— amfire" : `— ${ownerFirstName}, amfire`;
  return `Hi ${name.split(" ")[0]}, here is invoice ${inv.number} for ${formatMoney(inv.total, inv.currency)} (${inv.title}).${due} You can view, download and pay it here: ${site.url}/hub/invoices/${inv.id}\n\nThank you!\n${sign}`;
}

/**
 * Tells the client about a sent invoice: emails it when email is set up, and
 * returns a WhatsApp (or email) link with the message typed in.
 */
export async function shareInvoice(db: DB, actor: Actor | null, invoiceId: string, text?: string) {
  assertOwner(actor);
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv || inv.status !== "sent") throw new CrmError("Send the invoice first.");
  const contact = await invoiceContact(db, inv.orgId);
  if (!contact || (!contact.phone && !contact.email)) {
    return { note: "Invoice sent to the client's Hub. Add a phone or email on their lead to message it to them.", link: undefined };
  }
  const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, actor.userId));
  const message = text ?? invoiceMessage(inv, contact.name, me?.name.split(" ")[0]);
  let emailed = false;
  if (contact.email && emailConfigured()) {
    await sendEmail({ to: contact.email, subject: `Invoice ${inv.number} from amfire`, text: message });
    emailed = true;
  }
  const link = contact.phone ? whatsappLink(contact.phone, message) : !emailed && contact.email ? sendLink({ channel: "email", recipient: contact.email }, message) : undefined;
  await db.insert(interactions).values({
    leadId: contact.id,
    orgId: inv.orgId,
    kind: emailed && !contact.phone ? "email" : "whatsapp",
    direction: "out",
    summary: message,
    authorId: actor.userId,
  });
  return {
    note: [emailed ? `Invoice emailed to ${contact.email}.` : "Invoice sent to the client's Hub.", link ? (contact.phone ? "Open WhatsApp to send it." : "Open your email to send it.") : null]
      .filter(Boolean)
      .join(" "),
    link,
  };
}

/** Messages approved in the last 12 hours that still need the owner to press send. */
export async function readyToSend(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const rows = await db
    .select()
    .from(approvals)
    .where(and(eq(approvals.status, "approved"), gte(approvals.decidedAt, new Date(now.getTime() - 12 * 60 * 60 * 1000))))
    .orderBy(desc(approvals.decidedAt));
  return rows.flatMap((a) => {
    const link = sendLink(a, a.finalText ?? a.draft);
    return link ? [{ approval: a, link }] : [];
  });
}

/**
 * Approves a suggestion, optionally with the owner's edited text, and does
 * what it says. Returns a link when the last step is the owner's (pressing
 * send in WhatsApp, posting on LinkedIn).
 */
export async function approve(db: DB, actor: Actor | null, approvalId: string, editedText?: string) {
  assertStaff(actor);
  const [a] = await db.select().from(approvals).where(and(eq(approvals.id, approvalId), eq(approvals.status, "pending")));
  if (!a) throw new CrmError("This suggestion has already been decided.");
  const text = (editedText ?? a.draft).trim() || a.draft;
  let link: string | undefined;
  let note = "Approved.";

  // Effects that can fail run before the approval is marked done.
  if (a.kind === "send_invoice") {
    // Finance's draft is the message to the client; the invoice itself goes to their Hub.
    assertOwner(actor);
    if (!a.data.invoiceId) throw new CrmError("This suggestion has no invoice attached.");
    await sendInvoice(db, actor, a.data.invoiceId);
    note = "Invoice sent to the client's Hub.";
  }
  if (a.channel === "hub") {
    if (!a.data.projectId) throw new CrmError("This suggestion has no project attached.");
    await postProjectUpdate(db, actor, a.data.projectId, text);
    note = "Posted to the client's Hub.";
  } else if (a.channel === "email" && a.recipient && emailConfigured()) {
    await sendEmail({ to: a.recipient, subject: a.kind === "send_invoice" ? "Your invoice from amfire" : "A note from amfire", text });
    note = a.kind === "send_invoice" ? `Invoice sent and emailed to ${a.recipient}.` : `Emailed to ${a.recipient}.`;
  } else {
    link = sendLink(a, text);
    const prefix = a.kind === "send_invoice" ? "Invoice sent. " : "Approved. ";
    if (link) note = prefix + (a.channel === "linkedin" ? "Open LinkedIn to post it." : a.channel === "whatsapp" ? "Open WhatsApp and press send." : "Open your email to send it.");
  }

  await db.transaction(async (tx) => {
    const [done] = await tx
      .update(approvals)
      .set({ status: "approved", finalText: text, decidedBy: actor.userId, decidedAt: new Date() })
      .where(and(eq(approvals.id, a.id), eq(approvals.status, "pending")))
      .returning();
    if (!done) throw new CrmError("This suggestion has already been decided.");
    if (text !== a.draft.trim()) {
      // Agents read these to learn how the owner writes.
      await tx.insert(draftEdits).values({ approvalId: a.id, role: a.role, kind: a.kind, original: a.draft, edited: text });
    }
    if (MESSAGE_KINDS.has(a.channel) && (a.leadId || a.orgId)) {
      await tx.insert(interactions).values({
        leadId: a.leadId,
        orgId: a.orgId,
        kind: a.channel as "whatsapp" | "email",
        direction: "out",
        summary: text,
        authorId: actor.userId,
      });
    }
    // A follow-up that was due moves three days on, so the next one is drafted if they don't reply.
    if (a.leadId && (a.kind === "follow_up" || a.kind === "combined_message")) {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, a.leadId));
      if (lead && ["new", "qualified", "proposal_sent"].includes(lead.status)) {
        await tx
          .update(leads)
          .set({ nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), updatedAt: new Date() })
          .where(eq(leads.id, a.leadId));
      }
    }
    await audit(tx, {
      actorId: actor.userId,
      orgId: a.orgId,
      action: "approval.approved",
      subjectType: a.subjectType,
      subjectId: a.subjectId,
      data: { approvalId: a.id, kind: a.kind, role: a.role, edited: text !== a.draft.trim() },
    });
  });
  return { note, link };
}

export async function reject(db: DB, actor: Actor | null, approvalId: string) {
  assertStaff(actor);
  const [a] = await db
    .update(approvals)
    .set({ status: "rejected", decidedBy: actor.userId, decidedAt: new Date() })
    .where(and(eq(approvals.id, approvalId), eq(approvals.status, "pending")))
    .returning();
  if (!a) throw new CrmError("This suggestion has already been decided.");
  await audit(db, { actorId: actor.userId, orgId: a.orgId, action: "approval.rejected", subjectType: a.subjectType, subjectId: a.subjectId, data: { kind: a.kind, role: a.role } });
  return a;
}

/** How often the owner approves each kind of draft unchanged — the evidence for trusting an agent more. */
export async function approvalStats(db: DB) {
  const rows = await db
    .select({ role: approvals.role, kind: approvals.kind, status: approvals.status, draft: approvals.draft, finalText: approvals.finalText })
    .from(approvals)
    .where(inArray(approvals.status, ["approved", "rejected"]));
  const stats = new Map<string, { approved: number; unchanged: number; rejected: number }>();
  for (const r of rows) {
    const s = stats.get(r.role) ?? { approved: 0, unchanged: 0, rejected: 0 };
    if (r.status === "rejected") s.rejected += 1;
    else {
      s.approved += 1;
      if ((r.finalText ?? "").trim() === r.draft.trim()) s.unchanged += 1;
    }
    stats.set(r.role, s);
  }
  return stats;
}

export const AgentSettingInput = z.object({
  enabled: z.boolean(),
  dailyBudgetUsd: z.coerce.number().min(0).max(100),
});

export async function updateAgentSetting(db: DB, actor: Actor | null, role: string, input: z.input<typeof AgentSettingInput>) {
  assertOwner(actor);
  const data = AgentSettingInput.parse(input);
  const values = { role, enabled: data.enabled, dailyBudgetMicroUsd: Math.round(data.dailyBudgetUsd * 1_000_000), updatedAt: new Date() };
  await db.insert(agentSettings).values(values).onConflictDoUpdate({ target: agentSettings.role, set: values });
  await audit(db, { actorId: actor.userId, action: "agent.settings_changed", subjectType: "agent", data: values });
}

// --- Investor update -------------------------------------------------------------------------

/** Drafts the monthly YC-style update from last month's numbers, into the inbox. */
export async function draftInvestorUpdate(db: DB, actor: Actor | null, opts: { system?: boolean; now?: Date } = {}) {
  if (!opts.system) assertStaff(actor);
  const now = opts.now ?? new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(from);
  const [pays, subs, ls, orgs] = await Promise.all([
    db
      .select({ amount: payments.amount, currency: invoices.currency, receivedAt: payments.receivedAt })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(gte(payments.receivedAt, new Date(now.getFullYear(), now.getMonth() - 2, 1))),
    db.select().from(subscriptions),
    db.select().from(leads).where(gte(leads.createdAt, from)),
    db.select().from(organizations).where(and(eq(organizations.kind, "client"), gte(organizations.createdAt, from))),
  ]);
  const sumFor = (start: Date, end: Date) =>
    pays
      .filter((p) => p.receivedAt >= start && p.receivedAt < end)
      .reduce<Record<string, number>>((acc, p) => ((acc[p.currency] = (acc[p.currency] ?? 0) + p.amount), acc), {});
  const money = (r: Record<string, number>) => Object.entries(r).map(([c, v]) => formatMoney(v, c)).join(" + ") || formatMoney(0);
  const lastMonth = sumFor(from, to);
  const monthBefore = sumFor(new Date(now.getFullYear(), now.getMonth() - 2, 1), from);
  const monthLeads = ls.filter((l) => l.createdAt < to);
  const bySource = new Map<string, number>();
  for (const l of monthLeads) bySource.set(l.source, (bySource.get(l.source) ?? 0) + 1);
  const won = monthLeads.filter((l) => l.status === "won").length;

  const draft = [
    `AMFIRE update — ${month}`,
    "",
    "Numbers",
    `• Revenue collected: ${money(lastMonth)} (month before: ${money(monthBefore)})`,
    `• Monthly recurring revenue: ${money(mrr(subs))}`,
    `• New leads: ${monthLeads.length}${bySource.size ? ` (${[...bySource.entries()].map(([s, n]) => `${sourceLabel(s)} ${n}`).join(", ")})` : ""}`,
    `• New clients: ${orgs.filter((o) => o.createdAt < to).length} · deals won: ${won}`,
    "",
    "Highlights",
    "• ",
    "",
    "Lowlights",
    "• ",
    "",
    "Asks",
    "• Introductions to owners of Indian businesses with manual, repetitive work.",
  ].join("\n");

  const [row] = await db
    .insert(approvals)
    .values({
      role: "chief_of_staff",
      kind: "investor_update",
      subjectType: "company",
      subjectId: "00000000-0000-0000-0000-000000000000",
      title: `Investor update for ${month}`,
      reason: "The numbers are filled in from your records. Add highlights, lowlights and asks, then copy it into your email.",
      channel: "internal",
      draft,
      fingerprint: `investor_update:${from.toISOString().slice(0, 7)}`,
    })
    .onConflictDoNothing({ target: approvals.fingerprint })
    .returning();
  return row ?? null;
}

export type { Approval };
