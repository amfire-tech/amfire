// Calendar invites (RFC 5545) and "Add to Google Calendar" links for booked
// calls, so a customer has the meeting in their calendar even if Cal.com's own
// email never reaches them.

export type CallInvite = {
  /** Shared with Cal.com's invite when known, so calendars merge the two into one event. */
  uid: string;
  sequence?: number;
  title: string;
  description: string;
  start: Date;
  end: Date;
  location?: string;
  organizer: { name: string; email: string };
  attendee?: { name: string; email: string };
};

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapes text for an iCalendar property value. */
const text = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds long lines at 75 octets, as calendars expect. */
function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest, "utf8") > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut), "utf8") > 75) cut--;
    out.push(rest.slice(0, cut));
    rest = " " + rest.slice(cut);
  }
  out.push(rest);
  return out.join("\r\n");
}

const cn = (name: string) => name.replace(/["\\;:,]/g, "");

/** A complete .ics file: REQUEST adds or updates the event, CANCEL removes it. */
export function inviteIcs(invite: CallInvite, method: "REQUEST" | "CANCEL" | "PUBLISH" = "REQUEST", now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//amfire//Booked call//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${invite.uid}`,
    `SEQUENCE:${invite.sequence ?? 0}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(invite.start)}`,
    `DTEND:${stamp(invite.end)}`,
    `SUMMARY:${text(invite.title)}`,
    `DESCRIPTION:${text(invite.description)}`,
    ...(invite.location ? [`LOCATION:${text(invite.location)}`] : []),
    `ORGANIZER;CN=${cn(invite.organizer.name)}:mailto:${invite.organizer.email}`,
    ...(invite.attendee
      ? [`ATTENDEE;CN=${cn(invite.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=${method === "CANCEL" ? "DECLINED" : "ACCEPTED"};RSVP=FALSE:mailto:${invite.attendee.email}`]
      : []),
    `STATUS:${method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    ...(method === "CANCEL"
      ? []
      : ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${text(invite.title)}`, "TRIGGER:-PT15M", "END:VALARM"]),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Opens Google Calendar with the event filled in, one tap to save. */
export function googleCalendarUrl(invite: Pick<CallInvite, "title" | "description" | "start" | "end" | "location">) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: invite.title,
    dates: `${stamp(invite.start)}/${stamp(invite.end)}`,
    details: invite.description,
    ...(invite.location ? { location: invite.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
