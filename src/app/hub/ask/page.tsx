import { EmptyState, PageHeader } from "@/components/ui";
import { requireClientActor } from "@/lib/session";
import { Concierge } from "../concierge";

export const metadata = { title: "Ask AMFIRE AI" };

export default async function AskPage() {
  const actor = await requireClientActor("/hub/ask");
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Ask AMFIRE AI"
        description="Ask anything about your projects, approvals, invoices or what we need from you, in English or Hindi. AMFIRE AI answers from your own records and links you to the right page. Anything it can't answer goes to a person."
      />
      {actor.clientOrgIds.length ? <Concierge orgId={actor.clientOrgIds[0]} /> : <EmptyState title="Nothing to ask about yet." />}
    </div>
  );
}
