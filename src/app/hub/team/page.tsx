import { ActionForm } from "@/components/action-form";
import { Card, CardTitle, EmptyState, Field, PageHeader, formatDate, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { requireActor } from "@/lib/session";
import { getTeam } from "@/server/portal";
import { inviteTeammateAction, removeTeammateAction } from "../actions";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const actor = await requireActor("/hub/team");
  const orgId = actor.clientOrgIds[0];
  if (!orgId) return <EmptyState title="No account yet." />;
  const { members, canManage } = await getTeam(await getDb(), actor, orgId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Everyone from your side who can sign in to this Hub. Add your accountant for invoices, or a manager to approve work. Each person signs in with their own email."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardTitle>People</CardTitle>
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {m.name}
                    {m.userId === actor.userId && <span className="text-muted"> (you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {m.email} · {m.role === "client_admin" ? "Admin" : "Member"} · since {formatDate(m.since)}
                  </p>
                </div>
                {canManage && m.userId !== actor.userId && (
                  <ActionForm action={removeTeammateAction.bind(null, orgId, m.userId)} submitLabel="Remove" size="sm" variant="ghost" />
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitle>Add someone</CardTitle>
          {canManage ? (
            <ActionForm action={inviteTeammateAction.bind(null, orgId)} submitLabel="Add to team" variant="primary">
              <Field label="Name" htmlFor="tm-name">
                <input id="tm-name" name="name" required maxLength={120} className={inputClass} />
              </Field>
              <Field label="Email" htmlFor="tm-email">
                <input id="tm-email" name="email" type="email" required className={inputClass} />
              </Field>
              <Field label="Access" htmlFor="tm-role" hint="Admins can also add and remove people.">
                <select id="tm-role" name="role" defaultValue="client_member" className={inputClass}>
                  <option value="client_member">Member — see everything, approve and pay</option>
                  <option value="client_admin">Admin — also manage the team</option>
                </select>
              </Field>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">Ask an admin on your team to add people.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
