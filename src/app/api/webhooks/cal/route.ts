// Cal.com reports bookings here. In Cal.com → Settings → Developer → Webhooks,
// add {site}/api/webhooks/cal with the events Booking created, rescheduled and
// cancelled, and the same secret as CAL_WEBHOOK_SECRET.

import { getDb } from "@/db";
import { CalWebhook, recordCalBooking, sendBookingAlert, sendClientInvite, verifyCalSignature, type BookingAlert } from "@/server/bookings";
import { afterResponse } from "@/server/client-notify";

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyCalSignature(raw, request.headers.get("x-cal-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Not JSON", { status: 400 });
  }
  // Cal.com's "Ping test" sends a payload without a booking.
  const event = CalWebhook.safeParse(body);
  if (!event.success) return Response.json({ ignored: "unrecognised payload" });
  const db = await getDb();
  const result = await recordCalBooking(db, event.data);
  const { alert, ...outcome } = result as typeof result & { alert?: BookingAlert; leadId?: string };
  const summary = alert ? { ...outcome, newLead: alert.newLead } : outcome;
  // Shows in Vercel's logs what happened to each booking.
  console.info("cal webhook", event.data.triggerEvent, JSON.stringify(summary));
  if (alert && outcome.leadId) {
    const leadId = outcome.leadId;
    await afterResponse(() =>
      Promise.all([
        sendClientInvite(db, alert).catch((err) => console.error("client invite failed", err)),
        sendBookingAlert(db, leadId, alert).catch((err) => console.error("booking alert failed", err)),
      ]),
    );
  }
  return Response.json(summary);
}
