// The outreach desk and the HQ connector, against a real (in-memory)
// PostgreSQL: adding and de-duplicating prospects, what each outcome does,
// the call queue, turning a prospect into a lead, the scoreboard, and the
// MCP tools Claude uses.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { interactions, leads, prospects, touches, users } from "@/db/schema";
import { AccessDenied, loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { handleMcpMessage, TOOLS } from "@/server/connector";
import {
  addProspects,
  applyOutcome,
  convertToLead,
  getScoreboard,
  istDayStart,
  logTouch,
  nextInQueue,
  parseIstLocal,
  parsePastedProspects,
} from "@/server/outreach";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

let db: DB;
let owner: Actor;

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  const [u] = await db.select().from(users).where(eq(users.email, DEFAULT_OWNER_EMAIL));
  owner = await loadActor(db, u);
});

describe("prospects", () => {
  test("only staff can add them, and duplicates are skipped", async () => {
    await assert.rejects(addProspects(db, null, [{ name: "Shree Tiles" }]), AccessDenied);
    const first = await addProspects(db, owner, [
      { name: "Shree Tiles", phone: "+91 98220 11111", area: "Baner", industry: "Retail, showroom or shop", tier: "A", score: 80 },
      { name: "Kale Distributors", phone: "020-2444 5555", website: "kaledistributors.in", area: "Market Yard" },
    ]);
    assert.equal(first.created.length, 2);
    assert.equal(first.created[0].city, "Pune");
    assert.equal(first.created[1].website, "https://kaledistributors.in");

    const again = await addProspects(db, owner, [
      { name: "Shree Tiles & Sanitary", phone: "9822011111" }, // same number without +91
      { name: "Kale Dist.", website: "https://www.kaledistributors.in/contact" }, // same site
      { name: "shree tiles", area: "Baner" }, // same name, same area
      { name: "Shree Tiles", area: "Wakad" }, // a different branch
    ]);
    assert.equal(again.created.length, 1);
    assert.equal(again.skipped.length, 3);
  });

  test("pasted rows from a sheet or a list are read column by column", () => {
    const rows = parsePastedProspects("Name\tPhone\tArea\nSai Clinic\t98765 43210\tKothrud\tHealthcare, clinic or lab\n\nPatil & Co, patilco.in, 9876500000, Shivajinagar", { kind: "ca_firm" });
    assert.equal(rows.length, 2);
    assert.deepEqual(
      { name: rows[0].name, phone: rows[0].phone, area: rows[0].area, industry: rows[0].industry },
      { name: "Sai Clinic", phone: "98765 43210", area: "Kothrud", industry: "Healthcare, clinic or lab" },
    );
    assert.equal(rows[1].website, "patilco.in");
    assert.equal(rows[1].area, "Shivajinagar");
    assert.equal(rows[1].kind, "ca_firm");
  });

  test("datetime-local values are read as Indian time", () => {
    assert.equal(parseIstLocal("2026-10-27T11:00")?.toISOString(), "2026-10-27T05:30:00.000Z");
    assert.equal(parseIstLocal(""), undefined);
  });
});

describe("outcomes", () => {
  const now = new Date("2026-10-27T06:00:00Z");

  test("unanswered calls retry, and park the prospect after five", () => {
    const first = applyOutcome({ status: "to_contact", missedCalls: 0 }, "no_answer", { now });
    assert.equal(first.status, "trying");
    assert.equal(first.nextFollowUpAt?.getTime(), now.getTime() + DAY);
    const busy = applyOutcome({ status: "trying", missedCalls: 1 }, "busy", { now });
    assert.equal(busy.nextFollowUpAt?.getTime(), now.getTime() + 3 * HOUR);
    const fifth = applyOutcome({ status: "trying", missedCalls: 4 }, "no_answer", { now });
    assert.equal(fifth.status, "not_now");
    assert.match(fifth.statusReason ?? "", /5 calls/);
  });

  test("conversations move forward and never undo a lead", () => {
    assert.equal(applyOutcome({ status: "trying", missedCalls: 3 }, "interested", { now }).status, "talking");
    assert.equal(applyOutcome({ status: "trying", missedCalls: 3 }, "interested", { now }).missedCalls, 0);
    assert.equal(applyOutcome({ status: "talking", missedCalls: 0 }, "meeting_booked", { now }).status, "meeting");
    assert.equal(applyOutcome({ status: "meeting", missedCalls: 0 }, "no_answer", { now }).status, "meeting");
    assert.equal(applyOutcome({ status: "lead", missedCalls: 0 }, "not_interested", { now }).status, "lead");
    const later = new Date("2026-10-30T05:30:00Z");
    assert.equal(applyOutcome({ status: "talking", missedCalls: 0 }, "call_back", { now, followUpAt: later }).nextFollowUpAt, later);
  });

  test("no means no: not interested waits 60 days, do-not-contact stops for good", () => {
    const no = applyOutcome({ status: "trying", missedCalls: 0 }, "not_interested", { now, objection: "already_have" });
    assert.equal(no.status, "not_now");
    assert.equal(no.statusReason, "Already have someone / an agency");
    assert.equal(no.nextFollowUpAt?.getTime(), now.getTime() + 60 * DAY);
    const stop = applyOutcome({ status: "talking", missedCalls: 0 }, "do_not_contact", { now });
    assert.equal(stop.status, "dropped");
    assert.equal(stop.doNotContact, true);
    assert.equal(stop.nextFollowUpAt, null);
  });
});

describe("calling desk", () => {
  test("the queue puts due follow-ups first, then the best fresh prospects, and skips do-not-contact", async () => {
    const now = new Date("2026-10-27T05:00:00Z");
    const { created } = await addProspects(db, owner, [
      { name: "Queue C", tier: "C", score: 90, area: "Q" },
      { name: "Queue A", tier: "A", score: 60, area: "Q" },
      { name: "Queue Follow-up", tier: "C", score: 10, area: "Q" },
      { name: "Queue Stop", tier: "A", score: 99, area: "Q" },
    ]);
    const [c, a, follow, stop] = created;
    await logTouch(db, owner, { prospectId: follow.id, channel: "call", outcome: "call_back", followUpAt: new Date(now.getTime() - HOUR) }, { now: new Date(now.getTime() - 2 * DAY) });
    await logTouch(db, owner, { prospectId: stop.id, channel: "call", outcome: "do_not_contact" }, { now });

    // Only this batch: skip everything added in earlier tests.
    const others = (await db.select({ id: prospects.id, name: prospects.name }).from(prospects)).filter((p) => !p.name.startsWith("Queue")).map((p) => p.id);
    const first = await nextInQueue(db, owner, { now, skip: others });
    assert.equal(first.prospect?.id, follow.id);
    assert.equal(first.remaining, 3);
    assert.equal(first.history.length, 1);
    const second = await nextInQueue(db, owner, { now, skip: [...others, follow.id] });
    assert.equal(second.prospect?.id, a.id);
    const third = await nextInQueue(db, owner, { now, skip: [...others, follow.id, a.id] });
    assert.equal(third.prospect?.id, c.id);
    const done = await nextInQueue(db, owner, { now, skip: [...others, follow.id, a.id, c.id] });
    assert.equal(done.prospect, null);
  });

  test("an outcome that doesn't fit the channel is refused", async () => {
    const [p] = (await addProspects(db, owner, [{ name: "Channel Check" }])).created;
    await assert.rejects(logTouch(db, owner, { prospectId: p.id, channel: "call", outcome: "replied" }), /doesn't fit/);
  });

  test("becoming a lead carries the research and every touch into the pipeline", async () => {
    const [p] = (
      await addProspects(db, owner, [
        {
          name: "Deshmukh Interiors",
          contactName: "Amit Deshmukh",
          phone: "9890012345",
          area: "Aundh",
          industry: "Real estate & construction",
          signal: "Google reviews mention slow WhatsApp replies",
          brief: "Interior studio, 12 staff, enquiries from Instagram and WhatsApp.",
        },
      ])
    ).created;
    await logTouch(db, owner, { prospectId: p.id, channel: "call", outcome: "interested", note: "Asked for the demo" });
    await logTouch(db, owner, { prospectId: p.id, channel: "whatsapp", outcome: "demo_sent" });
    const lead = await convertToLead(db, owner, p.id);
    assert.equal(lead.company, "Deshmukh Interiors");
    assert.equal(lead.name, "Amit Deshmukh");
    assert.equal(lead.source, "whatsapp");
    assert.equal(lead.phone, "9890012345");
    assert.equal(lead.businessType, "Real estate & construction");
    assert.match(lead.problem, /slow WhatsApp replies/);
    const history = await db.select().from(interactions).where(eq(interactions.leadId, lead.id));
    assert.equal(history.length, 2);
    assert.ok(history.some((h) => h.summary.includes("Asked for the demo")));
    const [after] = await db.select().from(prospects).where(eq(prospects.id, p.id));
    assert.equal(after.status, "lead");
    assert.equal(after.leadId, lead.id);
    await assert.rejects(convertToLead(db, owner, p.id), /already a lead/);

    // Later touches keep the lead's history current.
    await logTouch(db, owner, { prospectId: p.id, channel: "call", outcome: "meeting_booked" });
    assert.equal((await db.select().from(interactions).where(eq(interactions.leadId, lead.id))).length, 3);
    const [stillLead] = await db.select().from(prospects).where(eq(prospects.id, p.id));
    assert.equal(stillLead.status, "lead");
    const [l] = await db.select().from(leads).where(eq(leads.id, lead.id));
    assert.equal(l.status, "new");
  });

  test("the scoreboard counts today's touches, conversations and meetings, and the streak", async () => {
    const now = new Date("2026-11-10T08:00:00Z"); // 13:30 IST
    const [p] = (await addProspects(db, owner, [{ name: "Score Board Co", industry: "Manufacturing", area: "Bhosari MIDC" }])).created;
    const yesterday = new Date(istDayStart(now).getTime() - 2 * HOUR);
    for (let i = 0; i < 20; i++) {
      await db.insert(touches).values({ prospectId: p.id, channel: "call", outcome: "no_answer", occurredAt: new Date(yesterday.getTime() - i * 60_000) });
    }
    await logTouch(db, owner, { prospectId: p.id, channel: "call", outcome: "no_answer" }, { now });
    await logTouch(db, owner, { prospectId: p.id, channel: "call", outcome: "interested", objection: "send_details" }, { now });
    await logTouch(db, owner, { prospectId: p.id, channel: "whatsapp", outcome: "meeting_booked" }, { now });
    await logTouch(db, owner, { prospectId: p.id, channel: "note", outcome: "noted", note: "Owner's son handles WhatsApp" }, { now });

    const s = await getScoreboard(db, owner, now);
    assert.deepEqual(s.today, { touches: 3, conversations: 2, meetings: 1, calls: 2 });
    assert.equal(s.streak, 1); // yesterday had 20 touches; today is still under the bar
    assert.equal(s.week.length, 7);
    assert.equal(s.week.at(-1)?.touches, 3);
    const manufacturing = s.byIndustry.find((r) => r.segment === "Manufacturing");
    assert.deepEqual({ contacted: manufacturing?.contacted, talked: manufacturing?.talked, meetings: manufacturing?.meetings }, { contacted: 1, talked: 1, meetings: 1 });
    assert.equal(s.objections[0]?.id, "send_details");
    assert.ok(s.hours.some((h) => h.hour === 13 && h.dials === 2 && h.reached === 1));
  });
});

describe("HQ connector", () => {
  test("initialize, list tools with valid schemas, and ignore notifications", async () => {
    const init = (await handleMcpMessage(db, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })) as { result: { protocolVersion: string; serverInfo: { name: string } } };
    assert.equal(init.result.protocolVersion, "2025-06-18");
    assert.equal(init.result.serverInfo.name, "amfire-hq");
    assert.equal(await handleMcpMessage(db, { jsonrpc: "2.0", method: "notifications/initialized" }), null);

    const list = (await handleMcpMessage(db, { jsonrpc: "2.0", id: 2, method: "tools/list" })) as { result: { tools: { name: string; inputSchema: { type: string } }[] } };
    assert.equal(list.result.tools.length, TOOLS.length);
    for (const t of list.result.tools) assert.equal(t.inputSchema.type, "object", t.name);

    const unknown = (await handleMcpMessage(db, { jsonrpc: "2.0", id: 3, method: "resources/list" })) as { error: { code: number } };
    assert.equal(unknown.error.code, -32601);
  });

  test("Claude adds prospects, logs a touch and writes a review", async () => {
    const call = async (name: string, args: unknown) =>
      (await handleMcpMessage(db, { jsonrpc: "2.0", id: name, method: "tools/call", params: { name, arguments: args } })) as {
        result: { content: { text: string }[]; isError?: boolean };
      };

    const added = await call("add_prospects", {
      prospects: [{ name: "Connector Caterers", phone: "9800000001", area: "Hadapsar", tier: "B", signal: "Hiring a telecaller on Naukri", sourceUrl: "https://example.com/job" }],
    });
    assert.equal(added.result.isError, undefined);
    const { created } = JSON.parse(added.result.content[0].text) as { created: { id: string }[] };
    const [row] = await db.select().from(prospects).where(eq(prospects.id, created[0].id));
    assert.equal(row.source, "claude");

    const logged = await call("log_touch", { prospectId: row.id, channel: "call", outcome: "call_back", followUpAt: "2026-11-12T11:00:00+05:30" });
    assert.equal(logged.result.isError, undefined);
    const [t] = await db.select().from(touches).where(eq(touches.prospectId, row.id));
    assert.equal(t.loggedBy, "claude");
    assert.equal(t.authorId, null);

    const analysed = await call("attach_call_analysis", { touchId: t.id, transcript: "Hello…", analysis: { summary: "Owner busy, asked for a call on Thursday.", ownerTalkShare: 0.7, coaching: ["Ask one question before pitching."] } });
    assert.equal(analysed.result.isError, undefined);

    const review = await call("add_note", { kind: "review", title: "Review: 27 Oct", body: "Calls before 11 connected best." });
    assert.equal(review.result.isError, undefined);

    const bad = await call("log_touch", { prospectId: row.id, channel: "call", outcome: "teleported" });
    assert.equal(bad.result.isError, true);
    assert.match(bad.result.content[0].text, /outcome/);

    const board = await call("get_scoreboard", {});
    assert.ok(JSON.parse(board.result.content[0].text).targets.touches > 0);
  });
});
