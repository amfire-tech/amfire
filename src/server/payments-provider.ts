// Razorpay: payment links for sent invoices, and verification of the webhook
// that reports payments. Everything here is off unless RAZORPAY_KEY_ID and
// RAZORPAY_KEY_SECRET are set; invoices then show UPI and bank details instead.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { Invoice } from "@/db/schema";
import { site } from "@/config/site";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Creates a Razorpay payment link for the invoice total, or returns null when Razorpay isn't set up. */
export async function createPaymentLink(inv: Invoice): Promise<string | null> {
  if (!razorpayConfigured()) return null;
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: inv.total,
      currency: inv.currency,
      description: `${inv.number} · ${inv.title}`.slice(0, 2048),
      reference_id: inv.number,
      notes: { invoice_id: inv.id },
      callback_url: `${site.url}/hub/invoices/${inv.id}`,
      callback_method: "get",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Razorpay payment link failed (${res.status})`);
  const body = (await res.json()) as { short_url?: string };
  return body.short_url ?? null;
}

/** Checks the X-Razorpay-Signature header against RAZORPAY_WEBHOOK_SECRET. */
export function verifyRazorpaySignature(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
