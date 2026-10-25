import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Card, EmptyState, PageHeader, StatusBadge, cx, formatDateTime, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { requireStaffActor } from "@/lib/session";
import { listRequestsForStaff } from "@/server/portal";
import { staffReplyAction } from "../actions";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const actor = await requireStaffActor();
  const threads = await listRequestsForStaff(await getDb(), actor);
  const open = threads.filter((t) => t.request.status === "open").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client requests"
        description={`Questions and problems clients send from their Hub. Your reply is shown in their Hub and emailed to them. ${open} open.`}
      />
      {threads.length === 0 ? (
        <EmptyState title="No requests yet." />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {threads.map(({ request: r, orgName, projectName, messages }) => (
            <Card key={r.id} className={r.status === "open" ? "ring-2 ring-flame/60" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{r.subject}</p>
                  <p className="text-xs text-muted">
                    <Link href={`/hq/clients/${r.orgId}`} className="underline-offset-4 hover:underline">
                      {orgName}
                    </Link>
                    {projectName && (
                      <>
                        {" · "}
                        <Link href={`/hq/projects/${r.projectId}`} className="underline-offset-4 hover:underline">
                          {projectName}
                        </Link>
                      </>
                    )}
                    {" · "}
                    {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <ol className="mt-4 space-y-3">
                <li className="w-fit max-w-[90%] rounded-2xl bg-subtle px-4 py-2.5 text-sm whitespace-pre-wrap ring-1 ring-line">{r.body}</li>
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={cx(
                      "w-fit max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                      m.fromStaff ? "ml-auto bg-fg text-page" : "bg-subtle ring-1 ring-line",
                    )}
                  >
                    {m.body}
                    <span className={cx("mt-1 block text-[11px]", m.fromStaff ? "text-page/60" : "text-muted")}>{formatDateTime(m.createdAt)}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 border-t border-line pt-4">
                <ActionForm action={staffReplyAction.bind(null, r.id)} submitLabel="Send reply" size="sm">
                  <label htmlFor={`staff-reply-${r.id}`} className="sr-only">
                    Reply
                  </label>
                  <textarea id={`staff-reply-${r.id}`} name="body" rows={2} required minLength={2} className={`${inputClass} text-sm`} placeholder="Write your reply…" />
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input type="checkbox" name="resolve" defaultChecked={r.status === "open"} className="accent-signal" /> Mark as resolved
                  </label>
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
