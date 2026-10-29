import type { Invoice, Organization } from "@/db/schema";
import { site } from "@/config/site";
import { formatMoney } from "@/knowledge/pricing";
import { gstSplit } from "@/server/money";
import { Card, InvoiceBadge, Logo, formatDate } from "./ui";

/** IT design and development services; override with AMFIRE_SAC. */
const SAC = process.env.AMFIRE_SAC ?? "998314";

/** The invoice as the client sees it, in HQ and in the Client Hub. Prints cleanly as a PDF. */
export function InvoiceDocument({
  invoice: i,
  org,
  paid,
  balance,
  overdue,
}: {
  invoice: Invoice;
  org: Pick<Organization, "name" | "billingName" | "billingAddress" | "gstin" | "state">;
  paid: number;
  balance: number;
  overdue: boolean;
}) {
  const gstin = process.env.AMFIRE_GSTIN?.trim();
  const legalName = process.env.AMFIRE_LEGAL_NAME ?? "amfire";
  const address = process.env.AMFIRE_ADDRESS?.replace(/\\n/g, "\n");
  const taxes = gstSplit(i);
  const kind = i.isRecord ? "Payment record" : i.taxRate ? "Tax invoice" : "Invoice";
  return (
    <Card className="print:p-0 print:shadow-none print:ring-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="text-sm">
          <Logo className="h-7" />
          <p className="mt-2 font-medium">{legalName}</p>
          {address && <p className="whitespace-pre-line text-muted">{address}</p>}
          {gstin && <p className="text-muted">GSTIN {gstin}</p>}
          <p className="text-muted">{site.contactEmail}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{kind}</p>
          <p className="text-xl font-semibold">{i.number}</p>
          <div className="mt-1 print:hidden">
            <InvoiceBadge status={i.status} overdue={overdue} />
          </div>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Billed to</dt>
          <dd className="font-medium">{org.billingName ?? org.name}</dd>
          {org.billingAddress && <dd className="whitespace-pre-line text-muted">{org.billingAddress}</dd>}
          {org.gstin && <dd className="text-muted">GSTIN {org.gstin}</dd>}
        </div>
        <div>
          <dt className="text-muted">{i.isRecord ? "Paid" : "Issued"}</dt>
          <dd>{formatDate(i.issuedAt)}</dd>
          {(i.placeOfSupply ?? org.state) && i.taxRate > 0 && (
            <>
              <dt className="mt-2 text-muted">Place of supply</dt>
              <dd>{i.placeOfSupply ?? org.state}</dd>
            </>
          )}
        </div>
        {!i.isRecord && (
          <div>
            <dt className="text-muted">Due</dt>
            <dd>{formatDate(i.dueAt)}</dd>
          </div>
        )}
      </dl>

      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-xs text-muted uppercase">
          <tr className="border-b border-line">
            <th className="py-2 font-medium">Description</th>
            {i.taxRate > 0 && <th className="py-2 font-medium">SAC</th>}
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="[&_td]:py-2">
          <tr className="border-b border-line">
            <td>{i.title}</td>
            {i.taxRate > 0 && <td>{SAC}</td>}
            <td className="text-right">{formatMoney(i.subtotal, i.currency)}</td>
          </tr>
          {taxes.map((t) => (
            <tr key={t.label} className="text-muted">
              <td colSpan={i.taxRate > 0 ? 2 : 1}>{t.label}</td>
              <td className="text-right">{formatMoney(t.amount, i.currency)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td colSpan={i.taxRate > 0 ? 2 : 1}>Total</td>
            <td className="text-right">{formatMoney(i.total, i.currency)}</td>
          </tr>
          {paid > 0 && !i.isRecord && (
            <>
              <tr className="text-muted">
                <td colSpan={i.taxRate > 0 ? 2 : 1}>Paid</td>
                <td className="text-right">−{formatMoney(paid, i.currency)}</td>
              </tr>
              <tr className="font-semibold">
                <td colSpan={i.taxRate > 0 ? 2 : 1}>Balance due</td>
                <td className="text-right">{formatMoney(balance, i.currency)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      {i.currency !== "INR" && gstin && <p className="mt-4 text-xs text-muted">Export of services. No GST charged.</p>}
    </Card>
  );
}
