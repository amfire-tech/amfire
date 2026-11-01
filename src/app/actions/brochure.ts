"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";
import { site } from "@/config/site";
import { getDb } from "@/db";
import { brochureFor } from "@/knowledge/brochures";
import { SERVICES } from "@/knowledge/catalog";
import { CURRENCY_COOKIE, isCurrency } from "@/knowledge/pricing";
import { ATTRIBUTION_COOKIE, readTouch } from "@/lib/attribution";
import { rateLimit } from "@/lib/rate-limit";
import {
  ACCESS_TTL_MS,
  BROCHURE_COOKIE,
  BROCHURE_STEPS,
  BrochureRequestSchema,
  confirmBrochureLead,
  createAccessCookie,
  createBrochureLink,
  readAccessCookie,
  readBrochureLink,
  recordBrochureStep,
  recordBrochureWish,
} from "@/server/brochures";
import { emailConfigured, sendEmail } from "@/server/notify";

type GateValues = { name?: string; email?: string; company?: string; phone?: string };
/** `values` refills the form after an error, since React clears it when the action returns. */
export type BrochureGateState = { sent?: string; devLink?: string; errors?: Record<string, string>; formError?: string; values?: GateValues } | undefined;

/** Links point at the site's own domain in production, wherever you are locally. */
async function origin() {
  if (process.env.VERCEL_ENV === "production") return site.url;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : site.url;
}

const text = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
};

export async function requestBrochure(_prev: BrochureGateState, formData: FormData): Promise<BrochureGateState> {
  // Honeypot: real visitors never fill this hidden field.
  if (formData.get("website")) return { sent: "your inbox" };
  const values: GateValues = { name: text(formData, "name"), email: text(formData, "email"), company: text(formData, "company"), phone: text(formData, "phone") };
  if (!(await rateLimit("brochure", 6, 60 * 60 * 1000))) {
    return { formError: "We've sent several links to this connection already. Please check your inbox, or try again later.", values };
  }

  const currency = (await cookies()).get(CURRENCY_COOKIE)?.value;
  const parsed = BrochureRequestSchema.safeParse({
    plan: text(formData, "plan"),
    ...values,
    currency: isCurrency(currency) ? currency : undefined,
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { errors, values };
  }

  const req = parsed.data;
  const link = `${await origin()}/brochure/open?t=${encodeURIComponent(createBrochureLink(req))}`;
  const plan = SERVICES[req.plan].name;
  if (!emailConfigured()) {
    // Development: show the link on screen instead of emailing it.
    if (process.env.NODE_ENV !== "production") return { sent: req.email, devLink: link };
    console.error("[brochure] email isn't configured, so the brochure link couldn't be sent");
    return { formError: `We couldn't send the email just now. Please write to ${site.contactEmail} and we'll send the brochure.`, values };
  }
  try {
    await sendEmail({
      to: req.email,
      subject: `Your amfire ${plan} brochure`,
      text: `Hi ${req.name.split(" ")[0]},\n\nHere's your link to see everything you get with amfire ${plan}:\n${link}\n\nIt opens the brochure on any device for the next 7 days.\n\nIf you didn't ask for this, you can ignore this email.\n\n— amfire\n${site.url}`,
      idempotencyKey: `brochure-${req.plan}-${req.email}-${new Date().toISOString().slice(0, 13)}`,
    });
  } catch (err) {
    console.error("[brochure] sending the link failed", err instanceof Error ? err.message : err);
    return { formError: "We couldn't send the email just now. Please try again in a minute.", values };
  }
  return { sent: req.email };
}

/** The button on the confirm page: saves the lead and unlocks the brochure on this device. */
export async function openBrochure(formData: FormData) {
  const req = readBrochureLink(text(formData, "t"));
  if (!req) redirect("/brochure/open?expired=1");
  const jar = await cookies();
  const lead = await confirmBrochureLead(await getDb(), req, readTouch(jar.get(ATTRIBUTION_COOKIE)?.value));
  const previous = readAccessCookie(jar.get(BROCHURE_COOKIE)?.value);
  const plans = Array.from(new Set([...(previous?.leadId === lead.id ? previous.plans : []), req.plan]));
  jar.set(BROCHURE_COOKIE, createAccessCookie({ leadId: lead.id, name: req.name, plans }), {
    path: "/",
    maxAge: ACCESS_TTL_MS / 1000,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(`/brochure/${req.plan}`);
}

async function reader(plan: string) {
  // A confirmed email unlocks every plan's brochure, so any valid cookie is a known reader.
  return brochureFor(plan) ? readAccessCookie((await cookies()).get(BROCHURE_COOKIE)?.value) : null;
}

/** Called as the reader scrolls; never throws, the brochure must keep working. */
export async function trackBrochureStep(plan: string, step: string) {
  try {
    const access = await reader(plan);
    const known = BROCHURE_STEPS.find((s) => s === step);
    if (access && known) await recordBrochureStep(await getDb(), access.leadId, plan, known);
  } catch (err) {
    console.error("[brochure] tracking failed", err);
  }
}

const WishSchema = z.object({ wishes: z.array(z.string().trim().max(80)).max(20), note: z.string().trim().max(500).optional() });

/** The super-mall: what else they want built. Sends them on to book the free demo. */
export async function submitBrochureWish(plan: string, input: z.input<typeof WishSchema>) {
  const parsed = WishSchema.safeParse(input);
  const access = await reader(plan);
  if (parsed.success && access && (parsed.data.wishes.length || parsed.data.note)) {
    try {
      await recordBrochureWish(await getDb(), access.leadId, plan, parsed.data.wishes, parsed.data.note || undefined);
    } catch (err) {
      console.error("[brochure] saving the wish list failed", err);
    }
  }
  return { ok: true };
}
