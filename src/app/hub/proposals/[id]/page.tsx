import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { signOutAndReturn } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { ProposalDocument } from "@/components/proposal-document";
import { Card, CardTitle, Notice, PageHeader, StatusBadge, buttonClass, formatDate } from "@/components/ui";
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
  // Signed in as someone else (often the owner, testing a client's link in the same browser):
  // say so plainly, never switch them into HQ.
  if (!proposal) return <WrongAccount email={actor.email} staff={!!actor.internalRole} proposalId={id} />;
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

/** Signed in, but the proposal was sent to a different email address. */
function WrongAccount({ email, staff, proposalId }: { email: string; staff: boolean; proposalId: string }) {
  return (
    <Card className="mx-auto max-w-lg">
      <CardTitle>This proposal was sent to a different email</CardTitle>
      <p className="text-sm text-muted">
        This browser is signed in as <strong className="text-fg">{email}</strong>
        {staff ? ", the amfire team account" : ""}. The proposal opens only for the email address it was sent to.
        {staff && " Your client signs in with their own email and sees only their Client Hub, never HQ."}
      </p>
      <p className="mt-2 text-sm text-muted">To see it as the client, sign out here (or use a private window) and sign in with their email.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={signOutAndReturn}>
          <input type="hidden" name="next" value={`/hub/proposals/${proposalId}`} />
          <SubmitButton pendingLabel="Signing out…">Sign out and switch account</SubmitButton>
        </form>
        {staff && (
          <Link href={`/hq/proposals/${proposalId}`} className={buttonClass("secondary")}>
            Open it in HQ
          </Link>
        )}
      </div>
    </Card>
  );
}
