// Panels shared by the lead and client pages: conversations and the dossier.

import { ActionForm } from "@/components/action-form";
import { AgentTag } from "@/components/hq";
import { SubmitButton } from "@/components/forms";
import { Card, CardTitle, EmptyState, Field, formatDateTime, inputClass } from "@/components/ui";
import type { Interaction, Memory } from "@/db/schema";
import { INTERACTION_KINDS } from "@/server/crm";
import { addFactAction, logInteractionAction, retireFactAction } from "./actions";

const KIND_LABEL = Object.fromEntries(INTERACTION_KINDS.map((k) => [k.id, k.label]));

export function ConversationsCard({ target, items }: { target: { leadId?: string; orgId?: string }; items: Interaction[] }) {
  return (
    <Card>
      <CardTitle>Conversations</CardTitle>
      <ActionForm action={logInteractionAction.bind(null, target)} submitLabel="Log it" pendingLabel="Saving…">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Channel" htmlFor="int-kind">
            <select id="int-kind" name="kind" defaultValue="whatsapp" className={inputClass}>
              {INTERACTION_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Who started it" htmlFor="int-direction">
            <select id="int-direction" name="direction" defaultValue="out" className={inputClass}>
              <option value="out">We contacted them</option>
              <option value="in">They contacted us</option>
            </select>
          </Field>
        </div>
        <Field label="What was said or agreed" htmlFor="int-summary">
          <textarea id="int-summary" name="summary" rows={2} required className={inputClass} placeholder="Called — wants a demo on Monday, budget about ₹40k" />
        </Field>
      </ActionForm>
      {items.length === 0 ? (
        <div className="mt-5">
          <EmptyState title="No conversations logged yet." />
        </div>
      ) : (
        <ol className="mt-6 space-y-4">
          {items.slice(0, 30).map((i) => (
            <li key={i.id} className="border-l-2 border-line pl-4">
              <p className="text-xs text-muted">
                {KIND_LABEL[i.kind]}
                {i.direction === "in" ? " · from them" : i.direction === "out" ? " · from us" : ""} · {formatDateTime(i.occurredAt)}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap">{i.summary}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

export function DossierCard({ subject, facts }: { subject: { type: "lead" | "organization"; id: string }; facts: Memory[] }) {
  return (
    <Card>
      <CardTitle>Dossier</CardTitle>
      <p className="-mt-2 mb-4 text-sm text-muted">
        Facts every agent reads before drafting a message or suggestion. Add what you learn, like who decides or how they like to be contacted.
      </p>
      {facts.length > 0 && (
        <ul className="mb-5 space-y-2">
          {facts.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-3 rounded-xl bg-subtle px-3 py-2.5">
              <div className="min-w-0">
                <p>{f.fact}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {f.source === "owner" || f.source === "staff" ? <span>Added by {f.source}</span> : <AgentTag role={f.source} />}
                  <span>{formatDateTime(f.createdAt)}</span>
                </p>
              </div>
              <form action={retireFactAction.bind(null, f.id)}>
                <SubmitButton variant="ghost" size="sm" title="No longer true">
                  Remove
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={addFactAction.bind(null, subject)} submitLabel="Add fact" inline>
        <div className="min-w-0 flex-1">
          <label htmlFor={`fact-${subject.id}`} className="sr-only">
            New fact
          </label>
          <input id={`fact-${subject.id}`} name="fact" required className={inputClass} placeholder="Prefers WhatsApp after 7pm · son decides on tech" />
        </div>
      </ActionForm>
    </Card>
  );
}
