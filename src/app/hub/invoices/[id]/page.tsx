import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { Card, CardTitle, Notice, PageHeader, buttonClass, formatDate } from "@/components/ui";
import { contact } from "@/config/site";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { isUuid } from "@/lib/ids";
import { requireActor } from "@/lib/session";
import { getInvoiceForClient, isOverdue, upiLink } from "@/server/money";

export const metadata = { title: "Invoice" };

export default async function HubInvoicePage({ params }: PageProps<"/hub/invoices/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const actor = await requireActor(`/hub/invoices/${id}`);
  const data = await getInvoiceForClient(await getDb(), actor, id);
  if (!data) notFound();
  const { invoice: i, org, paid, balance, payments } = data;
  const upi = upiLink(i, balance);
  const bank = process.env.PAYMENT_BANK_DETAILS?.replace(/\\n/g, "\n");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hub" className="hover:underline">
            ← Client Hub
          </Link>
        }
        title={`Invoice ${i.number}`}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <InvoiceDocument invoice={i} org={org} paid={paid} balance={balance} overdue={isOverdue(i)} />

        {i.status === "paid" ? (
          <Notice tone="success" title="Paid — thank you">
            Received {formatDate(i.paidAt)}. {payments.length > 1 ? `${payments.length} payments recorded.` : ""}
          </Notice>
        ) : i.status === "sent" ? (
          <Card>
            <CardTitle>Pay {formatMoney(balance, i.currency)}</CardTitle>
            <div className="space-y-4 text-sm">
              {i.paymentLinkUrl && (
                <a href={i.paymentLinkUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md", "w-full")}>
                  Pay online (UPI, card, netbanking)
                </a>
              )}
              {upi && (
                <div>
                  <a href={upi} className={buttonClass(i.paymentLinkUrl ? "secondary" : "primary", "md", "w-full")}>
                    Pay with any UPI app
                  </a>
                  <p className="mt-1.5 text-center text-muted">
                    Or pay to UPI ID <strong className="text-fg">{process.env.PAYMENT_UPI_ID}</strong> with “{i.number}” as the note.
                  </p>
                </div>
              )}
              {bank && (
                <div>
                  <p className="font-medium">Bank transfer</p>
                  <pre className="mt-1 rounded-xl bg-subtle p-3 font-sans whitespace-pre-wrap">{bank}</pre>
                </div>
              )}
              {!i.paymentLinkUrl && !upi && !bank && <p>We’ll share payment details with you directly.</p>}
              <p className="text-muted">
                Paid already? Send the reference on{" "}
                <a href={contact.whatsapp(`Hi AMFIRE, I've paid invoice ${i.number}. Reference: `)} target="_blank" rel="noopener noreferrer" className="underline">
                  WhatsApp
                </a>{" "}
                and we’ll mark it paid.
              </p>
            </div>
          </Card>
        ) : (
          <Notice>This invoice was cancelled.</Notice>
        )}
      </div>
    </div>
  );
}
