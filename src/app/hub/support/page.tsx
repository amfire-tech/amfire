import { ActionForm } from "@/components/action-form";
import { Card, CardTitle, EmptyState, Field, PageHeader, StatusBadge, cx, formatDateTime, inputClass } from "@/components/ui";
import { contact, site } from "@/config/site";
import { getDb } from "@/db";
import { requireClientActor } from "@/lib/session";
import { listClientRequests } from "@/server/portal";
import { getClientHome } from "@/server/projects";
import { replyToRequestAction, supportRequestAction } from "../actions";

export const metadata = { title: "Support" };

export default async function SupportPage() {
  const actor = await requireClientActor("/hub/support");
  const db = await getDb();
  const [threads, home] = await Promise.all([listClientRequests(db, actor), getClientHome(db, actor)]);
  const orgId = actor.clientOrgIds[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description={`Questions, problems, or something we got wrong — a person at amfire replies ${site.availability.firstResponse}, and you'll get the reply by email too.`}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardTitle>New request</CardTitle>
          {orgId ? (
            <ActionForm action={supportRequestAction.bind(null, orgId, null)} submitLabel="Send to a person" variant="primary">
              <Field label="Subject" htmlFor="sr-subject">
                <input id="sr-subject" name="subject" required minLength={3} maxLength={200} className={inputClass} />
              </Field>
              <Field label="How can we help?" htmlFor="sr-body">
                <textarea id="sr-body" name="body" rows={5} required minLength={5} className={inputClass} />
              </Field>
            </ActionForm>
          ) : (
            <EmptyState title="No account yet." />
          )}
          <div className="mt-6 border-t border-line pt-4 text-sm">
            <p className="font-medium">Need us right now?</p>
            <p className="mt-1 text-muted">{site.availability.hours}</p>
            <div className="mt-2 flex flex-wrap gap-4">
              <a href={contact.whatsapp()} target="_blank" rel="noopener noreferrer" className="font-medium text-[#128c4b] underline underline-offset-4">
                WhatsApp {site.contactPhone}
              </a>
              <a href={contact.call} className="underline underline-offset-4">
                Call
              </a>
              <a href={contact.email} className="underline underline-offset-4">
                {site.contactEmail}
              </a>
            </div>
          </div>
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your requests</h2>
          {threads.length === 0 ? (
            <EmptyState title="No requests yet." />
          ) : (
            threads.map(({ request: r, projectName, messages }) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.subject}</p>
                    <p className="text-xs text-muted">
                      {projectName ? `${projectName} · ` : ""}
                      {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <ol className="mt-4 space-y-3">
                  <li className="ml-auto w-fit max-w-[90%] rounded-2xl bg-fg px-4 py-2.5 text-sm whitespace-pre-wrap text-page">{r.body}</li>
                  {messages.map((m) => (
                    <li
                      key={m.id}
                      className={cx(
                        "w-fit max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                        m.fromStaff ? "bg-subtle ring-1 ring-line" : "ml-auto bg-fg text-page",
                      )}
                    >
                      {m.fromStaff && <span className="mb-1 block text-xs font-semibold text-muted">amfire</span>}
                      {m.body}
                      <span className={cx("mt-1 block text-[11px]", m.fromStaff ? "text-muted" : "text-page/60")}>{formatDateTime(m.createdAt)}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 border-t border-line pt-4">
                  <ActionForm action={replyToRequestAction.bind(null, r.id)} submitLabel={r.status === "resolved" ? "Reopen with a reply" : "Reply"} size="sm" inline>
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`reply-${r.id}`} className="sr-only">
                        Reply
                      </label>
                      <input id={`reply-${r.id}`} name="body" required minLength={2} className={`${inputClass} !py-2`} placeholder="Write a reply…" />
                    </div>
                  </ActionForm>
                </div>
              </Card>
            ))
          )}
          {home.projects.length > 0 && <p className="text-sm text-muted">To ask for a change to a project, open the project and use “Ask for a change” — you&apos;ll get a price before any work starts.</p>}
        </section>
      </div>
    </div>
  );
}
