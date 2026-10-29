import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalDocument } from "@/components/proposal-document";
import { SubmitButton } from "@/components/forms";
import { Notice, PageHeader, StatusBadge, formatDateTime } from "@/components/ui";
import { getDb } from "@/db";
import { formatMoney } from "@/knowledge/pricing";
import { isUuid } from "@/lib/ids";
import { requireStaffActor } from "@/lib/session";
import { getProposalForStaff } from "@/server/hq";
import { pricingFloorFor, proposalTotal } from "@/server/proposals";
import { reviseProposalAction } from "../../actions";
import { ApprovePanel } from "./approve-panel";
import { ProposalEditor } from "./proposal-editor";

export default async function ProposalPage({ params }: PageProps<"/hq/proposals/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const actor = await requireStaffActor();
  const db = await getDb();
  const row = await getProposalForStaff(db, actor, id);
  if (!row) notFound();
  const { proposal, lead } = row;
  const floor = await pricingFloorFor(db, proposal);
  const total = proposalTotal(proposal);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/hq/leads/${lead.id}`} className="hover:underline">
            ← {lead.company}
          </Link>
        }
        title={proposal.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={proposal.status} />
            <span>
              {formatMoney(total, proposal.currency)} · updated {formatDateTime(proposal.updatedAt)}
            </span>
          </span>
        }
      />

      {proposal.status === "draft" ? (
        <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
          <ProposalEditor
            proposalId={proposal.id}
            currency={proposal.currency}
            path={proposal.path}
            initial={{
              title: proposal.title,
              summary: proposal.summary,
              scope: proposal.scope,
              outOfScope: proposal.outOfScope,
              assumptions: proposal.assumptions,
              milestones: proposal.milestones,
              discount: proposal.discount,
              discountNote: proposal.discountNote,
              monthlyAmount: proposal.monthlyAmount,
              terms: proposal.terms,
            }}
          />
          <div className="xl:sticky xl:top-6">
            <ApprovePanel
              proposalId={proposal.id}
              isOwner={actor.internalRole === "owner"}
              belowGuideline={total < floor}
              guidelineText={`usually ${formatMoney(floor, proposal.currency)} or more for this size of work. Saved total ${formatMoney(total, proposal.currency)}${proposal.monthlyAmount != null ? `, then ${formatMoney(proposal.monthlyAmount, proposal.currency)} a month` : ""}.`}
              clientEmail={lead.email}
            />
          </div>
        </div>
      ) : (
        <>
          {proposal.status === "declined" && proposal.clientNote && (
            <Notice tone="warning" title="The client asked for changes">
              <p className="whitespace-pre-wrap">{proposal.clientNote}</p>
            </Notice>
          )}
          {proposal.status === "sent" && (
            <Notice title="Waiting for the client">Sent {formatDateTime(proposal.sentAt)}. The client decides in their Client Hub.</Notice>
          )}
          {proposal.pricingOverrideNote && (
            <Notice tone="warning" title="Approved below pricing guideline">
              {proposal.pricingOverrideNote}
            </Notice>
          )}
          {(proposal.status === "sent" || proposal.status === "declined") && (
            <form action={reviseProposalAction.bind(null, proposal.id)}>
              <SubmitButton variant="secondary">
                {proposal.status === "sent" ? "Withdraw and revise" : "Create revised draft"}
              </SubmitButton>
            </form>
          )}
          <ProposalDocument proposal={proposal} company={lead.company} />
        </>
      )}
    </div>
  );
}
