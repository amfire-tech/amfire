// Emails to clients when something in their Hub needs them or is new:
// a milestone to approve, a proposal, an update, a priced change, a request
// for something we need. Sent from NOTIFY_FROM_EMAIL (hello@amfire.in); replies
// go to the support inbox. Off until email is set up; every attempt is logged.

import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "@/db";
import { leads, memberships, notifications, users } from "@/db/schema";
import { site } from "@/config/site";
import { emailConfigured, sendEmail } from "./notify";

export type ClientMessage = {
  subject: string;
  /** Short paragraphs, plain text. */
  lines: string[];
  /** Path inside the site, e.g. /hub/projects/{id}. */
  path: string;
  action: string;
};

/** People at a client who get its emails: Hub members, or the lead it came from. */
export async function clientRecipients(db: Pick<DB, "select">, orgId: string) {
  const members = await db
    .select({ email: users.email, name: users.name })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.orgId, orgId), inArray(memberships.role, ["client_admin", "client_member"])));
  if (members.length) return members;
  const [lead] = await db.select({ email: leads.email, name: leads.name }).from(leads).where(eq(leads.clientOrgId, orgId)).limit(1);
  return lead?.email ? [{ email: lead.email, name: lead.name }] : [];
}

export function clientEmailText(name: string, m: ClientMessage, extra: string[] = []) {
  return [
    `Hi ${name.split(" ")[0] || "there"},`,
    ...m.lines,
    ...extra,
    `${m.action}: ${site.url}${m.path}`,
    `Questions? Just reply to this email.\n\n— amfire`,
  ].join("\n\n");
}

/**
 * Lines for one recipient only, e.g. their one-time password. Sent in their
 * email but never stored: the log keeps `logged` in their place.
 */
export type PrivateLines = { email: string; lines: string[]; logged: string };

/** Emails everyone at the client. Never throws: a failed email mustn't undo the work that triggered it. */
export async function notifyClient(
  db: DB,
  orgId: string,
  m: ClientMessage,
  opts: { dedupeKey?: string; privateFor?: PrivateLines } = {},
) {
  if (!emailConfigured()) return { sent: 0 };
  let sent = 0;
  try {
    const people = await clientRecipients(db, orgId);
    for (const [i, p] of people.entries()) {
      // One key per recipient, so a repeated run can't send the same digest twice.
      const dedupeKey = opts.dedupeKey ? `${opts.dedupeKey}:${i}` : null;
      if (dedupeKey) {
        const [already] = await db.select({ id: notifications.id }).from(notifications).where(eq(notifications.dedupeKey, dedupeKey));
        if (already) continue;
      }
      const own = opts.privateFor && opts.privateFor.email.toLowerCase() === p.email.toLowerCase() ? opts.privateFor : null;
      const text = clientEmailText(p.name, m, own ? [own.logged] : []);
      let status = "sent";
      let error: string | null = null;
      try {
        await sendEmail({ to: p.email, subject: m.subject, text: own ? clientEmailText(p.name, m, own.lines) : text });
        sent += 1;
      } catch (err) {
        status = "failed";
        error = err instanceof Error ? err.message : String(err);
      }
      await db
        .insert(notifications)
        .values({ channel: "email", recipient: p.email, subject: m.subject, body: text, status, error, dedupeKey })
        .onConflictDoNothing({ target: notifications.dedupeKey });
    }
  } catch (err) {
    console.error("[notify] client email failed", err instanceof Error ? err.message : err);
  }
  return { sent };
}

/**
 * Runs `task` after the response is sent when inside a Next.js request (so
 * the client's click isn't slowed by sending email), or right away otherwise
 * (tests, cron).
 */
export async function afterResponse(task: () => Promise<unknown>) {
  try {
    const { after } = await import("next/server");
    after(task);
  } catch {
    await task();
  }
}
