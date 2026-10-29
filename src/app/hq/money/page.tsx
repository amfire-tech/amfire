import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Money, StatTile } from "@/components/hq";
import { Card, CardTitle, EmptyState, Field, PageHeader, StatusBadge, formatDate, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { requireStaffActor } from "@/lib/session";
import { listClientOrgs } from "@/server/crm";
import { getMoneyOverview, gstRegistered } from "@/server/money";
import { razorpayConfigured } from "@/server/payments-provider";
import { draftRetainerInvoicesAction, newInvoiceAction } from "../actions";
import { InvoiceList } from "./invoice-list";

export const metadata = { title: "Money" };

export default async function MoneyPage() {
  const actor = await requireStaffActor();
  const db = await getDb();
  const [m, clients] = await Promise.all([getMoneyOverview(db, actor), listClientOrgs(db, actor)]);
  // The bars compare months in the main currency only.
  const main = Object.keys(m.mrr)[0] ?? "INR";
  const peak = Math.max(1, ...m.months.map((x) => x.collected[main] ?? 0));
  const overdueTotal = m.overdue.reduce<Record<string, number>>((acc, r) => ((acc[r.invoice.currency] = (acc[r.invoice.currency] ?? 0) + r.invoice.total), acc), {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Money"
        description={
          <>
            What’s coming in, what’s owed and what’s recurring. Payments are recorded by hand
            {razorpayConfigured() ? " or arrive automatically from Razorpay." : ". Add Razorpay keys to collect online and record payments automatically."}
          </>
        }
        actions={<ActionForm action={draftRetainerInvoicesAction} submitLabel="Draft due plan invoices" size="sm" />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Monthly recurring" hint="Active monthly plans, before GST">
          <Money amounts={m.mrr} />
        </StatTile>
        <StatTile label="Collected this month" tone="good">
          <Money amounts={m.collectedThisMonth} />
        </StatTile>
        <StatTile label="Outstanding" hint="Sent and not yet paid">
          <Money amounts={m.outstanding} />
        </StatTile>
        <StatTile label="Overdue" tone={m.overdue.length ? "bad" : undefined} hint={`${m.overdue.length} invoice${m.overdue.length === 1 ? "" : "s"}`}>
          <Money amounts={overdueTotal} />
        </StatTile>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardTitle>Collected, last 6 months ({main})</CardTitle>
          <div className="flex h-40 items-end gap-3" role="img" aria-label="Money collected per month">
            {m.months.map((x) => {
              const v = x.collected[main] ?? 0;
              return (
                <div key={x.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[11px] text-muted">{v ? formatMoney(v, main).replace(/\.00$/, "") : ""}</span>
                  <div className="bg-brand w-full rounded-t-lg" style={{ height: `${Math.max(2, (v / peak) * 100)}%`, opacity: v ? 1 : 0.25 }} />
                  <span className="text-xs text-muted">{x.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle>Monthly plans</CardTitle>
          {m.subscriptions.length === 0 ? (
            <EmptyState title="No monthly plans yet.">An accepted Operate proposal adds one automatically.</EmptyState>
          ) : (
            <ul className="-mx-2 divide-y divide-line">
              {m.subscriptions.map(({ subscription: s, orgName }) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-2 py-2.5">
                  <Link href={`/hq/clients/${s.orgId}`} className="min-w-0 hover:underline">
                    <span className="block truncate font-medium">{orgName}</span>
                    <span className="block text-sm text-muted">
                      {formatMoney(s.amount, s.currency)}/month · next {formatDate(s.nextInvoiceAt)}
                    </span>
                  </Link>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <p className="text-sm text-muted">
          Finance creates invoices by itself when a client approves a milestone and every month for monthly plans, then asks you to send each one. For anything
          else, create one here.{" "}
          {gstRegistered() ? "GST is added to rupee invoices." : "No GST is added: set AMFIRE_GSTIN once amfire is GST-registered."}
        </p>
        {clients.length > 0 && (
          <Card>
            <ActionForm action={newInvoiceAction} submitLabel="Create draft invoice" inline>
              <Field label="Client" htmlFor="new-inv-org">
                <select id="new-inv-org" name="orgId" required defaultValue="" className={`${inputClass} sm:!w-56`}>
                  <option value="" disabled>
                    Choose a client
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="For" htmlFor="new-inv-title">
                <input id="new-inv-title" name="title" required className={`${inputClass} sm:!w-64`} placeholder="Extra report design" />
              </Field>
              <Field label="Amount (before GST)" htmlFor="new-inv-amount">
                <input id="new-inv-amount" name="amount" type="number" min={1} required className={`${inputClass} sm:!w-36`} />
              </Field>
              <Field label="Currency" htmlFor="new-inv-currency">
                <select id="new-inv-currency" name="currency" defaultValue="INR" className={`${inputClass} sm:!w-28`}>
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                </select>
              </Field>
            </ActionForm>
          </Card>
        )}
        <InvoiceList rows={m.invoices} />
      </section>
    </div>
  );
}
