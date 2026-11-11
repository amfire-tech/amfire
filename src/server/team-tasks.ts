// The revenue team's task queue. HQ never runs Claude: the founder starts the
// runner on their laptop (scripts/team-runner.ts), which claims tasks here,
// runs Claude Code on their own subscription for each one, and submits a
// validated result. The rules that keep that safe:
//
// - Leases: a claimed task has a lease the runner renews. A laptop that went
//   to sleep loses it, and the task goes back in the queue.
// - Fences: every claim bumps the task's fence. A result carrying an older
//   fence (the laptop woke up after someone else took over) is refused, so a
//   task never completes twice.
// - Retries: a retryable failure waits and goes back in the queue, up to
//   maxAttempts; usage limits don't count as attempts.
// - Keys: the runner's own key works only here (/api/team). Each agent run
//   gets a short-lived run key for its one task, with read-only connector
//   tools. Neither ever acts as the owner, whoever created it.

import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { connectorTokens, huntRequests, prospects, type HuntRequest } from "@/db/schema";
import { SEGMENT_IDS, beltOf, type BeltId } from "@/knowledge/engine";
import { copyProblems, TASK_RESULTS, type MessagePackResult, type ResearchBatchResult } from "@/knowledge/team";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { upsertTargets } from "./engine";
import { HuntError } from "./hunts";
import { saveEmailDraft } from "./outreach-emails";
import { addOutreachNote, updateProspect } from "./outreach";

const MINUTE = 60 * 1000;
/** How long a claim lasts without a renewal. The runner renews every few minutes while working. */
export const LEASE_MS = 15 * MINUTE;
/** A run key outlives its lease by this much, then stops working whatever happens. */
const RUN_KEY_GRACE_MS = 10 * MINUTE;
/** Progress lines kept per task. */
const PROGRESS_CAP = 200;

/** The run no longer holds the task, or it doesn't exist: the runner drops its result (HTTP 409). */
export class TaskError extends HuntError {
  constructor(message: string) {
    super(message);
    this.name = "TaskError";
  }
}

/** The result doesn't match its task type's shape: the runner retries the run once (HTTP 422). */
export class ResultError extends HuntError {
  constructor(message: string) {
    super(message);
    this.name = "ResultError";
  }
}

// --- Task types ----------------------------------------------------------------------

const PlaceInput = z.object({
  city: z.string().trim().max(80).optional(),
  area: z.string().trim().max(80).optional(),
  near: z.object({ area: z.string().trim().max(80), km: z.number().min(0.5).max(100) }).optional(),
});

/** What each task type takes. The runner reads `payload` in the task packet. */
export const TASK_PAYLOADS = {
  /** Find and verify up to 10 new target accounts in a place. */
  research_batch: z.object({
    segment: z.enum(SEGMENT_IDS),
    place: PlaceInput,
    count: z.number().int().min(1).max(10).default(10),
    brief: z.string().trim().max(1000).optional(),
  }),
  /** Write the brief, opener, email draft and outline for up to 10 accounts. */
  message_pack: z.object({
    prospectIds: z.array(z.uuid()).min(1).max(10),
    brief: z.string().trim().max(1000).optional(),
  }),
} as const;
export type TaskType = keyof typeof TASK_PAYLOADS;
export const TASK_TYPES = Object.keys(TASK_PAYLOADS) as [TaskType, ...TaskType[]];

/** The connector tools a run key may call: reading only. Agents propose; the runner commits. */
export const RUN_TOOLS = new Set([
  "get_task_packet",
  "get_playbook",
  "get_engine_playbook",
  "get_engine_insights",
  "get_prospect",
  "list_prospects",
  "find_targets",
  "list_touches",
  "list_notes",
]);

/** Whether this caller may see and call a connector tool. Personal keys and the shared key keep every tool. */
export function toolAllowed(actor: Actor | undefined, tool: string) {
  if (!actor?.agent) return true;
  return actor.agent.kind === "run" && RUN_TOOLS.has(tool);
}

// --- Keys ------------------------------------------------------------------------------

const KEY_PREFIX = "amf_";
const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");
const newKey = () => `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;

/** The signed-in person's laptop runner key. Shown once; it works only for /api/team. */
export async function createRunnerKey(db: DB, actor: Actor | null, label = "Laptop runner") {
  assertStaff(actor);
  if (actor.agent) throw new TaskError("An agent can't create keys.");
  const key = newKey();
  const [row] = await db
    .insert(connectorTokens)
    .values({ userId: actor.userId, label: label.trim().slice(0, 60) || "Laptop runner", kind: "runner", tokenHash: hashKey(key), hint: key.slice(0, KEY_PREFIX.length + 6) })
    .returning();
  await audit(db, { actorId: actor.userId, action: "connector_token.created", subjectType: "connector_token", subjectId: row.id, data: { kind: "runner" } });
  return { key, token: row };
}

/** A key for one agent run: this task only, read-only tools, gone shortly after the lease. */
async function mintRunKey(db: DB, runner: RunnerActor, task: HuntRequest, now: Date) {
  const key = newKey();
  await db.insert(connectorTokens).values({
    userId: runner.userId,
    label: `Run ${task.type} ${task.id.slice(0, 8)}`,
    kind: "run",
    taskId: task.id,
    tokenHash: hashKey(key),
    hint: key.slice(0, KEY_PREFIX.length + 6),
    expiresAt: new Date((task.leaseExpiresAt ?? now).getTime() + RUN_KEY_GRACE_MS),
  });
  return key;
}

/** Run keys for a task stop working the moment it's finished, failed or handed back. */
async function revokeRunKeys(db: DB, taskId: string, now: Date) {
  await db
    .update(connectorTokens)
    .set({ revokedAt: now })
    .where(and(eq(connectorTokens.taskId, taskId), eq(connectorTokens.kind, "run"), isNull(connectorTokens.revokedAt)));
}

type RunnerActor = Actor & { internalRole: "owner" | "staff"; agent: NonNullable<Actor["agent"]> };

function assertRunner(actor: Actor | null): asserts actor is RunnerActor {
  assertStaff(actor);
  if (actor.agent?.kind !== "runner") throw new TaskError("Only the laptop runner's key can do this.");
}

// --- Creating tasks -----------------------------------------------------------------------

export const TaskInput = z.object({
  type: z.enum(TASK_TYPES),
  payload: z.record(z.string(), z.unknown()),
  priority: z.number().int().min(-100).max(100).default(0),
  /** A user id: whose runner should take it. Empty = anyone's. */
  assignedTo: z.uuid().optional(),
  parentId: z.uuid().optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
  maxAttempts: z.number().int().min(1).max(5).default(3),
});

/** Queues a task. The same idempotency key twice returns the first task. */
export async function createTask(db: DB, actor: Actor | null, input: z.input<typeof TaskInput>) {
  assertStaff(actor);
  if (actor.agent?.kind === "run") throw new TaskError("An agent run can't queue tasks.");
  const data = TaskInput.parse(input);
  const payload = TASK_PAYLOADS[data.type].parse(data.payload);
  if (data.idempotencyKey) {
    const [existing] = await db.select().from(huntRequests).where(eq(huntRequests.idempotencyKey, data.idempotencyKey));
    if (existing) return { task: existing, created: false };
  }
  const segment = "segment" in payload ? payload.segment : "manufacturer";
  const [task] = await db
    .insert(huntRequests)
    .values({
      type: data.type,
      segment,
      payload: payload as Record<string, unknown>,
      count: "count" in payload ? payload.count : "prospectIds" in payload ? payload.prospectIds.length : 0,
      brief: payload.brief ?? null,
      place: "place" in payload ? payload.place : {},
      priority: data.priority,
      assignedTo: data.assignedTo ?? null,
      requestedBy: actor.userId,
      parentId: data.parentId ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
      maxAttempts: data.maxAttempts,
    })
    .onConflictDoNothing({ target: huntRequests.idempotencyKey })
    .returning();
  if (!task) {
    // Two requests raced on the same key: the other one won.
    const [existing] = await db.select().from(huntRequests).where(eq(huntRequests.idempotencyKey, data.idempotencyKey!));
    return { task: existing, created: false };
  }
  await audit(db, { actorId: actor.userId, action: "task.queued", subjectType: "task", subjectId: task.id, data: { type: task.type } });
  return { task, created: true };
}

// --- The runner's side ----------------------------------------------------------------------

/**
 * Hands back every task whose lease ran out: to the queue while attempts
 * remain, else failed. Run before each claim, so no cron is needed.
 */
export async function requeueExpired(db: DB, now = new Date()) {
  const expired = await db
    .select()
    .from(huntRequests)
    .where(and(eq(huntRequests.status, "running"), lt(huntRequests.leaseExpiresAt, now)));
  for (const t of expired) {
    const last = t.attempts >= t.maxAttempts;
    await db
      .update(huntRequests)
      .set(
        last
          ? { status: "failed", finishedAt: now, error: "The runner stopped reporting (laptop asleep or closed) on the last attempt." }
          : { status: "queued", claimedBy: null, claimedAt: null, leaseExpiresAt: null, error: "The runner stopped reporting, so the task was queued again." },
      )
      .where(and(eq(huntRequests.id, t.id), eq(huntRequests.fence, t.fence), eq(huntRequests.status, "running")));
    await revokeRunKeys(db, t.id, now);
  }
  return expired.length;
}

export const ClaimInput = z.object({
  /** The task types this runner can do. */
  types: z.array(z.enum(TASK_TYPES)).min(1).default([...TASK_TYPES]),
});

/**
 * The next task for this runner: assigned to its person first, then anyone's;
 * highest priority, then oldest. Returns the task, its fence (send it with
 * every renewal and result) and a run key for the agent. Null when idle.
 */
export async function claimTask(db: DB, actor: Actor | null, input: z.input<typeof ClaimInput> = {}, now = new Date()) {
  assertRunner(actor);
  const { types } = ClaimInput.parse(input);
  await requeueExpired(db, now);
  const candidates = await db
    .select()
    .from(huntRequests)
    .where(
      and(
        eq(huntRequests.status, "queued"),
        inArray(huntRequests.type, types),
        or(eq(huntRequests.assignedTo, actor.userId), isNull(huntRequests.assignedTo)),
        or(isNull(huntRequests.nextAttemptAt), lte(huntRequests.nextAttemptAt, now)),
      ),
    )
    .orderBy(desc(huntRequests.priority), asc(huntRequests.createdAt))
    .limit(10);
  const ordered = [...candidates.filter((c) => c.assignedTo === actor.userId), ...candidates.filter((c) => c.assignedTo === null)];
  for (const c of ordered) {
    // Conditional on the fence it had, so two runners never take the same task.
    const [claimed] = await db
      .update(huntRequests)
      .set({
        status: "running",
        claimedBy: actor.userId,
        claimedAt: now,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        fence: sql`${huntRequests.fence} + 1`,
        attempts: sql`${huntRequests.attempts} + 1`,
        nextAttemptAt: null,
      })
      .where(and(eq(huntRequests.id, c.id), eq(huntRequests.status, "queued"), eq(huntRequests.fence, c.fence)))
      .returning();
    if (!claimed) continue;
    const runKey = await mintRunKey(db, actor, claimed, now);
    await audit(db, { actorId: actor.userId, action: "task.claimed", subjectType: "task", subjectId: claimed.id, data: { type: claimed.type, attempt: claimed.attempts } });
    return { task: claimed, fence: claimed.fence, leaseExpiresAt: claimed.leaseExpiresAt, runKey };
  }
  return null;
}

const Fenced = z.object({ taskId: z.uuid(), fence: z.number().int().min(1) });

/** The running task, only if this runner still holds it with this fence. */
async function heldTask(db: DB, runner: RunnerActor, taskId: string, fence: number) {
  const [task] = await db.select().from(huntRequests).where(eq(huntRequests.id, taskId));
  if (!task) throw new TaskError("No such task.");
  if (task.status !== "running" || task.fence !== fence || task.claimedBy !== runner.userId) {
    throw new TaskError("This run no longer holds the task (its lease ran out and it was handed on). Drop the result.");
  }
  return task;
}

export async function renewLease(db: DB, actor: Actor | null, input: z.input<typeof Fenced>, now = new Date()) {
  assertRunner(actor);
  const { taskId, fence } = Fenced.parse(input);
  await heldTask(db, actor, taskId, fence);
  const leaseExpiresAt = new Date(now.getTime() + LEASE_MS);
  await db.update(huntRequests).set({ leaseExpiresAt }).where(and(eq(huntRequests.id, taskId), eq(huntRequests.fence, fence)));
  await db
    .update(connectorTokens)
    .set({ expiresAt: new Date(leaseExpiresAt.getTime() + RUN_KEY_GRACE_MS) })
    .where(and(eq(connectorTokens.taskId, taskId), eq(connectorTokens.kind, "run"), isNull(connectorTokens.revokedAt)));
  return { leaseExpiresAt };
}

export const ProgressInput = Fenced.extend({ lines: z.array(z.string().trim().min(1).max(300)).min(1).max(50) });

/** What the run is doing ("Reading tofler.in/…"), shown live in HQ. Never raw page text. */
export async function reportProgress(db: DB, actor: Actor | null, input: z.input<typeof ProgressInput>, now = new Date()) {
  assertRunner(actor);
  const { taskId, fence, lines } = ProgressInput.parse(input);
  const task = await heldTask(db, actor, taskId, fence);
  const at = now.toISOString();
  const progress = [...task.progress, ...lines.map((text) => ({ at, text }))].slice(-PROGRESS_CAP);
  await db.update(huntRequests).set({ progress }).where(and(eq(huntRequests.id, taskId), eq(huntRequests.fence, fence)));
  return { kept: progress.length };
}

export const CompleteInput = Fenced.extend({ output: z.record(z.string(), z.unknown()) });

/**
 * The run's result: checked against its type's shape, then applied by HQ in
 * one transaction with the task marked done. Refused when the fence is stale,
 * so a task never completes (or applies) twice.
 */
export async function completeTask(db: DB, actor: Actor | null, input: z.input<typeof CompleteInput>, now = new Date()) {
  assertRunner(actor);
  const { taskId, fence, output } = CompleteInput.parse(input);
  const held = await heldTask(db, actor, taskId, fence);
  const schema = TASK_RESULTS[held.type as TaskType];
  if (!schema) throw new ResultError(`Unknown task type ${held.type}.`);
  const parsed = schema.safeParse(output);
  if (!parsed.success) throw new ResultError(parsed.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "result"}: ${i.message}`).join("; "));

  const task = await db.transaction(async (tx) => {
    const applied =
      held.type === "research_batch"
        ? await applyResearch(tx, actor, held, parsed.data as ResearchBatchResult)
        : await applyPacks(tx, actor, held, parsed.data as MessagePackResult);
    const [done] = await tx
      .update(huntRequests)
      .set({ status: "done", output: { result: parsed.data, applied: applied.report }, result: applied.summary, error: null, finishedAt: now, leaseExpiresAt: null })
      .where(and(eq(huntRequests.id, taskId), eq(huntRequests.fence, fence), eq(huntRequests.status, "running")))
      .returning();
    // Throwing here rolls back everything applied above.
    if (!done) throw new TaskError("This run no longer holds the task. Drop the result.");
    return done;
  });
  await revokeRunKeys(db, taskId, now);
  await audit(db, { actorId: actor.userId, action: "task.done", subjectType: "task", subjectId: taskId, data: { type: task.type } });
  return task;
}

// --- Applying results ------------------------------------------------------------------------

/** New targets go through the signal engine like any research: deduped (CIN first), scored. */
async function applyResearch(db: DB, actor: RunnerActor, task: HuntRequest, result: ResearchBatchResult) {
  const { segment, place } = TASK_PAYLOADS.research_batch.parse(task.payload);
  const inputs = result.targets.map((t) => ({
    prospect: { ...t.prospect, kind: segment, city: place.city ?? "Pune" },
    facts: t.facts,
    contacts: t.contacts,
    signals: t.signals,
  }));
  const rows = inputs.length ? await upsertTargets(db, actor, inputs, { source: "claude" }) : [];
  const added = rows.filter((r) => r.created).length;
  const warm = rows.filter((r) => (r.score ?? 0) >= 60).length;
  return {
    summary: { added, updated: rows.length - added, warm, summary: result.summary },
    report: { targets: rows.map((r) => ({ id: r.id, name: r.name, created: r.created, score: r.score })), rejected: result.rejected },
  };
}

const PACK_EMAIL = {
  preheader: "One hour of your plant head's time. The written study is yours to keep.",
  image: null,
  button: null,
  findingsTitle: "",
  findings: [],
  showMethod: false,
  replyLabel: "Yes, a short call works",
  ps: "",
  signRole: "Co-founder, amfire, Pune",
  footer: "Not relevant? Reply \u201cno\u201d and I won\u2019t write again.",
};

/**
 * Each pack: the brief and opener on the prospect, the email as a draft the
 * founder tests and sends, the outline as a note. Only the task's own
 * accounts; an opener or email that breaks the copy rules is held back.
 */
async function applyPacks(db: DB, actor: RunnerActor, task: HuntRequest, result: MessagePackResult) {
  const allowed = new Set(TASK_PAYLOADS.message_pack.parse(task.payload).prospectIds);
  const rows = await db.select().from(prospects).where(inArray(prospects.id, [...allowed]));
  const skipped: { prospectId: string; reason: string }[] = [];
  const held: { prospectId: string; what: string; problems: string[] }[] = [];
  let packed = 0;
  for (const pack of result.packs) {
    const p = rows.find((r) => r.id === pack.prospectId);
    if (!p) {
      skipped.push({ prospectId: pack.prospectId, reason: "not one of this task's accounts" });
      continue;
    }
    const openerProblems = copyProblems(pack.opener);
    if (openerProblems.length) held.push({ prospectId: p.id, what: "opener", problems: openerProblems });
    await updateProspect(db, actor, p.id, { brief: pack.brief, ...(openerProblems.length ? {} : { opener: pack.opener }) });
    if (pack.email) {
      const e = pack.email;
      const problems = copyProblems([e.subject, e.headline, e.opening, e.closing].join("\n"));
      if (problems.length) {
        held.push({ prospectId: p.id, what: "email", problems });
      } else {
        const who = p.contactName ?? p.name;
        await saveEmailDraft(
          db,
          actor,
          {
            prospectId: p.id,
            toEmail: e.toEmail ?? "",
            subject: e.subject,
            content: {
              ...PACK_EMAIL,
              eyebrow: `For ${who}, ${p.name}`.slice(0, 120),
              headline: e.headline,
              greeting: e.greeting,
              opening: e.opening,
              closing: e.closing,
              replyBody: `Hello, this is ${who} from ${p.name}. A short call about the plant study works for me.`.slice(0, 300),
              signName: actor.name,
            },
          },
          { draftedBy: "claude" },
        );
      }
    }
    await addOutreachNote(db, actor, { kind: "content", title: `Plant study outline: ${p.name}`, body: pack.outline });
    packed++;
  }
  return {
    summary: { added: 0, updated: packed, warm: 0, summary: result.summary },
    report: { packed, skipped, held },
  };
}

export const FailInput = Fenced.extend({
  error: z.string().trim().min(1).max(1000),
  /** Worth trying again (network, overload, a schema slip)? */
  retryable: z.boolean().default(false),
  retryAfterMs: z.number().int().min(0).max(24 * 60 * MINUTE).optional(),
  /** A usage limit: wait, but don't count it against the task's attempts. */
  usageLimit: z.boolean().default(false),
});

/** A failed run: back in the queue after a wait while attempts remain, else failed for good. */
export async function failTask(db: DB, actor: Actor | null, input: z.input<typeof FailInput>, now = new Date()) {
  assertRunner(actor);
  const data = FailInput.parse(input);
  const task = await heldTask(db, actor, data.taskId, data.fence);
  const attempts = data.usageLimit ? task.attempts - 1 : task.attempts;
  const again = (data.retryable || data.usageLimit) && attempts < task.maxAttempts;
  // Back off 2, 4, 8… minutes unless the runner knows better (a usage limit's reset time).
  const wait = data.retryAfterMs ?? 2 ** Math.max(attempts, 1) * MINUTE;
  const [updated] = await db
    .update(huntRequests)
    .set(
      again
        ? { status: "queued", claimedBy: null, claimedAt: null, leaseExpiresAt: null, attempts, nextAttemptAt: new Date(now.getTime() + wait), error: data.error }
        : { status: "failed", finishedAt: now, leaseExpiresAt: null, attempts, error: data.error },
    )
    .where(and(eq(huntRequests.id, data.taskId), eq(huntRequests.fence, data.fence), eq(huntRequests.status, "running")))
    .returning();
  await revokeRunKeys(db, data.taskId, now);
  await audit(db, { actorId: actor.userId, action: again ? "task.retry" : "task.failed", subjectType: "task", subjectId: data.taskId, data: { error: data.error } });
  return updated;
}

export const HeartbeatInput = z.object({
  version: z.string().max(40).optional(),
  host: z.string().max(80).optional(),
  claudeVersion: z.string().max(40).optional(),
  running: z.number().int().min(0).max(10).default(0),
  capacity: z.number().int().min(0).max(10).default(1),
  /** Paused for a usage limit until this time, if so. */
  pausedUntil: z.string().max(40).optional(),
});

/** The runner checks in, so HQ can show "team online" and when it was last seen. */
export async function runnerHeartbeat(db: DB, actor: Actor | null, input: z.input<typeof HeartbeatInput>, now = new Date()) {
  assertRunner(actor);
  const info = HeartbeatInput.parse(input);
  await db.update(connectorTokens).set({ heartbeatAt: now, lastUsedAt: now, runnerInfo: info }).where(eq(connectorTokens.id, actor.agent.tokenId));
  const [queued] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(huntRequests)
    .where(and(eq(huntRequests.status, "queued"), inArray(huntRequests.type, TASK_TYPES)));
  // Poll fast while there's work, slowly when idle.
  return { ok: true, queued: queued?.n ?? 0, pollAfterMs: (queued?.n ?? 0) > 0 ? 3000 : 30000 };
}

// --- The agent's side ------------------------------------------------------------------------

/** Everything an agent run needs for its one task: the task, and for a pack, the accounts. */
export async function taskPacket(db: DB, actor: Actor | null) {
  assertStaff(actor);
  const taskId = actor.agent?.kind === "run" ? actor.agent.taskId : null;
  if (!taskId) throw new TaskError("Only an agent run's key has a task packet.");
  const [task] = await db.select().from(huntRequests).where(eq(huntRequests.id, taskId));
  if (!task || task.status !== "running") throw new TaskError("This run's task is no longer running.");
  const packet: Record<string, unknown> = { taskId: task.id, type: task.type, attempt: task.attempts, payload: task.payload };
  if (task.type === "message_pack") {
    const ids = TASK_PAYLOADS.message_pack.parse(task.payload).prospectIds;
    packet.accounts = await db
      .select({ id: prospects.id, name: prospects.name, area: prospects.area, cin: prospects.cin, website: prospects.website, facts: prospects.facts, reason: prospects.reason, brief: prospects.brief })
      .from(prospects)
      .where(inArray(prospects.id, ids));
  }
  return packet;
}

// --- HQ's view ----------------------------------------------------------------------------------

/** Runners whose heartbeat is this recent count as online. */
export const RUNNER_ONLINE_MS = 2 * MINUTE;

/** The laptop runners: who, last check-in, whether online now and what they reported. */
export async function listTeamRunners(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const rows = await db
    .select()
    .from(connectorTokens)
    .where(and(eq(connectorTokens.kind, "runner"), isNull(connectorTokens.revokedAt)))
    .orderBy(desc(connectorTokens.heartbeatAt));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    label: r.label,
    hint: r.hint,
    heartbeatAt: r.heartbeatAt,
    online: !!r.heartbeatAt && now.getTime() - r.heartbeatAt.getTime() < RUNNER_ONLINE_MS,
    info: r.runnerInfo,
  }));
}

/** Cancels a task that hasn't started. A running one finishes or times out by itself. */
export async function cancelTask(db: DB, actor: Actor | null, taskId: string, now = new Date()) {
  assertStaff(actor);
  if (actor.agent) throw new TaskError("Only a person can cancel a task.");
  const [row] = await db
    .update(huntRequests)
    .set({ status: "cancelled", finishedAt: now })
    .where(and(eq(huntRequests.id, taskId), eq(huntRequests.status, "queued"), inArray(huntRequests.type, TASK_TYPES)))
    .returning();
  if (!row) throw new TaskError("Only a task that hasn't started can be cancelled.");
  await audit(db, { actorId: actor.userId, action: "task.cancelled", subjectType: "task", subjectId: row.id });
  return row;
}

/**
 * Manufacturers to choose from for a pack: active, not do-not-contact,
 * optionally in one belt, best first. `packed` = already has an opener.
 */
export async function packCandidates(db: DB, actor: Actor | null, opts: { belt?: BeltId } = {}) {
  assertStaff(actor);
  const rows = await db
    .select({ id: prospects.id, name: prospects.name, area: prospects.area, score: prospects.score, tier: prospects.tier, opener: prospects.opener, email: prospects.email, status: prospects.status })
    .from(prospects)
    .where(and(eq(prospects.kind, "manufacturer"), eq(prospects.doNotContact, false), inArray(prospects.status, ["to_contact", "trying", "talking", "meeting"])))
    .orderBy(desc(prospects.score));
  return rows
    .map((r) => ({ ...r, belt: beltOf(r.area), packed: !!r.opener }))
    .filter((r) => !opts.belt || r.belt === opts.belt);
}

/** Recent team tasks, newest first, for HQ. */
export async function listTasks(db: DB, actor: Actor | null, opts: { limit?: number } = {}) {
  assertStaff(actor);
  return db
    .select()
    .from(huntRequests)
    .where(inArray(huntRequests.type, TASK_TYPES))
    .orderBy(desc(huntRequests.createdAt))
    .limit(Math.min(opts.limit ?? 20, 100));
}

/** Everything the Revenue team page shows: recent tasks (with account names), the runners, and what's waiting. */
export async function teamBoard(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const tasks = await listTasks(db, actor, { limit: 25 });
  const ids = [...new Set(tasks.flatMap((t) => (t.type === "message_pack" ? ((t.payload.prospectIds as string[] | undefined) ?? []) : [])))];
  const names = new Map(ids.length ? (await db.select({ id: prospects.id, name: prospects.name }).from(prospects).where(inArray(prospects.id, ids))).map((p) => [p.id, p.name]) : []);
  const runners = await listTeamRunners(db, actor, now);
  return {
    tasks: tasks.map((t) => ({ ...t, accounts: ((t.payload.prospectIds as string[] | undefined) ?? []).map((id) => ({ id, name: names.get(id) ?? "Unknown account" })) })),
    runners,
    online: runners.some((r) => r.online),
    lastSeen: runners.map((r) => r.heartbeatAt).find(Boolean) ?? null,
    queued: tasks.filter((t) => t.status === "queued").length,
    running: tasks.filter((t) => t.status === "running").length,
  };
}
