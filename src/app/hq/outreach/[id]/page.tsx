import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Button, ButtonLink, Card, CardTitle, Chip, EmptyState, Field, PageHeader, buttonClass, inputClass } from "@/components/ui";
import { getDb } from "@/db";
import { BUSINESS_TYPES } from "@/knowledge/catalog";
import { CHANNEL_LABELS, PROSPECT_KINDS, fillTemplate, formatIst, hookFor, objectionLabel, outcomeLabel, prospectStatusLabel, type TouchChannel } from "@/knowledge/outreach";
import { requireStaffActor } from "@/lib/session";
import { whatsappLink } from "@/server/brain";
import { getProspectEngine } from "@/server/engine";
import { RESPONSE_TEST_CHANNELS, getProspect } from "@/server/outreach";
import {
  convertToLeadAction,
  createPartnerLinkAction,
  logTouchAction,
  markResponseRepliedAction,
  setProspectStatusAction,
  startResponseTestAction,
  updateProspectAction,
} from "../actions";
import { EnginePanel } from "../engine-ui";
import { TouchForm } from "../touch-form";

export const metadata = { title: "Prospect" };

type Analysis = { summary?: string; outcomeReason?: string; objections?: string[]; ownerTalkShare?: number; nextStepSecured?: boolean; coaching?: string[] };

export default async function ProspectPage({ params }: PageProps<"/hq/outreach/[id]">) {
  const actor = await requireStaffActor();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await getDb();
  const [found, engine] = await Promise.all([getProspect(db, actor, id), getProspectEngine(db, actor, id)]);
  if (!found || !engine) notFound();
  const { prospect: p, history, lead, demo, responseTests, referral } = found;

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
                href={whatsappLink(p.phone, fillTemplate(history.length ? hookFor(p.kind).whatsapp : hookFor(p.kind).coldWhatsapp, { contact: p.contactName, owner: actor.name.split(" ")[0], business: p.name, demo: demo?.url }))}
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

          <EnginePanel prospect={p} engine={engine} />

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
          {(p.kind === "business" || p.kind === "network") && (
            <Card>
              <CardTitle aside={demo && <span className="text-sm text-muted">{demo.views} {demo.views === 1 ? "view" : "views"}</span>}>Demo page</CardTitle>
              {demo ? (
                <div className="space-y-2 text-sm">
                  <code className="block rounded bg-subtle px-2 py-1.5 text-xs break-all select-all">{demo.url}</code>
                  <p className="text-muted">
                    {demo.lastViewedAt ? `Last opened ${formatIst(demo.lastViewedAt)}` : "Not opened yet"} · {demo.chats} {demo.chats === 1 ? "message" : "messages"} tried
                  </p>
                  <a href={demo.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                    Open demo ↗
                  </a>
                  <p className="text-xs text-muted">The WhatsApp button fills in this link after your first conversation. When they open it, they jump to the top of your call list.</p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No demo yet. In Claude Code, ask: “build a demo for {p.name}”. Claude reads their website and listing and makes their own AI-salesperson page.
                </p>
              )}
            </Card>
          )}

          {p.kind === "ca_firm" && (
            <Card>
              <CardTitle>Partner referral link</CardTitle>
              {referral ? (
                <div className="space-y-2 text-sm">
                  <code className="block rounded bg-subtle px-2 py-1.5 text-xs break-all select-all">{referral.url}</code>
                  <p className="text-muted">
                    {referral.clicks} {referral.clicks === 1 ? "click" : "clicks"}. Clients who book through it are credited to this firm. Share: 10% of what they pay in year one.
                  </p>
                </div>
              ) : (
                <ActionForm action={createPartnerLinkAction.bind(null, p.id)} submitLabel="Create referral link" size="sm">
                  <p className="text-sm text-muted">When the firm agrees to refer clients, give them their own link. It marks them as a partner.</p>
                </ActionForm>
              )}
            </Card>
          )}

          {(p.kind === "business" || p.kind === "network") && (
            <Card>
              <CardTitle>Response-time test</CardTitle>
              <p className="-mt-2 mb-3 text-sm text-muted">Send them a genuine enquiry, start the timer, and tap when they reply. Tell them about the test when you pitch.</p>
              {responseTests.length > 0 && (
                <ul className="mb-3 space-y-2 text-sm">
                  {responseTests.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-subtle px-3 py-2">
                      <span>
                        {t.channel} · sent {formatIst(t.sentAt)}
                        <br />
                        <span className="text-muted">
                          {t.repliedAt ? `Replied after ${formatDuration(t.repliedAt.getTime() - t.sentAt.getTime())}` : `No reply yet (${formatDuration(elapsedMs(t.sentAt))})`}
                        </span>
                      </span>
                      {!t.repliedAt && (
                        <form action={markResponseRepliedAction.bind(null, p.id, t.id)}>
                          <Button size="sm" variant="secondary">
                            They replied
                          </Button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <ActionForm action={startResponseTestAction.bind(null, p.id)} submitLabel="I just sent an enquiry" size="sm" inline>
                <Field label="Channel" htmlFor="test-channel">
                  <select id="test-channel" name="channel" defaultValue="whatsapp" className={`${inputClass} !py-2`}>
                    {RESPONSE_TEST_CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </ActionForm>
            </Card>
          )}

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

function formatDuration(ms: number) {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} days`;
}

/** Time since `d`, read when the page renders. */
function elapsedMs(d: Date) {
  return Date.now() - d.getTime();
}
