import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Card, CardTitle, Chip, EmptyState, Field, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { BUSINESS_TYPES } from "@/knowledge/catalog";
import { CHANNEL_LABELS, PROSPECT_KINDS, fillTemplate, formatIst, hookFor, objectionLabel, outcomeLabel, prospectStatusLabel, type TouchChannel } from "@/knowledge/outreach";
import { requireStaffActor } from "@/lib/session";
import { whatsappLink } from "@/server/brain";
import { getProspect } from "@/server/outreach";
import { convertToLeadAction, logTouchAction, setProspectStatusAction, updateProspectAction } from "../actions";
import { TouchForm } from "../touch-form";

export const metadata = { title: "Prospect" };

type Analysis = { summary?: string; outcomeReason?: string; objections?: string[]; ownerTalkShare?: number; nextStepSecured?: boolean; coaching?: string[] };

export default async function ProspectPage({ params }: PageProps<"/hq/outreach/[id]">) {
  const actor = await requireStaffActor();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const found = await getProspect(await getDb(), actor, id);
  if (!found) notFound();
  const { prospect: p, history, lead } = found;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/outreach" className="hover:underline">
            ← Outreach
          </Link>
        }
        title={p.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Chip>{prospectStatusLabel(p.status)}</Chip>
            {p.statusReason && <span className="text-sm">{p.statusReason}</span>}
            {p.doNotContact && <Chip className="!bg-[#fef3f2] !text-[#b42318]">Do not contact</Chip>}
            <span className="text-sm">
              {[PROSPECT_KINDS.find((k) => k.id === p.kind)?.label, `Tier ${p.tier}`, `Score ${p.score}`, p.source === "claude" ? "Researched by Claude" : null].filter(Boolean).join(" · ")}
            </span>
          </span>
        }
        actions={
          <>
            {p.phone && !p.doNotContact && (
              <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className={buttonClass("primary")}>
                Call
              </a>
            )}
            {p.phone && !p.doNotContact && (
              <a
                href={whatsappLink(p.phone, fillTemplate(history.length ? hookFor(p.kind).whatsapp : hookFor(p.kind).coldWhatsapp, { contact: p.contactName, owner: actor.name.split(" ")[0], business: p.name }))}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary")}
              >
                WhatsApp ↗
              </a>
            )}
            {lead ? (
              <ButtonLink href={`/hq/leads/${lead.id}`} variant="secondary">
                Open lead
              </ButtonLink>
            ) : (
              <form action={convertToLeadAction.bind(null, p.id)}>
                <Button variant="secondary">Make it a lead</Button>
              </form>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          {(p.signal || p.brief || p.opener) && (
            <Card>
              <CardTitle>Research</CardTitle>
              <dl className="space-y-3 text-sm">
                {p.signal && (
                  <div>
                    <dt className="font-medium">Why now</dt>
                    <dd className="text-fg/80">{p.signal}</dd>
                  </div>
                )}
                {p.brief && (
                  <div>
                    <dt className="font-medium">Brief</dt>
                    <dd className="whitespace-pre-line text-fg/80">{p.brief}</dd>
                  </div>
                )}
                {p.opener && (
                  <div>
                    <dt className="font-medium">Open with</dt>
                    <dd className="text-fg/80">“{p.opener}”</dd>
                  </div>
                )}
                {p.sourceUrl && (
                  <div>
                    <dt className="font-medium">Source</dt>
                    <dd>
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-fg/80 underline">
                        {p.sourceUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          <Card>
            <CardTitle>Log a touch</CardTitle>
            <TouchForm action={logTouchAction.bind(null, p.id)} />
          </Card>

          <Card>
            <CardTitle aside={<span className="text-sm text-muted">{history.length}</span>}>History</CardTitle>
            {history.length === 0 ? (
              <EmptyState title="No touches yet." />
            ) : (
              <ol className="space-y-4">
                {history.map((t) => {
                  const a = t.analysis as Analysis | null;
                  return (
                    <li key={t.id} className="border-l-2 border-line pl-4">
                      <p className="text-sm">
                        <span className="font-medium">{CHANNEL_LABELS[t.channel as TouchChannel]}</span> · {outcomeLabel(t.outcome)}
                        {t.objection && <span className="text-muted"> · {objectionLabel(t.objection)}</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {formatIst(t.occurredAt)}
                        {t.loggedBy === "claude" && " · logged by Claude"}
                        {t.durationSec ? ` · ${Math.round(t.durationSec / 60)} min` : ""}
                      </p>
                      {t.note && <p className="mt-1 text-sm whitespace-pre-line text-fg/85">{t.note}</p>}
                      {a?.summary && (
                        <div className="mt-2 rounded-xl bg-subtle p-3 text-sm">
                          <p className="font-medium">Claude’s call review</p>
                          <p className="mt-1 text-fg/85">{a.summary}</p>
                          {a.outcomeReason && <p className="mt-1 text-fg/85">Why: {a.outcomeReason}</p>}
                          {typeof a.ownerTalkShare === "number" && <p className="mt-1 text-muted">You talked {Math.round(a.ownerTalkShare * 100)}% of the call.</p>}
                          {a.coaching && a.coaching.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-fg/85">
                              {a.coaching.map((c) => (
                                <li key={c}>{c}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      {t.transcript && (
                        <details className="mt-2 text-sm">
                          <summary className="cursor-pointer text-muted">Transcript</summary>
                          <p className="mt-1 max-h-72 overflow-y-auto whitespace-pre-line text-fg/80">{t.transcript}</p>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardTitle>Details</CardTitle>
            <ActionForm action={updateProspectAction.bind(null, p.id)} submitLabel="Save" size="sm">
              <TextField id="name" label="Business or name" value={p.name} required />
              <TextField id="contactName" label="Contact person" value={p.contactName} />
              <TextField id="contactRole" label="Their role" value={p.contactRole} />
              <TextField id="phone" label="Phone" value={p.phone} />
              <TextField id="email" label="Email" value={p.email} />
              <TextField id="website" label="Website" value={p.website} />
              <TextField id="mapsUrl" label="Google listing" value={p.mapsUrl} />
              <TextField id="area" label="Area" value={p.area} />
              <Field label="Industry" htmlFor="industry" optional>
                <select id="industry" name="industry" defaultValue={p.industry ?? ""} className={inputClass}>
                  <option value="">Not set</option>
                  {p.industry && !(BUSINESS_TYPES as readonly string[]).includes(p.industry) && <option value={p.industry}>{p.industry}</option>}
                  {BUSINESS_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kind" htmlFor="kind">
                  <select id="kind" name="kind" defaultValue={p.kind} className={inputClass}>
                    {PROSPECT_KINDS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Tier" htmlFor="tier">
                  <select id="tier" name="tier" defaultValue={p.tier} className={inputClass}>
                    {["A", "B", "C"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Why now" htmlFor="signal" optional>
                <textarea id="signal" name="signal" rows={2} defaultValue={p.signal ?? ""} className={inputClass} />
              </Field>
              <Field label="Notes" htmlFor="notes" optional>
                <textarea id="notes" name="notes" rows={3} defaultValue={p.notes ?? ""} className={inputClass} />
              </Field>
            </ActionForm>
          </Card>

          <Card>
            <CardTitle>Status</CardTitle>
            <div className="flex flex-wrap gap-2">
              {p.kind === "ca_firm" && p.status !== "partner" && (
                <form action={setProspectStatusAction.bind(null, p.id, "partner")}>
                  <Button size="sm" variant="secondary">
                    Mark as partner
                  </Button>
                </form>
              )}
              {!p.doNotContact && (
                <form action={setProspectStatusAction.bind(null, p.id, "do_not_contact")}>
                  <Button size="sm" variant="ghost">
                    Do not contact
                  </Button>
                </form>
              )}
              {(p.status === "not_now" || p.status === "dropped") && (
                <form action={setProspectStatusAction.bind(null, p.id, "reopen")}>
                  <Button size="sm" variant="ghost">
                    Put back on the list
                  </Button>
                </form>
              )}
            </div>
            <p className="mt-3 text-sm text-muted">
              Next follow-up: {formatIst(p.nextFollowUpAt)}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function TextField({ id, label, value, required }: { id: string; label: string; value: string | null; required?: boolean }) {
  return (
    <Field label={label} htmlFor={id} optional={!required}>
      <input id={id} name={id} defaultValue={value ?? ""} required={required} className={inputClass} />
    </Field>
  );
}
