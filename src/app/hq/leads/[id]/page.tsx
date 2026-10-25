import Link from "next/link";
import { notFound } from "next/navigation";
import { ScorePill, SourceChip } from "@/components/hq";
import { SubmitButton } from "@/components/forms";
import {
  BulletList,
  Card,
  CardTitle,
  DescriptionList,
  Notice,
  PageHeader,
  PathBadge,
  StatusBadge,
  Table,
  formatDateTime,
  inputClass,
} from "@/components/ui";
import { getDb } from "@/db";
import { CALL_TIMES, GOALS, TEAM_SIZES, URGENCY, labelFor } from "@/knowledge/catalog";
import { CURRENCIES, formatMoney, isCurrency, PRICING_CURRENCY, priceBand, type ProjectSize } from "@/knowledge/pricing";
import { sourceLabel } from "@/lib/attribution";
import { isUuid } from "@/lib/ids";
import { requireStaffActor } from "@/lib/session";
import { aiConfigured } from "@/server/agents/solution-architect";
import { getLeadDetail } from "@/server/leads";
import { proposalTotal } from "@/server/proposals";
import { createDraftAction, qualifyLeadAction, rejectRecommendationAction, rerunRecommendationAction } from "../../actions";
import { ContactForm } from "./contact-form";

export default async function LeadPage({ params }: PageProps<"/hq/leads/[id]">) {
  const { id } = await params;
  const actor = await requireStaffActor();
  if (!isUuid(id)) notFound();
  const detail = await getLeadDetail(await getDb(), actor, id);
  if (!detail) notFound();
  const { lead, recommendations, runs, proposals } = detail;
  const latest = recommendations[0];
  const latestRun = latest ? runs.find((r) => r.id === latest.agentRunId) : null;
  const canDraft = lead.status === "qualified" && latest && latest.status !== "rejected";
  const usesAi = aiConfigured();
  const currency = isCurrency(lead.currency) ? lead.currency : PRICING_CURRENCY;
  // Discovery-form leads always carry consent; leads added in HQ don't.
  const addedByHand = !lead.consentAt;
  const tracking = [
    lead.utmMedium && `medium: ${lead.utmMedium}`,
    lead.utmCampaign && `campaign: ${lead.utmCampaign}`,
    lead.utmContent && `content: ${lead.utmContent}`,
    lead.utmTerm && `term: ${lead.utmTerm}`,
    lead.referrer && `from ${lead.referrer}`,
    lead.landingPath && `landed on ${lead.landingPath}`,
  ].filter(Boolean);
  const sourceDetail = (
    <>
      {sourceLabel(lead.source)}
      {lead.sourceNote && <span className="block text-sm text-muted">{lead.sourceNote}</span>}
      {tracking.length > 0 && <span className="block text-sm text-muted">{tracking.join(" · ")}</span>}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/leads" className="hover:underline">
            ← Leads
          </Link>
        }
        title={lead.company}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status} />
            <SourceChip source={lead.source} />
            <span>
              {lead.name} ·{" "}
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="underline underline-offset-4">
                  {lead.email}
                </a>
              ) : (
                "no email yet"
              )}
            </span>
          </span>
        }
      />

      {lead.nextAction && <Notice title="Next action">{lead.nextAction}</Notice>}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardTitle aside={<ScorePill score={lead.qualificationScore} />}>{addedByHand ? "Lead details" : "Discovery answers"}</CardTitle>
          <DescriptionList
            items={[
              { term: "Source", value: sourceDetail },
              { term: "Goal", value: labelFor(GOALS, lead.goal) },
              { term: "Timing", value: labelFor(URGENCY, lead.urgency) },
              { term: "Organisation type", value: lead.businessType },
              { term: "Team size", value: labelFor(TEAM_SIZES, lead.teamSize) },
              { term: "Current tools", value: lead.currentTools },
              { term: "Viewed prices in", value: currency },
              {
                term: "Phone / WhatsApp",
                value: lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="underline underline-offset-4">
                    {lead.phone}
                  </a>
                ) : null,
              },
              { term: "Best time to call", value: lead.callTime ? labelFor(CALL_TIMES, lead.callTime) : null },
              { term: addedByHand ? "Added" : "Received", value: formatDateTime(lead.createdAt) },
            ]}
          />
          {addedByHand && (!lead.email || !lead.phone) && (
            <div className="mt-5 border-t border-line pt-5">
              <ContactForm leadId={lead.id} needsEmail={!lead.email} needsPhone={!lead.phone} />
            </div>
          )}
          <h3 className="mt-6 text-xs font-medium tracking-wide text-muted uppercase">
            {addedByHand ? "What they need" : "In their words"}
          </h3>
          <blockquote className="mt-1.5 rounded-xl bg-subtle p-4 whitespace-pre-wrap">{lead.problem}</blockquote>
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted">How the score was calculated</summary>
            <pre className="mt-2 font-sans whitespace-pre-wrap text-muted">{lead.qualificationNotes}</pre>
          </details>

          {lead.status === "new" && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
              <form action={qualifyLeadAction.bind(null, lead.id, "qualified")}>
                <SubmitButton>Qualify lead</SubmitButton>
              </form>
              <form action={qualifyLeadAction.bind(null, lead.id, "disqualified")}>
                <SubmitButton variant="secondary">Not a fit</SubmitButton>
              </form>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle aside={latest && <StatusBadge status={latest.status} />}>Recommendation</CardTitle>
          {!latest ? (
            <Notice tone="warning" title="No recommendation yet">
              The last agent run did not produce one. Run it again below.
            </Notice>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <PathBadge path={latest.path} />
                <span className="text-sm text-muted">
                  Size: {latest.size} · guideline {formatMoney(priceBand(latest.path, latest.size as ProjectSize, currency).low, currency)}–
                  {formatMoney(priceBand(latest.path, latest.size as ProjectSize, currency).high, currency)}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold">{latest.headline}</h3>
              <p className="mt-1 text-fg/80">{latest.summary}</p>
              <div className="mt-5 space-y-5 text-sm">
                <Section title="Approach" items={latest.approach} />
                <Section title="Assumptions" items={latest.assumptions} />
                <Section title="Risks" items={latest.risks} />
                <Section title="Ask on the first call" items={latest.openQuestions} />
              </div>
              <p className="mt-5 text-xs text-muted">
                Proposed by the Solution Architect ({latestRun?.engine ?? "unknown"}
                {latestRun?.model ? `, ${latestRun.model}` : ""}) {formatDateTime(latest.createdAt)}. Not a commitment.
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
            {canDraft && (
              <form action={createDraftAction.bind(null, latest.id)} className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="draft-currency">
                  Proposal currency
                </label>
                <select
                  id="draft-currency"
                  name="currency"
                  defaultValue={currency}
                  className={`${inputClass} !w-auto !py-2 text-sm`}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c === "INR" ? "₹ INR" : "$ USD"}
                    </option>
                  ))}
                </select>
                <SubmitButton pendingLabel="Drafting…">Create proposal draft</SubmitButton>
              </form>
            )}
            <form action={rerunRecommendationAction.bind(null, lead.id)}>
              <SubmitButton variant="secondary" pendingLabel="Running…">
                {usesAi ? "Re-run with Gemini" : "Re-run (rules)"}
              </SubmitButton>
            </form>
            {latest?.status === "proposed" && (
              <form action={rejectRecommendationAction.bind(null, lead.id, latest.id)}>
                <SubmitButton variant="ghost">Reject</SubmitButton>
              </form>
            )}
          </div>
          {lead.status === "new" && <p className="mt-3 text-sm text-muted">Qualify the lead before drafting a proposal.</p>}
        </Card>
      </div>

      {proposals.length > 0 && (
        <Card>
          <CardTitle>Proposals</CardTitle>
          <ul className="-mx-2 divide-y divide-line">
            {proposals.map((p) => (
              <li key={p.id}>
                <Link href={`/hq/proposals/${p.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-subtle">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.title}</span>
                    <span className="text-sm text-muted">
                      {formatMoney(proposalTotal(p), p.currency)} · {formatDateTime(p.updatedAt)}
                    </span>
                  </span>
                  <StatusBadge status={p.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardTitle>Agent runs for this lead</CardTitle>
        <Table>
          <thead>
            <tr>
              <th>Started</th>
              <th>Engine</th>
              <th>Status</th>
              <th>Tokens</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{formatDateTime(r.startedAt)}</td>
                <td>
                  {r.engine}
                  {r.model ? ` · ${r.model}` : ""}
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td>{r.inputTokens != null ? `${r.inputTokens} in / ${r.outputTokens} out` : "—"}</td>
                <td className="max-w-xs truncate text-muted">{r.error ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">{title}</h4>
      <BulletList items={items} />
    </div>
  );
}
