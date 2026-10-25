import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { AgentTag } from "@/components/hq";
import { Card, inputClass, timeAgo } from "@/components/ui";
import type { Approval } from "@/db/schema";
import { approveAction, rejectAction } from "./actions";

const CHANNEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  hub: "Client Hub update",
  linkedin: "LinkedIn post",
  internal: "Action in HQ",
};

const APPROVE_LABEL: Record<string, string> = {
  send_invoice: "Send invoice",
  weekly_update: "Post to Hub",
  investor_update: "Done",
};

export function ApprovalCard({ a }: { a: Approval }) {
  const editable = a.channel !== "internal" || a.kind === "investor_update";
  const label = APPROVE_LABEL[a.kind] ?? (a.channel === "whatsapp" ? "Approve → WhatsApp" : a.channel === "linkedin" ? "Approve → LinkedIn" : "Approve");
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <AgentTag role={a.role} />
        <span>{CHANNEL[a.channel] ?? a.channel}</span>
        {a.recipientName && <span>· to {a.recipientName}</span>}
        <span>· {timeAgo(a.createdAt)}</span>
      </div>
      <div>
        <h3 className="font-semibold">{a.title}</h3>
        <p className="mt-0.5 text-sm text-muted">{a.reason}</p>
        {a.data.href && (
          <Link href={a.data.href} className="mt-1 inline-block text-sm underline underline-offset-4">
            Open the record
          </Link>
        )}
      </div>
      <ActionForm action={approveAction.bind(null, a.id)} submitLabel={label} variant="primary" size="sm" pendingLabel="Working…">
        {editable ? (
          <>
            <label htmlFor={`draft-${a.id}`} className="sr-only">
              Draft
            </label>
            <textarea
              id={`draft-${a.id}`}
              name="text"
              defaultValue={a.draft}
              rows={Math.min(12, Math.max(3, a.draft.split("\n").length + 1))}
              className={`${inputClass} text-sm`}
            />
            <p className="text-xs text-muted">Edit freely — your changes teach the team how you write.</p>
          </>
        ) : (
          <p className="rounded-xl bg-subtle px-3 py-2 text-sm">{a.draft}</p>
        )}
      </ActionForm>
      <ActionForm action={rejectAction.bind(null, a.id)} submitLabel="Not now" variant="ghost" size="sm" />
    </Card>
  );
}
