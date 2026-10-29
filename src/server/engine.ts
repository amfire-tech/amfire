// The signal engine. Claude (through the HQ connector) and the owner feed it
// targets: a school or firm, its facts, the people who decide and dated
// signals. It scores every lead on fit × trigger × timing × reach, runs each
// warm one through a play of touches across channels with a reason in every
// message, and every night re-learns its weights from what actually happened:
// which signals got conversations, which channels, steps, message variants,
// areas and hours worked. See src/server/engine-core.ts for the maths.

import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { buyingSignals, engineFeedback, engineRuns, engineStats, leads, prospectContacts, prospects, touches, type Prospect } from "@/db/schema";
import {
  CONTACT_ROLE_IDS,
  FEEDBACK_KIND_IDS,
  FIT_RULES,
  PLAYS,
  SEGMENT_IDS,
  SIGNAL_TYPES,
  SIGNAL_TYPE_IDS,
  WARM_SCORE,
  areaCentre,
  defaultPlay,
  playFor,
  segmentFor,
  segmentOf,
  signalType,
  signalTypesFor,
  type SegmentId,
} from "@/knowledge/engine";
import { type ProspectStatus } from "@/knowledge/outreach";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { whatsappLink } from "./brain";
import {
  coordsOf,
  draftText,
  fitScore,
  haversineKm,
  insightsFrom,
  learn,
  parseMapsCoords,
  pickVariant,
  scoreProspect,
  stepDue,
  type StatRow,
} from "./engine-core";
import { OutreachError, ProspectInput, addProspects, istDayStart, nameKey, phoneKey, sameSite } from "./outreach";

const DAY = 24 * 60 * 60 * 1000;
const ACTIVE: ProspectStatus[] = ["to_contact", "trying", "talking", "meeting"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Inputs -------------------------------------------------------------------------

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined)
    .optional()
    .nullable();

const webUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => (!v ? undefined : /^https?:\/\//i.test(v) ? v : `https://${v}`))
  .pipe(z.union([z.undefined(), z.url("Use a full web address.")]))
  .optional()
  .nullable();

export const ContactInput = z.object({
  name: z.string().trim().min(1, "Add the person's name.").max(120),
  title: text(80),
  role: z.enum(CONTACT_ROLE_IDS).default("decision_maker"),
  phone: z
    .string()
    .trim()
    .max(30)
    .transform((v) => v.replace(/[^\d+]/g, "") || undefined)
    .pipe(z.union([z.undefined(), z.string().regex(/^\+?\d{6,15}$/, "Enter a valid phone number.")]))
    .optional()
    .nullable(),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address.").trim().toLowerCase().max(200)])
    .transform((v) => v || undefined)
    .optional()
    .nullable(),
  linkedinUrl: webUrl,
  sourceUrl: webUrl,
  notes: text(1000),
});
export type ContactInput = z.input<typeof ContactInput>;

export const SignalInput = z.object({
  type: z.enum(SIGNAL_TYPE_IDS, { error: "Choose a signal type from the engine playbook." }),
  title: z.string().trim().min(3, "Say what happened, with specifics.").max(300),
  detail: text(2000),
  sourceUrl: webUrl,
  observedAt: z.coerce.date({ error: "Give the date it happened." }),
  expiresAt: z.coerce.date().optional().nullable(),
  confidence: z.coerce.number().min(0).max(1).optional(),
});
export type SignalInput = z.input<typeof SignalInput>;

const factValue = z.union([z.string().trim().max(200), z.number(), z.boolean()]);

export const FactsInput = z.object({
  facts: z.record(z.string().max(40), factValue.nullable()).optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "A pin code has 6 digits.")
    .optional()
    .nullable(),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  assetUrl: webUrl,
});

export class EngineError extends OutreachError {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

// --- Loading and scoring ----------------------------------------------------------

/** Learned weight per signal type, per segment. */
async function loadSignalWeights(db: DB) {
  const rows = await db.select().from(engineStats).where(eq(engineStats.dimension, "signal"));
  const out = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = out.get(r.segment) ?? new Map<string, number>();
    m.set(r.key, r.weight);
    out.set(r.segment, m);
  }
  return out;
}

/** Recomputes the score, tier, reason and breakdown of the given prospects (all when no ids). */
export async function rescoreProspects(db: DB, opts: { ids?: string[]; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  if (opts.ids && opts.ids.length === 0) return 0;
  const weights = await loadSignalWeights(db);
  const rows = await db
    .select()
    .from(prospects)
    .where(opts.ids ? inArray(prospects.id, opts.ids) : undefined);
  if (rows.length === 0) return 0;
  const ids = rows.map((r) => r.id);
  const contacts = await db.select().from(prospectContacts).where(inArray(prospectContacts.prospectId, ids));
  const sigs = await db.select().from(buyingSignals).where(inArray(buyingSignals.prospectId, ids));
  for (const p of rows) {
    const segment = segmentOf(p.kind);
    const result = scoreProspect({
      segment,
      facts: p.facts ?? {},
      prospect: p,
      contacts: contacts.filter((c) => c.prospectId === p.id),
      signals: sigs.filter((s) => s.prospectId === p.id),
      weights: weights.get(segment) ?? new Map(),
      now,
    });
    await db
      .update(prospects)
      .set({ score: result.score, tier: result.tier, scoreParts: result.parts, reason: result.reason, scoredAt: now })
      .where(eq(prospects.id, p.id));
  }
  return rows.length;
}

// --- Targets: a prospect with its facts, people and signals, in one go -------------------

export const TargetInput = z.object({
  prospectId: z.uuid().optional(),
  prospect: z.looseObject({ name: z.string() }).optional(),
  facts: FactsInput.shape.facts,
  pincode: FactsInput.shape.pincode,
  lat: FactsInput.shape.lat,
  lng: FactsInput.shape.lng,
  assetUrl: FactsInput.shape.assetUrl,
  contacts: z.array(z.unknown()).max(20).optional(),
  signals: z.array(z.unknown()).max(30).optional(),
});
export type TargetInput = z.input<typeof TargetInput>;

/** The prospect already on the desk with the same phone, website, or name in the same area. */
async function findExisting(db: DB, input: { name: string; phone?: string | null; website?: string | null; area?: string | null }) {
  const phone = phoneKey(input.phone);
  const key = nameKey(input.name, input.area);
  const all = await db.select({ id: prospects.id, name: prospects.name, area: prospects.area, phone: prospects.phone, website: prospects.website }).from(prospects);
  return all.find((p) => (phone && phoneKey(p.phone) === phone) || sameSite(p.website, input.website) || nameKey(p.name, p.area) === key) ?? null;
}

/**
 * Adds or enriches targets: creates the prospect if it isn't on the desk
 * (matched by phone, website, or name in the same area), merges its facts,
 * adds the people and the dated signals (skipping ones already there), and
 * rescores it. Returns each target's new score and what's still missing.
 */
export async function upsertTargets(db: DB, actor: Actor | null, inputs: TargetInput[], opts: { source?: "owner" | "claude" | "import"; now?: Date } = {}) {
  assertStaff(actor);
  if (inputs.length === 0) throw new EngineError("Nothing to add.");
  if (inputs.length > 100) throw new EngineError("Send at most 100 targets at a time.");
  const now = opts.now ?? new Date();
  const results: { id: string; name: string; created: boolean; contactsAdded: number; signalsAdded: number; skipped: string[] }[] = [];

  for (const raw of inputs) {
    const t = TargetInput.parse(raw);
    let prospect: Prospect | undefined;
    let created = false;
    if (t.prospectId) {
      [prospect] = await db.select().from(prospects).where(eq(prospects.id, t.prospectId));
      if (!prospect) throw new EngineError(`No prospect with id ${t.prospectId}.`);
    } else if (t.prospect) {
      const input = ProspectInput.parse(t.prospect);
      const existing = await findExisting(db, input);
      if (existing) {
        [prospect] = await db.select().from(prospects).where(eq(prospects.id, existing.id));
      } else {
        const { created: rows } = await addProspects(db, actor, [t.prospect as never], { source: opts.source ?? "claude" });
        prospect = rows[0];
        created = true;
      }
    } else {
      throw new EngineError("Give a prospectId or the prospect's details.");
    }
    if (!prospect) throw new EngineError("Couldn't add the prospect.");

    await setFacts(db, actor, prospect.id, { facts: t.facts ?? undefined, pincode: t.pincode, lat: t.lat, lng: t.lng, assetUrl: t.assetUrl }, { rescore: false });

    const skipped: string[] = [];
    let contactsAdded = 0;
    for (const c of t.contacts ?? []) {
      const r = await addContact(db, actor, prospect.id, c as ContactInput, { rescore: false });
      if (r.created) contactsAdded++;
      else skipped.push(`contact ${r.contact.name}: already there`);
    }
    let signalsAdded = 0;
    for (const s of t.signals ?? []) {
      const r = await addSignal(db, actor, prospect.id, s as SignalInput, { rescore: false, foundBy: opts.source === "owner" ? "owner" : "claude", now });
      if (r.created) signalsAdded++;
      else skipped.push(`signal "${r.signal.title}": already there`);
    }
    results.push({ id: prospect.id, name: prospect.name, created, contactsAdded, signalsAdded, skipped });
  }

  await rescoreProspects(db, { ids: results.map((r) => r.id), now });
  const scored = await db
    .select({ id: prospects.id, score: prospects.score, tier: prospects.tier, reason: prospects.reason, scoreParts: prospects.scoreParts })
    .from(prospects)
    .where(inArray(prospects.id, results.map((r) => r.id)));
  await audit(db, { actorId: actor.userId, action: "engine.targets_upserted", subjectType: "prospect", data: { count: results.length, created: results.filter((r) => r.created).length } });
  return results.map((r) => {
    const s = scored.find((x) => x.id === r.id);
    return { ...r, score: s?.score ?? null, tier: s?.tier ?? null, reason: s?.reason ?? null, parts: s?.scoreParts ?? null };
  });
}

export async function setFacts(db: DB, actor: Actor | null, prospectId: string, input: z.input<typeof FactsInput>, opts: { rescore?: boolean } = {}) {
  assertStaff(actor);
  const data = FactsInput.parse(input);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
  if (!p) throw new EngineError("Prospect not found.");
  const facts = { ...(p.facts ?? {}) };
  for (const [k, v] of Object.entries(data.facts ?? {})) {
    if (v === null || v === "") delete facts[k];
    else facts[k] = v;
  }
  const fromMaps = p.lat === null && data.lat == null ? parseMapsCoords(p.mapsUrl) : null;
  await db
    .update(prospects)
    .set({
      facts,
      pincode: data.pincode === undefined ? p.pincode : data.pincode,
      lat: data.lat === undefined ? (fromMaps?.[0] ?? p.lat) : data.lat,
      lng: data.lng === undefined ? (fromMaps?.[1] ?? p.lng) : data.lng,
      assetUrl: data.assetUrl === undefined ? p.assetUrl : (data.assetUrl ?? null),
      updatedAt: new Date(),
    })
    .where(eq(prospects.id, prospectId));
  if (opts.rescore !== false) await rescoreProspects(db, { ids: [prospectId] });
}

export async function addContact(db: DB, actor: Actor | null, prospectId: string, input: ContactInput, opts: { rescore?: boolean } = {}) {
  assertStaff(actor);
  const data = ContactInput.parse(input);
  const existing = await db.select().from(prospectContacts).where(eq(prospectContacts.prospectId, prospectId));
  const same = existing.find(
    (c) => c.name.toLowerCase() === data.name.toLowerCase() || (data.phone && phoneKey(c.phone) === phoneKey(data.phone)) || (data.email && c.email === data.email),
  );
  if (same) return { contact: same, created: false };
  const [p] = await db.select({ id: prospects.id, contactName: prospects.contactName }).from(prospects).where(eq(prospects.id, prospectId));
  if (!p) throw new EngineError("Prospect not found.");
  const [contact] = await db
    .insert(prospectContacts)
    .values({
      prospectId,
      name: data.name,
      title: data.title ?? null,
      role: data.role,
      phone: data.phone ?? null,
      email: data.email ?? null,
      linkedinUrl: data.linkedinUrl ?? null,
      sourceUrl: data.sourceUrl ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  // The desk's single contact field shows the first decision maker we find.
  if (!p.contactName && (data.role === "decision_maker" || data.role === "budget_owner")) {
    await db.update(prospects).set({ contactName: data.name, contactRole: data.title ?? null, updatedAt: new Date() }).where(eq(prospects.id, prospectId));
  }
  if (opts.rescore !== false) await rescoreProspects(db, { ids: [prospectId] });
  return { contact, created: true };
}

const dedupeKey = (type: string, sourceUrl: string | null | undefined, title: string) =>
  `${type}|${(sourceUrl ?? "").toLowerCase().replace(/\/+$/, "")}|${sourceUrl ? "" : title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 80)}`;

export async function addSignal(db: DB, actor: Actor | null, prospectId: string, input: SignalInput, opts: { rescore?: boolean; foundBy?: string; now?: Date } = {}) {
  assertStaff(actor);
  const data = SignalInput.parse(input);
  const [p] = await db.select({ id: prospects.id, kind: prospects.kind }).from(prospects).where(eq(prospects.id, prospectId));
  if (!p) throw new EngineError("Prospect not found.");
  const type = signalType(data.type)!;
  const segment = segmentOf(p.kind);
  if (type.segments !== "all" && !type.segments.includes(segment)) {
    throw new EngineError(`"${type.label}" is a signal for ${type.segments.map((s) => segmentFor(s).noun).join(", ")}, not ${segmentFor(segment).noun}.`);
  }
  const key = dedupeKey(data.type, data.sourceUrl, data.title);
  const [same] = await db.select().from(buyingSignals).where(and(eq(buyingSignals.prospectId, prospectId), eq(buyingSignals.dedupeKey, key)));
  if (same) return { signal: same, created: false };
  const [signal] = await db
    .insert(buyingSignals)
    .values({
      prospectId,
      type: data.type,
      title: data.title,
      detail: data.detail ?? null,
      sourceUrl: data.sourceUrl ?? null,
      observedAt: data.observedAt,
      expiresAt: data.expiresAt ?? (type.expires ? new Date(`${type.expires}T23:59:59+05:30`) : null),
      confidence: data.confidence ?? 0.8,
      foundBy: opts.foundBy ?? "owner",
      dedupeKey: key,
    })
    .returning();
  if (opts.rescore !== false) await rescoreProspects(db, { ids: [prospectId], now: opts.now });
  return { signal, created: true };
}

export async function removeSignal(db: DB, actor: Actor | null, signalId: string) {
  assertStaff(actor);
  const [s] = await db.delete(buyingSignals).where(eq(buyingSignals.id, signalId)).returning();
  if (!s) throw new EngineError("Signal not found.");
  await rescoreProspects(db, { ids: [s.prospectId] });
  return s;
}

export async function removeContact(db: DB, actor: Actor | null, contactId: string) {
  assertStaff(actor);
  const [c] = await db.delete(prospectContacts).where(eq(prospectContacts.id, contactId)).returning();
  if (!c) throw new EngineError("Contact not found.");
  await rescoreProspects(db, { ids: [c.prospectId] });
  return c;
}

// --- Plays ---------------------------------------------------------------------------

export async function startPlay(db: DB, actor: Actor | null, prospectId: string, playId?: string, now = new Date()) {
  assertStaff(actor);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
  if (!p) throw new EngineError("Prospect not found.");
  if (p.doNotContact) throw new EngineError("They asked not to be contacted.");
  if (p.status === "lead" || p.status === "dropped") throw new EngineError("This prospect is past the outreach stage.");
  const play = playId ? playFor(playId) : defaultPlay(segmentOf(p.kind));
  if (!play) throw new EngineError("Unknown play.");
  if (play.segment !== segmentOf(p.kind)) throw new EngineError(`"${play.name}" is a play for ${segmentFor(play.segment).noun}.`);
  const [row] = await db
    .update(prospects)
    .set({ play: play.id, playStep: 0, playStartedAt: now, playEndedReason: null, nextFollowUpAt: now, updatedAt: now })
    .where(eq(prospects.id, prospectId))
    .returning();
  await audit(db, { actorId: actor.userId, action: "engine.play_started", subjectType: "prospect", subjectId: prospectId, data: { play: play.id } });
  return row;
}

export async function stopPlay(db: DB, actor: Actor | null, prospectId: string, reason = "Stopped by the owner") {
  assertStaff(actor);
  const [row] = await db.update(prospects).set({ playEndedReason: reason, updatedAt: new Date() }).where(eq(prospects.id, prospectId)).returning();
  if (!row) throw new EngineError("Prospect not found.");
  return row;
}

// --- Location filters -------------------------------------------------------------------

export const PlaceFilter = z.object({
  segment: z.enum(SEGMENT_IDS).optional(),
  city: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
  pincode: z.string().trim().regex(/^\d{1,6}$/).optional(),
  /** A centre: coordinates, or a Pune locality name. */
  near: z
    .object({ lat: z.number().optional(), lng: z.number().optional(), area: z.string().optional(), km: z.number().min(0.5).max(500) })
    .optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  signalType: z.string().optional(),
});
export type PlaceFilter = z.input<typeof PlaceFilter>;

function placeMatcher(filter: z.infer<typeof PlaceFilter>) {
  const centre: [number, number] | null = filter.near
    ? filter.near.lat !== undefined && filter.near.lng !== undefined
      ? [filter.near.lat, filter.near.lng]
      : areaCentre(filter.near.area)
    : null;
  if (filter.near && !centre) throw new EngineError("Give coordinates, or a Pune locality the engine knows, for the distance filter.");
  return (p: Prospect) => {
    if (filter.segment && segmentOf(p.kind) !== filter.segment) return { ok: false as const };
    if (filter.city && p.city.toLowerCase() !== filter.city.toLowerCase()) return { ok: false as const };
    if (filter.area && !(p.area ?? "").toLowerCase().includes(filter.area.toLowerCase())) return { ok: false as const };
    if (filter.pincode && !(p.pincode ?? "").startsWith(filter.pincode)) return { ok: false as const };
    if (filter.minScore !== undefined && p.score < filter.minScore) return { ok: false as const };
    let distanceKm: number | null = null;
    let approximate = false;
    if (centre && filter.near) {
      const at = coordsOf(p);
      if (!at) return { ok: false as const };
      distanceKm = Math.round(haversineKm(centre, at.at) * 10) / 10;
      approximate = at.approximate;
      if (distanceKm > filter.near.km) return { ok: false as const };
    }
    return { ok: true as const, distanceKm, approximate };
  };
}

/** Ranked targets matching a place and segment filter, best first, with why. */
export async function findTargets(db: DB, actor: Actor | null, input: PlaceFilter & { status?: string; limit?: number } = {}) {
  assertStaff(actor);
  const filter = PlaceFilter.parse(input);
  const match = placeMatcher(filter);
  const rows = await db
    .select()
    .from(prospects)
    .where(input.status ? eq(prospects.status, input.status as ProspectStatus) : inArray(prospects.status, ACTIVE))
    .orderBy(desc(prospects.score));
  const withSignal = filter.signalType
    ? new Set((await db.select({ id: buyingSignals.prospectId }).from(buyingSignals).where(eq(buyingSignals.type, filter.signalType))).map((r) => r.id))
    : null;
  const out = [];
  for (const p of rows) {
    if (p.doNotContact) continue;
    if (withSignal && !withSignal.has(p.id)) continue;
    const m = match(p);
    if (!m.ok) continue;
    out.push({ prospect: p, distanceKm: m.distanceKm, approximate: m.approximate });
    if (out.length >= Math.min(input.limit ?? 100, 500)) break;
  }
  return out;
}

// --- Today's plays ----------------------------------------------------------------------

type ContactRow = typeof prospectContacts.$inferSelect;

/** The best person to use for a channel: the decision maker first, then anyone with that channel. */
function contactFor(channel: string, contacts: ContactRow[], p: Prospect) {
  const live = contacts.filter((c) => !c.doNotContact);
  const senior = (c: ContactRow) => c.role === "decision_maker" || c.role === "budget_owner";
  const has = (c: ContactRow) => (channel === "email" ? !!c.email : channel === "linkedin" ? !!c.linkedinUrl : channel === "visit" ? true : !!c.phone);
  const c = live.find((x) => senior(x) && has(x)) ?? live.find(has) ?? (channel === "visit" ? live.find(senior) : undefined);
  return {
    contact: c ?? null,
    name: c?.name ?? p.contactName,
    phone: c?.phone ?? p.phone,
    email: c?.email ?? p.email,
    linkedinUrl: c?.linkedinUrl ?? p.linkedinUrl,
  };
}

const SUBJECTS: Record<SegmentId, string> = {
  school: "CT & AI readiness note for {org}",
  ca_firm: "Peer review readiness check for {org}",
  business: "A demo for {org}",
};

/** What the owner does next for one prospect on a play: the step, the person, the drafted message and a one-tap link. */
export function draftNextStep(p: Prospect, contacts: ContactRow[], variantStats: Map<string, { trials: number; successes: number }>, ownerName: string) {
  const play = playFor(p.play);
  if (!play || p.playEndedReason || p.playStep >= play.steps.length) return null;
  const step = play.steps[p.playStep];
  const variant = pickVariant(play, p.playStep, variantStats, p.id)!;
  const segment = segmentOf(p.kind);
  const who = contactFor(step.channel, contacts, p);
  const values = { contact: who.name, org: p.name, owner: ownerName, segment, reason: p.reason, asset: p.assetUrl, area: p.area };
  const message = draftText(variant.text, values);
  const subject = draftText(SUBJECTS[segment], values);
  const href =
    step.channel === "email" && who.email
      ? `mailto:${who.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
      : step.channel === "whatsapp" && who.phone
        ? whatsappLink(who.phone, message)
        : step.channel === "call" && who.phone
          ? `tel:${who.phone.replace(/[^\d+]/g, "")}`
          : step.channel === "linkedin" && who.linkedinUrl
            ? who.linkedinUrl
            : step.channel === "visit" && p.mapsUrl
              ? p.mapsUrl
              : null;
  const signalId = p.scoreParts?.top?.[0]?.signalId;
  return {
    play: play.id,
    playName: play.name,
    stepIndex: p.playStep,
    steps: play.steps.length,
    channel: step.channel,
    goal: step.goal,
    variant: variant.id,
    contactId: who.contact?.id ?? null,
    contactName: who.name,
    subject: step.channel === "email" ? subject : null,
    message,
    href,
    missingChannel: !href && step.channel !== "visit",
    signalId: signalId && UUID.test(signalId) ? signalId : null,
    due: stepDue(p),
  };
}

async function variantStats(db: DB) {
  const rows = await db.select().from(engineStats).where(eq(engineStats.dimension, "variant"));
  return new Map(rows.map((r) => [r.key, { trials: r.trials, successes: r.successes }]));
}

/**
 * Today's work, best first: play steps that are due, warm leads ready to
 * start a play, and nearly-warm ones that need one more piece of research.
 */
export async function getEngineQueue(db: DB, actor: Actor | null, input: PlaceFilter & { now?: Date } = {}) {
  assertStaff(actor);
  const now = input.now ?? new Date();
  const endOfToday = new Date(istDayStart(now).getTime() + DAY);
  const filter = PlaceFilter.parse({ ...input, now: undefined });
  const match = placeMatcher(filter);
  const rows = (await db.select().from(prospects).where(and(inArray(prospects.status, ACTIVE), eq(prospects.doNotContact, false))).orderBy(desc(prospects.score))).filter(
    (p) => match(p).ok,
  );
  const ids = rows.map((r) => r.id);
  const contacts = ids.length ? await db.select().from(prospectContacts).where(inArray(prospectContacts.prospectId, ids)) : [];
  const stats = await variantStats(db);
  const owner = actor.name.split(" ")[0] || actor.name;

  const due = [];
  const ready = [];
  const warming = [];
  for (const p of rows) {
    const mine = contacts.filter((c) => c.prospectId === p.id);
    const distance = match(p);
    const place = distance.ok ? { distanceKm: distance.distanceKm, approximate: distance.approximate } : {};
    if (p.play && !p.playEndedReason) {
      const next = draftNextStep(p, mine, stats, owner);
      if (next?.due && next.due.getTime() < endOfToday.getTime()) due.push({ prospect: p, next, ...place });
    } else if (!p.lastTouchAt && p.status === "to_contact") {
      if (p.score >= WARM_SCORE) ready.push({ prospect: p, ...place });
      else if (p.score >= 40 && (p.scoreParts?.missing.length ?? 0) > 0) warming.push({ prospect: p, ...place });
    }
  }
  due.sort((a, b) => (a.next.due?.getTime() ?? 0) - (b.next.due?.getTime() ?? 0) || b.prospect.score - a.prospect.score);
  return { due, ready: ready.slice(0, 50), warming: warming.slice(0, 30), considered: rows.length };
}

// --- One prospect --------------------------------------------------------------------

export async function getProspectEngine(db: DB, actor: Actor | null, prospectId: string) {
  assertStaff(actor);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
  if (!p) return null;
  const [contacts, sigs, feedback, stats] = await Promise.all([
    db.select().from(prospectContacts).where(eq(prospectContacts.prospectId, prospectId)),
    db.select().from(buyingSignals).where(eq(buyingSignals.prospectId, prospectId)).orderBy(desc(buyingSignals.observedAt)),
    db.select().from(engineFeedback).where(eq(engineFeedback.prospectId, prospectId)).orderBy(desc(engineFeedback.createdAt)),
    variantStats(db),
  ]);
  const segment = segmentOf(p.kind);
  return {
    segment,
    contacts,
    signals: sigs,
    feedback,
    next: draftNextStep(p, contacts, stats, actor.name.split(" ")[0] || actor.name),
    plays: PLAYS.filter((pl) => pl.segment === segment),
    signalTypes: signalTypesFor(segment),
    fitRules: FIT_RULES[segment].map((r) => ({ fact: r.fact, label: r.label, hint: r.hint })),
  };
}

// --- Feedback --------------------------------------------------------------------------

export const FeedbackInput = z.object({
  prospectId: z.uuid(),
  kind: z.enum(FEEDBACK_KIND_IDS),
  signalId: z.uuid().optional().nullable(),
  touchId: z.uuid().optional().nullable(),
  note: text(1000),
});

export async function recordFeedback(db: DB, actor: Actor | null, input: z.input<typeof FeedbackInput>, givenBy: "owner" | "claude" = "owner") {
  assertStaff(actor);
  const data = FeedbackInput.parse(input);
  const [row] = await db
    .insert(engineFeedback)
    .values({ prospectId: data.prospectId, kind: data.kind, signalId: data.signalId ?? null, touchId: data.touchId ?? null, note: data.note ?? null, givenBy })
    .returning();
  // A stale signal stops counting at once; the rest waits for the learning run.
  if (data.kind === "signal_stale" && data.signalId) await db.update(buyingSignals).set({ expiresAt: new Date() }).where(eq(buyingSignals.id, data.signalId));
  await rescoreProspects(db, { ids: [data.prospectId] });
  return row;
}

// --- Learning -------------------------------------------------------------------------

/** Prospects researched before the engine keep their free-text reason as a signal, so they're scored and learned from too. */
async function backfillLegacySignals(db: DB) {
  const rows = await db
    .select({ id: prospects.id, signal: prospects.signal, createdAt: prospects.createdAt, sourceUrl: prospects.sourceUrl })
    .from(prospects)
    .leftJoin(buyingSignals, eq(buyingSignals.prospectId, prospects.id))
    .where(and(isNotNull(prospects.signal), isNull(buyingSignals.id)));
  for (const r of rows) {
    if (!r.signal?.trim()) continue;
    await db
      .insert(buyingSignals)
      .values({ prospectId: r.id, type: "legacy_note", title: r.signal.slice(0, 300), sourceUrl: r.sourceUrl, observedAt: r.createdAt, confidence: 0.7, foundBy: "engine", dedupeKey: "legacy" })
      .onConflictDoNothing();
  }
  return rows.length;
}

/**
 * The nightly learning run (also on demand): rebuilds every statistic from
 * the raw history, moves the weights, rescores every prospect with them, and
 * records what changed and what it learned.
 */
export async function runLearning(db: DB, actor: Actor | null, opts: { system?: boolean; trigger?: string; now?: Date } = {}) {
  if (!opts.system) assertStaff(actor);
  const now = opts.now ?? new Date();
  await backfillLegacySignals(db);

  const all = await db
    .select({ id: prospects.id, kind: prospects.kind, area: prospects.area, status: prospects.status, facts: prospects.facts, leadStatus: leads.status })
    .from(prospects)
    .leftJoin(leads, eq(leads.id, prospects.leadId));
  const sigs = await db.select({ id: buyingSignals.id, prospectId: buyingSignals.prospectId, type: buyingSignals.type, observedAt: buyingSignals.observedAt, expiresAt: buyingSignals.expiresAt }).from(buyingSignals);
  const history = await db
    .select({
      prospectId: touches.prospectId,
      channel: touches.channel,
      outcome: touches.outcome,
      occurredAt: touches.occurredAt,
      signalId: touches.signalId,
      play: touches.play,
      playStep: touches.playStep,
      variant: touches.variant,
    })
    .from(touches);
  const feedback = await db.select({ prospectId: engineFeedback.prospectId, signalId: engineFeedback.signalId, kind: engineFeedback.kind }).from(engineFeedback);

  const rows = learn({
    prospects: all.map((p) => ({ id: p.id, kind: p.kind, area: p.area, status: p.status, fit: fitScore(segmentOf(p.kind), p.facts ?? {}).fit, won: p.leadStatus === "won" })),
    signals: sigs,
    touches: history,
    feedback,
  });

  const before = await db.select().from(engineStats);
  const previous = new Map(before.map((r) => [`${r.segment}|${r.dimension}|${r.key}`, r.weight]));
  const changes = rows
    .map((r) => ({ segment: r.segment, dimension: r.dimension, key: r.key, from: previous.get(`${r.segment}|${r.dimension}|${r.key}`) ?? null, to: r.weight, trials: Math.round(r.trials * 10) / 10 }))
    .filter((c) => c.from === null || Math.abs(c.to - c.from) >= 0.01)
    .sort((a, b) => Math.abs(b.to - (b.from ?? b.to)) - Math.abs(a.to - (a.from ?? a.to)))
    .slice(0, 60);

  await db.transaction(async (tx) => {
    await tx.delete(engineStats);
    if (rows.length) await tx.insert(engineStats).values(rows.map((r) => ({ ...r, updatedAt: now })));
  });
  const scored = await rescoreProspects(db, { now });

  const fresh = await db.select({ id: prospects.id, kind: prospects.kind, score: prospects.score, facts: prospects.facts, play: prospects.play, playEndedReason: prospects.playEndedReason, status: prospects.status }).from(prospects);
  const deciders = new Set(
    (await db.select({ id: prospectContacts.prospectId, role: prospectContacts.role }).from(prospectContacts)).filter((c) => c.role === "decision_maker" || c.role === "budget_owner").map((c) => c.id),
  );
  const named = new Set((await db.select({ id: prospects.id }).from(prospects).where(isNotNull(prospects.contactName))).map((r) => r.id));
  const gaps = SEGMENT_IDS.map((segment) => {
    const mine = fresh.filter((p) => segmentOf(p.kind) === segment && ACTIVE.includes(p.status));
    return {
      segment,
      warmWithoutDecisionMaker: mine.filter((p) => p.score >= WARM_SCORE && !deciders.has(p.id) && !named.has(p.id)).length,
      withoutFacts: segment === "business" ? 0 : mine.filter((p) => Object.keys(p.facts ?? {}).length === 0).length,
      onPlay: mine.filter((p) => p.play && !p.playEndedReason).length,
    };
  });
  const insights = insightsFrom(rows, gaps);

  const [run] = await db
    .insert(engineRuns)
    .values({ trigger: opts.trigger ?? (opts.system ? "nightly" : "owner"), prospectsScored: scored, touchesRead: history.length, changes, insights, ranAt: now })
    .returning();
  return run;
}

/** What the engine knows now: per segment, what converts, what to hunt next, and its recent runs. */
export async function getEngineInsights(db: DB, actor: Actor | null) {
  assertStaff(actor);
  const [stats, runs, all, sigs] = await Promise.all([
    db.select().from(engineStats),
    db.select().from(engineRuns).orderBy(desc(engineRuns.ranAt)).limit(5),
    db.select({ id: prospects.id, kind: prospects.kind, score: prospects.score, status: prospects.status, play: prospects.play, playEndedReason: prospects.playEndedReason, lastTouchAt: prospects.lastTouchAt }).from(prospects),
    db.select({ prospectId: buyingSignals.prospectId, type: buyingSignals.type, expiresAt: buyingSignals.expiresAt }).from(buyingSignals),
  ]);
  const now = Date.now();
  const segments = SEGMENT_IDS.map((segment) => {
    const mine = all.filter((p) => segmentOf(p.kind) === segment);
    const ids = new Set(mine.map((p) => p.id));
    const seg = stats.find((s) => s.segment === segment && s.dimension === "segment");
    const counts = new Map<string, number>();
    for (const s of sigs) if (ids.has(s.prospectId) && (!s.expiresAt || s.expiresAt.getTime() > now)) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    const hunt = signalTypesFor(segment)
      .filter((t) => t.id !== "legacy_note")
      .map((t) => {
        const st = stats.find((s) => s.segment === segment && s.dimension === "signal" && s.key === t.id);
        return { type: t.id, label: t.label, weight: st?.weight ?? t.prior, learned: !!st, trials: st?.trials ?? 0, successes: st?.successes ?? 0, prospectsWithIt: counts.get(t.id) ?? 0, untested: (st?.trials ?? 0) < 3 };
      })
      .sort((a, b) => b.weight - a.weight);
    const dim = (d: string) =>
      stats
        .filter((s) => s.segment === segment && s.dimension === d)
        .map((s) => ({ key: s.key, trials: s.trials, successes: s.successes, rate: s.trials ? s.successes / s.trials : 0, weight: s.weight, meetings: s.meetings, wins: s.wins }))
        .sort((a, b) => b.weight - a.weight);
    return {
      segment,
      label: segmentFor(segment).label,
      prospects: mine.length,
      warm: mine.filter((p) => p.score >= WARM_SCORE && ACTIVE.includes(p.status)).length,
      onPlay: mine.filter((p) => p.play && !p.playEndedReason && ACTIVE.includes(p.status)).length,
      contacted: seg?.trials ?? 0,
      engaged: seg?.successes ?? 0,
      meetings: seg?.meetings ?? 0,
      wins: seg?.wins ?? 0,
      hunt,
      channels: dim("channel"),
      steps: dim("step"),
      variants: dim("variant"),
      areas: dim("area"),
      fitBands: dim("fit_band"),
      hours: dim("hour"),
    };
  });
  return { segments, runs, lastRun: runs[0] ?? null };
}

export function enginePlaybook(weights?: StatRow[]) {
  return {
    warmScore: WARM_SCORE,
    scoring: "score = 100 × fit^0.3 × trigger^0.4 × timing^0.1 × reach^0.2. Trigger = 1 − Π(1 − weight × confidence × freshness) over live signals. Weights are learned nightly from outcomes.",
    segments: SEGMENT_IDS.map((id) => ({ ...segmentFor(id), fitFacts: FIT_RULES[id].map((r) => ({ fact: r.fact, label: r.label, hint: r.hint, weight: r.weight })) })),
    signalTypes: SIGNAL_TYPES.filter((t) => t.id !== "legacy_note").map((t) => ({
      ...t,
      learned: weights?.filter((w) => w.dimension === "signal" && w.key === t.id).map((w) => ({ segment: w.segment, weight: w.weight, trials: w.trials })) ?? [],
    })),
    plays: PLAYS.map((p) => ({ id: p.id, segment: p.segment, name: p.name, asset: p.asset, steps: p.steps.map((s) => ({ day: s.day, channel: s.channel, goal: s.goal, variants: s.variants.map((v) => v.id) })) })),
    contactRoles: CONTACT_ROLE_IDS,
    feedbackKinds: FEEDBACK_KIND_IDS,
  };
}

export async function loadStats(db: DB): Promise<StatRow[]> {
  return (await db.select().from(engineStats)).map((r) => ({ ...r, segment: r.segment as SegmentId }));
}
