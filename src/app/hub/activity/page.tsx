import { PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { requireActor } from "@/lib/session";
import { getClientActivity } from "@/server/portal";
import { ActivityList } from "../activity-list";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  const actor = await requireActor("/hub/activity");
  const items = await getClientActivity(await getDb(), actor);
  return (
    <div className="space-y-6">
      <PageHeader title="Activity" description="Everything that has happened on your account, newest first: updates, milestones, proposals, invoices and payments." />
      <ActivityList items={items} />
    </div>
  );
}
