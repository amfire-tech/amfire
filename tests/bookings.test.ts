// Calls booked on Cal.com: the webhook's signature check, matching a booking to
// the lead who filled in the form (or creating one), marking an outreach
// prospect as meeting booked, ignoring repeated deliveries, and cancellations.

import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { interactions, leads, prospects, touches, users } from "@/db/schema";
import { loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { bookedCall, bookingAlertEmail, bookingOfferCode, CalWebhook, callInvite, clientInviteEmail, recordCalBooking, verifyCalSignature, whatsappConfirmation } from "@/server/bookings";
import { googleCalendarUrl } from "@/lib/ics";
import { listLeads } from "@/server/hq";
import { demoOfferCode, submitDiscovery } from "@/server/leads";
import { addProspects } from "@/server/outreach";

let db: DB;
let owner: Actor;

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  const [u] = await db.select().from(users).where(eq(users.email, DEFAULT_OWNER_EMAIL));
  owner = await loadActor(db, u);
});

const booking = (trigger: string, uid: string, email: string, extra: Record<string, unknown> = {}) =>
  CalWebhook.parse({
    triggerEvent: trigger,
    payload: {
      uid,
      type: "partner-call",
      title: "Partner call between amfire and Crystal",
      startTime: "2026-11-12T14:30:00Z",
      attendees: [{ email, name: "Crystal Williams", timeZone: "America/New_York" }],
      responses: { notes: { value: "We have 3 clients asking about AI receptionists" } },
      ...extra,
    },
  });

describe("Cal.com bookings", () => {
  test("only a body signed with our secret is accepted", () => {
    const raw = JSON.stringify({ triggerEvent: "BOOKING_CREATED" });
    const sig = createHmac("sha256", "s3cret").update(raw).digest("hex");
    assert.equal(verifyCalSignature(raw, sig, "s3cret"), true);
    assert.equal(verifyCalSignature(raw, sig, "other"), false);
    assert.equal(verifyCalSignature(raw + " ", sig, "s3cret"), false);
    assert.equal(verifyCalSignature(raw, null, "s3cret"), false);
    assert.equal(verifyCalSignature(raw, sig, ""), false);
  });

  test("a booking from someone new creates a lead, once, and marks their prospect as meeting booked", async () => {
    const [p] = (await addProspects(db, owner, [{ name: "Lemon Seed Marketing", email: "Crystal@LemonSeed.com", city: "Austin" }])).created;

    const first = await recordCalBooking(db, booking("BOOKING_CREATED", "uid-1", "crystal@lemonseed.com"));
    assert.ok("leadId" in first && first.leadId);
    const [lead] = await db.select().from(leads).where(eq(leads.id, first.leadId));
    assert.equal(lead.goal, "white-label");
    assert.equal(lead.currency, "USD");
    assert.equal(lead.company, "lemonseed.com");
    assert.match(lead.problem, /3 clients asking/);
    assert.match(lead.nextAction ?? "", /^Call booked for .* IST/);
    assert.equal(lead.nextFollowUpAt?.toISOString(), "2026-11-12T14:30:00.000Z");

    const [prospect] = await db.select().from(prospects).where(eq(prospects.id, p.id));
    assert.equal(prospect.status, "meeting");
    assert.equal(prospect.leadId, lead.id);
    const logged = await db.select().from(touches).where(eq(touches.prospectId, p.id));
    assert.deepEqual(
      logged.map((t) => t.outcome),
      ["meeting_booked"],
    );

    // Cal.com retries deliveries; the second copy changes nothing.
    assert.deepEqual(await recordCalBooking(db, booking("BOOKING_CREATED", "uid-1", "crystal@lemonseed.com")), { duplicate: true });
    assert.equal((await db.select().from(leads).where(eq(leads.email, "crystal@lemonseed.com"))).length, 1);
    assert.equal((await db.select().from(touches).where(eq(touches.prospectId, p.id))).length, 1);
  });

  test("a booking after the form goes on that lead, and a cancellation asks us to rebook", async () => {
    const { lead } = await submitDiscovery(db, {
      goal: "ai-opportunity-map",
      businessType: "Manufacturing",
      urgency: "month",
      problem: "We re-type every order from email into Tally and it takes all day.",
      name: "Rohit Kale",
      email: "rohit@kaleforge.in",
      company: "Kale Forge",
      consent: true,
    });
    const event = (trigger: string) =>
      booking(trigger, "uid-2", "ROHIT@kaleforge.in", { type: "ai-plan-call", title: "Free AI plan call", attendees: [{ email: "ROHIT@kaleforge.in", name: "Rohit" }] });

    const booked = await recordCalBooking(db, event("BOOKING_CREATED"));
    assert.ok("leadId" in booked);
    assert.equal(booked.leadId, lead.id);
    const [after] = await db.select().from(leads).where(eq(leads.id, lead.id));
    assert.equal(after.goal, "ai-opportunity-map");
    assert.match(after.nextAction ?? "", /^Call booked/);

    await recordCalBooking(db, event("BOOKING_CANCELLED"));
    const [cancelled] = await db.select().from(leads).where(eq(leads.id, lead.id));
    assert.match(cancelled.nextAction ?? "", /^Call cancelled/);
    const notes = await db.select().from(interactions).where(eq(interactions.leadId, lead.id));
    assert.equal(notes.filter((n) => n.kind === "meeting").length, 2);
  });

  test("other events and bookings without an attendee are ignored", async () => {
    assert.deepEqual(await recordCalBooking(db, booking("MEETING_ENDED", "uid-3", "x@y.com")), { ignored: "MEETING_ENDED" });
    assert.deepEqual(await recordCalBooking(db, booking("BOOKING_CREATED", "uid-4", "x@y.com", { attendees: [] })), { ignored: "no attendee" });
  });

  test("the promo code shown the moment someone books on the calendar is the one their lead gets", async () => {
    const uid = "one-click-uid-1";
    const shown = await bookingOfferCode(db, uid); // the page loads before the webhook arrives
    const result = await recordCalBooking(db, booking("BOOKING_CREATED", uid, "owner@sharmatraders.in", { type: "ai-plan-call", title: "Free AI plan call" }));
    assert.ok("leadId" in result && result.leadId);
    const [lead] = await db.select().from(leads).where(eq(leads.id, result.leadId));
    assert.equal(demoOfferCode(lead.publicRef), shown);
    assert.equal(await bookingOfferCode(db, uid), shown); // and after it
  });

  test("a returning lead who books comes to the top of HQ, and the alert says it isn't a new lead", async () => {
    const { lead } = await submitDiscovery(db, {
      goal: "customer-portal",
      businessType: "Manufacturing",
      urgency: "month",
      problem: "We want an app for our camera rental business, bookings are on paper.",
      name: "Aryan",
      company: "Aryan Cameras",
      email: "aryan@cameras.test",
      consent: true,
    });
    await db.update(leads).set({ createdAt: new Date("2026-11-01"), updatedAt: new Date("2026-11-01") }).where(eq(leads.id, lead.id));
    // A newer lead arrives after it.
    await recordCalBooking(db, booking("BOOKING_CREATED", "newer-uid", "someone@else.test", { type: "ai-plan-call", title: "Free AI plan call" }));

    const result = await recordCalBooking(db, booking("BOOKING_CREATED", "returning-uid", "Aryan@Cameras.test", { type: "ai-plan-call", title: "Free AI plan call" }));
    assert.ok("alert" in result && result.alert);
    assert.equal(result.leadId, lead.id);
    assert.equal(result.alert.newLead, false);
    const mail = bookingAlertEmail(result.alert, "https://amfire.test/hq/leads/x");
    assert.match(mail.subject, /^New call booked: Crystal Williams, /);
    assert.match(mail.text, /existing lead "Aryan/);

    const { leads: list } = await listLeads(db, owner);
    assert.equal(list[0].id, lead.id);
  });

  test("the business name from the booking form is kept, and replaces a placeholder on a returning lead", async () => {
    const first = await recordCalBooking(db, booking("BOOKING_CREATED", "biz-uid-1", "aryan@gmail.com", { type: "ai-plan-call", title: "Free AI plan call", attendees: [{ email: "aryan@gmail.com", name: "Aryan" }], responses: { "business-name": { value: "Opticviyu" } } }));
    assert.ok("leadId" in first && first.leadId);
    const [created] = await db.select().from(leads).where(eq(leads.id, first.leadId));
    assert.equal(created.company, "Opticviyu");
    const [note] = await db.select().from(interactions).where(eq(interactions.leadId, created.id));
    assert.match(note.summary, /by Aryan, Opticviyu/);

    await db.update(leads).set({ company: "na" }).where(eq(leads.id, created.id));
    await recordCalBooking(db, booking("BOOKING_RESCHEDULED", "biz-uid-2", "aryan@gmail.com", { type: "ai-plan-call", title: "Free AI plan call", attendees: [{ email: "aryan@gmail.com", name: "Aryan" }], responses: { "business-name": { value: "Opticviyu" } } }));
    const [after] = await db.select().from(leads).where(eq(leads.id, created.id));
    assert.equal(after.company, "Opticviyu");
  });

  test("the client gets amfire's own calendar invite, the owner a one-tap WhatsApp confirmation, and the page finds the Meet link", async () => {
    const result = await recordCalBooking(
      db,
      booking("BOOKING_CREATED", "invite-uid-1", "meera@clinic.test", {
        type: "ai-plan-call",
        title: "Free AI plan call",
        startTime: "2026-11-09T05:30:00Z",
        endTime: "2026-11-09T06:00:00Z",
        iCalUID: "abc123@Cal.com",
        organizer: { email: "amfire.info@gmail.com", name: "Navanish" },
        metadata: { videoCallUrl: "https://meet.google.com/wsp-ossm-ckm" },
        attendees: [{ email: "meera@clinic.test", name: "Meera Shah", timeZone: "Asia/Kolkata" }],
        responses: { attendeePhoneNumber: { value: "+91 98765 43210" } },
      }),
    );
    assert.ok("alert" in result && result.alert);
    const a = result.alert;
    assert.equal(a.phone, "919876543210");

    const mail = clientInviteEmail(a, new Date("2026-11-07T06:00:00Z"));
    assert.ok(mail);
    assert.match(mail.subject, /^Confirmed: our call on Mon, 9 Nov/);
    assert.match(mail.text, /Join: https:\/\/meet\.google\.com\/wsp-ossm-ckm/);
    assert.match(mail.text, /tap "Yes"/);
    assert.match(mail.text, /DEMO5K-/);
    assert.match(mail.ics, /METHOD:REQUEST/);
    assert.match(mail.ics, /UID:abc123@Cal\.com/);
    assert.match(mail.ics, /DTSTART:20261109T053000Z/);
    assert.match(mail.ics, /ORGANIZER;CN=Navanish Pandey · amfire:mailto:amfire\.info@gmail\.com/);
    assert.ok(mail.ics.split("\r\n").every((line) => Buffer.byteLength(line, "utf8") <= 75), "lines are folded");

    const wa = whatsappConfirmation(a);
    assert.ok(wa?.startsWith("https://wa.me/919876543210?text="));
    assert.match(decodeURIComponent(wa!), /Join here: https:\/\/meet\.google\.com/);
    assert.match(bookingAlertEmail(a, "https://amfire.test/hq/leads/x").text, /Confirm on WhatsApp/);

    // The booked page's calendar buttons, a few seconds later: the webhook's record wins over the page's hint.
    const call = await bookedCall(db, "invite-uid-1", { start: "2026-01-01T00:00:00Z" });
    assert.equal(call?.meetUrl, "https://meet.google.com/wsp-ossm-ckm");
    assert.equal(call?.start.toISOString(), "2026-11-09T05:30:00.000Z");
    assert.match(googleCalendarUrl(callInvite(call!)), /dates=20261109T053000Z%2F20261109T060000Z/);

    // Before the webhook arrives, the time Cal.com gave the page is enough.
    const early = await bookedCall(db, "not-yet-uid", { start: "2026-11-10T05:30:00Z" });
    assert.equal(early?.end.toISOString(), "2026-11-10T06:00:00.000Z");
    assert.equal(await bookedCall(db, "nothing-uid"), null);

    const cancel = clientInviteEmail({ ...a, trigger: "BOOKING_CANCELLED" });
    assert.match(cancel!.ics, /METHOD:CANCEL/);
  });
});
