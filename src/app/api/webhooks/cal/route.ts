// Cal.com reports bookings here. In Cal.com → Settings → Developer → Webhooks,
// add {site}/api/webhooks/cal with the events Booking created, rescheduled and
// cancelled, and the same secret as CAL_WEBHOOK_SECRET.

import { getDb } from "@/db";
import { CalWebhook, recordCalBooking, verifyCalSignature } from "@/server/bookings";

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
  return Response.json(await recordCalBooking(await getDb(), event.data));
}
