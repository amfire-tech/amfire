// Calls booked on Cal.com land in HQ. Cal.com posts each booking, reschedule and
// cancellation to /api/webhooks/cal; we match the attendee to a lead (the
// booking form usually came first) or create one, note the call on the lead,
// and mark a matching outreach prospect as "meeting booked".

import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { auditEvents, interactions, leads, prospects } from "@/db/schema";
import { audit } from "./audit";
import { connectorActor } from "./connector";
import { demoOfferCode } from "./leads";
import { logTouch } from "./outreach";

/** Cal.com signs the raw body with the webhook's secret (HMAC-SHA256, hex) in X-Cal-Signature-256. */
export function verifyCalSignature(raw: string, signature: string | null, secret = process.env.CAL_WEBHOOK_SECRET) {
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const given = Buffer.from(signature.trim());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * The lead reference for someone who booked straight on the calendar, derived
 * from the Cal.com booking id. The page they land on after booking and the
 * webhook that creates their lead both derive it, so the promo code shown
 * the moment they book is the one on their proposal later.
 */
export function calLeadRef(bookingUid: string, secret = process.env.CAL_WEBHOOK_SECRET || "amfire-cal") {
  return createHmac("sha256", secret).update(`cal-lead:${bookingUid}`).digest("base64url").slice(0, 16);
}

const Answer = z.object({ value: z.unknown().optional() }).passthrough();

export const CalWebhook = z.object({
  triggerEvent: z.string(),
  payload: z
    .object({
      uid: z.string().optional(),
      type: z.string().optional(),
      title: z.string().optional(),
      startTime: z.string().optional(),
      additionalNotes: z.string().nullish(),
      description: z.string().nullish(),
      attendees: z.array(z.object({ email: z.string(), name: z.string().optional(), timeZone: z.string().optional() }).passthrough()).default([]),
      responses: z.record(z.string(), Answer).optional(),
    })
    .passthrough(),
});
export type CalWebhook = z.infer<typeof CalWebhook>;

const HANDLED = ["BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED"] as const;

const ist = (d: Date) => `${d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`;

function answer(event: CalWebhook, key: string) {
  const v = event.payload.responses?.[key]?.value;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail|rediffmail)\./i;

/** Records one Cal.com event. Safe to receive twice: a repeated delivery is ignored. */
export async function recordCalBooking(db: DB, event: CalWebhook, now = new Date()) {
  const trigger = event.triggerEvent as (typeof HANDLED)[number];
  if (!HANDLED.includes(trigger)) return { ignored: event.triggerEvent };
  const attendee = event.payload.attendees[0];
  const uid = event.payload.uid;
  if (!attendee?.email || !uid) return { ignored: "no attendee" };

  const action = `booking.${trigger.toLowerCase()}`;
  const [seen] = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(and(eq(auditEvents.action, action), sql`${auditEvents.data}->>'uid' = ${uid}`))
    .limit(1);
  if (seen) return { duplicate: true };

  const email = attendee.email.trim().toLowerCase();
  const name = attendee.name?.trim() || answer(event, "name") || email.split("@")[0];
  const start = event.payload.startTime ? new Date(event.payload.startTime) : null;
  const when = start && !Number.isNaN(start.getTime()) ? ist(start) : "a time on Cal.com";
  const partner = /partner/i.test(`${event.payload.type ?? ""} ${event.payload.title ?? ""}`);
  const notes = (event.payload.additionalNotes || event.payload.description || answer(event, "notes"))?.slice(0, 2000);
  const cancelled = trigger === "BOOKING_CANCELLED";
  const summary = cancelled
    ? `Cancelled the ${partner ? "partner call" : "call"} booked for ${when} (Cal.com)`
    : `${trigger === "BOOKING_RESCHEDULED" ? "Rescheduled" : "Booked"} a ${partner ? "partner call" : "call"} for ${when} (Cal.com)${notes ? `. Notes: ${notes}` : ""}`;

  const lead = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(leads)
      .where(sql`lower(${leads.email}) = ${email}`)
      .orderBy(desc(leads.createdAt))
      .limit(1);
    const nextAction = cancelled ? "Call cancelled: reach out to rebook" : `Call booked for ${when}: prepare for it`;
    const nextFollowUpAt = cancelled || !start ? now : start;
    let row = existing;
    if (existing) {
      [row] = await tx.update(leads).set({ nextAction, nextFollowUpAt, updatedAt: now }).where(eq(leads.id, existing.id)).returning();
    } else {
      const domain = email.split("@")[1];
      const company = answer(event, "company") ?? (FREE_MAIL.test(email) ? name : domain);
      const zone = attendee.timeZone ?? "";
      [row] = await tx
        .insert(leads)
        .values({
          publicRef: calLeadRef(uid),
          name,
          email,
          company,
          goal: partner ? "white-label" : "not-sure",
          businessType: "Something else",
          urgency: "month",
          problem: notes || "Booked a call straight from the calendar, without the booking form.",
          currency: /^Asia\/(Kolkata|Calcutta)$/.test(zone) ? "INR" : "USD",
          source: "direct",
          sourceNote: "Booked through Cal.com",
          nextAction,
          nextFollowUpAt,
        })
        .returning();
      await audit(tx, { action: "lead.created", subjectType: "lead", subjectId: row.id, data: { source: "cal.com" } });
    }
    await tx.insert(interactions).values({ leadId: row.id, kind: "meeting", direction: "in", summary, occurredAt: now });
    await audit(tx, { action, subjectType: "lead", subjectId: row.id, data: { uid, start: start?.toISOString() ?? null, partner } });
    return row;
  });

  // Someone from the outreach desk who booked: the meeting counts on the scoreboard.
  const [prospect] = await db
    .select({ id: prospects.id, leadId: prospects.leadId })
    .from(prospects)
    .where(sql`lower(${prospects.email}) = ${email}`)
    .limit(1);
  if (prospect && !cancelled) {
    try {
      await logTouch(db, await connectorActor(db), { prospectId: prospect.id, channel: "email", outcome: "meeting_booked", note: summary }, { now });
      if (!prospect.leadId) await db.update(prospects).set({ leadId: lead.id }).where(and(eq(prospects.id, prospect.id), isNull(prospects.leadId)));
    } catch {
      // The lead already has the booking; the desk is a nice-to-have.
    }
  }
  return { leadId: lead.id, prospectId: prospect?.id ?? null };
}

/**
 * The free-demo promo code for a booking made on the calendar. When the booking
 * belongs to a lead who filled in the form earlier, it is that lead's code;
 * otherwise the code of the lead the webhook creates (or has created) for it.
 */
export async function bookingOfferCode(db: DB, bookingUid: string) {
  const [event] = await db
    .select({ leadId: auditEvents.subjectId })
    .from(auditEvents)
    .where(and(eq(auditEvents.action, "booking.booking_created"), sql`${auditEvents.data}->>'uid' = ${bookingUid}`))
    .limit(1);
  if (event?.leadId) {
    const [lead] = await db.select({ publicRef: leads.publicRef }).from(leads).where(eq(leads.id, event.leadId)).limit(1);
    if (lead) return demoOfferCode(lead.publicRef);
  }
  return demoOfferCode(calLeadRef(bookingUid));
}
