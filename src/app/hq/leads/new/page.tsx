import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { MANUAL_SOURCES } from "@/lib/attribution";
import { requireStaffActor } from "@/lib/session";
import { LeadForm } from "./lead-form";

export const metadata = { title: "Add a lead" };

export default async function NewLeadPage({ searchParams }: PageProps<"/hq/leads/new">) {
  await requireStaffActor();
  const { source } = await searchParams;
  const defaultSource = MANUAL_SOURCES.find((s) => s === source);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/leads" className="hover:underline">
            ← Leads
          </Link>
        }
        title="Add a lead"
        description="For enquiries that didn't come through the website: a LinkedIn DM, a WhatsApp chat, a referral or a call. The lead is scored and gets a recommendation, just like a form booking."
      />
      <Card className="max-w-3xl">
        <LeadForm defaultSource={defaultSource} />
      </Card>
    </div>
  );
}
