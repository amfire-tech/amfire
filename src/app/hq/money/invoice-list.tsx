import Link from "next/link";
import { EmptyState, InvoiceBadge, Table, formatDate } from "@/components/ui";
import type { Invoice } from "@/db/schema";
import { formatMoney } from "@/knowledge/pricing";
import { isOverdue } from "@/server/money";

export function InvoiceList({ rows, hideClient }: { rows: { invoice: Invoice; orgName: string }[]; hideClient?: boolean }) {
  if (rows.length === 0) return <EmptyState title="No invoices yet.">A draft appears here when a client approves a priced milestone.</EmptyState>;
  const now = new Date();
  return (
    <Table>
      <thead>
        <tr>
          <th>Invoice</th>
          {!hideClient && <th>Client</th>}
          <th>Total</th>
          <th>Status</th>
          <th>Due</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ invoice: i, orgName }) => (
          <tr key={i.id} className="hover:bg-subtle/60">
            <td>
              <Link href={`/hq/money/invoices/${i.id}`} className="font-medium underline-offset-4 hover:underline">
                {i.number}
              </Link>
              <div className="max-w-xs truncate text-xs text-muted">{i.title}</div>
            </td>
            {!hideClient && <td>{orgName}</td>}
            <td className="whitespace-nowrap">{formatMoney(i.total, i.currency)}</td>
            <td>
              <InvoiceBadge status={i.status} overdue={isOverdue(i, now)} />
            </td>
            <td className="whitespace-nowrap text-muted">{i.status === "paid" ? `Paid ${formatDate(i.paidAt)}` : formatDate(i.dueAt)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
