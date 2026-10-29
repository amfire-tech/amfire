// Outreach emails in the Toran theme: the owner (or Claude, through the
// connector) drafts one for a prospect, the owner sends a test to their own
// inbox, and only a tested version can go to the prospect. Sending logs an
// email touch, so the desk and the nightly review see it like any other.

import { isDeepStrictEqual } from "node:util";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { notifications, outreachEmails, prospectContacts, prospects, type OutreachEmail } from "@/db/schema";
import { contact, site } from "@/config/site";
import { defaultEmailContent, renderEmailHtml, renderEmailText, type EmailContent, type EmailFrame } from "@/knowledge/email-theme";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { getDemoForProspect, demoUrl } from "./demos";
import { emailConfigured, emailDeliveryStatus, sendEmail } from "./notify";
import { OutreachError, logTouch } from "./outreach";

const line = (max: number) => z.string().trim().max(max);
const optionalEmail = z.union([z.literal(""), z.email("That email address doesn't look right.")]).nullish();

export const EmailContentSchema = z.object({
  preheader: line(200),
  eyebrow: line(120),
  headline: z.string().trim().min(1, "Give the email a headline.").max(200),
  greeting: line(120),
  opening: z.string().trim().max(3000),
  image: z.object({ url: z.url(), alt: line(200) }).nullable(),
  button: z.object({ label: z.string().trim().min(1).max(60), url: z.url(), note: line(200) }).nullable(),
  findingsTitle: line(120),
  findings: z.array(z.object({ title: z.string().trim().min(1).max(160), body: z.string().trim().max(600) })).max(8),
  showMethod: z.boolean(),
  closing: z.string().trim().max(3000),
  replyLabel: line(60),
  signName: z.string().trim().min(1, "Add your name for the signature.").max(80),
  signRole: line(120),
  footer: line(300),
}) satisfies z.ZodType<EmailContent>;

export const EmailDraftInput = z.object({
  prospectId: z.uuid(),
  toEmail: optionalEmail,
  cc: z.string().trim().max(300).nullish(),
  subject: z.string().trim().min(1, "Add a subject.").max(200),
  content: EmailContentSchema,
});

function frame(subject: string): EmailFrame {
  return {
    subject,
    replyTo: site.contactEmail,
    phone: site.contactPhone,
    whatsappUrl: contact.whatsapp(`Hi, I got your email: "${subject}"`),
  };
}

export function renderOutreachEmail(email: Pick<OutreachEmail, "subject" | "content">) {
  const f = frame(email.subject);
  return { html: renderEmailHtml(email.content, f), text: renderEmailText(email.content, f) };
}

/** Outreach comes from the inbox replies go to: hello@amfire.in (OUTREACH_FROM_EMAIL overrides). */
export const outreachFromAddress = () => process.env.OUTREACH_FROM_EMAIL?.trim() || site.contactEmail;

/**
 * Sends from hello@amfire.in and logs every attempt in notifications. Failures
 * become messages the owner can read in the composer. Returns Resend's id.
 */
async function deliver(db: DB, args: Omit<Parameters<typeof sendEmail>[0], "fromAddress">) {
  if (!emailConfigured()) throw new OutreachError("Email sending isn't set up on this server (RESEND_API_KEY and NOTIFY_FROM_EMAIL).");
  const log = (status: "sent" | "failed", error: string | null) =>
    db.insert(notifications).values({ channel: "email", recipient: args.to, subject: args.subject, body: args.text, status, error });
  try {
    const id = await sendEmail({ ...args, fromAddress: outreachFromAddress() });
    await log("sent", null);
    return id;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    await log("failed", reason);
    throw new OutreachError(`The email didn't go out: ${reason}.`);
  }
}

/** Asks Resend what happened to the last test or send of this email. */
export async function checkEmailDelivery(db: DB, actor: Actor | null, emailId: string) {
  assertStaff(actor);
  const [email] = await db.select().from(outreachEmails).where(eq(outreachEmails.id, emailId));
  if (!email) throw new OutreachError("Email not found.");
  if (!email.resendId) throw new OutreachError("Nothing has been sent from this email yet.");
  return emailDeliveryStatus(email.resendId);
}

const ccList = (cc: string | null | undefined) =>
  (cc ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/** What the composer needs: the prospect, who to send to, the latest email and a frame for the preview. */
export async function getEmailComposer(db: DB, actor: Actor | null, prospectId: string) {
  assertStaff(actor);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
  if (!p) return null;
  const [contacts, [latest], demo, [lastTest]] = await Promise.all([
    db.select().from(prospectContacts).where(eq(prospectContacts.prospectId, p.id)),
    db.select().from(outreachEmails).where(eq(outreachEmails.prospectId, p.id)).orderBy(desc(outreachEmails.createdAt)).limit(1),
    getDemoForProspect(db, p.id),
    db
      .select({ to: outreachEmails.testSentTo })
      .from(outreachEmails)
      .where(isNotNull(outreachEmails.testSentTo))
      .orderBy(desc(outreachEmails.testSentAt))
      .limit(1),
  ]);
  const recipients = [
    ...(p.email ? [{ email: p.email, name: p.contactName ?? p.name }] : []),
    ...contacts.filter((c) => c.email && !c.doNotContact).map((c) => ({ email: c.email!, name: `${c.name}${c.title ? `, ${c.title}` : ""}` })),
  ].filter((r, i, all) => all.findIndex((x) => x.email.toLowerCase() === r.email.toLowerCase()) === i);
  // An account still named after the brand leaves the signature for the owner to fill in.
  const ownerName = /amfire/i.test(actor.name) ? "" : actor.name;
  const draft =
    latest && latest.status === "draft"
      ? latest
      : {
          id: null,
          toEmail: recipients[0]?.email ?? "",
          cc: "",
          subject: "",
          content: defaultEmailContent({ business: p.name.replace(/\s*\(.*?\)\s*/g, " ").trim(), contactName: contacts.find((c) => c.email)?.name ?? p.contactName, demoUrl: demo ? demoUrl(demo) : null, ownerName }),
          version: 0,
          testedVersion: null,
          testSentTo: null,
          testSentAt: null,
        };
  return { prospect: p, recipients, draft, lastSent: latest?.status === "sent" ? latest : null, lastTestTo: lastTest?.to ?? null, emailReady: emailConfigured(), frame: frame(""), fromAddress: outreachFromAddress() };
}

/** Saves a draft (creating one if needed). A changed draft needs a new test before it can go out. */
export async function saveEmailDraft(db: DB, actor: Actor | null, input: z.input<typeof EmailDraftInput> & { emailId?: string | null }, opts: { draftedBy?: "owner" | "claude" } = {}) {
  assertStaff(actor);
  const data = EmailDraftInput.parse(input);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, data.prospectId));
  if (!p) throw new OutreachError("Prospect not found.");
  const values = { toEmail: data.toEmail || null, cc: data.cc || null, subject: data.subject, content: data.content };
  const [existing] = input.emailId
    ? await db.select().from(outreachEmails).where(and(eq(outreachEmails.id, input.emailId), eq(outreachEmails.prospectId, p.id)))
    : await db
        .select()
        .from(outreachEmails)
        .where(and(eq(outreachEmails.prospectId, p.id), eq(outreachEmails.status, "draft")))
        .orderBy(desc(outreachEmails.createdAt))
        .limit(1);
  if (existing && existing.status === "draft") {
    // jsonb doesn't keep key order, so compare by value.
    const changed = !isDeepStrictEqual(values, { toEmail: existing.toEmail, cc: existing.cc, subject: existing.subject, content: existing.content });
    if (!changed) return existing;
    const [row] = await db
      .update(outreachEmails)
      .set({ ...values, version: existing.version + 1, updatedAt: new Date(), ...(opts.draftedBy ? { draftedBy: opts.draftedBy } : {}) })
      .where(eq(outreachEmails.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(outreachEmails)
    .values({ ...values, prospectId: p.id, draftedBy: opts.draftedBy ?? "owner" })
    .returning();
  await audit(db, { actorId: actor.userId, action: "outreach_email.drafted", subjectType: "prospect", subjectId: p.id, data: { emailId: row.id, by: opts.draftedBy ?? "owner" } });
  return row;
}

async function loadDraft(db: DB, emailId: string) {
  const [email] = await db.select().from(outreachEmails).where(eq(outreachEmails.id, emailId));
  if (!email) throw new OutreachError("Email not found.");
  if (email.status !== "draft") throw new OutreachError("This email was already sent. Start a new one.");
  return email;
}

/** Sends the current version to the owner's own address, marked [TEST]. */
export async function sendEmailTest(db: DB, actor: Actor | null, emailId: string, to: string) {
  assertStaff(actor);
  const address = z.email("Type the address to send the test to.").parse(to.trim());
  const email = await loadDraft(db, emailId);
  const { html, text } = renderOutreachEmail(email);
  const resendId = await deliver(db, { to: address, subject: `[TEST] ${email.subject}`, html, text, fromName: email.content.signName.split(" ")[0] });
  const [row] = await db
    .update(outreachEmails)
    .set({ testedVersion: email.version, testSentTo: address, testSentAt: new Date(), resendId })
    .where(eq(outreachEmails.id, email.id))
    .returning();
  return row;
}

/** Sends the tested version to the prospect and logs it as an email touch. */
export async function sendEmailToProspect(db: DB, actor: Actor | null, emailId: string) {
  assertStaff(actor);
  const email = await loadDraft(db, emailId);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, email.prospectId));
  if (!p) throw new OutreachError("Prospect not found.");
  if (p.doNotContact) throw new OutreachError("This prospect asked not to be contacted.");
  if (!email.toEmail) throw new OutreachError("Add the address to send to.");
  if (email.testedVersion !== email.version) throw new OutreachError("Send yourself a test of this version first.");
  const { html, text } = renderOutreachEmail(email);
  const resendId = await deliver(db, { to: email.toEmail, cc: ccList(email.cc), subject: email.subject, html, text, fromName: email.content.signName.split(" ")[0] });
  const touch = await logTouch(db, actor, { prospectId: p.id, channel: "email", outcome: "sent", note: `Email sent to ${email.toEmail}: "${email.subject}"` });
  const [row] = await db
    .update(outreachEmails)
    .set({ status: "sent", sentAt: new Date(), touchId: touch.touch.id, resendId })
    .where(eq(outreachEmails.id, email.id))
    .returning();
  await audit(db, { actorId: actor.userId, action: "outreach_email.sent", subjectType: "prospect", subjectId: p.id, data: { emailId: email.id, to: email.toEmail } });
  return row;
}
