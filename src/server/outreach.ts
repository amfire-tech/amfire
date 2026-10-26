// The outreach desk: prospects to contact, every touch with them, and the
// numbers that show what works. Prospects become leads when a conversation
// turns real; their touches go with them, so the Sales agent knows the history.

import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, notInArray, or, sql, type SQL } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { contentPosts, demos, interactions, leads, outreachNotes, prospects, responseTests, touches, type Prospect } from "@/db/schema";
import { site } from "@/config/site";
import { BUSINESS_TYPES } from "@/knowledge/catalog";
import {
  DAILY_TARGETS,
  MAX_MISSED_CALLS,
  OBJECTION_IDS,
  OUTCOME_IDS,
  PROSPECT_KIND_IDS,
  STREAK_MIN_TOUCHES,
  TOUCH_CHANNELS,
  objectionLabel,
  outcomeFor,
  type OutcomeId,
  type ProspectStatus,
} from "@/knowledge/outreach";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { addManualLead, ManualLeadSchema } from "./leads";

export class OutreachError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OutreachError";
  }
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const IST_OFFSET = 5.5 * HOUR;

/** Midnight in India for the day containing `d`. */
export function istDayStart(d: Date) {
  return new Date(Math.floor((d.getTime() + IST_OFFSET) / DAY) * DAY - IST_OFFSET);
}

/** "2026-10-27" for the Indian date of `d`. */
export function istDateKey(d: Date) {
  return new Date(d.getTime() + IST_OFFSET).toISOString().slice(0, 10);
}

function istHour(d: Date) {
  return new Date(d.getTime() + IST_OFFSET).getUTCHours();
}

/** A datetime-local value ("2026-10-27T11:00") read as Indian time. */
export function parseIstLocal(value: string | null | undefined) {
  if (!value) return undefined;
  const d = new Date(`${value.length === 16 ? `${value}:00` : value}+05:30`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined)
    .optional()
    .nullable();

const url = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (!v ? undefined : /^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.union([z.undefined(), z.url("Use a full web address.")]))
  .optional()
  .nullable();

// Without defaults, so a partial update never resets a field it didn't mention.
const prospectFields = {
  name: z.string().trim().min(1, "Add the business or person's name.").max(200),
  contactName: optional(120),
  contactRole: optional(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .transform((v) => v.replace(/[^\d+]/g, ""))
    .pipe(z.union([z.literal("").transform(() => undefined), z.string().regex(/^\+?\d{6,15}$/, "Enter a valid phone number.")]))
    .optional()
    .nullable(),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address.").trim().toLowerCase().max(200)])
    .transform((v) => v || undefined)
    .optional()
    .nullable(),
  website: url,
  linkedinUrl: url,
  mapsUrl: url,
  city: z.string().trim().min(1).max(80),
  area: optional(120),
  industry: optional(120),
  kind: z.enum(PROSPECT_KIND_IDS),
  tier: z.enum(["A", "B", "C"]),
  score: z.coerce.number().int().min(0).max(100),
  signal: optional(1000),
  brief: optional(4000),
  opener: optional(1000),
  sourceUrl: url,
  notes: optional(4000),
};

export const ProspectInput = z.object({
  ...prospectFields,
  city: prospectFields.city.default("Pune"),
  kind: prospectFields.kind.default("business"),
  tier: prospectFields.tier.default("C"),
  score: prospectFields.score.default(50),
});
export type ProspectInput = z.input<typeof ProspectInput>;

/** Digits that identify a phone number regardless of +91, spaces or a leading 0. */
export function phoneKey(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits || null;
}

function hostKey(website: string | null | undefined) {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const nameKey = (name: string, area: string | null | undefined) => `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}|${(area ?? "").toLowerCase().trim()}`;

/** Adds prospects, skipping any already on the desk (same phone, website, or name in the same area). */
export async function addProspects(db: DB, actor: Actor | null, inputs: ProspectInput[], opts: { source?: "owner" | "claude" | "import" } = {}) {
  assertStaff(actor);
  if (inputs.length === 0) throw new OutreachError("Nothing to add.");
  if (inputs.length > 200) throw new OutreachError("Add at most 200 prospects at a time.");
  const parsed = inputs.map((input) => ProspectInput.parse(input));

  const existing = await db
    .select({ name: prospects.name, area: prospects.area, phone: prospects.phone, website: prospects.website })
    .from(prospects);
  const phones = new Set(existing.map((p) => phoneKey(p.phone)).filter(Boolean));
  const hosts = new Set(existing.map((p) => hostKey(p.website)).filter(Boolean));
  const names = new Set(existing.map((p) => nameKey(p.name, p.area)));

  const created: Prospect[] = [];
  const skipped: { name: string; reason: string }[] = [];
  for (const p of parsed) {
    const phone = phoneKey(p.phone);
    const host = hostKey(p.website);
    const key = nameKey(p.name, p.area);
    if (phone && phones.has(phone)) {
      skipped.push({ name: p.name, reason: "same phone number already on the desk" });
      continue;
    }
    if (host && hosts.has(host)) {
      skipped.push({ name: p.name, reason: "same website already on the desk" });
      continue;
    }
    if (names.has(key)) {
      skipped.push({ name: p.name, reason: "same name in the same area already on the desk" });
      continue;
    }
    const [row] = await db
      .insert(prospects)
      .values({
        name: p.name,
        contactName: p.contactName ?? null,
        contactRole: p.contactRole ?? null,
        phone: p.phone ?? null,
        email: p.email ?? null,
        website: p.website ?? null,
        linkedinUrl: p.linkedinUrl ?? null,
        mapsUrl: p.mapsUrl ?? null,
        city: p.city,
        area: p.area ?? null,
        industry: p.industry ?? null,
        kind: p.kind,
        tier: p.tier,
        score: p.score,
        signal: p.signal ?? null,
        brief: p.brief ?? null,
        opener: p.opener ?? null,
        sourceUrl: p.sourceUrl ?? null,
        notes: p.notes ?? null,
        source: opts.source ?? "owner",
        createdBy: actor.userId,
      })
      .returning();
    created.push(row);
    if (phone) phones.add(phone);
    if (host) hosts.add(host);
    names.add(key);
  }
  if (created.length > 0) {
    await audit(db, { actorId: actor.userId, action: "prospects.added", subjectType: "prospect", data: { count: created.length, source: opts.source ?? "owner" } });
  }
  return { created, skipped };
}

/**
 * Reads pasted rows, from a spreadsheet (tabs) or a list (commas): the first
 * column is the name; a phone number, email and website are recognised in any
 * column; the remaining columns are the area and then the industry.
 */
export function parsePastedProspects(text: string, defaults: { kind?: string; industry?: string } = {}): ProspectInput[] {
  const rows: ProspectInput[] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line
      .split(line.includes("\t") ? "\t" : ",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length === 0) continue;
    const [name, ...rest] = cells;
    if (/^(name|business|company)$/i.test(name)) continue; // a header row
    const row: ProspectInput = { name, kind: (PROSPECT_KIND_IDS as readonly string[]).includes(defaults.kind ?? "") ? (defaults.kind as ProspectInput["kind"]) : "business" };
    const others: string[] = [];
    for (const cell of rest) {
      if (!row.phone && /^\+?[\d\s()-]{8,}$/.test(cell)) row.phone = cell;
      else if (!row.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cell)) row.email = cell;
      else if (!row.website && /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(cell)) row.website = cell;
      else others.push(cell);
    }
    row.area = others[0];
    row.industry = others[1] ?? defaults.industry;
    if (others.length > 2) row.notes = others.slice(2).join(" · ");
    rows.push(row);
  }
  return rows;
}

export const ProspectPatch = z.object(prospectFields).partial().extend({
  status: z.enum(["to_contact", "trying", "talking", "meeting", "lead", "partner", "not_now", "dropped"]).optional(),
  statusReason: optional(300),
  doNotContact: z.boolean().optional(),
  nextFollowUpAt: z.coerce.date().nullable().optional(),
});

export async function updateProspect(db: DB, actor: Actor | null, prospectId: string, input: z.input<typeof ProspectPatch>) {
  assertStaff(actor);
  const data = ProspectPatch.parse(input);
  const set: Partial<typeof prospects.$inferInsert> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    // null clears a field (e.g. nextFollowUpAt: null); undefined leaves it alone.
    if (value !== undefined) (set as Record<string, unknown>)[key] = value;
  }
  const [row] = await db.update(prospects).set(set).where(eq(prospects.id, prospectId)).returning();
  if (!row) throw new OutreachError("Prospect not found.");
  return row;
}

/**
 * What a touch's outcome does to the prospect: the status it moves to and when
 * to follow up. Pure, so the rules can be read and tested in one place.
 */
export function applyOutcome(
  p: Pick<Prospect, "status" | "missedCalls">,
  outcome: OutcomeId,
  opts: { now: Date; followUpAt?: Date; objection?: string | null },
): { status: ProspectStatus; statusReason?: string | null; missedCalls: number; nextFollowUpAt: Date | null; doNotContact?: true } {
  const { now } = opts;
  const after = (ms: number) => opts.followUpAt ?? new Date(now.getTime() + ms);
  const settled = p.status === "lead" || p.status === "partner";
  const keep = (next: ProspectStatus) => (settled ? p.status : next);
  // Early statuses only move forward on a contact attempt.
  const atLeastTrying = p.status === "to_contact" || p.status === "not_now" ? "trying" : p.status;

  switch (outcome) {
    case "no_answer":
    case "busy": {
      const missed = p.missedCalls + 1;
      if (!settled && missed >= MAX_MISSED_CALLS && (p.status === "to_contact" || p.status === "trying")) {
        return { status: "not_now", statusReason: `No answer after ${missed} calls`, missedCalls: missed, nextFollowUpAt: after(30 * DAY) };
      }
      return { status: keep(atLeastTrying), missedCalls: missed, nextFollowUpAt: after(outcome === "busy" ? 3 * HOUR : DAY) };
    }
    case "wrong_number":
      return { status: keep("dropped"), statusReason: "Wrong number", missedCalls: p.missedCalls, nextFollowUpAt: null };
    case "do_not_contact":
      return { status: keep("dropped"), statusReason: "Asked not to be contacted", missedCalls: 0, nextFollowUpAt: null, doNotContact: true };
    case "gatekeeper":
      return { status: keep(atLeastTrying), missedCalls: 0, nextFollowUpAt: after(DAY) };
    case "not_interested":
      return {
        status: keep("not_now"),
        statusReason: opts.objection ? objectionLabel(opts.objection) : "Not interested",
        missedCalls: 0,
        nextFollowUpAt: after(60 * DAY),
      };
    case "call_back":
      return { status: keep("talking"), missedCalls: 0, nextFollowUpAt: after(2 * DAY) };
    case "interested":
    case "demo_sent":
      return { status: keep(p.status === "meeting" ? "meeting" : "talking"), missedCalls: 0, nextFollowUpAt: after(DAY) };
    case "meeting_booked":
      return { status: keep("meeting"), missedCalls: 0, nextFollowUpAt: after(DAY) };
    case "sent":
      return { status: keep(atLeastTrying), missedCalls: p.missedCalls, nextFollowUpAt: after(2 * DAY) };
    case "replied":
      return { status: keep(p.status === "meeting" ? "meeting" : "talking"), missedCalls: 0, nextFollowUpAt: after(0) };
    case "met":
      return { status: keep(p.status === "meeting" ? "meeting" : "talking"), missedCalls: 0, nextFollowUpAt: after(2 * DAY) };
    case "noted":
      return { status: p.status, missedCalls: p.missedCalls, nextFollowUpAt: opts.followUpAt ?? null };
  }
}

export const TouchInput = z
  .object({
    prospectId: z.uuid(),
    channel: z.enum(TOUCH_CHANNELS),
    outcome: z.enum(OUTCOME_IDS, { error: "Choose what happened." }),
    objection: z
      .union([z.literal(""), z.enum(OBJECTION_IDS)])
      .transform((v) => v || undefined)
      .optional()
      .nullable(),
    note: optional(4000),
    durationSec: z.coerce.number().int().min(0).max(36_000).optional().nullable(),
    followUpAt: z.coerce.date().optional().nullable(),
    occurredAt: z.coerce.date().optional().nullable(),
  })
  .refine((t) => (outcomeFor(t.outcome)?.channels as readonly string[]).includes(t.channel), {
    message: "That outcome doesn't fit this channel.",
    path: ["outcome"],
  });

export async function logTouch(db: DB, actor: Actor | null, input: z.input<typeof TouchInput>, opts: { loggedBy?: "owner" | "claude"; now?: Date } = {}) {
  assertStaff(actor);
  const data = TouchInput.parse(input);
  const now = opts.now ?? new Date();
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(prospects).where(eq(prospects.id, data.prospectId));
    if (!p) throw new OutreachError("Prospect not found.");
    const occurredAt = data.occurredAt ?? now;
    const [touch] = await tx
      .insert(touches)
      .values({
        prospectId: p.id,
        channel: data.channel,
        outcome: data.outcome,
        objection: data.objection ?? null,
        note: data.note ?? null,
        durationSec: data.durationSec ?? null,
        loggedBy: opts.loggedBy ?? "owner",
        authorId: opts.loggedBy === "claude" ? null : actor.userId,
        occurredAt,
      })
      .returning();
    const next = applyOutcome(p, data.outcome, { now, followUpAt: data.followUpAt ?? undefined, objection: data.objection });
    const [prospect] = await tx
      .update(prospects)
      .set({
        status: next.status,
        statusReason: next.statusReason === undefined ? p.statusReason : next.statusReason,
        missedCalls: next.missedCalls,
        nextFollowUpAt: next.nextFollowUpAt,
        doNotContact: next.doNotContact ?? p.doNotContact,
        lastTouchAt: data.channel === "note" ? p.lastTouchAt : occurredAt,
        updatedAt: now,
      })
      .where(eq(prospects.id, p.id))
      .returning();
    // A prospect that is already a lead keeps the lead's history up to date.
    if (p.leadId && data.channel !== "note") {
      await tx.insert(interactions).values(touchInteraction(p.leadId, touch, actor.userId));
    }
    return { touch, prospect };
  });
}

function touchInteraction(
  leadId: string,
  t: { channel: string; outcome: string; objection: string | null; note: string | null; occurredAt: Date },
  authorId: string | null,
): typeof interactions.$inferInsert {
  const kind = t.channel === "visit" ? "meeting" : (t.channel as "call" | "whatsapp" | "email" | "linkedin" | "note");
  const summary = [outcomeFor(t.outcome)?.label ?? t.outcome, t.objection ? `objection: ${objectionLabel(t.objection)}` : null, t.note].filter(Boolean).join(" · ");
  return { leadId, kind, direction: t.channel === "note" ? null : t.outcome === "replied" ? "in" : "out", summary, occurredAt: t.occurredAt, authorId };
}

/** Turns a prospect into a lead in the sales pipeline, carrying the research and every touch with it. */
export async function convertToLead(db: DB, actor: Actor | null, prospectId: string) {
  assertStaff(actor);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
  if (!p) throw new OutreachError("Prospect not found.");
  if (p.leadId) throw new OutreachError("This prospect is already a lead.");
  const history = await db.select().from(touches).where(eq(touches.prospectId, p.id)).orderBy(asc(touches.occurredAt));
  const lastChannel = [...history].reverse().find((t) => t.channel !== "note")?.channel;

  const source = p.kind === "network" ? "referral" : lastChannel === "call" || lastChannel === "whatsapp" || lastChannel === "email" || lastChannel === "linkedin" ? lastChannel : "other";
  const phone = ManualLeadSchema.shape.phone.safeParse(p.phone ?? "");
  const email = ManualLeadSchema.shape.email.safeParse(p.email ?? "");
  const problem = [
    p.signal && `Why we called: ${p.signal}`,
    p.brief && `Research: ${p.brief}`,
    p.notes && `Notes: ${p.notes}`,
    phone.success && phone.data ? null : p.phone && `Phone: ${p.phone}`,
    history.length > 0 && `Outreach: ${history.length} touch${history.length === 1 ? "" : "es"} since ${istDateKey(history[0].occurredAt)}.`,
  ]
    .filter(Boolean)
    .join("\n");

  const { lead } = await addManualLead(db, actor, {
    source,
    sourceNote: `Outreach desk${p.area ? ` · ${p.area}` : ""}${p.kind === "ca_firm" ? " · CA firm" : ""}`,
    name: p.contactName || `${p.name} (owner)`,
    company: p.name,
    email: email.success ? (email.data ?? "") : "",
    phone: phone.success ? (phone.data ?? "") : "",
    problem: problem.length >= 10 ? problem : `${p.name}: interested after outreach.`,
    businessType: (BUSINESS_TYPES as readonly string[]).includes(p.industry ?? "") ? (p.industry as (typeof BUSINESS_TYPES)[number]) : "Something else",
  });

  const carried = history.filter((t) => t.channel !== "note" || t.note);
  if (carried.length > 0) await db.insert(interactions).values(carried.map((t) => touchInteraction(lead.id, t, t.authorId)));
  await db.update(prospects).set({ status: "lead", leadId: lead.id, nextFollowUpAt: null, updatedAt: new Date() }).where(eq(prospects.id, p.id));
  await audit(db, { actorId: actor.userId, action: "prospect.converted", subjectType: "prospect", subjectId: p.id, data: { leadId: lead.id } });
  return lead;
}

const ACTIVE: ProspectStatus[] = ["to_contact", "trying", "talking", "meeting"];

/** The next prospect to contact: follow-ups that are due first, then the best untouched ones. */
export async function nextInQueue(db: DB, actor: Actor | null, opts: { skip?: string[]; kind?: string; now?: Date } = {}) {
  assertStaff(actor);
  const now = opts.now ?? new Date();
  const where: (SQL | undefined)[] = [
    eq(prospects.doNotContact, false),
    inArray(prospects.status, ACTIVE),
    or(isNull(prospects.nextFollowUpAt), lte(prospects.nextFollowUpAt, now)),
    opts.skip?.length ? notInArray(prospects.id, opts.skip) : undefined,
    opts.kind ? eq(prospects.kind, opts.kind) : undefined,
  ];
  const order = [
    sql`case when ${prospects.nextFollowUpAt} is null then 1 else 0 end`,
    asc(prospects.nextFollowUpAt),
    asc(prospects.tier),
    desc(prospects.score),
    asc(prospects.createdAt),
  ];
  const [next] = await db.select().from(prospects).where(and(...where)).orderBy(...order).limit(1);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prospects)
    .where(and(...where));
  if (!next) return { prospect: null, remaining: 0, history: [], demo: null };
  const history = await db.select().from(touches).where(eq(touches.prospectId, next.id)).orderBy(desc(touches.occurredAt)).limit(5);
  return { prospect: next, remaining: count, history, demo: await demoSummary(db, next.id) };
}

export async function listProspects(
  db: DB,
  actor: Actor | null,
  filters: { status?: string; kind?: string; industry?: string; search?: string; dueOnly?: boolean; limit?: number; now?: Date } = {},
) {
  assertStaff(actor);
  const now = filters.now ?? new Date();
  const where: (SQL | undefined)[] = [
    filters.status ? eq(prospects.status, filters.status as ProspectStatus) : undefined,
    filters.kind ? eq(prospects.kind, filters.kind) : undefined,
    filters.industry ? eq(prospects.industry, filters.industry) : undefined,
    filters.search ? or(ilike(prospects.name, `%${filters.search}%`), ilike(prospects.area, `%${filters.search}%`), ilike(prospects.phone, `%${filters.search}%`)) : undefined,
    filters.dueOnly ? and(inArray(prospects.status, ACTIVE), lte(prospects.nextFollowUpAt, now), eq(prospects.doNotContact, false)) : undefined,
  ];
  const rows = await db
    .select()
    .from(prospects)
    .where(and(...where))
    .orderBy(desc(prospects.updatedAt))
    .limit(Math.min(filters.limit ?? 200, 500));
  const counts = await db
    .select({ status: prospects.status, count: sql<number>`count(*)::int` })
    .from(prospects)
    .groupBy(prospects.status);
  return { prospects: rows, counts };
}

export async function getProspect(db: DB, actor: Actor | null, prospectId: string) {
  assertStaff(actor);
  const [prospect] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
  if (!prospect) return null;
  const history = await db.select().from(touches).where(eq(touches.prospectId, prospectId)).orderBy(desc(touches.occurredAt));
  const [lead] = prospect.leadId ? await db.select({ id: leads.id, status: leads.status }).from(leads).where(eq(leads.id, prospect.leadId)) : [];
  const tests = await db.select().from(responseTests).where(eq(responseTests.prospectId, prospectId)).orderBy(desc(responseTests.sentAt));
  const [referral] = prospect.referralPostId ? await db.select().from(contentPosts).where(eq(contentPosts.id, prospect.referralPostId)) : [];
  return {
    prospect,
    history,
    lead: lead ?? null,
    demo: await demoSummary(db, prospectId),
    responseTests: tests,
    referral: referral ? { url: `${site.url}/go/${referral.slug}`, clicks: referral.clicks, slug: referral.slug } : null,
  };
}

/** The prospect's demo page, if Claude has built one: its link and how often it was opened. */
async function demoSummary(db: DB, prospectId: string) {
  const [d] = await db.select().from(demos).where(eq(demos.prospectId, prospectId));
  return d ? { url: `${site.url}/demo/${d.slug}`, views: d.views, chats: d.chats, lastViewedAt: d.lastViewedAt } : null;
}

export async function listTouches(db: DB, actor: Actor | null, opts: { since?: Date; until?: Date; channel?: string; limit?: number } = {}) {
  assertStaff(actor);
  const where = and(
    opts.since ? gte(touches.occurredAt, opts.since) : undefined,
    opts.until ? lte(touches.occurredAt, opts.until) : undefined,
    opts.channel ? eq(touches.channel, opts.channel as (typeof TOUCH_CHANNELS)[number]) : undefined,
  );
  return db
    .select({
      touch: touches,
      prospect: { id: prospects.id, name: prospects.name, area: prospects.area, industry: prospects.industry, kind: prospects.kind, tier: prospects.tier, signal: prospects.signal, status: prospects.status },
    })
    .from(touches)
    .innerJoin(prospects, eq(prospects.id, touches.prospectId))
    .where(where)
    .orderBy(desc(touches.occurredAt))
    .limit(Math.min(opts.limit ?? 200, 1000));
}

export const CallAnalysis = z.object({
  touchId: z.uuid(),
  transcript: optional(100_000),
  recordingRef: optional(500),
  durationSec: z.coerce.number().int().min(0).max(36_000).optional().nullable(),
  analysis: z
    .object({
      summary: z.string().max(2000),
      outcomeReason: z.string().max(1000).optional(),
      objections: z.array(z.string().max(300)).max(20).optional(),
      ownerTalkShare: z.number().min(0).max(1).optional(),
      nextStepSecured: z.boolean().optional(),
      coaching: z.array(z.string().max(500)).max(10).optional(),
    })
    .optional(),
});

/** Claude attaches the transcript and review of a recorded call to the touch it belongs to. */
export async function attachCallAnalysis(db: DB, actor: Actor | null, input: z.input<typeof CallAnalysis>) {
  assertStaff(actor);
  const data = CallAnalysis.parse(input);
  const set: Partial<typeof touches.$inferInsert> = {};
  if (data.transcript !== undefined) set.transcript = data.transcript ?? null;
  if (data.recordingRef !== undefined) set.recordingRef = data.recordingRef ?? null;
  if (data.durationSec != null) set.durationSec = data.durationSec;
  if (data.analysis) set.analysis = data.analysis;
  if (Object.keys(set).length === 0) throw new OutreachError("Nothing to attach.");
  const [row] = await db.update(touches).set(set).where(eq(touches.id, data.touchId)).returning();
  if (!row) throw new OutreachError("Touch not found.");
  return row;
}

export const NoteInput = z.object({
  kind: z.enum(["review", "research", "playbook", "content"]),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(40_000),
});

export async function addOutreachNote(db: DB, actor: Actor | null, input: z.input<typeof NoteInput>, author: "owner" | "claude" = "claude") {
  assertStaff(actor);
  const data = NoteInput.parse(input);
  const [row] = await db.insert(outreachNotes).values({ ...data, author }).returning();
  return row;
}

export async function listOutreachNotes(db: DB, actor: Actor | null, opts: { kind?: string; limit?: number } = {}) {
  assertStaff(actor);
  return db
    .select()
    .from(outreachNotes)
    .where(opts.kind ? eq(outreachNotes.kind, opts.kind) : undefined)
    .orderBy(desc(outreachNotes.createdAt))
    .limit(opts.limit ?? 10);
}

type Funnel = { segment: string; prospects: number; contacted: number; reached: number; talked: number; meetings: number; leads: number; won: number };

/**
 * The scoreboard: today's activity against the targets, the streak, the last
 * week, and over 30 days what converts by industry, area and tier, which
 * objections come up and which hours people pick up.
 */
export async function getScoreboard(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const today = istDayStart(now);
  const since = new Date(today.getTime() - 29 * DAY);
  const recent = await db
    .select({ prospectId: touches.prospectId, channel: touches.channel, outcome: touches.outcome, objection: touches.objection, occurredAt: touches.occurredAt })
    .from(touches)
    .where(gte(touches.occurredAt, since));
  const all = await db
    .select({
      id: prospects.id,
      industry: prospects.industry,
      area: prospects.area,
      tier: prospects.tier,
      kind: prospects.kind,
      status: prospects.status,
      leadStatus: leads.status,
    })
    .from(prospects)
    .leftJoin(leads, eq(leads.id, prospects.leadId));

  const real = recent.filter((t) => t.channel !== "note");
  const byDay = new Map<string, { touches: number; conversations: number; meetings: number; calls: number }>();
  for (let i = 0; i < 30; i++) byDay.set(istDateKey(new Date(today.getTime() - i * DAY)), { touches: 0, conversations: 0, meetings: 0, calls: 0 });
  for (const t of real) {
    const day = byDay.get(istDateKey(t.occurredAt));
    if (!day) continue;
    const o = outcomeFor(t.outcome);
    day.touches++;
    if (t.channel === "call") day.calls++;
    if (o?.talked) day.conversations++;
    if (t.outcome === "meeting_booked") day.meetings++;
  }
  const todayKey = istDateKey(now);
  const todayStats = byDay.get(todayKey)!;

  let streak = 0;
  for (let i = todayStats.touches >= STREAK_MIN_TOUCHES ? 0 : 1; i < 30; i++) {
    if ((byDay.get(istDateKey(new Date(today.getTime() - i * DAY)))?.touches ?? 0) >= STREAK_MIN_TOUCHES) streak++;
    else break;
  }

  // Per prospect: the furthest they got.
  const reach = new Map<string, { contacted: boolean; reached: boolean; talked: boolean; meeting: boolean }>();
  const allTouches = await db.select({ prospectId: touches.prospectId, channel: touches.channel, outcome: touches.outcome }).from(touches);
  for (const t of allTouches) {
    if (t.channel === "note") continue;
    const r = reach.get(t.prospectId) ?? { contacted: false, reached: false, talked: false, meeting: false };
    const o = outcomeFor(t.outcome);
    r.contacted = true;
    r.reached ||= !!o?.reached;
    r.talked ||= !!o?.talked;
    r.meeting ||= t.outcome === "meeting_booked";
    reach.set(t.prospectId, r);
  }
  const funnel = (key: (p: (typeof all)[number]) => string | null) => {
    const groups = new Map<string, Funnel>();
    for (const p of all) {
      const segment = key(p) || "Not set";
      const g = groups.get(segment) ?? { segment, prospects: 0, contacted: 0, reached: 0, talked: 0, meetings: 0, leads: 0, won: 0 };
      const r = reach.get(p.id);
      g.prospects++;
      if (r?.contacted) g.contacted++;
      if (r?.reached) g.reached++;
      if (r?.talked) g.talked++;
      if (r?.meeting || p.status === "meeting" || p.status === "lead") g.meetings++;
      if (p.leadStatus) g.leads++;
      if (p.leadStatus === "won") g.won++;
      groups.set(segment, g);
    }
    return [...groups.values()].sort((a, b) => b.contacted - a.contacted || b.prospects - a.prospects);
  };

  const objections = new Map<string, number>();
  for (const t of real) if (t.objection) objections.set(t.objection, (objections.get(t.objection) ?? 0) + 1);

  const hours = new Map<number, { dials: number; reached: number }>();
  for (const t of real) {
    if (t.channel !== "call") continue;
    const h = istHour(t.occurredAt);
    const row = hours.get(h) ?? { dials: 0, reached: 0 };
    row.dials++;
    if (outcomeFor(t.outcome)?.reached) row.reached++;
    hours.set(h, row);
  }

  const due = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(prospects)
    .where(and(eq(prospects.doNotContact, false), inArray(prospects.status, ACTIVE), or(isNull(prospects.nextFollowUpAt), lte(prospects.nextFollowUpAt, now))));

  return {
    targets: DAILY_TARGETS,
    today: todayStats,
    streak,
    week: [...byDay.entries()].slice(0, 7).reverse().map(([day, s]) => ({ day, ...s })),
    last30: real.length,
    byIndustry: funnel((p) => p.industry),
    byArea: funnel((p) => p.area),
    byTier: funnel((p) => p.tier),
    byKind: funnel((p) => p.kind),
    objections: [...objections.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, label: objectionLabel(id), count })),
    hours: [...hours.entries()].sort((a, b) => a[0] - b[0]).map(([hour, h]) => ({ hour, ...h })),
    readyToContact: due[0]?.count ?? 0,
    totalProspects: all.length,
  };
}

// --- Response-time tests ---------------------------------------------------------
//
// The owner sends a business a genuine enquiry and times the reply. The result
// opens the pitch ("I enquired on Tuesday at 11 and heard back 26 hours later")
// and, across many businesses, becomes the Pune business response report.

export const RESPONSE_TEST_CHANNELS = ["whatsapp", "website", "call", "email"] as const;

export async function startResponseTest(db: DB, actor: Actor | null, input: { prospectId: string; channel: string; note?: string | null; sentAt?: Date }) {
  assertStaff(actor);
  const data = z
    .object({ prospectId: z.uuid(), channel: z.enum(RESPONSE_TEST_CHANNELS), note: optional(500), sentAt: z.coerce.date().optional() })
    .parse(input);
  const [row] = await db
    .insert(responseTests)
    .values({ prospectId: data.prospectId, channel: data.channel, note: data.note ?? null, sentAt: data.sentAt ?? new Date() })
    .returning();
  return row;
}

export async function markResponseTestReplied(db: DB, actor: Actor | null, testId: string, repliedAt = new Date()) {
  assertStaff(actor);
  const [row] = await db
    .update(responseTests)
    .set({ repliedAt })
    .where(and(eq(responseTests.id, testId), isNull(responseTests.repliedAt)))
    .returning();
  if (!row) throw new OutreachError("Test not found, or already marked as replied.");
  return row;
}

/** Every test with the business it was for, plus the numbers for the report. */
export async function listResponseTests(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const rows = await db
    .select({ test: responseTests, prospect: { id: prospects.id, name: prospects.name, area: prospects.area, industry: prospects.industry } })
    .from(responseTests)
    .innerJoin(prospects, eq(prospects.id, responseTests.prospectId))
    .orderBy(desc(responseTests.sentAt));
  const hours = (t: { sentAt: Date; repliedAt: Date | null }) => (t.repliedAt ? (t.repliedAt.getTime() - t.sentAt.getTime()) / HOUR : null);
  const settled = rows.filter((r) => r.test.repliedAt || now.getTime() - r.test.sentAt.getTime() > DAY);
  const times = settled.map((r) => hours(r.test)).filter((h): h is number => h !== null).sort((a, b) => a - b);
  return {
    tests: rows.map((r) => ({ ...r.test, prospect: r.prospect, hoursToReply: hours(r.test) })),
    summary: {
      tests: rows.length,
      settled: settled.length,
      replied: times.length,
      noReplyWithin24h: settled.filter((r) => (hours(r.test) ?? Infinity) > 24).length,
      medianHoursToReply: times.length ? times[Math.floor(times.length / 2)] : null,
      within1h: times.filter((h) => h <= 1).length,
    },
  };
}

// --- Recorded calls ---------------------------------------------------------------

/**
 * Finds the prospect a recorded call was with (by phone number) and the call
 * touch logged closest to when it happened, so Claude can attach the
 * transcript and review. A call that wasn't logged returns the prospect only.
 */
export async function findCallTouch(db: DB, actor: Actor | null, input: { phone: string; at: Date | string; windowMinutes?: number }) {
  assertStaff(actor);
  const key = phoneKey(input.phone);
  if (!key || key.length < 8) throw new OutreachError("Give the phone number from the recording.");
  const at = new Date(input.at);
  if (Number.isNaN(at.getTime())) throw new OutreachError("Give the time of the call.");
  const window = (input.windowMinutes ?? 120) * 60 * 1000;
  const candidates = await db.select().from(prospects).where(ilike(prospects.phone, `%${key.slice(-4)}%`));
  const prospect = candidates.find((p) => phoneKey(p.phone) === key);
  if (!prospect) return { prospect: null, touch: null };
  const calls = await db
    .select()
    .from(touches)
    .where(and(eq(touches.prospectId, prospect.id), eq(touches.channel, "call"), gte(touches.occurredAt, new Date(at.getTime() - window)), lte(touches.occurredAt, new Date(at.getTime() + window))));
  const touch = calls.sort((a, b) => Math.abs(a.occurredAt.getTime() - at.getTime()) - Math.abs(b.occurredAt.getTime() - at.getTime()))[0] ?? null;
  return { prospect: { id: prospect.id, name: prospect.name, status: prospect.status }, touch: touch ? { id: touch.id, outcome: touch.outcome, occurredAt: touch.occurredAt, hasTranscript: !!touch.transcript } : null };
}
