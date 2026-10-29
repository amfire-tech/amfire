// Read-only proposal, identical for amfire and the client.

import type { Proposal } from "@/db/schema";
import { formatMoney } from "@/knowledge/pricing";
import { BulletList, Card, PathBadge, formatDate } from "./ui";

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

export function ProposalDocument({ proposal, company, pdfHref }: { proposal: Proposal; company?: string; pdfHref?: string }) {
  const subtotal = proposal.milestones.reduce((s, m) => s + m.amount, 0);
  const discount = proposal.discount ?? 0;
  const weeks = proposal.milestones.reduce((s, m) => s + m.weeks, 0);

  return (
    <Card className="space-y-8 p-6 sm:p-10">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <PathBadge path={proposal.path} />
          {proposal.sentAt && <span className="text-sm text-muted">Issued {formatDate(proposal.sentAt)}</span>}
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">{proposal.title}</h2>
        {company && <p className="text-muted">Prepared for {company}</p>}
        <p className="mt-4 whitespace-pre-wrap text-fg/85">{proposal.summary}</p>
        {pdfHref && (
          <a href={pdfHref} target="_blank" rel="noopener" className="mt-4 inline-block font-medium text-signal hover:underline">
            Read the full proposal (PDF) ↗
          </a>
        )}
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h3 className="mb-2 font-semibold">What&apos;s included</h3>
          <BulletList items={proposal.scope} />
        </section>
        <section>
          <h3 className="mb-2 font-semibold">Not included</h3>
          <BulletList items={proposal.outOfScope} />
        </section>
      </div>

      <section>
        <h3 className="mb-2 font-semibold">Assumptions</h3>
        <BulletList items={proposal.assumptions} />
      </section>

      <section>
        <h3 className="mb-3 font-semibold">Milestones and price</h3>
        <ol className="divide-y divide-line rounded-xl ring-1 ring-line">
          {proposal.milestones.map((m, i) => (
            <li key={i} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div>
                <p className="font-medium">
                  {i + 1}. {m.title}
                </p>
                <p className="text-sm text-muted">{m.description}</p>
              </div>
              <div className="shrink-0 text-sm sm:text-right">
                <p className="font-medium">{formatMoney(m.amount, proposal.currency)}</p>
                <p className="text-muted">
                  ~{m.weeks} week{m.weeks === 1 ? "" : "s"}
                </p>
              </div>
            </li>
          ))}
          {discount > 0 && (
            <>
              <li className="flex items-center justify-between p-4 text-sm">
                <span className="text-muted">Subtotal</span>
                <span>{formatMoney(subtotal, proposal.currency)}</span>
              </li>
              <li className="flex items-center justify-between p-4 text-sm">
                <span className="font-medium text-signal">{proposal.discountNote ?? "Discount"}</span>
                <span className="font-medium text-signal">−{formatMoney(discount, proposal.currency)}</span>
              </li>
            </>
          )}
          <li className="flex items-center justify-between bg-subtle p-4 font-semibold">
            <span>Total · about {weeks} weeks</span>
            <span>{formatMoney(Math.max(0, subtotal - discount), proposal.currency)}</span>
          </li>
          {proposal.path === "operate" && proposal.monthlyAmount != null && (
            <li className="flex items-center justify-between p-4 font-semibold">
              <span>
                Then, every month
                {proposal.monthlyStartsOn && (
                  <span className="block text-sm font-normal text-muted">
                    Billed on the {ordinal(proposal.monthlyStartsOn.getDate())}, starting {formatDate(proposal.monthlyStartsOn)}
                  </span>
                )}
              </span>
              <span>{formatMoney(proposal.monthlyAmount, proposal.currency)}</span>
            </li>
          )}
        </ol>
      </section>

      <section>
        <h3 className="mb-2 font-semibold">Terms</h3>
        <BulletList items={proposal.terms.split("\n").filter(Boolean)} />
      </section>
    </Card>
  );
}
