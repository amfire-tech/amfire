import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { InvoiceDocument } from "@/components/invoice-document";
import { Card, CardTitle, Field, Notice, PageHeader, formatDateTime, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { isUuid } from "@/lib/ids";
import { requireStaffActor } from "@/lib/session";
import { getInvoiceForStaff, isOverdue } from "@/server/money";
import { recordPaymentAction, sendInvoiceAction, voidInvoiceAction } from "../../../actions";

const METHODS = [
  { id: "upi", label: "UPI" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "card", label: "Card" },
  { id: "cash", label: "Cash" },
  { id: "razorpay", label: "Razorpay" },
  { id: "other", label: "Other" },
];

export const metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: PageProps<"/hq/money/invoices/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const actor = await requireStaffActor();
  const data = await getInvoiceForStaff(await getDb(), actor, id);
  if (!data) notFound();
  const { invoice: i, org, payments, paid, balance } = data;
  const isOwner = actor.internalRole === "owner";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/money" className="hover:underline">
            ← Money
          </Link>
        }
        title={i.number}
        description={
          <Link href={`/hq/clients/${org.id}`} className="underline underline-offset-4">
            {org.name}
          </Link>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <InvoiceDocument invoice={i} org={org} paid={paid} balance={balance} overdue={isOverdue(i)} />

        <div className="space-y-6">
          {i.status === "draft" && (
            <Card>
              <CardTitle>Send to the client</CardTitle>
              <p className="mb-4 text-sm text-muted">
                The client sees it in their Hub with payment details, due in 7 days. This is a commercial commitment.
              </p>
              {isOwner ? (
                <ActionForm action={sendInvoiceAction.bind(null, i.id)} submitLabel="Send invoice" variant="primary" pendingLabel="Sending…" />
              ) : (
                <Notice>Only the owner can send invoices.</Notice>
              )}
            </Card>
          )}

          {i.status === "sent" && (
            <Card>
              <CardTitle>Record a payment</CardTitle>
              <ActionForm action={recordPaymentAction.bind(null, i.id)} submitLabel="Record payment" variant="primary">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={`Amount (${i.currency})`} htmlFor="pay-amount">
                    <input id="pay-amount" name="amount" type="number" step="any" min={0} defaultValue={balance / 100} required className={inputClass} />
                  </Field>
                  <Field label="Method" htmlFor="pay-method">
                    <select id="pay-method" name="method" defaultValue="upi" className={inputClass}>
                      {METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Reference" htmlFor="pay-ref" optional hint="UTR or transaction ID">
                  <input id="pay-ref" name="reference" className={inputClass} />
                </Field>
              </ActionForm>
              {i.paymentLinkUrl && (
                <p className="mt-4 text-sm text-muted">
                  Razorpay link:{" "}
                  <a href={i.paymentLinkUrl} className="underline" target="_blank" rel="noopener noreferrer">
                    {i.paymentLinkUrl}
                  </a>
                </p>
              )}
            </Card>
          )}

          {payments.length > 0 && (
            <Card>
              <CardTitle>Payments</CardTitle>
              <ul className="space-y-2 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3">
                    <span>
                      {formatMoney(p.amount, i.currency)} · {METHODS.find((m) => m.id === p.method)?.label}
                      {p.reference && <span className="text-muted"> · {p.reference}</span>}
                    </span>
                    <span className="text-muted">{formatDateTime(p.receivedAt)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {isOwner && (i.status === "draft" || i.status === "sent") && (
            <ActionForm action={voidInvoiceAction.bind(null, i.id)} submitLabel="Void this invoice" variant="ghost" size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}
