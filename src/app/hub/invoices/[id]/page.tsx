import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice-document";
import { PrintButton } from "@/components/print-button";
import { Card, CardTitle, Notice, PageHeader, buttonClass, formatDate } from "@/components/ui";
import { contact } from "@/config/site";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { isUuid } from "@/lib/ids";
import { requireClientActor, switchAccountUrl } from "@/lib/session";
import { getInvoiceForClient, isOverdue, upiLink } from "@/server/money";

export const metadata = { title: "Invoice" };

export default async function HubInvoicePage({ params }: PageProps<"/hub/invoices/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const actor = await requireClientActor(`/hub/invoices/${id}`);
  const data = await getInvoiceForClient(await getDb(), actor, id);
  if (!data) redirect(switchAccountUrl(`/hub/invoices/${id}`));
  const { invoice: i, org, paid, balance, payments } = data;
  const upi = upiLink(i, balance);
  const bank = process.env.PAYMENT_BANK_DETAILS?.replace(/\\n/g, "\n");

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow={
            <Link href="/hub/billing" className="hover:underline">
              ← Billing
            </Link>
          }
          title={`Invoice ${i.number}`}
          actions={<PrintButton />}
        />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr] print:block print:[&>*:nth-child(2)]:hidden">
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
                <a href={contact.whatsapp(`Hi amfire, I've paid invoice ${i.number}. Reference: `)} target="_blank" rel="noopener noreferrer" className="underline">
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
