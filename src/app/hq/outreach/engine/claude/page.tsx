import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/action-form";
import { Button, Card, CardTitle, Chip, EmptyState, Field, PageHeader, inputClass, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { requireStaffActor } from "@/lib/session";
import { listConnectorTokens, listRunners } from "@/server/hunts";
import { addTeammateAction, revokeKeyAction } from "../../engine-actions";
import { KeyForm } from "./key-form";

export const metadata = { title: "Your Claude" };

const ROUTINE_PROMPT = "Run the run-hunts skill (.claude/skills/run-hunts/SKILL.md): claim the next AMFIRE HQ hunt for me, research it with the signal-hunt skill, and report back.";
const CRON = "30 3-15 * * *";

export default async function ClaudeRunnerPage() {
  const actor = await requireStaffActor();
  const db = await getDb();
  const [keys, runners] = await Promise.all([listConnectorTokens(db, actor), listRunners(db, actor)]);
  const owner = actor.internalRole === "owner";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/outreach/engine" className="hover:underline">
            ← Signal engine
          </Link>
        }
        title="Your Claude"
        description="Hunts you request in HQ run on your own Claude plan. Your Claude checks HQ with your personal key, does the research and reports back. HQ never sees or uses your Claude login."
      />

      <Card>
        <CardTitle>1. Your personal key</CardTitle>
        <p className="-mt-2 mb-4 text-sm text-muted">It lets your Claude read and write the outreach desk as you, and nothing else. Make one per place you run Claude, and revoke it if a laptop is lost.</p>
        <KeyForm />
        {keys.length > 0 && (
          <ul className="mt-5 divide-y divide-line text-sm">
            {keys.map(({ token: k, user }) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="font-medium">{k.label}</span>
                  <span className="text-muted">
                    {" "}
                    · {owner && user.id !== actor.userId ? `${user.name} · ` : ""}
                    <code className="text-xs">{k.hint}…</code> · created {timeAgo(k.createdAt)} · {k.lastUsedAt ? `last used ${timeAgo(k.lastUsedAt)}` : "not used yet"}
                  </span>
                </span>
                <form action={revokeKeyAction.bind(null, k.id)}>
                  <Button size="sm" variant="ghost">
                    Revoke
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle aside={<Chip>Recommended</Chip>}>2. Run hunts in the cloud</CardTitle>
          <p className="-mt-2 mb-4 text-sm text-muted">Your laptop can be off. Uses your Claude plan (Pro or Max) on claude.ai.</p>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <Step>
              Open{" "}
              <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" className="underline">
                claude.ai/code
              </a>{" "}
              signed in to <strong>your own</strong> Claude account, and connect GitHub so it can read <code className="text-xs">amfire-tech/amfire</code>.
            </Step>
            <Step>
              Create an environment called <strong>AMFIRE hunts</strong>. Set network access to <strong>Full</strong> (research needs the open web and www.amfire.in), and add the environment variable{" "}
              <code className="text-xs">AMFIRE_HQ_TOKEN</code> = your key.
            </Step>
            <Step>
              Create a routine: repository <code className="text-xs">amfire-tech/amfire</code>, environment <strong>AMFIRE hunts</strong>, schedule every hour from 9 am to 9 pm India time (
              <code className="text-xs">{CRON}</code> in UTC), and this prompt:
              <code className="mt-1.5 block rounded bg-subtle px-2 py-1.5 text-xs select-all">{ROUTINE_PROMPT}</code>
            </Step>
            <Step>Or open Claude Code and say “set up my AMFIRE hunt routine”; Claude creates it in your account, and you add the key to the environment.</Step>
          </ol>
          <p className="mt-4 text-sm text-muted">An hour with nothing queued ends in seconds. A 25-lead hunt is heavy: on Pro that may be one or two hunts per usage window.</p>
        </Card>

        <Card>
          <CardTitle>Or run hunts on your laptop</CardTitle>
          <p className="-mt-2 mb-4 text-sm text-muted">Works while your laptop is on and the Claude app is open. It can use the built-in browser for sites that block plain fetches.</p>
          <ol className="list-decimal space-y-3 pl-5 text-sm">
            <Step>
              Save your key on the laptop. On Windows, in a terminal: <code className="mt-1.5 block rounded bg-subtle px-2 py-1.5 text-xs select-all">setx AMFIRE_HQ_TOKEN &quot;your-key&quot;</code> then restart the Claude app.
            </Step>
            <Step>
              Open the <code className="text-xs">amfire</code> folder in the Claude app (Code tab), and create a scheduled task that runs every hour with the prompt <code className="text-xs">/run-hunts</code>.
            </Step>
          </ol>
        </Card>
      </div>

      <Card>
        <CardTitle aside={<span className="text-sm text-muted">{runners.length}</span>}>The team’s Claude</CardTitle>
        {runners.length === 0 ? (
          <EmptyState title="Nobody yet." />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {runners.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <span>
                  <span className="font-medium">{r.name}</span>
                  {r.id === actor.userId && <span className="text-muted"> (you)</span>}
                  <span className="text-muted"> · {r.email}</span>
                </span>
                <span className={r.online ? "text-success" : "text-muted"}>
                  {r.online ? `Checked in ${timeAgo(r.lastSeenAt!)}` : r.lastSeenAt ? `Last checked in ${timeAgo(r.lastSeenAt)}` : r.hasKey ? "Key made, hasn’t checked in yet" : "No key yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {owner && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">Add a teammate</summary>
            <p className="mt-2 text-sm text-muted">They get staff access to HQ (sending quotes and pricing overrides stay with you), make their own key here, and run hunts on their own Claude plan.</p>
            <ActionForm action={addTeammateAction} submitLabel="Add to HQ" size="sm" className="mt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor="tm-name">
                  <input id="tm-name" name="name" required maxLength={120} className={inputClass} />
                </Field>
                <Field label="Email" htmlFor="tm-email">
                  <input id="tm-email" name="email" type="email" required className={inputClass} />
                </Field>
              </div>
            </ActionForm>
          </details>
        )}
      </Card>
    </div>
  );
}

function Step({ children }: { children: ReactNode }) {
  return <li className="pl-1 text-fg/85">{children}</li>;
}
