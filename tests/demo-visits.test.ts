// Visits to the live operating-system demo, against a real (in-memory) PostgreSQL:
// a prospect's personal link names them and alerts the owner, staff and link
// checkers are never recorded, anonymous visits keep only coarse facts, and the
// browser's reports can't inflate time or add unknown modules.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { demoVisits, prospects, touches, users } from "@/db/schema";
import { loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { addProspects } from "@/server/outreach";
import { site } from "@/config/site";
import {
  demoLinkFor,
  demoVisitStats,
  describeAction,
  deviceOf,
  getDemoInvite,
  listDemoVisits,
  prospectDemoVisits,
  referrerHost,
  startDemoVisit,
  updateDemoVisit,
} from "@/server/demo-visits";

const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
const LAPTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";
const MIN = 60 * 1000;

let db: DB;
let owner: Actor;

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  const [u] = await db.select().from(users).where(eq(users.email, DEFAULT_OWNER_EMAIL));
  owner = await loadActor(db, u);
});

describe("live demo visits", () => {
  test("a personal link names the prospect, counts the visit and alerts once an hour", async () => {
    const [p] = (await addProspects(db, owner, [{ name: "Apex Pressings (Chakan)", phone: "9811100009", contactName: "Rohit Shah" }])).created;
    assert.equal(demoLinkFor(p), `${site.url}/demo?p=${p.linkToken}`);
    assert.deepEqual(await getDemoInvite(db, p.linkToken), { org: "Apex Pressings" });
    assert.equal(await getDemoInvite(db, "../etc"), null);
    assert.equal(await getDemoInvite(db, "zzzzzzzzzzzz"), null);

    const now = new Date("2026-11-13T10:00:00Z");
    const first = await startDemoVisit(db, { token: p.linkToken, page: "demo", userAgent: PHONE, geo: { city: "Pune" }, now });
    assert.ok(first?.id);
    assert.equal(first.alerted, true);

    const [after1] = await db.select().from(prospects).where(eq(prospects.id, p.id));
    assert.equal(after1.demoVisits, 1);
    assert.equal(after1.demoFirstVisitAt?.getTime(), now.getTime());
    const notes = await db.select().from(touches).where(eq(touches.prospectId, p.id));
    assert.ok(notes.some((t) => t.note?.startsWith("Opened the live demo for the first time")));

    const soon = await startDemoVisit(db, { token: p.linkToken, page: "demo", userAgent: PHONE, now: new Date(now.getTime() + 20 * MIN) });
    assert.equal(soon?.alerted, false, "a second visit within the hour doesn't alert again");
    const later = await startDemoVisit(db, { token: p.linkToken, page: "demo", userAgent: LAPTOP, now: new Date(now.getTime() + 3 * 60 * MIN) });
    assert.equal(later?.alerted, true);
    const notes2 = await db.select().from(touches).where(eq(touches.prospectId, p.id));
    assert.ok(notes2.some((t) => t.note?.startsWith("Opened the live demo again (visit 3)")));

    const theirs = await prospectDemoVisits(db, owner, p.id);
    assert.equal(theirs.length, 3);
    assert.equal(theirs[0].device, "desktop");
    assert.equal(theirs.at(-1)?.city, "Pune");
  });

  test("staff testing the link and automated link checkers are never recorded", async () => {
    const [p] = (await addProspects(db, owner, [{ name: "Checker Test Ltd", phone: "9811100010" }])).created;
    assert.equal(await startDemoVisit(db, { token: p.linkToken, page: "demo", userAgent: PHONE, viewerIsStaff: true }), null);
    assert.equal(await startDemoVisit(db, { token: p.linkToken, page: "demo", userAgent: "WhatsApp/2.23.20.0 A" }), null);
    assert.equal(await startDemoVisit(db, { token: p.linkToken, page: "demo", userAgent: null }), null);
    const [row] = await db.select().from(prospects).where(eq(prospects.id, p.id));
    assert.equal(row.demoVisits, 0);
  });

  test("an anonymous visit keeps only coarse facts", async () => {
    const v = await startDemoVisit(db, {
      page: "services",
      visitorId: "abc123def456",
      referrer: "https://www.linkedin.com/feed/",
      utm: { source: "linkedin", campaign: "pune-manufacturers" },
      geo: { city: "Mumbai", country: "IN" },
      userAgent: PHONE,
    });
    assert.ok(v?.id);
    assert.equal(v.alerted, false);
    const [row] = await db.select().from(demoVisits).where(eq(demoVisits.id, v.id));
    assert.equal(row.prospectId, null);
    assert.equal(row.page, "services");
    assert.equal(row.referrer, "linkedin.com");
    assert.equal(row.utmCampaign, "pune-manufacturers");
    assert.equal(row.device, "phone");
    assert.equal(row.visitorId, "abc123def456");
    assert.equal(Object.keys(row).some((k) => /ip/i.test(k) && k !== "utmSource"), false, "no IP column");

    // A token that matches nobody is just anonymous; a bad visitor id is dropped.
    const stray = await startDemoVisit(db, { token: "nobody000000", visitorId: "<script>", page: "demo", userAgent: LAPTOP });
    const [s] = await db.select().from(demoVisits).where(eq(demoVisits.id, stray!.id));
    assert.equal(s.prospectId, null);
    assert.equal(s.visitorId, null);
  });

  test("reports can't inflate time, add unknown modules or revive an old visit", async () => {
    const t0 = new Date("2026-11-13T12:00:00Z");
    const v = await startDemoVisit(db, { page: "demo", userAgent: LAPTOP, now: t0 });
    assert.ok(v);
    const at = (s: number) => new Date(t0.getTime() + s * 1000);

    assert.equal(await updateDemoVisit(db, v.id, { activeSeconds: 99_999, views: ["home", "trace", "hacker", "finance", "trace"], actions: ["approve:price", "cta", "<b>x</b>", 42] }, { now: at(30) }), true);
    let [row] = await db.select().from(demoVisits).where(eq(demoVisits.id, v.id));
    assert.equal(row.activeSeconds, 35, "capped at time since the visit began, plus a little slack");
    assert.deepEqual(row.views, ["home", "trace", "finance"]);
    assert.deepEqual(row.actions, ["approve:price", "cta"]);

    await updateDemoVisit(db, v.id, { activeSeconds: 10, views: ["orders"], actions: ["order:SO-1182"] }, { now: at(60) });
    [row] = await db.select().from(demoVisits).where(eq(demoVisits.id, v.id));
    assert.equal(row.activeSeconds, 35, "time never goes down");
    assert.deepEqual(row.views, ["home", "trace", "finance", "orders"]);
    assert.deepEqual(row.actions, ["approve:price", "cta", "order:SO-1182"]);

    assert.equal(await updateDemoVisit(db, v.id, { activeSeconds: 500 }, { now: at(7 * 60 * 60) }), false, "too long after the last report");
    assert.equal(await updateDemoVisit(db, "not-a-uuid", { activeSeconds: 5 }), false);
  });

  test("HQ lists visits, filters them, and is closed to non-staff", async () => {
    const all = await listDemoVisits(db, owner);
    assert.ok(all.length >= 6);
    const named = await listDemoVisits(db, owner, { who: "prospects" });
    assert.ok(named.every((r) => r.prospect?.name));
    const anon = await listDemoVisits(db, owner, { who: "anonymous" });
    assert.ok(anon.every((r) => r.prospect === null));
    const stats = await demoVisitStats(db, owner, { days: 7, now: new Date("2026-11-13T23:00:00Z") });
    assert.ok(stats.visits >= 6);
    assert.ok(stats.engaged >= 1);
    await assert.rejects(() => listDemoVisits(db, null));
    await assert.rejects(() => demoVisitStats(db, null));
  });

  test("helpers read devices, referrers and actions plainly", () => {
    assert.equal(deviceOf(PHONE), "phone");
    assert.equal(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
    assert.equal(deviceOf(LAPTOP), "desktop");
    assert.equal(referrerHost(`${site.url}/services`), null, "our own pages aren't a source");
    assert.equal(referrerHost("not a url"), null);
    assert.match(describeAction("approve:price"), /^Approved a decision: Price for Apex Motors/);
    assert.equal(describeAction("order:SO-1182"), "Opened order SO-1182");
    assert.equal(describeAction("cta"), "Clicked Start a conversation");
  });
});
