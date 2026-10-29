import { ActionForm } from "@/components/action-form";
import { Button, Card, CardTitle, Chip, Field, buttonClass, cx, inputClass } from "@/components/ui";
import type { Prospect, ScoreParts } from "@/db/schema";
import { CONTACT_ROLES, FEEDBACK_KINDS, WARM_SCORE, playFor, signalType } from "@/knowledge/engine";
import { CHANNEL_LABELS, formatIst, type TouchChannel } from "@/knowledge/outreach";
import type { getProspectEngine } from "@/server/engine";
import {
  addContactAction,
  addSignalAction,
  feedbackAction,
  logStepAction,
  removeContactAction,
  removeSignalAction,
  setFactsAction,
  startPlayAction,
  stopPlayAction,
} from "./engine-actions";
import { TouchForm } from "./touch-form";

const PARTS: { key: keyof Pick<ScoreParts, "fit" | "trigger" | "timing" | "reach">; label: string; hint: string }[] = [
  { key: "fit", label: "Fit", hint: "Can they buy: size, fees, board, partners" },
  { key: "trigger", label: "Trigger", hint: "A dated reason to talk now" },
  { key: "timing", label: "Timing", hint: "A good time of year for them" },
  { key: "reach", label: "Reach", hint: "Can we reach the person who decides" },
];

export function ScoreChip({ score }: { score: number }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        score >= 70 ? "bg-[#ecfdf3] text-[#05603a]" : score >= WARM_SCORE ? "bg-[#f0f9ff] text-[#026aa2]" : score >= 40 ? "bg-[#fff6ed] text-[#9a3412]" : "bg-subtle text-muted",
      )}
    >
      {score}
    </span>
  );
}

/** The four parts of the score as small bars. */
export function ScoreBars({ parts, compact }: { parts: ScoreParts | null; compact?: boolean }) {
  if (!parts) return <p className="text-xs text-muted">Not scored yet.</p>;
  return (
    <dl className={cx("grid gap-x-4 gap-y-1.5", compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
      {PARTS.map((p) => (
        <div key={p.key} title={p.hint}>
          <dt className="text-xs text-muted">{p.label}</dt>
          <dd className="mt-1 flex items-center gap-2">
            <span className="h-1.5 flex-1 rounded-full bg-subtle">
              <span className={cx("block h-1.5 rounded-full", parts[p.key] >= 0.66 ? "bg-success" : parts[p.key] >= 0.33 ? "bg-signal" : "bg-[#f79009]")} style={{ width: `${Math.round(parts[p.key] * 100)}%` }} />
            </span>
            {!compact && <span className="w-8 text-right text-xs tabular-nums">{Math.round(parts[p.key] * 100)}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function StatsTable({ rows, label, keyLabel }: { rows: { key: string; trials: number; successes: number; weight: number }[]; label: string; keyLabel?: (k: string) => string }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <table className="w-full text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:py-1.5 [&_td]:pr-3">
        <tbody className="tabular-nums">
          {rows.slice(0, 8).map((r) => (
            <tr key={r.key}>
              <td className="font-medium">{keyLabel ? keyLabel(r.key) : r.key}</td>
              <td className="text-muted">
                {Math.round(r.successes * 10) / 10}/{Math.round(r.trials * 10) / 10}
              </td>
              <td className="text-right">{pct(r.weight)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function channelLink(channel: string) {
  return channel === "email" ? "Open email ↗" : channel === "whatsapp" ? "Open WhatsApp ↗" : channel === "call" ? "Call" : channel === "linkedin" ? "Open LinkedIn ↗" : "Open map ↗";
}

const MISSING: Record<string, string> = { email: "email address", whatsapp: "WhatsApp number", call: "phone number", linkedin: "LinkedIn profile" };

type Next = NonNullable<NonNullable<Awaited<ReturnType<typeof getProspectEngine>>>["next"]>;

/** One due play step: who, what to say, a one-tap link, and logging what happened. */
export function NextStep({ prospectId, next }: { prospectId: string; next: Next }) {
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-medium">
          Step {next.stepIndex + 1} of {next.steps} · {CHANNEL_LABELS[next.channel as TouchChannel]}
        </span>
        <span className="text-muted"> · {next.goal}</span>
      </p>
      <p className="text-sm text-muted">
        {next.contactName ? `To ${next.contactName}` : "No named person yet"}
        {next.due ? ` · due ${formatIst(next.due)}` : ""}
      </p>
      {next.subject && <p className="text-sm">Subject: {next.subject}</p>}
      <p className="rounded-xl bg-subtle p-3 text-sm whitespace-pre-line select-all">{next.message}</p>
      <div className="flex flex-wrap items-center gap-2">
        {next.href && (
          <a href={next.href} target={next.channel === "call" ? undefined : "_blank"} rel="noopener noreferrer" className={buttonClass("primary", "sm")}>
            {channelLink(next.channel)}
          </a>
        )}
        {next.missingChannel && <span className="text-sm text-muted">No {MISSING[next.channel] ?? "contact"} for them yet. Add it under People.</span>}
      </div>
      <details className="rounded-xl ring-1 ring-line">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Done it? Log what happened</summary>
        <div className="p-3 pt-1">
          <TouchForm
            action={logStepAction.bind(null, prospectId, { playStep: next.stepIndex, variant: next.variant, contactId: next.contactId, signalId: next.signalId })}
            defaultChannel={next.channel as TouchChannel}
            channels={[next.channel as TouchChannel]}
          />
        </div>
      </details>
    </div>
  );
}

/** Read when the page renders. */
const ageDays = (d: Date) => Math.max(0, Math.round((Date.now() - d.getTime()) / 86_400_000));
const isPast = (d: Date | null) => !!d && d.getTime() < Date.now();

/** Everything the engine knows about one prospect, and the controls to teach it. */
export function EnginePanel({ prospect: p, engine }: { prospect: Prospect; engine: NonNullable<Awaited<ReturnType<typeof getProspectEngine>>> }) {
  const parts = p.scoreParts;
  const play = playFor(p.play);
  const onPlay = !!play && !p.playEndedReason;
  const contribution = new Map(parts?.top.map((t) => [t.signalId, t.contribution]) ?? []);
  return (
    <>
      <Card>
        <CardTitle aside={<ScoreChip score={p.score} />}>Signal engine</CardTitle>
        <ScoreBars parts={parts} />
        {p.reason && (
          <p className="mt-4 text-sm">
            <span className="font-medium">Reason to contact now: </span>
            <span className="text-fg/85">{p.reason}</span>
          </p>
        )}
        {parts?.timingLabel && <p className="mt-2 text-sm text-muted">Timing: {parts.timingLabel}.</p>}
        {parts && parts.missing.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">Would raise the score:</span>
            {parts.missing.map((m) => (
              <Chip key={m}>{m}</Chip>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {FEEDBACK_KINDS.filter((f) => f.id === "great_lead" || f.id === "bad_fit" || f.id === "wrong_contact").map((f) => (
            <form key={f.id} action={feedbackAction.bind(null, p.id, null, f.id)}>
              <Button size="sm" variant="ghost">
                {f.label}
              </Button>
            </form>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle aside={onPlay && <span className="text-sm text-muted">{play.name}</span>}>Play</CardTitle>
        {onPlay && engine.next ? (
          <>
            <NextStep prospectId={p.id} next={engine.next} />
            <form action={stopPlayAction.bind(null, p.id)} className="mt-3">
              <Button size="sm" variant="ghost">
                Stop the play
              </Button>
            </form>
          </>
        ) : (
          <div className="space-y-3">
            {p.playEndedReason && <p className="text-sm text-muted">Last play ended: {p.playEndedReason}.</p>}
            <p className="text-sm text-muted">A play is a sequence of touches across email, visits, LinkedIn, calls and WhatsApp, each carrying the reason. A reply stops it and a person takes over.</p>
            <div className="flex flex-wrap gap-2">
              {engine.plays.map((pl) => (
                <form key={pl.id} action={startPlayAction.bind(null, p.id, pl.id)}>
                  <Button size="sm" variant={p.score >= WARM_SCORE ? "primary" : "secondary"} disabled={p.doNotContact}>
                    Start “{pl.name}”
                  </Button>
                </form>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle aside={<span className="text-sm text-muted">{engine.signals.length}</span>}>Signals</CardTitle>
        {engine.signals.length === 0 ? (
          <p className="text-sm text-muted">No dated signal yet, so the trigger score is near zero. Add one below, or ask Claude to hunt for them.</p>
        ) : (
          <ul className="space-y-3">
            {engine.signals.map((s) => {
              const expired = isPast(s.expiresAt);
              return (
                <li key={s.id} className={cx("rounded-xl p-3 ring-1 ring-line", expired && "opacity-60")}>
                  <p className="text-xs text-muted">
                    {signalType(s.type)?.label ?? s.type} · {ageDays(s.observedAt)} days ago
                    {contribution.has(s.id) ? ` · pull ${pct(contribution.get(s.id)!)}` : ""}
                    {expired ? " · expired" : s.expiresAt ? ` · until ${formatIst(s.expiresAt).split(",")[0]}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{s.title}</p>
                  {s.detail && <p className="mt-1 text-sm text-fg/80">{s.detail}</p>}
                  {s.sourceUrl && (
                    <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-muted underline">
                      {s.sourceUrl}
                    </a>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {FEEDBACK_KINDS.filter((f) => f.id === "reason_relevant" || f.id === "reason_wrong" || f.id === "signal_stale").map((f) => (
                      <form key={f.id} action={feedbackAction.bind(null, p.id, s.id, f.id)}>
                        <Button size="sm" variant="ghost">
                          {f.label}
                        </Button>
                      </form>
                    ))}
                    <form action={removeSignalAction.bind(null, p.id, s.id)}>
                      <Button size="sm" variant="ghost">
                        Remove
                      </Button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">Add a signal</summary>
          <ActionForm action={addSignalAction.bind(null, p.id)} submitLabel="Add signal" size="sm" className="mt-3">
            <Field label="Type" htmlFor="sig-type">
              <select id="sig-type" name="type" className={inputClass}>
                {engine.signalTypes
                  .filter((t) => t.id !== "legacy_note")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="What happened, with specifics" htmlFor="sig-title">
              <input id="sig-title" name="title" required maxLength={300} placeholder="Hiring a robotics teacher at ₹30k, Naukri" className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="When it happened" htmlFor="sig-date">
                <input id="sig-date" name="observedAt" type="date" required className={inputClass} />
              </Field>
              <Field label="Source link" htmlFor="sig-src" optional>
                <input id="sig-src" name="sourceUrl" className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </details>
      </Card>

      <Card>
        <CardTitle aside={<span className="text-sm text-muted">{engine.contacts.length}</span>}>People</CardTitle>
        {engine.contacts.length === 0 ? (
          <p className="text-sm text-muted">Nobody named yet. The decision maker&apos;s own email or number is the biggest lift to reach.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {engine.contacts.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.name}
                    {c.title && <span className="font-normal text-muted"> · {c.title}</span>}
                  </p>
                  <p className="text-xs text-muted">{CONTACT_ROLES.find((r) => r.id === c.role)?.label}</p>
                  <p className="mt-0.5 break-all text-fg/80">{[c.phone, c.email].filter(Boolean).join(" · ") || "No direct phone or email"}</p>
                  {c.linkedinUrl && (
                    <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline">
                      LinkedIn
                    </a>
                  )}
                </div>
                <form action={removeContactAction.bind(null, p.id, c.id)}>
                  <Button size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">Add a person</summary>
          <ActionForm action={addContactAction.bind(null, p.id)} submitLabel="Add person" size="sm" className="mt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="c-name">
                <input id="c-name" name="name" required maxLength={120} className={inputClass} />
              </Field>
              <Field label="Title" htmlFor="c-title" optional>
                <input id="c-title" name="title" maxLength={80} placeholder="Principal, Managing partner" className={inputClass} />
              </Field>
              <Field label="Role" htmlFor="c-role">
                <select id="c-role" name="role" defaultValue="decision_maker" className={inputClass}>
                  {CONTACT_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Phone" htmlFor="c-phone" optional>
                <input id="c-phone" name="phone" inputMode="tel" className={inputClass} />
              </Field>
              <Field label="Email" htmlFor="c-email" optional>
                <input id="c-email" name="email" type="email" className={inputClass} />
              </Field>
              <Field label="LinkedIn" htmlFor="c-li" optional>
                <input id="c-li" name="linkedinUrl" className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </details>
      </Card>

      <Card>
        <CardTitle>Fit facts</CardTitle>
        <ActionForm action={setFactsAction.bind(null, p.id)} submitLabel="Save facts" size="sm">
          <div className="grid gap-3 sm:grid-cols-2">
            {engine.fitRules.map((r) => (
              <Field key={r.fact} label={r.label} htmlFor={`fact-${r.fact}`} optional hint={r.hint}>
                <input id={`fact-${r.fact}`} name={`fact_${r.fact}`} defaultValue={p.facts?.[r.fact] === undefined ? "" : String(p.facts[r.fact])} className={inputClass} />
              </Field>
            ))}
            <Field label="Pin code" htmlFor="pincode" optional>
              <input id="pincode" name="pincode" inputMode="numeric" maxLength={6} defaultValue={p.pincode ?? ""} className={inputClass} />
            </Field>
            <Field label="Their report / check link" htmlFor="assetUrl" optional hint="Sent in the play's messages">
              <input id="assetUrl" name="assetUrl" defaultValue={p.assetUrl ?? ""} className={inputClass} />
            </Field>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
