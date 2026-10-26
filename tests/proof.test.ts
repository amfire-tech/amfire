// The proof engine and partner programme, against a real (in-memory)
// PostgreSQL: demo pages and their open alerts, the AI salesperson's plain
// fallback, CA partner links and credit, response-time tests, and matching a
// call recording to the call that was logged.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { contentPosts, leads, prospects, touches, users } from "@/db/schema";
import { loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { TOOLS } from "@/server/connector";
import { askDemo, fallbackAnswer, getPublicDemo, recordDemoView, upsertDemo } from "@/server/demos";
import { followTrackedLink } from "@/server/growth";
import { addProspects, findCallTouch, getProspect, listResponseTests, logTouch, markResponseTestReplied, startResponseTest } from "@/server/outreach";
import { createPartnerLink, getPartners } from "@/server/partners";

const HOUR = 60 * 60 * 1000;

let db: DB;
let owner: Actor;

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  const [u] = await db.select().from(users).where(eq(users.email, DEFAULT_OWNER_EMAIL));
  owner = await loadActor(db, u);
});

const KNOWLEDGE = [
  "We sell Kajaria and Somany vitrified tiles, 2x2 and 2x4 feet.",
  "Showroom open Monday to Saturday, 10 am to 8 pm. Closed on Sunday.",
  "Free delivery within 10 km of Baner on orders above ₹25,000.",
  "We accept UPI, cards and bank transfer.",
].join("\n");

describe("demo pages", () => {
  test("a demo keeps its link when updated, and the public page shows nothing private", async () => {
    const [p] = (await addProspects(db, owner, [{ name: "Shree Tiles (Baner)", notes: "Owner seemed rude last time", phone: "9811100001" }])).created;
    const first = await upsertDemo(db, owner, { prospectId: p.id, knowledge: KNOWLEDGE, sampleQuestions: ["Do you have 2x4 tiles?"], audit: [{ title: "No WhatsApp button", finding: "Listing has no button", impact: "Lost enquiries", fix: "Add it" }] });
    assert.match(first.demo.slug, /^shree-tiles-[0-9a-f]{6}$/);
    assert.equal(first.demo.businessName, "Shree Tiles");
    assert.match(first.url, /\/demo\/shree-tiles-/);
    const again = await upsertDemo(db, owner, { prospectId: p.id, knowledge: `${KNOWLEDGE}\nParking available.` });
    assert.equal(again.demo.slug, first.demo.slug);
    const pub = await getPublicDemo(db, first.demo.slug);
    assert.deepEqual(Object.keys(pub ?? {}).sort(), ["audit", "businessName", "greeting", "sampleQuestions", "slug"]);
    assert.equal(JSON.stringify(pub).includes("rude"), false);
    assert.equal(await getPublicDemo(db, "../etc"), null);
    const found = await getProspect(db, owner, p.id);
    assert.equal(found?.demo?.url, first.url);
  });

  test("opening a demo alerts the owner once an hour, ignores staff, and moves the prospect up the queue", async () => {
    const [p] = (await addProspects(db, owner, [{ name: "Open Alert Clinic", phone: "9811100002" }])).created;
    const { demo } = await upsertDemo(db, owner, { prospectId: p.id, knowledge: KNOWLEDGE });
    const now = new Date("2026-10-28T06:00:00Z");

    assert.deepEqual(await recordDemoView(db, demo.slug, { viewerIsStaff: true, now }), { counted: false, alerted: false });
    assert.deepEqual(await recordDemoView(db, demo.slug, { now }), { counted: true, alerted: true });
    assert.deepEqual(await recordDemoView(db, demo.slug, { now: new Date(now.getTime() + 10 * 60_000) }), { counted: true, alerted: false });
    assert.deepEqual(await recordDemoView(db, demo.slug, { now: new Date(now.getTime() + 3 * HOUR) }), { counted: true, alerted: true });

    const notes = await db.select().from(touches).where(eq(touches.prospectId, p.id));
    assert.equal(notes.length, 2);
    assert.ok(notes.every((t) => t.channel === "note" && t.loggedBy === "system"));
    assert.ok(notes.some((t) => t.note?.startsWith("Opened their demo for the first time")));
    assert.ok(notes.some((t) => t.note?.includes("view 3")));
    const [after] = await db.select().from(prospects).where(eq(prospects.id, p.id));
    assert.equal(after.nextFollowUpAt?.getTime(), now.getTime() + 3 * HOUR);
    const found = await getProspect(db, owner, p.id);
    assert.equal(found?.demo?.views, 3);
  });

  test("without AI, the salesperson answers from the closest knowledge lines, or asks for a callback", async () => {
    assert.match(fallbackAnswer(KNOWLEDGE, "Are you open on Sunday?", "Shree Tiles").answer, /Closed on Sunday/);
    assert.equal(fallbackAnswer(KNOWLEDGE, "kya aapke paas marble hai", "Shree Tiles").canAnswer, false);
    const [p] = (await addProspects(db, owner, [{ name: "Fallback Showroom", phone: "9811100003" }])).created;
    const { demo } = await upsertDemo(db, owner, { prospectId: p.id, knowledge: KNOWLEDGE });
    const reply = await askDemo(db, demo.slug, "Do you deliver to Baner?");
    assert.match(reply.answer, /delivery/i);
    await assert.rejects(askDemo(db, "no-such-demo", "hi"), /not found/);
  });
});

describe("CA partners", () => {
  test("a partner link is created once, credits referred leads, and works out the share", async () => {
    const [ca] = (await addProspects(db, owner, [{ name: "Patil & Co (CA)", kind: "ca_firm", phone: "9811100004" }])).created;
    const { post, url } = await createPartnerLink(db, owner, ca.id);
    assert.equal(post.channel, "referral");
    assert.match(url, /\/go\/patil-co-/);
    assert.equal((await createPartnerLink(db, owner, ca.id)).post.id, post.id);
    const [after] = await db.select().from(prospects).where(eq(prospects.id, ca.id));
    assert.equal(after.status, "partner");

    const target = await followTrackedLink(db, post.slug);
    assert.match(target ?? "", /utm_medium=referral/);
    assert.match(target ?? "", /utm_campaign=partner/);
    const [clicked] = await db.select().from(contentPosts).where(eq(contentPosts.id, post.id));
    assert.equal(clicked.clicks, 1);

    await db.insert(leads).values({ publicRef: "ref-partner-1", name: "Referred", company: "Referred Co", goal: "not-sure", businessType: "Manufacturing", urgency: "month", problem: "Orders by hand", source: "referral", utmContent: post.slug });
    const [partner] = (await getPartners(db, owner)).filter((x) => x.prospect.id === ca.id);
    assert.equal(partner.clicks, 1);
    assert.equal(partner.leads, 1);
    assert.equal(partner.won, 0);
    assert.deepEqual(partner.share, {});
  });
});

describe("response-time tests", () => {
  test("timing a reply, and the report numbers", async () => {
    const [a, b] = (await addProspects(db, owner, [{ name: "Fast Replier", phone: "9811100005" }, { name: "Slow Replier", phone: "9811100006" }])).created;
    const now = new Date("2026-10-28T10:00:00Z");
    const t1 = await startResponseTest(db, owner, { prospectId: a.id, channel: "whatsapp", sentAt: new Date(now.getTime() - 5 * HOUR) });
    await markResponseTestReplied(db, owner, t1.id, new Date(now.getTime() - 4.5 * HOUR));
    await assert.rejects(markResponseTestReplied(db, owner, t1.id), /already/);
    await startResponseTest(db, owner, { prospectId: b.id, channel: "website", sentAt: new Date(now.getTime() - 30 * HOUR) });
    await assert.rejects(startResponseTest(db, owner, { prospectId: b.id, channel: "pigeon" }));

    const { tests, summary } = await listResponseTests(db, owner, now);
    assert.equal(tests.length, 2);
    assert.equal(tests.find((t) => t.prospect.id === a.id)?.hoursToReply, 0.5);
    assert.deepEqual(summary, { tests: 2, settled: 2, replied: 1, noReplyWithin24h: 1, medianHoursToReply: 0.5, within1h: 1 });
  });
});

describe("recorded calls", () => {
  test("a recording is matched to its prospect and the nearest logged call", async () => {
    const [p] = (await addProspects(db, owner, [{ name: "Recorded Call Co", phone: "+91 98111 00007" }])).created;
    const at = new Date("2026-10-28T06:00:00Z");
    await logTouch(db, owner, { prospectId: p.id, channel: "call", outcome: "no_answer" }, { now: new Date(at.getTime() - 3 * HOUR) });
    const { touch } = await logTouch(db, owner, { prospectId: p.id, channel: "call", outcome: "interested" }, { now: new Date(at.getTime() + 2 * 60_000) });

    const match = await findCallTouch(db, owner, { phone: "9811100007", at });
    assert.equal(match.prospect?.id, p.id);
    assert.equal(match.touch?.id, touch.id);
    const unlogged = await findCallTouch(db, owner, { phone: "919811100007", at: new Date(at.getTime() + 24 * HOUR) });
    assert.equal(unlogged.prospect?.id, p.id);
    assert.equal(unlogged.touch, null);
    assert.deepEqual(await findCallTouch(db, owner, { phone: "9000000000", at }), { prospect: null, touch: null });
  });

  test("the connector offers the new tools", () => {
    const names = TOOLS.map((t) => t.name);
    for (const n of ["create_demo", "find_call_touch", "list_response_tests", "list_partners"]) assert.ok(names.includes(n), n);
  });
});
