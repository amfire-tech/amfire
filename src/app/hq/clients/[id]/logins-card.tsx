"use client";

import { useActionState, useState, useTransition } from "react";
import { SubmitButton } from "@/components/forms";
import { Button, Card, CardTitle, Field, Notice, inputClass } from "@/components/ui";
import { addClientLoginAction, resetClientLoginAction, type LoginState } from "../../actions";
import { LoginSharePanel } from "../login-share";

type Login = { userId: string; name: string; email: string; role: string; mustChangePassword: boolean; passwordSetAt: Date | null };

/** Who can sign in to this client's Hub, and fresh login details to share with them. */
export function LoginsCard({ orgId, logins, canManage }: { orgId: string; logins: Login[]; canManage: boolean }) {
  const [added, addAction] = useActionState<LoginState, FormData>(addClientLoginAction.bind(null, orgId), undefined);
  const [reset, setReset] = useState<LoginState>();
  const [pending, start] = useTransition();
  const shown = reset?.login ?? added?.login;

  return (
    <Card>
      <CardTitle>Client Hub logins</CardTitle>
      {logins.length === 0 ? (
        <p className="text-sm text-muted">Nobody can sign in to this client&apos;s Hub yet.</p>
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {logins.map((l) => (
            <li key={l.userId} className="flex flex-wrap items-center justify-between gap-3 px-2 py-3">
              <span className="min-w-0">
                <span className="block font-medium">{l.name}</span>
                <span className="block text-sm break-all text-muted">
                  {l.email} · {l.role === "client_admin" ? "admin" : "member"} ·{" "}
                  {l.passwordSetAt && !l.mustChangePassword ? "has their own password" : l.mustChangePassword ? "one-time password not used yet" : "no password yet"}
                </span>
              </span>
              {canManage && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    if (l.passwordSetAt && !window.confirm(`${l.name} already has their own password. Replace it with a new one-time password?`)) return;
                    start(async () => setReset(await resetClientLoginAction(orgId, l.userId)));
                  }}
                >
                  New one-time password
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {reset?.error && <Notice tone="error">{reset.error}</Notice>}
      {shown && (
        <div className="mt-4">
          <LoginSharePanel login={shown} />
        </div>
      )}
      {canManage && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium">Add a login</summary>
          <form action={addAction} className="mt-3 space-y-3" key={added?.ok}>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_150px]">
              <Field label="Name" htmlFor="login-name">
                <input id="login-name" name="name" required maxLength={120} className={inputClass} />
              </Field>
              <Field label="Email" htmlFor="login-email">
                <input id="login-email" name="email" type="email" required maxLength={200} className={inputClass} />
              </Field>
              <Field label="Role" htmlFor="login-role">
                <select id="login-role" name="role" defaultValue="client_member" className={inputClass}>
                  <option value="client_admin">Admin</option>
                  <option value="client_member">Member</option>
                </select>
              </Field>
            </div>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Adding…">
              Add login
            </SubmitButton>
            {added?.error && <Notice tone="error">{added.error}</Notice>}
          </form>
        </details>
      )}
    </Card>
  );
}
