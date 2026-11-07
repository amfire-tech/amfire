// Calls booked on Cal.com land in HQ. Cal.com posts each booking, reschedule and
// cancellation to /api/webhooks/cal; we match the attendee to a lead (the
// booking form usually came first) or create one, note the call on the lead,
// and mark a matching outreach prospect as "meeting booked".

import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { site } from "@/config/site";
import { inviteIcs, type CallInvite } from "@/lib/ics";
import { DEMO_OFFER, formatMoney, isCurrency } from "@/knowledge/pricing";
import { auditEvents, interactions, leads, notifications, prospects } from "@/db/schema";
import { audit } from "./audit";
import { connectorActor } from "./connector";
import { demoOfferCode } from "./leads";
import { briefEmails, emailConfigured, sendEmail } from "./notify";
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
      endTime: z.string().optional(),
      iCalUID: z.string().nullish(),
      iCalSequence: z.number().nullish(),
      location: z.string().nullish(),
      organizer: z.object({ email: z.string().optional(), name: z.string().optional() }).passthrough().nullish(),
      metadata: z.object({ videoCallUrl: z.string().nullish() }).passthrough().nullish(),
      videoCallData: z.object({ url: z.string().nullish() }).passthrough().nullish(),
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

/** The booking form's business name, whatever the question's identifier is ("company", "business-name"…). */
function businessAnswer(event: CalWebhook) {
  const direct = answer(event, "company");
  if (direct) return direct;
  const key = Object.keys(event.payload.responses ?? {}).find((k) => /business|company|organi[sz]ation|firm/i.test(k));
  return key ? answer(event, key)?.slice(0, 200) : undefined;
}

/** The video call link: Cal.com puts it in different places depending on the app (Google Meet, Zoom, Cal Video). */
function meetingLink(event: CalWebhook) {
  const p = event.payload;
  const candidates = [p.metadata?.videoCallUrl, p.videoCallData?.url, p.location];
  return candidates.find((u): u is string => typeof u === "string" && /^https:\/\//.test(u)) ?? null;
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
  const end = event.payload.endTime ? new Date(event.payload.endTime) : null;
  const meetUrl = meetingLink(event);
  const when = start && !Number.isNaN(start.getTime()) ? ist(start) : "a time on Cal.com";
  const partner = /partner/i.test(`${event.payload.type ?? ""} ${event.payload.title ?? ""}`);
  const notes = (event.payload.additionalNotes || event.payload.description || answer(event, "notes"))?.slice(0, 2000);
  const business = businessAnswer(event);
  const phone = phoneAnswer(event, attendee);
  const cancelled = trigger === "BOOKING_CANCELLED";
  // Who booked, as they gave it on the calendar: a returning lead may book under another name or business.
  const by = `by ${name}${business ? `, ${business}` : ""}`;
  const summary = cancelled
    ? `Cancelled the ${partner ? "partner call" : "call"} booked for ${when} (Cal.com, ${by})`
    : `${trigger === "BOOKING_RESCHEDULED" ? "Rescheduled" : "Booked"} a ${partner ? "partner call" : "call"} for ${when} (Cal.com, ${by})${notes ? `. Notes: ${notes}` : ""}`;

  const { row: lead, isNew } = await db.transaction(async (tx) => {
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
      // A placeholder business name ("na", or just their name) gives way to the one they booked with.
      const placeholder = existing.company.trim().length < 3 || existing.company.trim().toLowerCase() === existing.name.trim().toLowerCase();
      const company = business && placeholder ? business : existing.company;
      [row] = await tx
        .update(leads)
        .set({ company, ...(phone && !existing.phone ? { phone } : {}), nextAction, nextFollowUpAt, updatedAt: now })
        .where(eq(leads.id, existing.id))
        .returning();
    } else {
      const domain = email.split("@")[1];
      const company = business ?? (FREE_MAIL.test(email) ? name : domain);
      const zone = attendee.timeZone ?? "";
      [row] = await tx
        .insert(leads)
        .values({
          publicRef: calLeadRef(uid),
          name,
          email,
          ...(phone ? { phone } : {}),
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
    await audit(tx, { action, subjectType: "lead", subjectId: row.id, data: {
        uid,
        start: start?.toISOString() ?? null,
        end: end && !Number.isNaN(end.getTime()) ? end.toISOString() : null,
        partner,
        meetUrl,
        iCalUID: event.payload.iCalUID ?? null,
        iCalSequence: event.payload.iCalSequence ?? null,
        organizerEmail: event.payload.organizer?.email ?? null,
        title: event.payload.title ?? null,
      },
    });
    return { row, isNew: !existing };
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
  return {
    leadId: lead.id,
    prospectId: prospect?.id ?? null,
    alert: {
      trigger,
      uid,
      newLead: isNew,
      leadName: lead.name,
      company: lead.company,
      attendee: `${name} <${email}>`,
      guest: { name, email, timeZone: attendee.timeZone ?? null },
      phone: phone ?? lead.phone ?? null,
      when,
      summary,
      // What the client's own invite needs; null when Cal.com sent no usable time.
      call:
        start && !Number.isNaN(start.getTime())
          ? ({
              uid,
              start,
              end: end && end > start ? end : new Date(start.getTime() + (partner ? 15 : 30) * 60_000),
              partner,
              meetUrl,
              iCalUID: event.payload.iCalUID ?? null,
              iCalSequence: event.payload.iCalSequence ?? null,
              organizerEmail: event.payload.organizer?.email ?? null,
            } satisfies BookedCall)
          : null,
      code: partner ? null : demoOfferCode(lead.publicRef),
      currency: lead.currency,
    },
  };
}

/** The phone or WhatsApp number from the booking form, digits only with country code, if they gave one. */
function phoneAnswer(event: CalWebhook, attendee: Record<string, unknown>) {
  const responses = event.payload.responses ?? {};
  const key = ["attendeePhoneNumber", "whatsapp", "phone"].find((k) => answer(event, k)) ?? Object.keys(responses).find((k) => /phone|whatsapp|mobile/i.test(k) && answer(event, k));
  const raw = (key ? answer(event, key) : undefined) ?? (typeof attendee.phoneNumber === "string" ? attendee.phoneNumber : undefined);
  const digits = raw?.replace(/\D/g, "") ?? "";
  if (digits.length < 8 || digits.length > 15) return undefined;
  // A 10-digit Indian mobile without the country code.
  return digits.length === 10 && /^[6-9]/.test(digits) ? `91${digits}` : digits;
}

/** The time in the client's own zone (IST when Cal.com didn't say), for their invite. */
function inZone(d: Date, timeZone: string | null) {
  try {
    return `${d.toLocaleString("en-IN", { timeZone: timeZone ?? "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`;
  } catch {
    return ist(d);
  }
}

/** A ready-to-send WhatsApp confirmation for the owner to tap from the alert. */
export function whatsappConfirmation(a: BookingAlert) {
  if (!a.phone || !a.call) return null;
  const first = a.guest.name.split(" ")[0];
  const join = a.call.meetUrl ?? calBookingPage(a.uid);
  const message =
    a.trigger === "BOOKING_CANCELLED"
      ? `Hi ${first}, this is Navanish from amfire. I saw our call was cancelled. Would another time this week suit you? You can pick one here: https://cal.com/${site.booking.demo}`
      : `Hi ${first}, this is Navanish from amfire. Confirming our call on ${inZone(a.call.start, a.guest.timeZone)}.\n\nJoin here: ${join}\n\nI've also emailed you the calendar invite: please tap "Yes" so it's in your calendar with a reminder. See you then!`;
  return `https://wa.me/${a.phone}?text=${encodeURIComponent(message)}`;
}

/**
 * amfire's own invite to the client, from hello@amfire.in with the calendar
 * file attached: Gmail and Outlook show Yes / Maybe / No and add it to their
 * calendar. Cal.com sends one too, but from a bulk sender that Gmail often
 * files under Promotions; a personal email from our own domain reaches the inbox.
 */
export function clientInviteEmail(a: BookingAlert, now = new Date()) {
  if (!a.call) return null;
  const first = a.guest.name.split(" ")[0];
  const invite = callInvite(a.call, { name: a.guest.name, email: a.guest.email });
  const when = inZone(a.call.start, a.guest.timeZone);
  const minutes = Math.round((a.call.end.getTime() - a.call.start.getTime()) / 60_000);
  const join = a.call.meetUrl ?? calBookingPage(a.uid);
  const sign = ["Navanish", "Founder, amfire", site.contactPhone].join("\n");
  if (a.trigger === "BOOKING_CANCELLED") {
    return {
      subject: `Cancelled: our call on ${when}`,
      text: [`Hi ${first},`, "", `Our call on ${when} is cancelled, and I've taken it off your calendar.`, "", `If you'd like another time, pick one here: https://cal.com/${site.booking.demo}`, "", sign].join("\n"),
      ics: inviteIcs({ ...invite, sequence: (invite.sequence ?? 0) + 1 }, "CANCEL", now),
    };
  }
  const currency = isCurrency(a.currency) ? a.currency : "INR";
  const offer = a.code ? `Your ${formatMoney(DEMO_OFFER.amount[currency], currency)} off code: ${a.code} (nothing to enter: we take it off your proposal).` : null;
  return {
    subject: `${a.trigger === "BOOKING_RESCHEDULED" ? "Updated" : "Confirmed"}: our call on ${when}`,
    text: [
      `Hi ${first},`,
      "",
      `Thanks for booking. Our call is ${a.trigger === "BOOKING_RESCHEDULED" ? "moved to" : "confirmed for"}:`,
      "",
      `When: ${when} (${minutes} minutes)`,
      `Join: ${join}`,
      "",
      `The calendar invite is attached. Please tap "Yes" (or "Add to calendar") so it's in your calendar with a reminder. After that, my invites go straight into your calendar.`,
      ...(offer ? ["", offer] : []),
      "",
      `Need another time? Reschedule here: ${calBookingPage(a.uid)}, or just reply to this email or WhatsApp me.`,
      "",
      sign,
    ].join("\n"),
    ics: inviteIcs(invite, "REQUEST", now),
  };
}

/** Sends the client's invite and logs the attempt; a failure never affects the booking. */
export async function sendClientInvite(db: DB, a: BookingAlert) {
  const mail = clientInviteEmail(a);
  if (!mail) return;
  let status = "skipped";
  let error: string | null = "Not configured";
  if (emailConfigured()) {
    try {
      await sendEmail({
        to: a.guest.email,
        subject: mail.subject,
        text: mail.text,
        fromName: "Navanish",
        idempotencyKey: `cal-invite-${a.trigger}-${a.uid}`,
        attachments: [
          {
            filename: "invite.ics",
            content: Buffer.from(mail.ics, "utf8").toString("base64"),
            content_type: `text/calendar; charset=utf-8; method=${a.trigger === "BOOKING_CANCELLED" ? "CANCEL" : "REQUEST"}`,
          },
        ],
      });
      status = "sent";
      error = null;
    } catch (err) {
      status = "failed";
      error = err instanceof Error ? err.message : String(err);
    }
  }
  await db.insert(notifications).values({ channel: "email", recipient: a.guest.email, subject: mail.subject, body: mail.text, status, error });
}

export type BookingAlert = NonNullable<Extract<Awaited<ReturnType<typeof recordCalBooking>>, { alert: unknown }>["alert"]>;

/** The owner's heads-up for a booking, reschedule or cancellation, so a call never sits unnoticed in HQ. */
export function bookingAlertEmail(a: BookingAlert, leadUrl: string) {
  const verb = a.trigger === "BOOKING_CANCELLED" ? "Call cancelled" : a.trigger === "BOOKING_RESCHEDULED" ? "Call rescheduled" : "New call booked";
  const subject = `${verb}: ${a.attendee.replace(/ <.*/, "")}, ${a.when}`;
  const text = [
    `${verb} on Cal.com.`,
    "",
    `Who: ${a.attendee}`,
    `When: ${a.when}`,
    a.newLead
      ? `HQ: new lead created.`
      : `HQ: added to the existing lead "${a.leadName} · ${a.company}" (same email), not a new lead.`,
    "",
    a.summary,
    "",
    `Open the lead: ${leadUrl}`,
  ];
  const whatsapp = whatsappConfirmation(a);
  text.push(
    "",
    whatsapp
      ? `Confirm on WhatsApp (one tap, message ready): ${whatsapp}`
      : `No WhatsApp number on this booking: ${a.trigger === "BOOKING_CANCELLED" ? "email them to rebook." : "we've emailed them the calendar invite."}`,
  );
  return { subject, text: text.join("\n") };
}

/** Emails the alert to everyone who gets the HQ brief, and logs each attempt like the brief does. */
export async function sendBookingAlert(db: DB, leadId: string, a: BookingAlert) {
  const { subject, text } = bookingAlertEmail(a, `${site.url}/hq/leads/${leadId}`);
  const to = await briefEmails(db);
  for (const recipient of to) {
    let status = "skipped";
    let error: string | null = "Not configured";
    if (emailConfigured()) {
      try {
        await sendEmail({ to: recipient, subject, text, idempotencyKey: `cal-${a.trigger}-${a.uid}-${recipient}` });
        status = "sent";
        error = null;
      } catch (err) {
        status = "failed";
        error = err instanceof Error ? err.message : String(err);
      }
    }
    await db.insert(notifications).values({ channel: "email", recipient, subject, body: text, status, error });
  }
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


/** A booked call as the calendar buttons need it: from the webhook's record, else from what the page was told. */
export type BookedCall = {
  uid: string;
  start: Date;
  end: Date;
  partner: boolean;
  meetUrl: string | null;
  iCalUID: string | null;
  iCalSequence: number | null;
  organizerEmail: string | null;
};

const DEFAULT_MINUTES = { demo: 30, partner: 15 };

export async function bookedCall(db: DB, uid: string, hint: { start?: string; end?: string; partner?: boolean } = {}): Promise<BookedCall | null> {
  const [row] = await db
    .select({ data: auditEvents.data })
    .from(auditEvents)
    .where(and(sql`${auditEvents.action} in ('booking.booking_created', 'booking.booking_rescheduled')`, sql`${auditEvents.data}->>'uid' = ${uid}`))
    .orderBy(desc(auditEvents.createdAt))
    .limit(1);
  const d = (row?.data ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  const date = (v: string | undefined) => {
    const t = v ? new Date(v) : null;
    return t && !Number.isNaN(t.getTime()) ? t : null;
  };
  const partner = typeof d.partner === "boolean" ? d.partner : Boolean(hint.partner);
  const start = date(str(d.start)) ?? date(hint.start);
  if (!start) return null;
  let end = date(str(d.end)) ?? date(hint.end);
  // Anything odd (before the start, or longer than a working day) falls back to the call's usual length.
  if (!end || end <= start || end.getTime() - start.getTime() > 8 * 3600_000) {
    end = new Date(start.getTime() + DEFAULT_MINUTES[partner ? "partner" : "demo"] * 60_000);
  }
  return {
    uid,
    start,
    end,
    partner,
    meetUrl: str(d.meetUrl) ?? null,
    iCalUID: str(d.iCalUID) ?? null,
    iCalSequence: typeof d.iCalSequence === "number" ? d.iCalSequence : null,
    organizerEmail: str(d.organizerEmail) ?? null,
  };
}

/** The page on Cal.com where the client can see, reschedule or cancel the booking (it shows the meeting link too). */
export const calBookingPage = (uid: string) => `https://app.cal.com/booking/${encodeURIComponent(uid)}`;

/** The calendar entry for a booked call: what the client saves, and what amfire's invite email carries. */
export function callInvite(call: BookedCall, attendee?: { name: string; email: string }): CallInvite {
  const page = calBookingPage(call.uid);
  const join = call.meetUrl ?? page;
  const title = call.partner ? "amfire partner call (15 min)" : "Free AI plan call with amfire (30 min)";
  return {
    uid: call.iCalUID ?? `${call.uid}@amfire.in`,
    sequence: call.iCalSequence ?? 0,
    title,
    description: [
      call.partner ? "15 minutes with Navanish, founder of amfire." : "30 minutes with Navanish, founder of amfire. Nothing to prepare: come as you are.",
      "",
      `Join the call: ${join}`,
      `Reschedule or cancel: ${page}`,
      `Questions? WhatsApp ${site.contactPhone} or email ${site.contactEmail}`,
    ].join("\n"),
    start: call.start,
    end: call.end,
    location: join,
    organizer: { name: "Navanish Pandey · amfire", email: call.organizerEmail ?? site.contactEmail },
    ...(attendee ? { attendee } : {}),
  };
}
