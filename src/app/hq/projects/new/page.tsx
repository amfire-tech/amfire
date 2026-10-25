import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, Field, PageHeader, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { BUSINESS_TYPES } from "@/knowledge/catalog";
import { sourceLabel } from "@/lib/attribution";
import { requireStaffActor } from "@/lib/session";
import { listClientOrgs } from "@/server/crm";
import { addProjectAction } from "../../actions";

export const metadata = { title: "Add a project" };

const SOURCES = ["referral", "linkedin", "whatsapp", "call", "email", "instagram", "google", "event", "direct", "other"];

export default async function NewProjectPage() {
  const actor = await requireStaffActor();
  const clients = await listClientOrgs(await getDb(), actor);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/projects" className="hover:underline">
            ← Projects
          </Link>
        }
        title="Add a project"
        description="For work that didn't start from a proposal here: past projects, or a deal agreed on a call. It shows up in Projects, Clients, Money and the AI team's checks like any other."
      />
      <Card className="max-w-3xl">
        <ActionForm action={addProjectAction} submitLabel="Add project" variant="primary" pendingLabel="Adding…">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold">Client</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Existing client" htmlFor="orgId" optional>
                <select id="orgId" name="orgId" defaultValue="" className={inputClass}>
                  <option value="">— New client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="New client's name" htmlFor="clientName" hint="Leave empty if you chose an existing client.">
                <input id="clientName" name="clientName" maxLength={160} className={inputClass} placeholder="Skillship" />
              </Field>
              <Field label="Contact name" htmlFor="contactName">
                <input id="contactName" name="contactName" required maxLength={120} className={inputClass} />
              </Field>
              <Field label="How they found you" htmlFor="source">
                <select id="source" name="source" defaultValue="referral" className={inputClass}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {sourceLabel(s)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contact email" htmlFor="contactEmail" optional>
                <input id="contactEmail" name="contactEmail" type="email" className={inputClass} />
              </Field>
              <Field label="Contact phone / WhatsApp" htmlFor="contactPhone" optional>
                <input id="contactPhone" name="contactPhone" inputMode="tel" className={inputClass} />
              </Field>
              <Field label="Organisation type" htmlFor="businessType">
                <select id="businessType" name="businessType" defaultValue="Something else" className={inputClass}>
                  {BUSINESS_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-4 border-t border-line pt-5">
            <legend className="text-sm font-semibold">Project</legend>
            <Field label="Project name" htmlFor="name">
              <input id="name" name="name" required maxLength={200} className={inputClass} placeholder="AI learning platform for schools" />
            </Field>
            <Field label="What was built or agreed" htmlFor="description" optional>
              <textarea id="description" name="description" rows={3} maxLength={2000} className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Service" htmlFor="path">
                <select id="path" name="path" defaultValue="build" className={inputClass}>
                  <option value="build">Build</option>
                  <option value="automate">Automate</option>
                  <option value="operate">Operate</option>
                </select>
              </Field>
              <Field label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue="completed" className={inputClass}>
                  <option value="completed">Completed</option>
                  <option value="active">In progress</option>
                </select>
              </Field>
              <Field label="Start date" htmlFor="startedAt">
                <input id="startedAt" name="startedAt" type="date" required className={inputClass} />
              </Field>
              <Field label="End date" htmlFor="endedAt" hint="Needed for a completed project.">
                <input id="endedAt" name="endedAt" type="date" className={inputClass} />
              </Field>
              <Field label="Project value" htmlFor="amount" optional>
                <input id="amount" name="amount" type="number" min={0} step="any" className={inputClass} />
              </Field>
              <Field label="Currency" htmlFor="currency">
                <select id="currency" name="currency" defaultValue="INR" className={inputClass}>
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="paidInFull" className="accent-signal" /> Already paid in full — record the payment so revenue to date is right
            </label>
          </fieldset>
        </ActionForm>
      </Card>
    </div>
  );
}
