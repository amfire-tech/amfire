import { PageHeader } from "@/components/ui";
import { requireStaffActor } from "@/lib/session";
import { ASK_EXAMPLES } from "@/server/ask";
import { AskBox } from "./ask-box";

export const metadata = { title: "Ask HQ" };

export default async function AskPage() {
  await requireStaffActor();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Ask HQ" description="Ask about your business in plain words. Answers come from your records, with links to them." />
      <AskBox examples={ASK_EXAMPLES} />
    </div>
  );
}
