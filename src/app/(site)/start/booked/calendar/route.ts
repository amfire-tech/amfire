// "Add to calendar" on the booked page. Resolved when the client taps, not when
// the page loads, because Cal.com's webhook (with the Meet link) usually lands
// a few seconds after the visitor is sent to the page.
//   ?b=<booking uid>&to=google  → Google Calendar with the event filled in
//   ?b=<booking uid>&to=ics     → a calendar file for Outlook, Apple Calendar and the rest

import { getDb } from "@/db";
import { googleCalendarUrl, inviteIcs } from "@/lib/ics";
import { bookedCall, calBookingPage, callInvite } from "@/server/bookings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const uid = url.searchParams.get("b") ?? "";
  if (!/^[\w-]{6,64}$/.test(uid)) return new Response("Unknown booking", { status: 400 });
  const call = await bookedCall(await getDb(), uid, {
    start: url.searchParams.get("s") ?? undefined,
    end: url.searchParams.get("e") ?? undefined,
    partner: url.searchParams.get("k") === "partner",
  });
  // Without a time we can't build the event; Cal.com's page has every detail and its own calendar links.
  if (!call) return Response.redirect(calBookingPage(uid), 302);

  const invite = callInvite(call);
  if (url.searchParams.get("to") === "google") return Response.redirect(googleCalendarUrl(invite), 302);
  return new Response(inviteIcs(invite, "PUBLISH"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="amfire-call.ics"',
      "Cache-Control": "no-store",
    },
  });
}
