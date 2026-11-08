// When a prospect opens something we sent (their demo, their report link),
// the owner should call while it's fresh: a note on the prospect, the
// prospect moved to the top of the call queue, and an email to the owner.

import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { prospects, touches, type Prospect } from "@/db/schema";
import { site } from "@/config/site";
import { briefEmails, emailConfigured, sendEmail } from "./notify";

/** Repeat opens within this gap are counted but don't alert again. */
export const OPEN_ALERT_GAP = 60 * 60 * 1000;

/** Statuses still being worked; a lead, partner or lost prospect isn't pulled back into the queue. */
const WORKING = ["to_contact", "trying", "talking", "meeting"];

/** `label` reads as a sentence about them, e.g. "Opened their demo for the first time". */
export async function alertOpen(db: DB, p: Prospect, label: string, now: Date, what: string) {
  await db.insert(touches).values({ prospectId: p.id, channel: "note", outcome: "noted", note: `${label}. Call now while it's fresh.`, loggedBy: "system", occurredAt: now });
  if (!p.doNotContact && WORKING.includes(p.status)) {
    await db.update(prospects).set({ nextFollowUpAt: now, updatedAt: now }).where(eq(prospects.id, p.id));
  }
  // The call-now alert is for the owner: the first brief address, not the whole list.
  const [to] = await briefEmails(db);
  if (!to || !emailConfigured()) return;
  try {
    await sendEmail({
      to,
      subject: `${p.name} just opened their ${what}: call now`,
      text: `${p.name}${p.contactName ? ` (${p.contactName})` : ""} ${label.toLowerCase()} at ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}.\n\n${p.phone ? `Call: ${p.phone}\n` : ""}Prospect: ${site.url}/hq/outreach/${p.id}\n\nPeople who call within 10 minutes of an open win far more often.`,
    });
  } catch (err) {
    console.error(`${what} open alert email failed`, err);
  }
}
