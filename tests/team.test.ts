// The revenue team's task queue and keys: the runner's key can never act as
// the owner, run keys only read and only for their task, a task is claimed by
// one runner at a time, a lease that runs out (a sleeping laptop) hands the
// task on and refuses the stale result, failures retry with backoff, usage
// limits don't use up attempts, and hunts stay separate from runner tasks.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { users } from "@/db/schema";
import { AccessDenied, assertOwner, loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { handleMcpMessage } from "@/server/connector";
import { actorForConnectorKey, claimHunt, requestHunt } from "@/server/hunts";
import { addProspects } from "@/server/outreach";
import {
  LEASE_MS,
  RUN_TOOLS,
  claimTask,
  completeTask,
  createRunnerKey,
  createTask,
  failTask,
  listTeamRunners,
  renewLease,
  reportProgress,
  runnerHeartbeat,
  TaskError,
} from "@/server/team-tasks";

const MINUTE = 60 * 1000;
const t0 = new Date("2026-11-09T04:30:00Z");
const at = (minutes: number) => new Date(t0.getTime() + minutes * MINUTE);

let db: DB;
let owner: Actor;
let runner: Actor;
let prospectId: string;

const listTools = async (actor: Actor) => {
  const res = (await handleMcpMessage(db, { jsonrpc: "2.0", id: 1, method: "tools/list" }, actor)) as { result: { tools: { name: string }[] } };
  return res.result.tools.map((t) => t.name);
};
const callTool = async (actor: Actor, name: string, args: Record<string, unknown> = {}) => {
  const res = (await handleMcpMessage(db, { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } }, actor)) as {
    result: { content: { text: string }[]; isError?: boolean };
  };
  return { text: res.result.content[0].text, isError: !!res.result.isError };
};
const pack = (key: string) => ({ type: "message_pack" as const, payload: { prospectIds: [prospectId] }, idempotencyKey: key });

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  const [u] = await db.select().from(users).where(eq(users.email, DEFAULT_OWNER_EMAIL));
  owner = await loadActor(db, u);
  const { key } = await createRunnerKey(db, owner);
  runner = (await actorForConnectorKey(db, key))!;
  const { created } = await addProspects(db, owner, [{ name: "Example Forgings Pvt Ltd", kind: "manufacturer", area: "Chakan" }]);
  prospectId = created[0].id;
});

describe("keys", () => {
  test("the owner's runner key acts as staff, never the owner, and sees no connector tools", async () => {
    assert.equal(owner.internalRole, "owner");
    assert.equal(runner.internalRole, "staff");
    assert.equal(runner.agent?.kind, "runner");
    assert.throws(() => assertOwner(runner), AccessDenied);
    assert.deepEqual(await listTools(runner), []);
    assert.equal((await callTool(runner, "list_prospects")).isError, true);
  });

  test("the heartbeat marks the runner online", async () => {
    const beat = await runnerHeartbeat(db, runner, { version: "0.1.0", host: "laptop", capacity: 1 }, t0);
    assert.equal(beat.ok, true);
    const [r] = await listTeamRunners(db, owner, at(1));
    assert.equal(r.online, true);
    assert.equal((await listTeamRunners(db, owner, at(10)))[0].online, false);
  });
});

describe("the queue", () => {
  test("the same request twice makes one task, and a bad payload is refused", async () => {
    const a = await createTask(db, owner, pack("pack-1"));
    const b = await createTask(db, owner, pack("pack-1"));
    assert.equal(a.created, true);
    assert.equal(b.created, false);
    assert.equal(b.task.id, a.task.id);
    await assert.rejects(createTask(db, owner, { type: "message_pack", payload: { prospectIds: [] } }));
    await assert.rejects(createTask(db, owner, { type: "research_batch", payload: { segment: "manufacturer", place: {}, count: 50 } }));
  });

  test("a run key reads its own task and nothing else, and can't write", async () => {
    const claim = (await claimTask(db, runner, {}, t0))!;
    assert.equal(claim.fence, 1);
    const run = (await actorForConnectorKey(db, claim.runKey, t0))!;
    assert.equal(run.agent?.kind, "run");
    assert.equal(run.internalRole, "staff");
    assert.deepEqual(new Set(await listTools(run)), RUN_TOOLS);
    const packet = JSON.parse((await callTool(run, "get_task_packet")).text);
    assert.equal(packet.taskId, claim.task.id);
    assert.equal(packet.accounts[0].name, "Example Forgings Pvt Ltd");
    const write = await callTool(run, "upsert_targets", { targets: [{ prospectId, facts: { plants: 9 } }] });
    assert.equal(write.isError, true);
    assert.match(write.text, /can't use upsert_targets/);
    await assert.rejects(claimTask(db, run, {}, t0), TaskError); // a run can't take more work
    await assert.rejects(createTask(db, run, pack("from-agent")), TaskError);

    // Done: the result is stored and the run key stops working at once.
    await reportProgress(db, runner, { taskId: claim.task.id, fence: 1, lines: ["Reading tofler.in/example"] }, at(1));
    const done = await completeTask(db, runner, { taskId: claim.task.id, fence: 1, output: { packs: 1 } }, at(2));
    assert.equal(done.status, "done");
    assert.equal(done.progress.length, 1);
    assert.equal(await actorForConnectorKey(db, claim.runKey, at(2)), null);
    assert.equal(await claimTask(db, runner, {}, at(3)), null);
  });

  test("a laptop that slept loses the task: it's handed on and the stale result is refused", async () => {
    const { task } = await createTask(db, owner, pack("pack-2"));
    const first = (await claimTask(db, runner, {}, t0))!;
    assert.equal(first.task.id, task.id);
    await renewLease(db, runner, { taskId: task.id, fence: first.fence }, at(10)); // still working: lease to t0+25
    assert.equal(await claimTask(db, runner, {}, at(20)), null); // not yet expired
    const second = (await claimTask(db, runner, {}, at(10 + LEASE_MS / MINUTE + 1)))!;
    assert.equal(second.task.id, task.id);
    assert.equal(second.fence, first.fence + 1);
    assert.equal(second.task.attempts, 2);
    assert.equal(await actorForConnectorKey(db, first.runKey, at(30)), null); // the old run's key is dead
    await assert.rejects(completeTask(db, runner, { taskId: task.id, fence: first.fence, output: { late: true } }, at(31)), TaskError);
    const done = await completeTask(db, runner, { taskId: task.id, fence: second.fence, output: { packs: 1 } }, at(32));
    assert.deepEqual(done.output, { packs: 1 });
  });

  test("failures back off and retry; a usage limit doesn't use up an attempt; the last failure sticks", async () => {
    const { task } = await createTask(db, owner, { ...pack("pack-3"), maxAttempts: 2 });
    let c = (await claimTask(db, runner, {}, t0))!;
    let failed = await failTask(db, runner, { taskId: task.id, fence: c.fence, error: "Usage limit reached", usageLimit: true, retryAfterMs: 60 * MINUTE }, at(1));
    assert.equal(failed.status, "queued");
    assert.equal(failed.attempts, 0);
    assert.equal(await claimTask(db, runner, {}, at(30)), null); // waiting for the reset
    c = (await claimTask(db, runner, {}, at(62)))!;
    failed = await failTask(db, runner, { taskId: task.id, fence: c.fence, error: "Network", retryable: true }, at(63));
    assert.equal(failed.status, "queued");
    assert.equal(failed.attempts, 1);
    assert.equal(await claimTask(db, runner, {}, at(64)), null); // backing off
    c = (await claimTask(db, runner, {}, at(70)))!;
    failed = await failTask(db, runner, { taskId: task.id, fence: c.fence, error: "Network again", retryable: true }, at(71));
    assert.equal(failed.status, "failed");
  });

  test("higher priority runs first, and hunts and runner tasks never cross", async () => {
    const low = await createTask(db, owner, pack("low"));
    const high = await createTask(db, owner, { ...pack("high"), priority: 100 });
    await requestHunt(db, owner, { segment: "school", count: 5 });
    const hunt = await claimHunt(db, owner, at(100));
    assert.equal(hunt?.hunt.type, "hunt");
    const first = (await claimTask(db, runner, {}, at(100)))!;
    assert.equal(first.task.id, high.task.id);
    const second = (await claimTask(db, runner, {}, at(101)))!;
    assert.equal(second.task.id, low.task.id);
    assert.equal(await claimHunt(db, owner, at(102)), null);
  });
});
