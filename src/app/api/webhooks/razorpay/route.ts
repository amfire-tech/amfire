// Razorpay reports a paid payment link here; the payment is recorded against
// its invoice. Set this URL and RAZORPAY_WEBHOOK_SECRET in Razorpay → Webhooks
// with the "payment_link.paid" event.

import { getDb } from "@/db";
import { isUuid } from "@/lib/ids";
import { recordPayment } from "@/server/money";
import { verifyRazorpaySignature } from "@/server/payments-provider";

type PaidEvent = {
  event: string;
  payload?: {
    payment_link?: { entity?: { notes?: { invoice_id?: string } } };
    payment?: { entity?: { id?: string; amount?: number } };
  };
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyRazorpaySignature(raw, request.headers.get("x-razorpay-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const body = JSON.parse(raw) as PaidEvent;
  if (body.event !== "payment_link.paid") return Response.json({ ignored: body.event });

  const invoiceId = body.payload?.payment_link?.entity?.notes?.invoice_id;
  const payment = body.payload?.payment?.entity;
  if (!invoiceId || !isUuid(invoiceId) || !payment?.id || !payment.amount) {
    return new Response("Missing invoice or payment", { status: 400 });
  }
  const result = await recordPayment(
    await getDb(),
    null,
    invoiceId,
    { amount: payment.amount / 100, method: "razorpay", reference: payment.id },
    { system: true },
  );
  return Response.json({ ok: true, duplicate: result.duplicate });
}
