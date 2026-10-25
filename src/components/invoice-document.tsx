import type { Invoice, Organization } from "@/db/schema";
import { site } from "@/config/site";
import { formatMoney } from "@/knowledge/pricing";
import { Card, InvoiceBadge, Logo, formatDate } from "./ui";

/** The invoice as the client sees it, in HQ and in the Client Hub. */
export function InvoiceDocument({
  invoice: i,
  org,
  paid,
  balance,
  overdue,
}: {
  invoice: Invoice;
  org: Pick<Organization, "name">;
  paid: number;
  balance: number;
  overdue: boolean;
}) {
  const gstin = process.env.AMFIRE_GSTIN;
  return (
    <Card className="print:shadow-none print:ring-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Logo className="h-7" />
          <p className="mt-2 text-sm text-muted">{site.contactEmail}</p>
          {gstin && <p className="text-sm text-muted">GSTIN {gstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{i.taxRate ? "Tax invoice" : "Invoice"}</p>
          <p className="text-xl font-semibold">{i.number}</p>
          <div className="mt-1">
            <InvoiceBadge status={i.status} overdue={overdue} />
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Billed to</dt>
          <dd className="font-medium">{org.name}</dd>
        </div>
        <div>
          <dt className="text-muted">Issued</dt>
          <dd>{formatDate(i.issuedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Due</dt>
          <dd>{formatDate(i.dueAt)}</dd>
        </div>
      </dl>

      <table className="mt-6 w-full text-sm">
        <tbody className="[&_td]:py-2">
          <tr className="border-b border-line">
            <td>{i.title}</td>
            <td className="text-right">{formatMoney(i.subtotal, i.currency)}</td>
          </tr>
          {i.taxRate > 0 && (
            <tr className="text-muted">
              <td>GST {i.taxRate / 100}%</td>
              <td className="text-right">{formatMoney(i.tax, i.currency)}</td>
            </tr>
          )}
          <tr className="font-semibold">
            <td>Total</td>
            <td className="text-right">{formatMoney(i.total, i.currency)}</td>
          </tr>
          {paid > 0 && (
            <>
              <tr className="text-muted">
                <td>Paid</td>
                <td className="text-right">−{formatMoney(paid, i.currency)}</td>
              </tr>
              <tr className="font-semibold">
                <td>Balance due</td>
                <td className="text-right">{formatMoney(balance, i.currency)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </Card>
  );
}
