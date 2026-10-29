import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { StatTile } from "@/components/hq";
import { Button, ButtonLink, Card, CardTitle, Chip, EmptyState, Field, PageHeader, cx, inputClass, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { AREA_CENTRES, SEGMENTS, SEGMENT_IDS, signalType } from "@/knowledge/engine";
import { requireStaffActor } from "@/lib/session";
import type { HuntPlace } from "@/db/schema";
import { getEngineInsights, getEngineQueue } from "@/server/engine";
import { listHunts, listRunners } from "@/server/hunts";
import { cancelHuntAction, requestHuntAction, runLearningAction, startPlayAction } from "../engine-actions";
import { NextStep, ScoreBars, ScoreChip, StatsTable } from "../engine-ui";

export const metadata = { title: "Signal engine" };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : undefined);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const AREAS = Object.keys(AREA_CENTRES).sort();
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const HUNT_LABELS: Record<string, string> = { queued: "Queued", running: "Running", done: "Done", failed: "Failed", cancelled: "Cancelled" };
const HUNT_TONES: Record<string, string> = {
  running: "!bg-[#f0f9ff] !text-[#026aa2]",
  done: "!bg-[#ecfdf3] !text-[#05603a]",
  failed: "!bg-[#fef3f2] !text-[#b42318]",
};

function placeLabel(p: HuntPlace) {
  return [p.near ? `within ${p.near.km} km of ${title(p.near.area)}` : null, p.area, p.pincode ? `pin ${p.pincode}…` : null, p.city].filter(Boolean).join(", ");
}

export default async function EnginePage({ searchParams }: PageProps<"/hq/outreach/engine">) {
  const actor = await requireStaffActor();
  const db = await getDb();
  const params = await searchParams;
  const segment = SEGMENT_IDS.find((s) => s === params.segment);
  const area = one(params.area);
  const pincode = one(params.pincode)?.replace(/\D/g, "").slice(0, 6) || undefined;
  const near = AREAS.find((a) => a === one(params.near));
  const km = Math.min(Math.max(Number(one(params.km) ?? 5) || 5, 0.5), 100);
  const minScore = one(params.min) ? Math.min(Math.max(Number(one(params.min)) || 0, 0), 100) : undefined;
  const filter = { segment, area, pincode, near: near ? { area: near, km } : undefined, minScore };

  const [queue, insights, hunts, runners] = await Promise.all([getEngineQueue(db, actor, filter), getEngineInsights(db, actor), listHunts(db, actor, { limit: 8 }), listRunners(db, actor)]);
  const shown = insights.segments.filter((s) => !segment || s.segment === segment);
  const filtered = !!(segment || area || pincode || near || minScore !== undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/outreach" className="hover:underline">
            ← Outreach
          </Link>
        }
        title="Signal engine"
        description="Every lead is scored on fit × trigger × timing × reach. Warm ones go on a play: a reason in every touch, across email, visits, LinkedIn, calls and WhatsApp. Every morning it re-learns from what happened."
        actions={<ActionForm action={runLearningAction} submitLabel="Re-learn now" pendingLabel="Learning…" size="sm" inline />}
      />

      <Card>
        <CardTitle
          aside={
            <Link href="/hq/outreach/engine/claude" className="text-sm underline-offset-4 hover:underline">
              Set up your Claude →
            </Link>
          }
        >
          Find warm leads
        </CardTitle>
        <p className="-mt-2 mb-4 text-sm text-muted">
          Queue a hunt and a teammate’s own Claude runs it on their plan: it finds the targets, the person who decides and dated reasons to talk, and they land below already scored.
        </p>
        <ActionForm action={requestHuntAction} submitLabel="Find warm leads" pendingLabel="Queuing…" variant="primary">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Field label="Who" htmlFor="h-segment">
              <select id="h-segment" name="segment" defaultValue={segment ?? "school"} className={inputClass}>
                {SEGMENTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Near" htmlFor="h-near" optional>
              <select id="h-near" name="nearArea" defaultValue={near ?? ""} className={inputClass}>
                <option value="">Anywhere in Pune</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {title(a)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Within km" htmlFor="h-km" optional>
              <input id="h-km" name="km" type="number" min={0.5} max={100} step={0.5} defaultValue={5} className={inputClass} />
            </Field>
            <Field label="Area or pin code" htmlFor="h-area" optional>
              <input id="h-area" name="area" placeholder="Pimpri-Chinchwad" maxLength={80} className={inputClass} />
            </Field>
            <Field label="How many" htmlFor="h-count">
              <input id="h-count" name="count" type="number" min={5} max={50} defaultValue={25} className={inputClass} />
            </Field>
            <Field label="Run on" htmlFor="h-runner">
              <select id="h-runner" name="assignedTo" defaultValue="" className={inputClass}>
                <option value="">Whoever’s Claude is free</option>
                {runners.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id === actor.userId ? "My Claude" : `${r.name}’s Claude`}
                    {r.online ? " · online" : r.hasKey ? "" : " · not set up"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notes for the hunter" htmlFor="h-brief" optional>
            <input id="h-brief" name="brief" maxLength={1000} placeholder="Only CBSE with Classes 3–8 · firms with 3+ partners doing audits" className={inputClass} />
          </Field>
        </ActionForm>
        {!runners.some((r) => r.hasKey) && (
          <p className="mt-3 text-sm text-muted">
            Nobody’s Claude is set up yet, so hunts will wait in the queue.{" "}
            <Link href="/hq/outreach/engine/claude" className="underline">
              Set up yours
            </Link>{" "}
            (5 minutes).
          </p>
        )}
        {hunts.length > 0 && (
          <ul className="mt-5 divide-y divide-line text-sm">
            {hunts.map((h) => (
              <li key={h.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p>
                    <span className="font-medium">
                      {h.count} {SEGMENTS.find((s) => s.id === h.segment)?.noun ?? h.segment}
                    </span>
                    <span className="text-muted"> · {placeLabel(h.place)}</span>
                  </p>
                  <p className="text-xs text-muted">
                    Asked by {h.requestedByName ?? "someone"} {timeAgo(h.createdAt)} · for {h.assignedToName ? `${h.assignedToName}’s Claude` : "whoever’s free"}
                    {h.claimedByName ? ` · run on ${h.claimedByName}’s Claude` : ""}
                  </p>
                  {h.result && (
                    <p className="mt-1 text-fg/85">
                      {h.result.added} added, {h.result.updated} updated, {h.result.warm} warm. {h.result.summary}
                    </p>
                  )}
                  {h.error && <p className="mt-1 text-[#b42318]">{h.error}</p>}
                  {h.brief && <p className="mt-1 text-xs text-muted">Notes: {h.brief}</p>}
                </div>
                <span className="flex items-center gap-2">
                  <Chip className={HUNT_TONES[h.status]}>{HUNT_LABELS[h.status] ?? h.status}</Chip>
                  {h.status === "queued" && (
                    <form action={cancelHuntAction.bind(null, h.id)}>
                      <Button size="sm" variant="ghost">
                        Cancel
                      </Button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <form action="/hq/outreach/engine" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Segment" htmlFor="segment">
            <select id="segment" name="segment" defaultValue={segment ?? ""} className={inputClass}>
              <option value="">All</option>
              {SEGMENTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Near" htmlFor="near" optional>
            <select id="near" name="near" defaultValue={near ?? ""} className={inputClass}>
              <option value="">Anywhere</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {title(a)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Within km" htmlFor="km" optional>
            <input id="km" name="km" type="number" min={0.5} max={100} step={0.5} defaultValue={km} className={inputClass} />
          </Field>
          <Field label="Area contains" htmlFor="area" optional>
            <input id="area" name="area" defaultValue={area} placeholder="Wakad" className={inputClass} />
          </Field>
          <Field label="Pin code starts" htmlFor="pincode" optional>
            <input id="pincode" name="pincode" inputMode="numeric" defaultValue={pincode} placeholder="4110" className={inputClass} />
          </Field>
          <Field label="Min score" htmlFor="min" optional>
            <input id="min" name="min" type="number" min={0} max={100} defaultValue={minScore} className={inputClass} />
          </Field>
          <div className="flex items-center gap-2 sm:col-span-3 lg:col-span-6">
            <Button size="sm">Apply</Button>
            {filtered && (
              <ButtonLink href="/hq/outreach/engine" size="sm" variant="ghost">
                Clear
              </ButtonLink>
            )}
            <span className="text-sm text-muted">{queue.considered} active prospects match.</span>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {shown.map((s) => (
          <StatTile key={s.segment} label={`${s.label}: warm`} hint={`${s.onPlay} on a play · ${Math.round(s.engaged)}/${Math.round(s.contacted)} engaged · ${s.meetings} meetings · ${s.wins} won`}>
            {s.warm} <span className="text-base font-normal text-muted">of {s.prospects}</span>
          </StatTile>
        ))}
      </div>

      <Card>
        <CardTitle aside={<span className="text-sm text-muted">{queue.due.length}</span>}>Due today</CardTitle>
        {queue.due.length === 0 ? (
          <EmptyState title="No play steps due.">Start a play for a warm lead below, and its steps show up here on the right day.</EmptyState>
        ) : (
          <ol className="space-y-5">
            {queue.due.map(({ prospect: p, next, distanceKm }) => (
              <li key={p.id} className="rounded-card p-4 ring-1 ring-line">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/hq/outreach/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                    {p.name}
                  </Link>
                  <span className="flex items-center gap-2 text-sm text-muted">
                    {[p.area, distanceKm != null ? `${distanceKm} km` : null].filter(Boolean).join(" · ")}
                    <ScoreChip score={p.score} />
                  </span>
                </div>
                {p.reason && <p className="mb-3 text-sm text-fg/80">{p.reason}</p>}
                <NextStep prospectId={p.id} next={next} />
              </li>
            ))}
          </ol>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardTitle aside={<span className="text-sm text-muted">score {">"}= 60, not contacted</span>}>Warm, ready to start</CardTitle>
          {queue.ready.length === 0 ? (
            <EmptyState title="No warm leads waiting.">Ask Claude to hunt signals for schools or CA firms; anything that scores 60+ lands here.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {queue.ready.map(({ prospect: p, distanceKm }) => (
                <li key={p.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_12rem_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <Link href={`/hq/outreach/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                        {p.name}
                      </Link>
                      <ScoreChip score={p.score} />
                    </p>
                    <p className="text-xs text-muted">{[p.area, distanceKm != null ? `${distanceKm} km` : null, p.contactName].filter(Boolean).join(" · ")}</p>
                    {p.reason && <p className="mt-1 line-clamp-2 text-sm text-fg/80">{p.reason}</p>}
                  </div>
                  <ScoreBars parts={p.scoreParts} compact />
                  <form action={startPlayAction.bind(null, p.id, undefined)}>
                    <Button size="sm">Start play</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle aside={<span className="text-sm text-muted">score 40–59</span>}>One step from warm</CardTitle>
          {queue.warming.length === 0 ? (
            <p className="text-sm text-muted">Nothing here yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {queue.warming.map(({ prospect: p }) => (
                <li key={p.id}>
                  <p className="flex items-center gap-2">
                    <Link href={`/hq/outreach/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    <ScoreChip score={p.score} />
                  </p>
                  <p className="text-muted">Needs {p.scoreParts?.missing.join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle aside={insights.lastRun && <span className="text-sm text-muted">Last run {timeAgo(insights.lastRun.ranAt)}</span>}>What the engine learned</CardTitle>
        {!insights.lastRun ? (
          <p className="text-sm text-muted">It hasn&apos;t run yet. Press “Re-learn now”, or wait for tomorrow morning&apos;s run.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-fg/85">
              {insights.lastRun.insights.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <div>
              <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">Weights that moved</p>
              {insights.lastRun.changes.length === 0 ? (
                <p className="text-sm text-muted">Nothing moved in the last run.</p>
              ) : (
                <ul className="space-y-1 text-sm tabular-nums">
                  {insights.lastRun.changes.slice(0, 12).map((c) => (
                    <li key={`${c.segment}${c.dimension}${c.key}`} className="flex justify-between gap-3">
                      <span className="truncate">
                        {c.dimension === "signal" ? (signalType(c.key)?.label ?? c.key) : `${c.dimension}: ${c.key}`}
                        <span className="text-muted"> · {c.segment}</span>
                      </span>
                      <span className="shrink-0">
                        {c.from === null ? "new" : pct(c.from)} → {pct(c.to)} <span className="text-muted">({c.trials})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      {shown
        .filter((s) => s.segment !== "business" || s.prospects > 0)
        .map((s) => (
          <Card key={s.segment}>
            <CardTitle aside={<span className="text-sm text-muted">engaged / tried · weight now</span>}>{s.label}: what to hunt and what works</CardTitle>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted uppercase">Signals, strongest first</p>
                <table className="w-full text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:py-1.5 [&_td]:pr-3">
                  <tbody className="tabular-nums">
                    {s.hunt.map((h) => (
                      <tr key={h.type}>
                        <td className="font-medium">
                          {h.label}
                          {h.untested && <Chip className="ml-2 !text-[11px]">untested</Chip>}
                        </td>
                        <td className="text-muted">
                          {Math.round(h.successes * 10) / 10}/{Math.round(h.trials * 10) / 10}
                        </td>
                        <td className="text-muted" title="Prospects with this signal live">
                          {h.prospectsWithIt} live
                        </td>
                        <td className={cx("text-right", h.learned && "font-medium")}>{pct(h.weight)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <StatsTable label="Channels (reached)" rows={s.channels} />
                <StatsTable label="Play steps (reached)" rows={s.steps} />
                <StatsTable label="Message variants" rows={s.variants} />
                <StatsTable label="Areas (engaged)" rows={s.areas} keyLabel={title} />
                <StatsTable label="Fit band (engaged)" rows={s.fitBands} />
                <StatsTable label="Call hour (reached)" rows={s.hours} keyLabel={(h) => `${h}:00`} />
                {s.channels.length === 0 && <p className="text-sm text-muted sm:col-span-2">Channel, step, variant, area and hour results appear once touches are logged.</p>}
              </div>
            </div>
          </Card>
        ))}
    </div>
  );
}
