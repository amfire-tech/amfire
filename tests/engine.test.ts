// The signal engine: the scoring maths, how signals fade, how plays move,
// which message variant is sent, how outcomes become weights, and the whole
// loop against a real (in-memory) PostgreSQL, from adding a school to the
// engine re-learning from its reply, plus the connector tools Claude uses.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { buyingSignals, engineRuns, engineStats, prospects, touches, users } from "@/db/schema";
import { playFor } from "@/knowledge/engine";
import { loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { handleMcpMessage } from "@/server/connector";
import { findTargets, getEngineInsights, getEngineQueue, getProspectEngine, recordFeedback, runLearning, startPlay, upsertTargets } from "@/server/engine";
import {
  advancePlay,
  combine,
  decay,
  fitScore,
  haversineKm,
  learn,
  parseMapsCoords,
  pickVariant,
  posteriorRate,
  scoreProspect,
  stepDue,
  timingScore,
} from "@/server/engine-core";
import { logTouch } from "@/server/outreach";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-29T06:00:00Z"); // 11:30 in Pune
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);

const SCHOOL_FACTS = { board: "CBSE", students: 1200, annualFee: 90000, management: "private", hasClasses3to8: true, lab: "none" };
const noOne = { phone: null, email: null, contactName: null, website: null, mapsUrl: null };

describe("scoring", () => {
  test("signals fade by half every half-life, and deadlines don't fade", () => {
    assert.equal(decay(daysAgo(30), now, 30), 0.5);
    assert.equal(decay(daysAgo(0), now, 30), 1);
    assert.equal(decay(daysAgo(400), now, null), 1);
  });

  test("fit uses what we know and a neutral guess for what we don't", () => {
    assert.equal(fitScore("school", SCHOOL_FACTS).fit, 1);
    const unknown = fitScore("school", {});
    assert.ok(unknown.fit > 0.5 && unknown.fit < 0.65);
    assert.equal(unknown.unknown.length, 6);
    assert.ok(fitScore("ca_firm", { partners: 1, staff: 3 }).fit < fitScore("ca_firm", { partners: 4, staff: 25 }).fit);
  });

  test("timing follows each segment's calendar", () => {
    assert.equal(timingScore("ca_firm", new Date("2026-10-15T06:00:00Z")).timing, 0.35); // tax audit season
    assert.equal(timingScore("school", new Date("2026-12-01T06:00:00Z")).timing, 1); // admissions
    assert.equal(timingScore("school", new Date("2026-11-08T06:00:00Z")).label, "Diwali week");
  });

  test("a lead is warm only when all four parts are there", () => {
    assert.ok(combine({ fit: 1, trigger: 1, timing: 1, reach: 1 }) === 100);
    assert.ok(combine({ fit: 1, trigger: 0.05, timing: 1, reach: 1 }) < 35); // perfect fit, no reason to talk now
    const base = { segment: "school" as const, facts: SCHOOL_FACTS, weights: new Map<string, number>(), now };
    const cold = scoreProspect({ ...base, prospect: noOne, contacts: [], signals: [] });
    assert.ok(cold.score < 30);
    assert.ok(cold.parts.missing.includes("a dated reason to contact them now"));

    const signals = [
      { id: "s1", type: "hiring_stem_teacher", title: "Hiring a robotics teacher, Naukri, 24 Oct", observedAt: daysAgo(5), expiresAt: null, confidence: 0.9 },
      { id: "s2", type: "cbse_ct_ai_curriculum", title: "CBSE school with Classes 3–8", observedAt: new Date("2026-04-01"), expiresAt: new Date("2027-03-31"), confidence: 0.8 },
    ];
    const contacts = [{ id: "c1", name: "Mrs Rao", role: "decision_maker", phone: null, email: "principal@school.in", linkedinUrl: null, doNotContact: false }];
    const warm = scoreProspect({ ...base, prospect: noOne, contacts, signals });
    assert.ok(warm.score >= 70, `warm score ${warm.score}`);
    assert.equal(warm.tier, "A");
    assert.equal(warm.parts.top[0].signalId, "s1");
    assert.match(warm.reason!, /^Hiring a robotics teacher, Naukri, 24 Oct\. They are paying/);

    // An expired signal stops counting.
    const expired = scoreProspect({ ...base, prospect: noOne, contacts, signals: [{ ...signals[0], expiresAt: daysAgo(1) }] });
    assert.ok(expired.score < warm.score);
    assert.equal(expired.parts.top[0]?.signalId, undefined);
  });

  test("a learned weight changes the score", () => {
    const input = {
      segment: "school" as const,
      facts: SCHOOL_FACTS,
      prospect: noOne,
      contacts: [],
      signals: [{ id: "s1", type: "admission_ads", title: "Admission ads on Meta", observedAt: daysAgo(2), expiresAt: null, confidence: 0.8 }],
      now,
    };
    const low = scoreProspect({ ...input, weights: new Map([["admission_ads", 0.1]]) });
    const high = scoreProspect({ ...input, weights: new Map([["admission_ads", 0.8]]) });
    assert.ok(high.score > low.score);
  });

  test("locations: maps links, distances", () => {
    assert.deepEqual(parseMapsCoords("https://www.google.com/maps/place/X/@18.5590,73.7868,17z"), [18.559, 73.7868]);
    assert.deepEqual(parseMapsCoords("https://maps.google.com/?q=18.5,73.8"), [18.5, 73.8]);
    assert.equal(parseMapsCoords("https://maps.app.goo.gl/abc"), null);
    const km = haversineKm([18.559, 73.7868], [18.599, 73.764]); // Baner → Wakad
    assert.ok(km > 4 && km < 6, `${km}`);
  });
});

describe("plays", () => {
  const play = playFor("school_readiness")!;
  const start = daysAgo(0);
  const state = { play: play.id, playStep: 0, playStartedAt: start, lastTouchAt: null };

  test("doing the step's channel moves to the next step on its day", () => {
    const next = advancePlay(state, { channel: "email", outcome: "sent" }, now);
    assert.ok(next && !next.ended);
    assert.equal(next.playStep, 1);
    assert.equal(next.nextFollowUpAt.getTime(), start.getTime() + DAY);
    assert.equal(advancePlay(state, { channel: "call", outcome: "no_answer" }, now), null); // not this step
  });

  test("a reply or a no stops the play, and the last step finishes it", () => {
    assert.deepEqual(advancePlay(state, { channel: "email", outcome: "replied" }, now), { playEndedReason: "They replied", ended: true });
    assert.equal(advancePlay(state, { channel: "email", outcome: "do_not_contact" }, now)?.playEndedReason, "Asked not to be contacted");
    const last = advancePlay({ ...state, playStep: play.steps.length - 1 }, { channel: "email", outcome: "sent" }, now);
    assert.ok(last?.ended && "finished" in last);
  });

  test("a late step pushes the next one back by the same gap", () => {
    const late = new Date(start.getTime() + 5 * DAY);
    assert.equal(stepDue({ ...state, playStep: 3, lastTouchAt: late })!.getTime(), late.getTime() + DAY); // step 3 is day 3, step 2 day 2
  });

  test("the variant that gets replies is picked more often, and a pick is repeatable", () => {
    const stats = new Map([
      ["school_readiness:0:report", { trials: 40, successes: 20 }],
      ["school_readiness:0:question", { trials: 40, successes: 2 }],
    ]);
    let report = 0;
    for (let i = 0; i < 50; i++) if (pickVariant(play, 0, stats, `p${i}`)?.id === "report") report++;
    assert.ok(report >= 45, `${report}`);
    assert.equal(pickVariant(play, 0, new Map(), "same")?.id, pickVariant(play, 0, new Map(), "same")?.id);
  });
});

describe("learning", () => {
  test("a signal that gets conversations rises above its prior, one that doesn't sinks", () => {
    const prospectsIn = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, kind: "school", area: "Baner", status: "trying", fit: 0.9, won: false }));
    const signals = prospectsIn.map((p, i) => ({ id: `s${i}`, prospectId: p.id, type: i < 5 ? "hiring_stem_teacher" : "stem_activity", observedAt: daysAgo(10), expiresAt: null }));
    const history = prospectsIn.map((p, i) => ({
      prospectId: p.id,
      channel: "email",
      outcome: i < 4 ? "replied" : "sent", // 4 of the 5 hiring prospects reply, none of the others
      occurredAt: daysAgo(1),
      signalId: `s${i}`,
      play: "school_readiness",
      playStep: 0,
      variant: "report",
    }));
    const rows = learn({ prospects: prospectsIn, signals, touches: history, feedback: [] });
    const w = (dim: string, key: string) => rows.find((r) => r.dimension === dim && r.key === key)!;
    assert.ok(w("signal", "hiring_stem_teacher").weight > 0.45);
    assert.ok(w("signal", "stem_activity").weight < 0.22);
    assert.equal(w("segment", "all").trials, 10);
    assert.equal(w("channel", "email").successes, 4);
    assert.equal(w("variant", "school_readiness:0:report").trials, 10);
    assert.equal(w("area", "baner").trials, 10);
    assert.equal(posteriorRate(0.5, 0, 0), 0.5);
  });
});

describe("engine, end to end", () => {
  let db: DB;
  let owner: Actor;
  let schoolId: string;

  before(async () => {
    db = await openPglite();
    await bootstrap(db);
    const [u] = await db.select().from(users).where(eq(users.email, DEFAULT_OWNER_EMAIL));
    owner = await loadActor(db, u);
  });

  test("a school with facts, its principal and dated signals scores warm; sending it again adds nothing", async () => {
    const target = {
      prospect: { name: "Orchid International School", kind: "school" as const, area: "Baner", website: "orchid-school.example.in", mapsUrl: "https://www.google.com/maps/place/Orchid/@18.5605,73.7890,17z" },
      facts: SCHOOL_FACTS,
      pincode: "411045",
      contacts: [{ name: "Mrs Anita Rao", title: "Principal", role: "decision_maker" as const, email: "principal@orchid-school.example.in", sourceUrl: "https://orchid-school.example.in/about" }],
      signals: [
        { type: "hiring_stem_teacher", title: "Hiring a robotics teacher, Naukri, 24 Oct 2026", sourceUrl: "https://www.naukri.com/job/123", observedAt: daysAgo(5).toISOString(), confidence: 0.9 },
        { type: "cbse_ct_ai_curriculum", title: "CBSE school with Classes 3–8: the CT & AI curriculum applies this session", sourceUrl: "https://cbseacademic.nic.in/web_material/Circulars/2026/15_Circular_2026.pdf", observedAt: "2026-04-01" },
      ],
    };
    const [first] = await upsertTargets(db, owner, [target], { now });
    assert.equal(first.created, true);
    assert.equal(first.contactsAdded, 1);
    assert.equal(first.signalsAdded, 2);
    assert.ok(first.score! >= 70, `score ${first.score}`);
    assert.equal(first.tier, "A");
    schoolId = first.id;

    const [p] = await db.select().from(prospects).where(eq(prospects.id, schoolId));
    assert.equal(p.contactName, "Mrs Anita Rao"); // the desk's contact field shows the first decision maker
    assert.deepEqual([p.lat, p.lng], [18.5605, 73.789]); // from the maps link
    const [deadline] = await db.select().from(buyingSignals).where(eq(buyingSignals.type, "cbse_ct_ai_curriculum"));
    assert.equal(deadline.expiresAt?.toISOString(), "2027-03-31T18:29:59.000Z"); // the catalogue's expiry

    const [again] = await upsertTargets(db, owner, [{ ...target, prospect: { ...target.prospect, name: "Orchid International School" } }], { now });
    assert.equal(again.created, false);
    assert.equal(again.id, schoolId);
    assert.equal(again.contactsAdded + again.signalsAdded, 0);
    assert.equal(again.skipped.length, 3);
  });

  test("a signal for another segment is refused", async () => {
    await assert.rejects(upsertTargets(db, owner, [{ prospectId: schoolId, signals: [{ type: "peer_review_phase4", title: "3 partners", observedAt: "2025-12-31" }] }], { now }), /signal for CA firms/);
  });

  test("location filters: near a locality, by pin code", async () => {
    await upsertTargets(db, owner, [{ prospect: { name: "Sunrise School", kind: "school", area: "Hadapsar" }, facts: { board: "State" } }], { now });
    const nearBaner = await findTargets(db, owner, { segment: "school", near: { area: "baner", km: 5 } });
    assert.deepEqual(
      nearBaner.map((t) => t.prospect.name),
      ["Orchid International School"],
    );
    assert.equal(nearBaner[0].approximate, false);
    const wide = await findTargets(db, owner, { segment: "school", near: { area: "baner", km: 30 } });
    assert.equal(wide.length, 2);
    assert.equal(wide.find((t) => t.prospect.name === "Sunrise School")?.approximate, true); // only an area name: its centre
    assert.equal((await findTargets(db, owner, { pincode: "41104" })).length, 1);
  });

  test("a play: due today with the drafted email, a step logged moves it, a reply stops it", async () => {
    const queue0 = await getEngineQueue(db, owner, { segment: "school", now });
    assert.ok(queue0.ready.some((r) => r.prospect.id === schoolId));

    await startPlay(db, owner, schoolId, undefined, now);
    const queue = await getEngineQueue(db, owner, { segment: "school", now });
    const due = queue.due.find((d) => d.prospect.id === schoolId);
    assert.ok(due);
    assert.equal(due.next.channel, "email");
    assert.match(due.next.href ?? "", /^mailto:principal@orchid-school\.example\.in\?subject=CT%20%26%20AI/);
    assert.match(due.next.message, /Dear Mrs Anita Rao/);
    assert.match(due.next.message, /Hiring a robotics teacher/);
    assert.ok(due.next.signalId);

    await logTouch(db, owner, { prospectId: schoolId, channel: "email", outcome: "sent", playStep: 0, variant: due.next.variant, contactId: due.next.contactId, signalId: due.next.signalId }, { now });
    let [p] = await db.select().from(prospects).where(eq(prospects.id, schoolId));
    assert.equal(p.playStep, 1);
    assert.equal(p.nextFollowUpAt?.getTime(), now.getTime() + DAY);
    const [t] = await db.select().from(touches).where(eq(touches.prospectId, schoolId));
    assert.deepEqual([t.play, t.playStep, t.variant, t.signalId], ["school_readiness", 0, due.next.variant, due.next.signalId]);

    await logTouch(db, owner, { prospectId: schoolId, channel: "email", outcome: "replied", note: "Principal asked for a visit" }, { now: new Date(now.getTime() + 2 * 60 * 60 * 1000) });
    [p] = await db.select().from(prospects).where(eq(prospects.id, schoolId));
    assert.equal(p.playEndedReason, "They replied");
    assert.equal(p.status, "talking");
    const engine = await getProspectEngine(db, owner, schoolId);
    assert.equal(engine?.next, null);
  });

  test("learning: the reply raises the weight of the signal we led with, and the run records what moved", async () => {
    const run = await runLearning(db, owner, { now: new Date(now.getTime() + DAY) });
    assert.ok(run.prospectsScored >= 2);
    const [hiring] = await db.select().from(engineStats).where(eq(engineStats.key, "hiring_stem_teacher"));
    assert.equal(hiring.trials, 1);
    assert.ok(hiring.weight > 0.45);
    assert.ok(run.changes.some((c) => c.key === "hiring_stem_teacher" && c.from === null));
    assert.ok(run.insights.some((i) => i.startsWith("Schools: 1 of 1 contacted engaged")));

    const insights = await getEngineInsights(db, owner);
    const schools = insights.segments.find((s) => s.segment === "school")!;
    assert.equal(schools.hunt[0].type, "engaged_with_us"); // strongest prior still on top
    assert.ok(schools.hunt.find((h) => h.type === "hiring_stem_teacher")!.learned);
    assert.equal((await db.select().from(engineRuns)).length, 1);
  });

  test("feedback: a stale signal stops counting at once", async () => {
    const [sig] = await db.select().from(buyingSignals).where(eq(buyingSignals.type, "hiring_stem_teacher"));
    const [before] = await db.select().from(prospects).where(eq(prospects.id, schoolId));
    await recordFeedback(db, owner, { prospectId: schoolId, kind: "signal_stale", signalId: sig.id });
    const [s] = await db.select().from(buyingSignals).where(eq(buyingSignals.id, sig.id));
    assert.ok(s.expiresAt && s.expiresAt.getTime() <= Date.now());
    const [after] = await db.select().from(prospects).where(eq(prospects.id, schoolId));
    assert.ok(after.score < before.score);
  });

  test("Claude works the engine through the connector", async () => {
    const call = async (name: string, args: unknown) => {
      const res = (await handleMcpMessage(db, { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })) as { result: { content: { text: string }[]; isError?: boolean } };
      assert.ok(!res.result.isError, res.result.content[0].text);
      return JSON.parse(res.result.content[0].text);
    };
    const book = await call("get_engine_playbook", {});
    assert.ok(book.signalTypes.some((t: { id: string }) => t.id === "peer_review_phase4"));
    const [firm] = await call("upsert_targets", {
      targets: [
        {
          prospect: { name: "Kulkarni & Associates", kind: "ca_firm", area: "Shivajinagar", phone: "+91 20 2553 0000" },
          facts: { partners: 4, staff: 25, attestation: true, businessClients: "most" },
          contacts: [{ name: "CA Meera Kulkarni", title: "Managing partner", role: "decision_maker", email: "meera@kulkarni-ca.example.in" }],
          signals: [{ type: "peer_review_phase4", title: "4 partners doing statutory audits: Phase IV applies from 31 Dec 2026", observedAt: "2025-12-31T00:00:00+05:30" }],
        },
      ],
    });
    assert.ok(firm.score > 0 && firm.reason.startsWith("4 partners doing statutory audits"));
    const found = await call("find_targets", { segment: "ca_firm", near: { area: "shivajinagar", km: 2 } });
    assert.equal(found[0].name, "Kulkarni & Associates");
    await call("start_play", { prospectId: firm.id });
    const queue = await call("get_engine_queue", { segment: "ca_firm" });
    assert.equal(queue.due[0].next.play, "ca_peer_review");
    await call("record_feedback", { prospectId: firm.id, kind: "great_lead" });
    const run = await call("run_learning", {});
    assert.ok(run.prospectsScored >= 3);
    const insights = await call("get_engine_insights", {});
    assert.equal(insights.segments.length, 3);
  });
});
