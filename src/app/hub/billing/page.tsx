import Link from "next/link";
import { Money, StatTile } from "@/components/hq";
import { Card, CardTitle, EmptyState, InvoiceBadge, PageHeader, StatusBadge, Table, formatDate } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { requireClientActor } from "@/lib/session";
import { getClientBilling } from "@/server/portal";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const actor = await requireClientActor("/hub/billing");
  const b = await getClientBilling(await getDb(), actor);
  const upi = process.env.PAYMENT_UPI_ID;

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Your invoices, payments and monthly plan. Every invoice can be paid by UPI and downloaded as a PDF." />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="To pay" tone={Object.keys(b.outstanding).length ? "bad" : undefined}>
          <Money amounts={b.outstanding} />
        </StatTile>
        <StatTile label="Paid so far" tone="good">
          <Money amounts={b.paid} />
        </StatTile>
        <StatTile label="Monthly plan">
          {b.subscriptions.length ? <Money amounts={Object.fromEntries(b.subscriptions.map((s) => [s.currency, s.amount]))} /> : "None"}
        </StatTile>
      </div>

      {b.subscriptions.length > 0 && (
        <Card>
          <CardTitle>Your monthly plan</CardTitle>
          <ul className="space-y-3">
            {b.subscriptions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-muted">
                    {formatMoney(s.amount, s.currency)} a month + GST · next invoice {formatDate(s.nextInvoiceAt)}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Want to change or pause your plan?{" "}
            <Link href="/hub/support" className="underline">
              Send us a request
            </Link>
            .
          </p>
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invoices</h2>
        {b.invoices.length === 0 ? (
          <EmptyState title="No invoices yet." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {b.invoices.map(({ invoice: i, overdue }) => (
                <tr key={i.id} className="hover:bg-subtle/60">
                  <td>
                    <Link href={`/hub/invoices/${i.id}`} className="font-medium underline-offset-4 hover:underline">
                      {i.number}
                    </Link>
                    <div className="max-w-xs truncate text-xs text-muted">{i.title}</div>
                  </td>
                  <td className="whitespace-nowrap">{formatMoney(i.total, i.currency)}</td>
                  <td>
                    <InvoiceBadge status={i.status} overdue={overdue} />
                  </td>
                  <td className="whitespace-nowrap text-muted">{i.status === "paid" ? `Paid ${formatDate(i.paidAt)}` : `Due ${formatDate(i.dueAt)}`}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      {upi && (
        <Card>
          <CardTitle>How to pay</CardTitle>
          <p className="text-sm">
            Open any unpaid invoice and tap <strong>Pay with any UPI app</strong>, or pay to UPI ID <strong>{upi}</strong> with the invoice number as the note.
          </p>
        </Card>
      )}
    </div>
  );
}
