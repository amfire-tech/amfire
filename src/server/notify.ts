// Outgoing channels: email through Resend, WhatsApp through the WhatsApp
// Business Cloud API. Both are off until configured, and every attempt —
// sent, failed or skipped — is logged so HQ can show what happened.

import { eq } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { appSettings, notifications, type BriefBody } from "@/db/schema";
import { site } from "@/config/site";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM_EMAIL);
}

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.OWNER_WHATSAPP);
}

/**
 * The brand is written "amfire": whatever name NOTIFY_FROM_EMAIL carries, emails come from "amfire <address>",
 * or "Navanish from amfire <address>" when a person writes.
 */
export function fromHeader(from: string, personName?: string) {
  const address = from.match(/<([^>]+)>/)?.[1] ?? from.trim();
  const name = personName?.replace(/[^\p{L}\p{N} .'-]/gu, "").trim();
  // An account still named after the brand ("AMFIRE Owner") just sends as amfire.
  return name && !/amfire/i.test(name) ? `${name} from amfire <${address}>` : `amfire <${address}>`;
}

export async function sendEmail({ to, subject, text, html, cc, fromName }: { to: string; subject: string; text: string; html?: string; cc?: string[]; fromName?: string }) {
  if (!emailConfigured()) throw new Error("Email isn't set up (RESEND_API_KEY and NOTIFY_FROM_EMAIL).");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    // Replies go to the support inbox (hello@amfire.in), whatever address sends.
    body: JSON.stringify({
      from: fromHeader(process.env.NOTIFY_FROM_EMAIL!, fromName),
      to: [to],
      ...(cc?.length ? { cc } : {}),
      reply_to: site.contactEmail,
      subject,
      text,
      ...(html ? { html } : {}),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Resend returned ${res.status}`);
}

/**
 * WhatsApp only allows free-form messages inside a 24-hour window after the
 * recipient last wrote; outside it Meta requires an approved template. Set
 * WHATSAPP_BRIEF_TEMPLATE to a template with one body parameter to use one.
 */
async function sendWhatsApp(to: string, text: string) {
  const template = process.env.WHATSAPP_BRIEF_TEMPLATE;
  const body = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: template, language: { code: "en" }, components: [{ type: "body", parameters: [{ type: "text", text: text.slice(0, 1000) }] }] },
      }
    : { messaging_product: "whatsapp", to, type: "text", text: { body: text.slice(0, 4000) } };
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`WhatsApp returned ${res.status}`);
}

export function briefAsText(headline: string, body: BriefBody) {
  return [
    `amfire brief: ${headline}`,
    body.narrative ?? "",
    ...body.sections.flatMap((s) => [`\n${s.title}`, ...s.lines.map((l) => `• ${l.text}`)]),
    body.teamActivity.length ? `\nWhat the team did\n${body.teamActivity.map((t) => `• ${t}`).join("\n")}` : "",
    `\nOpen HQ: ${site.url}/hq`,
  ]
    .filter(Boolean)
    .join("\n");
}

const BRIEF_EMAILS_KEY = "brief_emails";

/** Where the morning brief is emailed: the list set in HQ, else BRIEF_EMAIL, else the owner's sign-in address. */
export async function briefEmails(db: DB): Promise<string[]> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, BRIEF_EMAILS_KEY));
  const saved = z.array(z.string()).safeParse(row?.value);
  if (saved.success && saved.data.length) return saved.data;
  const fallback = process.env.BRIEF_EMAIL?.trim() || process.env.OWNER_EMAIL?.trim();
  return fallback ? [fallback] : [];
}

/** True when the list comes from HQ rather than the environment. */
export async function briefEmailsSaved(db: DB) {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, BRIEF_EMAILS_KEY));
  return Array.isArray(row?.value) && row.value.length > 0;
}

export async function setBriefEmails(db: DB, emails: string[]) {
  const values = { key: BRIEF_EMAILS_KEY, value: emails, updatedAt: new Date() };
  await db.insert(appSettings).values(values).onConflictDoUpdate({ target: appSettings.key, set: values });
}

/** Sends the brief to the owner on every configured channel, and by email to each address set in HQ. */
export async function deliverBrief(db: DB, headline: string, body: BriefBody) {
  const text = briefAsText(headline, body);
  const emails = await briefEmails(db);
  const results: { channel: string; recipient: string | undefined; status: string }[] = [];
  const attempts: { channel: string; recipient: string | undefined; configured: boolean; send: () => Promise<void> }[] = [
    ...(emails.length ? emails : [undefined]).map((to) => ({
      channel: "email",
      recipient: to,
      configured: emailConfigured() && !!to,
      send: () => sendEmail({ to: to!, subject: `amfire brief: ${headline}`, text }),
    })),
    {
      channel: "whatsapp",
      recipient: process.env.OWNER_WHATSAPP,
      configured: whatsappConfigured(),
      send: () => sendWhatsApp(process.env.OWNER_WHATSAPP!.replace(/\D/g, ""), text),
    },
  ];
  for (const a of attempts) {
    let status = "skipped";
    let error: string | null = a.configured ? null : "Not configured";
    if (a.configured) {
      try {
        await a.send();
        status = "sent";
      } catch (err) {
        status = "failed";
        error = err instanceof Error ? err.message : String(err);
      }
    }
    await db.insert(notifications).values({ channel: a.channel, recipient: a.recipient ?? null, subject: headline, body: text, status, error });
    results.push({ channel: a.channel, recipient: a.recipient, status });
  }
  return results;
}
