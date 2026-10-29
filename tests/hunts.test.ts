// Hunts run on each person's own Claude: personal connector keys, adding a
// teammate, and the queue (assigning, claiming without collisions, requeueing
// a run that never reported, finishing), plus the connector acting as the
// key's owner.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { huntRequests, users } from "@/db/schema";
import { AccessDenied, loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { handleMcpMessage } from "@/server/connector";
import {
  actorForConnectorKey,
  addTeammate,
  cancelHunt,
  claimHunt,
  createConnectorToken,
  finishHunt,
  listHunts,
  listRunners,
  requestHunt,
  revokeConnectorToken,
} from "@/server/hunts";

const HOUR = 60 * 60 * 1000;

let db: DB;
let owner: Actor;
let prashant: Actor;

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  const [u] = await db.select().from(users).where(eq(users.email, DEFAULT_OWNER_EMAIL));
  owner = await loadActor(db, u);
});

describe("the team", () => {
  test("only the owner adds a teammate, once", async () => {
    const user = await addTeammate(db, owner, { name: "Prashant", email: "Prashant@Example.in" });
    assert.equal(user.email, "prashant@example.in");
    prashant = await loadActor(db, user);
    assert.equal(prashant.internalRole, "staff");
    await assert.rejects(addTeammate(db, owner, { name: "Prashant", email: "prashant@example.in" }), /already in HQ/);
    await assert.rejects(addTeammate(db, prashant, { name: "X", email: "x@example.in" }), AccessDenied);
  });
});

describe("personal keys", () => {
  test("a key acts as its owner until revoked, and shows when their Claude last checked in", async () => {
    const { key, token } = await createConnectorToken(db, prashant, "Cloud routine");
    assert.match(key, /^amf_[\w-]{40,}$/);
    assert.notEqual(token.tokenHash, key); // only the hash is stored
    const now = new Date();
    const as = await actorForConnectorKey(db, key, now);
    assert.equal(as?.userId, prashant.userId);
    assert.equal(await actorForConnectorKey(db, `${key}x`), null);
    assert.equal(await actorForConnectorKey(db, "not-a-key"), null);

    const runners = await listRunners(db, owner, now);
    assert.equal(runners.length, 2);
    const me = runners.find((r) => r.id === owner.userId)!;
    const him = runners.find((r) => r.id === prashant.userId)!;
    assert.deepEqual([me.hasKey, me.online], [false, false]);
    assert.deepEqual([him.hasKey, him.online], [true, true]);

    await assert.rejects(revokeConnectorToken(db, owner, "00000000-0000-4000-8000-000000000000"), /not found/);
    await revokeConnectorToken(db, prashant, token.id);
    assert.equal(await actorForConnectorKey(db, key), null);
  });
});

describe("the hunt queue", () => {
  test("a hunt for Prashant waits for his Claude; one for anyone goes to whoever asks first", async () => {
    const forPrashant = await requestHunt(db, owner, { segment: "school", nearArea: "wakad", km: 4, count: 20, assignedTo: prashant.userId, brief: "Only CBSE" });
    assert.deepEqual(forPrashant.place, { city: "Pune", near: { area: "wakad", km: 4 } });
    const forAnyone = await requestHunt(db, prashant, { segment: "ca_firm", pincode: "4110", assignedTo: "" });

    // The owner can't take Prashant's hunt, only the open one.
    const mine = await claimHunt(db, owner);
    assert.equal(mine?.hunt.id, forAnyone.id);
    assert.match(mine!.instructions, /Find 25 CA firms with pin codes starting 4110, Pune/);
    assert.equal(await claimHunt(db, owner), null);

    const his = await claimHunt(db, prashant);
    assert.equal(his?.hunt.id, forPrashant.id);
    assert.match(his!.instructions, /within 4 km of wakad/);
    assert.match(his!.instructions, /The owner's notes: Only CBSE/);
    assert.equal(await claimHunt(db, prashant), null);

    await assert.rejects(finishHunt(db, owner, { huntId: forPrashant.id, added: 1, warm: 0, summary: "x" }), /claimed by you/);
    const done = await finishHunt(db, prashant, { huntId: forPrashant.id, added: 18, updated: 2, warm: 7, summary: "7 schools hiring STEM teachers." });
    assert.equal(done.status, "done");
    assert.deepEqual(done.result, { added: 18, updated: 2, warm: 7, summary: "7 schools hiring STEM teachers." });
    const failed = await finishHunt(db, owner, { huntId: forAnyone.id, error: "Usage limit reached" });
    assert.equal(failed.status, "failed");

    const list = await listHunts(db, owner);
    const row = list.find((h) => h.id === forPrashant.id)!;
    assert.deepEqual([row.requestedByName, row.assignedToName, row.claimedByName], [owner.name, "Prashant", "Prashant"]);
    assert.equal(list.find((h) => h.id === forAnyone.id)?.assignedToName, null);
  });

  test("a run that never reports goes back in the queue after 3 hours; only queued hunts can be cancelled", async () => {
    const h = await requestHunt(db, owner, { segment: "business", count: 10 });
    const t0 = new Date();
    assert.equal((await claimHunt(db, owner, t0))?.hunt.id, h.id);
    assert.equal(await claimHunt(db, prashant, new Date(t0.getTime() + HOUR)), null); // still running
    const again = await claimHunt(db, prashant, new Date(t0.getTime() + 4 * HOUR));
    assert.equal(again?.hunt.id, h.id);
    assert.equal(again?.hunt.claimedBy, prashant.userId);
    await assert.rejects(cancelHunt(db, owner, h.id), /hasn't started/);

    const later = await requestHunt(db, owner, { segment: "school" });
    await cancelHunt(db, owner, later.id);
    const [row] = await db.select().from(huntRequests).where(eq(huntRequests.id, later.id));
    assert.equal(row.status, "cancelled");
  });

  test("the connector acts as the key's owner", async () => {
    await requestHunt(db, owner, { segment: "school", count: 5, assignedTo: prashant.userId });
    const res = (await handleMcpMessage(db, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "claim_hunt", arguments: {} } }, prashant)) as {
      result: { content: { text: string }[]; isError?: boolean };
    };
    assert.ok(!res.result.isError, res.result.content[0].text);
    const claimed = JSON.parse(res.result.content[0].text);
    assert.equal(claimed.you, "Prashant");
    assert.equal(claimed.hunt.claimedBy, prashant.userId);

    const fin = (await handleMcpMessage(
      db,
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "finish_hunt", arguments: { huntId: claimed.hunt.id, added: 5, warm: 2, summary: "Done" } } },
      prashant,
    )) as { result: { content: { text: string }[] } };
    assert.equal(JSON.parse(fin.result.content[0].text).status, "done");

    // Without a personal key (the shared one), it's the owner, who has nothing queued.
    const shared = (await handleMcpMessage(db, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "claim_hunt", arguments: {} } })) as { result: { content: { text: string }[] } };
    assert.equal(JSON.parse(shared.result.content[0].text).hunt, null);
  });
});
