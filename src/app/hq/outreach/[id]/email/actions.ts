"use server";

// The email composer's actions. Each re-checks authorisation on the server:
// the draft, the addresses and the email id all come from the browser.

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { EmailContent } from "@/knowledge/email-theme";
import { toActionError } from "@/lib/action-result";
import { getActor } from "@/lib/session";
import { OutreachError } from "@/server/outreach";
import { checkEmailDelivery, saveEmailDraft, sendEmailTest, sendEmailToProspect } from "@/server/outreach-emails";

export type DraftFields = { emailId: string | null; toEmail: string; cc: string; subject: string; content: EmailContent };
export type DraftState = { id: string; version: number; testedVersion: number | null; testSentTo: string | null; testSentAt: string | null };
export type ComposerResult = { error?: string; ok?: string; draft?: DraftState; sent?: boolean };

const state = (e: { id: string; version: number; testedVersion: number | null; testSentTo: string | null; testSentAt: Date | null }): DraftState => ({
  id: e.id,
  version: e.version,
  testedVersion: e.testedVersion,
  testSentTo: e.testSentTo,
  testSentAt: e.testSentAt?.toISOString() ?? null,
});

/** Half-filled optional parts: both empty means "none", one empty is a mistake to point out. */
function tidy(content: EmailContent): EmailContent {
  const b = content.button;
  const button = b && (b.label.trim() || b.url.trim()) ? b : null;
  if (button && (!button.label.trim() || !button.url.trim())) throw new OutreachError("Give the main button both its text and its link, or clear both.");
  const image = content.image?.url.trim() ? content.image : null;
  return { ...content, button, image, findings: content.findings.filter((f) => f.title.trim() || f.body.trim()) };
}

async function save(prospectId: string, fields: DraftFields) {
  const db = await getDb();
  const actor = await getActor();
  const email = await saveEmailDraft(db, actor, { prospectId, emailId: fields.emailId, toEmail: fields.toEmail, cc: fields.cc, subject: fields.subject, content: tidy(fields.content) });
  return { db, actor, email };
}

export async function saveEmailDraftAction(prospectId: string, fields: DraftFields): Promise<ComposerResult> {
  try {
    const { email } = await save(prospectId, fields);
    return { ok: "Draft saved.", draft: state(email) };
  } catch (err) {
    return toActionError(err) ?? {};
  }
}

/** Saves what's on screen, then sends that version to the test address. */
export async function sendEmailTestAction(prospectId: string, fields: DraftFields, testTo: string): Promise<ComposerResult> {
  try {
    const { db, actor, email } = await save(prospectId, fields);
    const tested = await sendEmailTest(db, actor, email.id, testTo);
    return { ok: `Test sent to ${tested.testSentTo}. Check it on your phone.`, draft: state(tested) };
  } catch (err) {
    return toActionError(err) ?? {};
  }
}

const DELIVERY: Record<string, string> = {
  sent: "Resend accepted it and is handing it to their mail server. Check again in a minute.",
  delivered: "Delivered to the inbox's mail server. If you can't see it, look in Spam and Promotions.",
  delivery_delayed: "Delivery is delayed; their mail server hasn't accepted it yet. Resend keeps trying.",
  bounced: "Bounced: the address doesn't exist or refused it. Check the spelling.",
  complained: "Delivered, but marked as spam.",
  opened: "Delivered and opened.",
  clicked: "Delivered, opened and a link was clicked.",
};

export async function checkEmailDeliveryAction(emailId: string): Promise<ComposerResult> {
  try {
    const res = await checkEmailDelivery(await getDb(), await getActor(), emailId);
    if (res.error) return { error: res.error };
    return { ok: res.status ? (DELIVERY[res.status] ?? `Resend status: ${res.status}.`) : "Resend has no status for it yet." };
  } catch (err) {
    return toActionError(err) ?? {};
  }
}

export async function sendEmailToProspectAction(prospectId: string, emailId: string): Promise<ComposerResult> {
  try {
    const db = await getDb();
    const sent = await sendEmailToProspect(db, await getActor(), emailId);
    revalidatePath("/hq/outreach", "layout");
    return { ok: `Sent to ${sent.toEmail} and logged on the desk.`, sent: true };
  } catch (err) {
    return toActionError(err) ?? {};
  }
}
