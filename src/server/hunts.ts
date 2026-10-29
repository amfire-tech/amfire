// Hunts: requests to find warm leads, made from HQ and run by a person's own
// Claude. The website never runs Claude itself. Anthropic only allows a
// Claude plan to be used through that person's own Claude apps, so a request
// waits in a queue until their Claude Code (a cloud routine on claude.ai, or
// the app on their laptop) claims it through the HQ connector with their
// personal key, researches, and reports back.

import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { connectorTokens, huntRequests, memberships, organizations, users, type HuntRequest } from "@/db/schema";
import { SEGMENT_IDS, segmentFor, AREA_CENTRES } from "@/knowledge/engine";
import { assertOwner, assertStaff, loadActor, type Actor } from "./access";
import { audit } from "./audit";
import { OutreachError } from "./outreach";

const HOUR = 60 * 60 * 1000;
/** A claimed hunt with no report after this long goes back in the queue. */
const STALE_AFTER = 3 * HOUR;
/** A runner that called HQ within this window counts as online. */
const ONLINE_WITHIN = 2 * HOUR;

export class HuntError extends OutreachError {
  constructor(message: string) {
    super(message);
    this.name = "HuntError";
  }
}

// --- Personal connector keys ---------------------------------------------------------

const KEY_PREFIX = "amf_";
const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** A new key for the signed-in person. The key itself is returned once and never stored. */
export async function createConnectorToken(db: DB, actor: Actor | null, label: string) {
  assertStaff(actor);
  const name = label.trim().slice(0, 60) || "Claude";
  const key = `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  const [row] = await db
    .insert(connectorTokens)
    .values({ userId: actor.userId, label: name, tokenHash: hashKey(key), hint: key.slice(0, KEY_PREFIX.length + 6) })
    .returning();
  await audit(db, { actorId: actor.userId, action: "connector_token.created", subjectType: "connector_token", subjectId: row.id, data: { label: name } });
  return { key, token: row };
}

/** Your own keys; the owner sees everyone's, so a lost laptop's key can be revoked. */
export async function listConnectorTokens(db: DB, actor: Actor | null) {
  assertStaff(actor);
  return db
    .select({ token: connectorTokens, user: { id: users.id, name: users.name } })
    .from(connectorTokens)
    .innerJoin(users, eq(users.id, connectorTokens.userId))
    .where(and(isNull(connectorTokens.revokedAt), actor.internalRole === "owner" ? undefined : eq(connectorTokens.userId, actor.userId)))
    .orderBy(desc(connectorTokens.createdAt));
}

export async function revokeConnectorToken(db: DB, actor: Actor | null, tokenId: string) {
  assertStaff(actor);
  const [row] = await db
    .update(connectorTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(connectorTokens.id, tokenId), isNull(connectorTokens.revokedAt), actor.internalRole === "owner" ? undefined : eq(connectorTokens.userId, actor.userId)))
    .returning();
  if (!row) throw new HuntError("Key not found.");
  await audit(db, { actorId: actor.userId, action: "connector_token.revoked", subjectType: "connector_token", subjectId: row.id });
  return row;
}

/** The HQ person a personal key belongs to, if it's live and they're still staff. */
export async function actorForConnectorKey(db: DB, key: string, now = new Date()): Promise<Actor | null> {
  if (!key.startsWith(KEY_PREFIX) || key.length < 40) return null;
  const [row] = await db
    .select({ token: connectorTokens, user: { id: users.id, email: users.email, name: users.name } })
    .from(connectorTokens)
    .innerJoin(users, eq(users.id, connectorTokens.userId))
    .where(and(eq(connectorTokens.tokenHash, hashKey(key)), isNull(connectorTokens.revokedAt)));
  if (!row) return null;
  const actor = await loadActor(db, row.user);
  if (!actor.internalRole) return null;
  // Written at most every few minutes; it shows whether their Claude is running.
  if (!row.token.lastUsedAt || now.getTime() - row.token.lastUsedAt.getTime() > 5 * 60 * 1000) {
    await db.update(connectorTokens).set({ lastUsedAt: now }).where(eq(connectorTokens.id, row.token.id));
  }
  return actor;
}

// --- The team ----------------------------------------------------------------------

/** Everyone in HQ whose Claude can run hunts, and whether it has checked in lately. */
export async function listRunners(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const people = await db
    .select({ id: users.id, name: users.name, email: users.email, role: memberships.role })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(and(eq(organizations.kind, "internal"), inArray(memberships.role, ["owner", "staff"])))
    .orderBy(asc(users.name));
  const keys = await db.select({ userId: connectorTokens.userId, lastUsedAt: connectorTokens.lastUsedAt }).from(connectorTokens).where(isNull(connectorTokens.revokedAt));
  return people.map((p) => {
    const mine = keys.filter((k) => k.userId === p.id);
    const lastSeen = mine.map((k) => k.lastUsedAt?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0);
    return { ...p, hasKey: mine.length > 0, lastSeenAt: lastSeen ? new Date(lastSeen) : null, online: lastSeen > 0 && now.getTime() - lastSeen < ONLINE_WITHIN };
  });
}

export const TeammateInput = z.object({
  name: z.string().trim().min(1, "Add their name.").max(120),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(200),
});

/** The owner adds a teammate (e.g. a co-founder) to HQ. They sign in with an email link. */
export async function addTeammate(db: DB, actor: Actor | null, input: z.input<typeof TeammateInput>) {
  assertOwner(actor);
  const data = TeammateInput.parse(input);
  const [org] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.kind, "internal"));
  if (!org) throw new HuntError("HQ has no internal organisation yet.");
  return db.transaction(async (tx) => {
    let [user] = await tx.select().from(users).where(eq(users.email, data.email));
    if (!user) [user] = await tx.insert(users).values({ email: data.email, name: data.name }).returning();
    const [existing] = await tx.select().from(memberships).where(and(eq(memberships.userId, user.id), eq(memberships.orgId, org.id)));
    if (existing) throw new HuntError(`${user.name} is already in HQ.`);
    await tx.insert(memberships).values({ userId: user.id, orgId: org.id, role: "staff" });
    await audit(tx, { actorId: actor.userId, action: "team.member_added", subjectType: "user", subjectId: user.id, data: { email: user.email } });
    return user;
  });
}

// --- Hunt requests -------------------------------------------------------------------

const AREAS = Object.keys(AREA_CENTRES) as [string, ...string[]];

export const HuntInput = z.object({
  segment: z.enum(SEGMENT_IDS, { error: "Choose schools, CA firms or businesses." }),
  city: z.string().trim().max(80).optional(),
  area: z
    .string()
    .trim()
    .max(80)
    .transform((v) => v || undefined)
    .optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{0,6}$/, "A pin code has up to 6 digits.")
    .transform((v) => v || undefined)
    .optional(),
  nearArea: z.union([z.literal(""), z.enum(AREAS)]).optional(),
  km: z.coerce.number().min(0.5).max(100).optional(),
  count: z.coerce.number().int().min(5, "At least 5.").max(50, "At most 50 a hunt; queue another for more.").default(25),
  brief: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || undefined)
    .optional(),
  /** A user id, or empty for whoever's Claude is free. */
  assignedTo: z.union([z.literal(""), z.uuid()]).optional(),
});

export async function requestHunt(db: DB, actor: Actor | null, input: z.input<typeof HuntInput>) {
  assertStaff(actor);
  const data = HuntInput.parse(input);
  if (data.assignedTo) {
    const runners = await listRunners(db, actor);
    if (!runners.some((r) => r.id === data.assignedTo)) throw new HuntError("That person isn't in HQ.");
  }
  const place = {
    city: data.city || "Pune",
    ...(data.area ? { area: data.area } : {}),
    ...(data.pincode ? { pincode: data.pincode } : {}),
    ...(data.nearArea ? { near: { area: data.nearArea, km: data.km ?? 5 } } : {}),
  };
  const [row] = await db
    .insert(huntRequests)
    .values({ segment: data.segment, place, count: data.count, brief: data.brief ?? null, assignedTo: data.assignedTo || null, requestedBy: actor.userId })
    .returning();
  await audit(db, { actorId: actor.userId, action: "hunt.requested", subjectType: "hunt", subjectId: row.id, data: { segment: row.segment, count: row.count } });
  return row;
}

export async function cancelHunt(db: DB, actor: Actor | null, huntId: string) {
  assertStaff(actor);
  const [row] = await db
    .update(huntRequests)
    .set({ status: "cancelled", finishedAt: new Date() })
    .where(and(eq(huntRequests.id, huntId), eq(huntRequests.status, "queued")))
    .returning();
  if (!row) throw new HuntError("Only a hunt that hasn't started can be cancelled.");
  return row;
}

/** Recent hunts with who asked, who it's for and who ran it. */
export async function listHunts(db: DB, actor: Actor | null, opts: { limit?: number } = {}) {
  assertStaff(actor);
  const rows = await db
    .select()
    .from(huntRequests)
    .orderBy(desc(huntRequests.createdAt))
    .limit(Math.min(opts.limit ?? 15, 100));
  const ids = [...new Set(rows.flatMap((r) => [r.assignedTo, r.requestedBy, r.claimedBy]).filter((v): v is string => !!v))];
  const names = new Map(ids.length ? (await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids))).map((u) => [u.id, u.name]) : []);
  const name = (id: string | null) => (id ? (names.get(id) ?? "someone") : null);
  return rows.map((r) => ({ ...r, assignedToName: name(r.assignedTo), requestedByName: name(r.requestedBy), claimedByName: name(r.claimedBy) }));
}

/** What the hunter should do, in plain words, so a cloud run with no other context gets it right. */
export function huntInstructions(h: Pick<HuntRequest, "segment" | "place" | "count" | "brief">) {
  const where = [
    h.place.near ? `within ${h.place.near.km} km of ${h.place.near.area}` : null,
    h.place.area ? `in areas matching "${h.place.area}"` : null,
    h.place.pincode ? `with pin codes starting ${h.place.pincode}` : null,
    h.place.city ?? "Pune",
  ]
    .filter(Boolean)
    .join(", ");
  return [
    `Find ${h.count} ${segmentFor(h.segment).noun} ${where}, following the signal-hunt skill.`,
    "Each target needs fit facts, the decision maker with their published contact, and dated, sourced signals. Send them with upsert_targets.",
    h.brief ? `The owner's notes: ${h.brief}` : null,
    "When done, call finish_hunt with how many were added, how many existing ones were updated, how many now score 60+ (warm), and a 3–5 line summary.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * The next hunt for this person's Claude: one assigned to them, else one for
 * anyone, oldest first. A hunt that was claimed but never reported is put
 * back in the queue first. Returns null when there's nothing to do.
 */
export async function claimHunt(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  await db
    .update(huntRequests)
    .set({ status: "queued", claimedBy: null, claimedAt: null, error: "The last run didn't report back, so it was queued again." })
    .where(and(eq(huntRequests.status, "running"), lt(huntRequests.claimedAt, new Date(now.getTime() - STALE_AFTER))));
  const candidates = await db
    .select()
    .from(huntRequests)
    .where(and(eq(huntRequests.status, "queued"), or(eq(huntRequests.assignedTo, actor.userId), isNull(huntRequests.assignedTo))))
    .orderBy(asc(huntRequests.createdAt))
    .limit(10);
  // Their own requests before anyone's.
  const ordered = [...candidates.filter((c) => c.assignedTo === actor.userId), ...candidates.filter((c) => c.assignedTo === null)];
  for (const c of ordered) {
    // Conditional on still being queued, so two runners never take the same hunt.
    const [claimed] = await db
      .update(huntRequests)
      .set({ status: "running", claimedBy: actor.userId, claimedAt: now })
      .where(and(eq(huntRequests.id, c.id), eq(huntRequests.status, "queued")))
      .returning();
    if (claimed) return { hunt: claimed, instructions: huntInstructions(claimed) };
  }
  return null;
}

export const FinishInput = z.union([
  z.object({
    huntId: z.uuid(),
    added: z.number().int().min(0),
    updated: z.number().int().min(0).default(0),
    warm: z.number().int().min(0),
    summary: z.string().trim().min(1).max(2000),
  }),
  z.object({ huntId: z.uuid(), error: z.string().trim().min(1).max(1000) }),
]);

/** The runner reports back: what it added, or why it couldn't. */
export async function finishHunt(db: DB, actor: Actor | null, input: z.input<typeof FinishInput>, now = new Date()) {
  assertStaff(actor);
  const data = FinishInput.parse(input);
  const failed = "error" in data;
  const [row] = await db
    .update(huntRequests)
    .set(
      failed
        ? { status: "failed", error: data.error, finishedAt: now }
        : { status: "done", error: null, finishedAt: now, result: { added: data.added, updated: data.updated, warm: data.warm, summary: data.summary } },
    )
    .where(and(eq(huntRequests.id, data.huntId), eq(huntRequests.status, "running"), eq(huntRequests.claimedBy, actor.userId)))
    .returning();
  if (!row) throw new HuntError("No running hunt with that id was claimed by you.");
  await audit(db, { actorId: actor.userId, action: failed ? "hunt.failed" : "hunt.done", subjectType: "hunt", subjectId: row.id, data: row.result ?? { error: row.error } });
  return row;
}
