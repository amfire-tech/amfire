// Invoices, payments and retainers. Amounts are in minor units (paise/cents)
// and every figure on a screen is computed from these records — never by AI.
//
// Rules:
// - A milestone gets a draft invoice when the client approves it.
// - Only the owner sends invoices (a commercial commitment).
// - An invoice is paid when recorded payments cover its total.

import { and, asc, desc, eq, gte, inArray, lt, sql, sum } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  invoices,
  memories,
  milestones,
  organizations,
  payments,
  projects,
  subscriptions,
  timeEntries,
  type Invoice,
  type Subscription,
} from "@/db/schema";
import { assertClientOrg, assertOwner, assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { createPaymentLink } from "./payments-provider";

type Tx = Pick<DB, "select" | "insert" | "update">;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

const DAY = 24 * 60 * 60 * 1000;
/** Days a client has to pay a sent invoice. */
export const PAYMENT_TERMS_DAYS = Number(process.env.PAYMENT_TERMS_DAYS) || 7;

/** GST is charged only by a GST-registered business: AMFIRE_GSTIN must be set. */
export function gstRegistered() {
  return Boolean(process.env.AMFIRE_GSTIN?.trim());
}

/**
 * GST for rupee invoices when amfire is registered (18% unless GST_RATE_BP says
 * otherwise); none for dollar invoices (export of services) or when unregistered.
 * Applies to invoices drafted after it's set.
 */
export function taxRateFor(currency: string) {
  if (currency !== "INR" || !gstRegistered()) return 0;
  const bp = process.env.GST_RATE_BP ? Number(process.env.GST_RATE_BP) : NaN;
  return Number.isFinite(bp) && bp >= 0 ? bp : 1800;
}

/** CGST + SGST when amfire and the client are in the same state, otherwise IGST. Null when the state isn't known. */
export function gstSplit(inv: Pick<Invoice, "tax" | "taxRate" | "placeOfSupply">) {
  if (!inv.taxRate) return [];
  const home = process.env.AMFIRE_STATE?.trim().toLowerCase();
  const place = inv.placeOfSupply?.trim().toLowerCase();
  if (!home || !place) return [{ label: `GST ${inv.taxRate / 100}%`, amount: inv.tax }];
  if (home === place) {
    const half = Math.round(inv.tax / 2);
    return [
      { label: `CGST ${inv.taxRate / 200}%`, amount: half },
      { label: `SGST ${inv.taxRate / 200}%`, amount: inv.tax - half },
    ];
  }
  return [{ label: `IGST ${inv.taxRate / 100}%`, amount: inv.tax }];
}

export function invoiceAmounts(subtotal: number, currency: string) {
  const taxRate = taxRateFor(currency);
  const tax = Math.round((subtotal * taxRate) / 10_000);
  return { subtotal, taxRate, tax, total: subtotal + tax };
}

/** Issued invoices are numbered consecutively (AMF-…); records of past payments use their own series (REC-…). */
async function nextInvoiceNumber(tx: Tx, now = new Date(), series = "AMF") {
  const prefix = `${series}-${now.getFullYear()}-`;
  const [row] = await tx
    .select({ n: sql<number>`count(*)`.mapWith(Number) })
    .from(invoices)
    .where(sql`${invoices.number} like ${prefix + "%"}`);
  return `${prefix}${String((row?.n ?? 0) + 1).padStart(4, "0")}`;
}

/** Called inside the client's milestone approval. Does nothing for unpriced milestones. */
export async function createMilestoneInvoice(tx: Tx, milestoneId: string) {
  const [row] = await tx
    .select({ m: milestones, p: projects })
    .from(milestones)
    .innerJoin(projects, eq(projects.id, milestones.projectId))
    .where(eq(milestones.id, milestoneId));
  if (!row || row.m.amount <= 0) return null;
  const [existing] = await tx.select().from(invoices).where(eq(invoices.milestoneId, milestoneId));
  if (existing) return existing;
  const [inv] = await tx
    .insert(invoices)
    .values({
      orgId: row.m.orgId,
      projectId: row.p.id,
      milestoneId,
      number: await nextInvoiceNumber(tx),
      title: `${row.p.name} — ${row.m.title}`,
      currency: row.p.currency,
      ...invoiceAmounts(row.m.amount, row.p.currency),
    })
    .returning();
  await audit(tx, { orgId: inv.orgId, action: "invoice.drafted", subjectType: "invoice", subjectId: inv.id, data: { milestoneId } });
  return inv;
}

export const ManualInvoiceInput = z.object({
  orgId: z.uuid(),
  projectId: z.uuid().optional(),
  title: z.string().trim().min(3, "Add what the invoice is for.").max(200),
  amount: z.coerce.number().int().positive("Enter an amount above zero."),
  currency: z.enum(["INR", "USD"]),
});

/** A one-off invoice drafted by staff. `amount` is in major units (₹ or $). */
export async function createManualInvoice(db: DB, actor: Actor | null, input: z.input<typeof ManualInvoiceInput>) {
  assertStaff(actor);
  const data = ManualInvoiceInput.parse(input);
  return db.transaction(async (tx) => {
    const [inv] = await tx
      .insert(invoices)
      .values({
        orgId: data.orgId,
        projectId: data.projectId ?? null,
        number: await nextInvoiceNumber(tx),
        title: data.title,
        currency: data.currency,
        ...invoiceAmounts(data.amount * 100, data.currency),
      })
      .returning();
    await audit(tx, { actorId: actor.userId, orgId: inv.orgId, action: "invoice.drafted", subjectType: "invoice", subjectId: inv.id });
    return inv;
  });
}

/** Owner only: issues the invoice to the client's Hub, with a payment link when Razorpay is set up. */
export async function sendInvoice(db: DB, actor: Actor | null, invoiceId: string, now = new Date()) {
  assertOwner(actor);
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) throw new MoneyError("Invoice not found.");
  if (inv.status !== "draft") throw new MoneyError("Only draft invoices can be sent.");
  const [org] = await db.select().from(organizations).where(eq(organizations.id, inv.orgId));
  const link = await createPaymentLink(inv).catch(() => null);
  return db.transaction(async (tx) => {
    const [sent] = await tx
      .update(invoices)
      .set({
        status: "sent",
        issuedAt: now,
        dueAt: new Date(now.getTime() + PAYMENT_TERMS_DAYS * DAY),
        sentBy: actor.userId,
        paymentLinkUrl: link,
        placeOfSupply: org?.state ?? null,
        updatedAt: now,
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.status, "draft")))
      .returning();
    if (!sent) throw new MoneyError("Only draft invoices can be sent.");
    await audit(tx, { actorId: actor.userId, orgId: sent.orgId, action: "invoice.sent", subjectType: "invoice", subjectId: sent.id });
    return sent;
  });
}

export async function voidInvoice(db: DB, actor: Actor | null, invoiceId: string) {
  assertOwner(actor);
  const [inv] = await db
    .update(invoices)
    .set({ status: "void", updatedAt: new Date() })
    .where(and(eq(invoices.id, invoiceId), inArray(invoices.status, ["draft", "sent"])))
    .returning();
  if (!inv) throw new MoneyError("Paid or already void invoices can't be voided.");
  await audit(db, { actorId: actor.userId, orgId: inv.orgId, action: "invoice.voided", subjectType: "invoice", subjectId: inv.id });
  return inv;
}

export const PaymentInput = z.object({
  amount: z.coerce.number().positive("Enter the amount received."),
  method: z.enum(["upi", "bank_transfer", "card", "cash", "razorpay", "other"]),
  reference: z
    .string()
    .trim()
    .max(120)
    .transform((v) => v || undefined)
    .optional(),
});

/**
 * Records money received against an invoice; `amount` is in major units.
 * Staff record payments by hand; the Razorpay webhook calls this with no actor.
 */
export async function recordPayment(
  db: DB,
  actor: Actor | null,
  invoiceId: string,
  input: z.input<typeof PaymentInput>,
  opts: { system?: boolean; now?: Date } = {},
) {
  if (!opts.system) assertStaff(actor);
  const data = PaymentInput.parse(input);
  const now = opts.now ?? new Date();
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) throw new MoneyError("Invoice not found.");
    if (inv.status === "void" || inv.status === "draft") throw new MoneyError("Send the invoice before recording a payment.");
    if (data.reference) {
      const [dupe] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.reference, data.reference));
      if (dupe) return { invoice: inv, duplicate: true };
    }
    await tx.insert(payments).values({
      invoiceId,
      orgId: inv.orgId,
      amount: Math.round(data.amount * 100),
      method: data.method,
      reference: data.reference ?? null,
      receivedAt: now,
      recordedBy: actor?.userId ?? null,
    });
    const [paid] = await tx
      .select({ total: sum(payments.amount).mapWith(Number) })
      .from(payments)
      .where(eq(payments.invoiceId, invoiceId));
    let updated = inv;
    if ((paid?.total ?? 0) >= inv.total && inv.status !== "paid") {
      [updated] = await tx.update(invoices).set({ status: "paid", paidAt: now, updatedAt: now }).where(eq(invoices.id, invoiceId)).returning();
      // The Finance agent remembers late payers, so reminders to them go out earlier.
      if (inv.dueAt && now.getTime() - inv.dueAt.getTime() > 3 * DAY) {
        const days = Math.round((now.getTime() - inv.dueAt.getTime()) / DAY);
        await tx.insert(memories).values({
          subjectType: "organization",
          subjectId: inv.orgId,
          fact: `Paid invoice ${inv.number} ${days} days after it was due.`,
          source: "finance",
          confidence: 100,
        });
      }
    }
    await audit(tx, {
      actorId: actor?.userId ?? null,
      orgId: inv.orgId,
      action: "payment.recorded",
      subjectType: "invoice",
      subjectId: inv.id,
      data: { amount: Math.round(data.amount * 100), method: data.method },
    });
    return { invoice: updated, duplicate: false };
  });
}

/** Records money received outside HQ (a past project), so revenue to date is complete. `amount` in minor units. */
export async function recordPastPayment(
  tx: Tx,
  opts: { orgId: string; projectId: string; title: string; amount: number; currency: string; paidAt: Date; recordedBy: string },
) {
  const [inv] = await tx
    .insert(invoices)
    .values({
      orgId: opts.orgId,
      projectId: opts.projectId,
      number: await nextInvoiceNumber(tx, opts.paidAt, "REC"),
      title: opts.title,
      currency: opts.currency,
      subtotal: opts.amount,
      total: opts.amount,
      status: "paid",
      issuedAt: opts.paidAt,
      paidAt: opts.paidAt,
      isRecord: true,
    })
    .returning();
  await tx.insert(payments).values({
    invoiceId: inv.id,
    orgId: opts.orgId,
    amount: opts.amount,
    method: "other",
    receivedAt: opts.paidAt,
    recordedBy: opts.recordedBy,
  });
  return inv;
}

// --- Retainers -------------------------------------------------------------------

export const SubscriptionInput = z.object({
  orgId: z.uuid(),
  projectId: z.uuid().optional(),
  title: z.string().trim().min(3).max(200),
  amount: z.coerce.number().int().positive("Enter the monthly amount."),
  currency: z.enum(["INR", "USD"]),
  startsAt: z.coerce.date().optional(),
});

/** A monthly plan; `amount` in major units. The first invoice is due on the start date. */
export async function createSubscription(db: DB, actor: Actor | null, input: z.input<typeof SubscriptionInput>) {
  assertOwner(actor);
  const data = SubscriptionInput.parse(input);
  const start = data.startsAt ?? new Date();
  const [sub] = await db
    .insert(subscriptions)
    .values({
      orgId: data.orgId,
      projectId: data.projectId ?? null,
      title: data.title,
      amount: data.amount * 100,
      currency: data.currency,
      startedAt: start,
      nextInvoiceAt: start,
    })
    .returning();
  await audit(db, { actorId: actor.userId, orgId: sub.orgId, action: "subscription.created", subjectType: "subscription", subjectId: sub.id });
  return sub;
}

export async function setSubscriptionStatus(db: DB, actor: Actor | null, subscriptionId: string, status: "active" | "paused" | "cancelled") {
  assertOwner(actor);
  const [sub] = await db
    .update(subscriptions)
    .set({ status, cancelledAt: status === "cancelled" ? new Date() : null })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();
  if (!sub) throw new MoneyError("Plan not found.");
  await audit(db, { actorId: actor.userId, orgId: sub.orgId, action: `subscription.${status}`, subjectType: "subscription", subjectId: sub.id });
  return sub;
}

function addMonth(d: Date) {
  const next = new Date(d);
  next.setMonth(next.getMonth() + 1);
  return next;
}

/** Drafts the invoice for every active plan that is due, and moves its next date on a month. */
export async function draftDueRetainerInvoices(db: DB, now = new Date()) {
  const due = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.status, "active"), lt(subscriptions.nextInvoiceAt, now)));
  const drafted: Invoice[] = [];
  for (const sub of due) {
    const inv = await db.transaction(async (tx) => {
      const [moved] = await tx
        .update(subscriptions)
        .set({ nextInvoiceAt: addMonth(sub.nextInvoiceAt) })
        .where(and(eq(subscriptions.id, sub.id), eq(subscriptions.nextInvoiceAt, sub.nextInvoiceAt)))
        .returning();
      if (!moved) return null; // another run got there first
      const period = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(sub.nextInvoiceAt);
      const [inv] = await tx
        .insert(invoices)
        .values({
          orgId: sub.orgId,
          projectId: sub.projectId,
          subscriptionId: sub.id,
          number: await nextInvoiceNumber(tx, now),
          title: `${sub.title} — ${period}`,
          currency: sub.currency,
          ...invoiceAmounts(sub.amount, sub.currency),
        })
        .returning();
      await audit(tx, { orgId: sub.orgId, action: "invoice.drafted", subjectType: "invoice", subjectId: inv.id, data: { subscriptionId: sub.id } });
      return inv;
    });
    if (inv) drafted.push(inv);
  }
  return drafted;
}

// --- Time ----------------------------------------------------------------------------

export const TimeInput = z.object({
  hours: z.coerce.number().positive("Enter the hours worked.").max(24),
  note: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || undefined)
    .optional(),
});

export async function logTime(db: DB, actor: Actor | null, projectId: string, input: z.input<typeof TimeInput>) {
  assertStaff(actor);
  const data = TimeInput.parse(input);
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) throw new MoneyError("Project not found.");
  const [entry] = await db
    .insert(timeEntries)
    .values({ projectId, orgId: project.orgId, userId: actor.userId, minutes: Math.round(data.hours * 60), note: data.note ?? null })
    .returning();
  return entry;
}

// --- Read models -----------------------------------------------------------------------

export function isOverdue(inv: Pick<Invoice, "status" | "dueAt">, now = new Date()) {
  return inv.status === "sent" && !!inv.dueAt && inv.dueAt < now;
}

/** Monthly recurring revenue by currency, from active plans. */
export function mrr(subs: Pick<Subscription, "status" | "amount" | "currency">[]) {
  const out: Record<string, number> = {};
  for (const s of subs) if (s.status === "active") out[s.currency] = (out[s.currency] ?? 0) + s.amount;
  return out;
}

function startOfMonth(d: Date, offset = 0) {
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

export async function getMoneyOverview(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const [allInvoices, subs, pays] = await Promise.all([
    db
      .select({ invoice: invoices, orgName: organizations.name })
      .from(invoices)
      .innerJoin(organizations, eq(organizations.id, invoices.orgId))
      .orderBy(desc(invoices.createdAt)),
    db
      .select({ subscription: subscriptions, orgName: organizations.name })
      .from(subscriptions)
      .innerJoin(organizations, eq(organizations.id, subscriptions.orgId))
      .orderBy(asc(subscriptions.nextInvoiceAt)),
    db
      .select({ amount: payments.amount, receivedAt: payments.receivedAt, currency: invoices.currency })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(gte(payments.receivedAt, startOfMonth(now, -5))),
  ]);

  const byCurrency = (rows: { amount: number; currency: string }[]) =>
    rows.reduce<Record<string, number>>((acc, r) => ((acc[r.currency] = (acc[r.currency] ?? 0) + r.amount), acc), {});

  const monthStart = startOfMonth(now);
  const collectedThisMonth = byCurrency(pays.filter((p) => p.receivedAt >= monthStart));
  const outstanding = byCurrency(allInvoices.filter((r) => r.invoice.status === "sent").map((r) => ({ amount: r.invoice.total, currency: r.invoice.currency })));
  const overdue = allInvoices.filter((r) => isOverdue(r.invoice, now));
  const months = Array.from({ length: 6 }, (_, i) => {
    const from = startOfMonth(now, i - 5);
    const to = startOfMonth(now, i - 4);
    return {
      label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(from),
      collected: byCurrency(pays.filter((p) => p.receivedAt >= from && p.receivedAt < to)),
    };
  });

  return {
    invoices: allInvoices,
    subscriptions: subs,
    mrr: mrr(subs.map((s) => s.subscription)),
    collectedThisMonth,
    outstanding,
    overdue,
    months,
    drafts: allInvoices.filter((r) => r.invoice.status === "draft"),
  };
}

export async function getInvoiceForStaff(db: DB, actor: Actor | null, invoiceId: string) {
  assertStaff(actor);
  return loadInvoice(db, invoiceId);
}

/** Clients see their own sent, paid or void invoices — never drafts. */
export async function getInvoiceForClient(db: DB, actor: Actor | null, invoiceId: string) {
  const row = await loadInvoice(db, invoiceId);
  if (!row || row.invoice.status === "draft" || !actor?.clientOrgIds.includes(row.invoice.orgId)) return null;
  return row;
}

export async function listClientInvoices(db: DB, actor: Actor | null, orgId: string) {
  assertClientOrg(actor, orgId);
  return db
    .select()
    .from(invoices)
    .where(and(eq(invoices.orgId, orgId), inArray(invoices.status, ["sent", "paid"])))
    .orderBy(desc(invoices.issuedAt));
}

async function loadInvoice(db: DB, invoiceId: string) {
  const [row] = await db
    .select({ invoice: invoices, org: organizations })
    .from(invoices)
    .innerJoin(organizations, eq(organizations.id, invoices.orgId))
    .where(eq(invoices.id, invoiceId));
  if (!row) return null;
  const pays = await db.select().from(payments).where(eq(payments.invoiceId, invoiceId)).orderBy(asc(payments.receivedAt));
  const paid = pays.reduce((s, p) => s + p.amount, 0);
  return { ...row, payments: pays, paid, balance: Math.max(0, row.invoice.total - paid) };
}

/** UPI deep link for paying an invoice from any UPI app, when PAYMENT_UPI_ID is set. */
export function upiLink(inv: Pick<Invoice, "number" | "total" | "currency">, balance: number) {
  const vpa = process.env.PAYMENT_UPI_ID;
  if (!vpa || inv.currency !== "INR" || balance <= 0) return null;
  const params = new URLSearchParams({
    pa: vpa,
    pn: process.env.PAYMENT_PAYEE_NAME ?? "amfire",
    am: (balance / 100).toFixed(2),
    cu: "INR",
    tn: `Invoice ${inv.number}`,
  });
  return `upi://pay?${params.toString()}`;
}
