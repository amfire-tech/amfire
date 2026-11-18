import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireStaffActor } from "@/lib/session";
import { ClientForm } from "./client-form";

export const metadata = { title: "Add a client" };

export default async function NewClientPage() {
  const actor = await requireStaffActor();
  // Signing a client is a commercial commitment.
  if (actor.internalRole !== "owner") redirect("/hq/clients");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/clients" className="hover:underline">
            ← Clients
          </Link>
        }
        title="Add a client"
        description="For a client you met and signed in person. No proposal email: the agreement goes in as accepted, the project starts, and they get a Client Hub login to follow its progress."
      />
      <ClientForm />
    </div>
  );
}
