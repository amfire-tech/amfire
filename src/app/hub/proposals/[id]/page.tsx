import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ProposalDocument } from "@/components/proposal-document";
import { Notice, PageHeader, StatusBadge, formatDate } from "@/components/ui";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";
import { isUuid } from "@/lib/ids";
import { requireActor } from "@/lib/session";
import { getClientProposal, proposalFileInfo } from "@/server/proposals";
import { DecisionPanel } from "./decision-panel";

export const metadata = { title: "Proposal" };

export default async function HubProposalPage({ params }: PageProps<"/hub/proposals/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const actor = await requireActor(`/hub/proposals/${id}`);
  const db = await getDb();
  const proposal = await getClientProposal(db, actor, id);
  if (!proposal) notFound();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, proposal.clientOrgId!));
  const file = await proposalFileInfo(db, proposal.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hub/projects" className="hover:underline">
            ← Projects
          </Link>
        }
        title="Proposal"
        description={<StatusBadge status={proposal.status} />}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <ProposalDocument proposal={proposal} company={org.name} pdfHref={file ? `/hub/proposals/${proposal.id}/pdf` : undefined} />
        <div className="space-y-4 lg:sticky lg:top-6">
          {proposal.status === "sent" && <DecisionPanel proposalId={proposal.id} company={org.name} />}
          {proposal.status === "accepted" && <Notice tone="success">You accepted this proposal on {formatDate(proposal.decidedAt)}.</Notice>}
          {proposal.status === "declined" && <Notice>You asked for changes on {formatDate(proposal.decidedAt)}. We&apos;ll send a revised version.</Notice>}
          {proposal.status === "withdrawn" && <Notice>This version was replaced by a revised proposal.</Notice>}
          <p className="text-sm text-muted">Questions about this proposal? Reply to our email and a person will answer.</p>
        </div>
      </div>
    </div>
  );
}
