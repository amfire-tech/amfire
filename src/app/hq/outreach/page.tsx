import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/action-form";
import { StatTile } from "@/components/hq";
import { ButtonLink, Card, CardTitle, Chip, EmptyState, Field, PageHeader, Table, cx, inputClass, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { BUSINESS_TYPES } from "@/knowledge/catalog";
import { DAILY_TARGETS, PROSPECT_KINDS, PROSPECT_STATUSES, STREAK_MIN_TOUCHES, formatIst, prospectStatusLabel } from "@/knowledge/outreach";
import { requireStaffActor } from "@/lib/session";
import { getScoreboard, listOutreachNotes, listProspects, listResponseTests } from "@/server/outreach";
import { getPartners } from "@/server/partners";
import { Money } from "@/components/hq";
import { addProspectAction, importProspectsAction } from "./actions";

export const metadata = { title: "Outreach" };

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

export default async function OutreachPage({ searchParams }: PageProps<"/hq/outreach">) {
  const actor = await requireStaffActor();
  const db = await getDb();
  const params = await searchParams;
  const status = PROSPECT_STATUSES.find((s) => s.id === params.status)?.id;
  const kind = PROSPECT_KINDS.find((k) => k.id === params.kind)?.id;
  const due = params.due === "1";
  const search = typeof params.q === "string" && params.q.trim() ? params.q.trim().slice(0, 80) : undefined;
  const [board, list, notes, partners, response] = await Promise.all([
    getScoreboard(db, actor),
    listProspects(db, actor, { status, kind, search, dueOnly: due }),
    listOutreachNotes(db, actor, { limit: 3 }),
    getPartners(db, actor),
    listResponseTests(db, actor),
  ]);
  const review = notes.find((n) => n.kind === "review");
  const total = list.counts.reduce((s, c) => s + c.count, 0);
  const maxDay = Math.max(DAILY_TARGETS.touches, ...board.week.map((d) => d.touches));
  const filterHref = (next: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { status, kind, q: search, due: due ? "1" : undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/hq/outreach?${s}` : "/hq/outreach";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach"
        description="Everyone you plan to contact, every call and message, and what's working. Count the work; the results follow."
        actions={
          <>
            <ButtonLink href="/hq/outreach/call">Start calling{board.readyToContact ? ` · ${board.readyToContact} due` : ""}</ButtonLink>
            <ButtonLink href="#add" variant="secondary">
              Add prospects
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Touches today" hint={`Target ${DAILY_TARGETS.touches}`} tone={board.today.touches >= DAILY_TARGETS.touches ? "good" : undefined}>
          {board.today.touches}
        </StatTile>
        <StatTile label="Conversations" hint={`Target ${DAILY_TARGETS.conversations}`} tone={board.today.conversations >= DAILY_TARGETS.conversations ? "good" : undefined}>
          {board.today.conversations}
        </StatTile>
        <StatTile label="Meetings booked" hint={`Target ${DAILY_TARGETS.meetings}`} tone={board.today.meetings >= DAILY_TARGETS.meetings ? "good" : undefined}>
          {board.today.meetings}
        </StatTile>
        <StatTile label="Streak" hint={`Days in a row with ${STREAK_MIN_TOUCHES}+ touches`}>
          {board.streak} {board.streak === 1 ? "day" : "days"}
        </StatTile>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle aside={<span className="text-sm text-muted">{board.last30} touches in 30 days</span>}>Last 7 days</CardTitle>
          <div className="flex h-36 items-end gap-2" role="img" aria-label={board.week.map((d) => `${d.day}: ${d.touches} touches`).join(", ")}>
            {board.week.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-muted tabular-nums">{d.touches || ""}</span>
                <div className="flex w-full flex-1 items-end rounded-md bg-subtle">
                  <div className={cx("w-full rounded-md", d.touches >= DAILY_TARGETS.touches ? "bg-success" : "bg-signal")} style={{ height: `${(d.touches / maxDay) * 100}%` }} />
                </div>
                <span className="text-xs text-muted">{new Date(`${d.day}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            {board.week.at(-1)?.meetings ?? 0} meetings today · {board.week.reduce((s, d) => s + d.meetings, 0)} this week
          </p>
        </Card>

        <Card>
          <CardTitle aside={review && <span className="text-sm text-muted">{timeAgo(review.createdAt)}</span>}>Claude’s latest review</CardTitle>
          {review ? (
            <>
              <p className="font-medium">{review.title}</p>
              <div className="mt-2 max-h-64 overflow-y-auto text-sm whitespace-pre-line text-fg/85">{review.body}</div>
            </>
          ) : (
            <EmptyState title="No review yet.">Every night Claude reads the day’s calls and messages and writes what to change tomorrow.</EmptyState>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle aside={<span className="text-sm text-muted">{total} on the desk</span>}>Prospects</CardTitle>
        <div className="space-y-3">
          <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
            <FilterLink href={filterHref({ status: undefined, due: undefined })} active={!status && !due}>
              All · {total}
            </FilterLink>
            <FilterLink href={filterHref({ status: undefined, due: "1" })} active={due}>
              Due now · {board.readyToContact}
            </FilterLink>
            {PROSPECT_STATUSES.map((s) => {
              const count = list.counts.find((c) => c.status === s.id)?.count ?? 0;
              return count ? (
                <FilterLink key={s.id} href={filterHref({ status: s.id, due: undefined })} active={status === s.id}>
                  {s.label} · {count}
                </FilterLink>
              ) : null;
            })}
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            {[{ id: undefined, label: "Every kind" }, ...PROSPECT_KINDS].map((k) => (
              <FilterLink key={k.label} href={filterHref({ kind: k.id })} active={kind === k.id}>
                {k.label}
              </FilterLink>
            ))}
            <form action="/hq/outreach" className="ml-auto flex gap-2">
              {status && <input type="hidden" name="status" value={status} />}
              {kind && <input type="hidden" name="kind" value={kind} />}
              {due && <input type="hidden" name="due" value="1" />}
              <label htmlFor="q" className="sr-only">
                Search
              </label>
              <input id="q" name="q" defaultValue={search} placeholder="Name, area or phone" className={`${inputClass} sm:!w-56 !py-2`} />
            </form>
          </div>
        </div>

        <div className="mt-4">
          {list.prospects.length === 0 ? (
            <EmptyState title={total ? "No prospects match." : "No prospects yet."}>
              {total ? "Try another filter." : "Paste your first list below, or ask Claude to research one."}
            </EmptyState>
          ) : (
            <>
              <ul className="space-y-2 sm:hidden">
                {list.prospects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/hq/outreach/${p.id}`} className="block rounded-xl p-3 ring-1 ring-line active:bg-subtle">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{p.name}</p>
                        <Chip>{prospectStatusLabel(p.status)}</Chip>
                      </div>
                      <p className="text-xs text-muted">{[p.area, p.industry, `Tier ${p.tier}`].filter(Boolean).join(" · ")}</p>
                      {p.signal && <p className="mt-1 line-clamp-2 text-sm text-fg/80">{p.signal}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="hidden sm:block">
                <Table>
                  <thead>
                    <tr>
                      <th>Prospect</th>
                      <th>Why now</th>
                      <th>Status</th>
                      <th>Next</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.prospects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link href={`/hq/outreach/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                            {p.name}
                          </Link>
                          <div className="text-xs text-muted">{[p.area, p.industry, `Tier ${p.tier}`, p.kind === "ca_firm" ? "CA firm" : p.kind === "network" ? "Network" : null].filter(Boolean).join(" · ")}</div>
                        </td>
                        <td className="max-w-xs text-fg/80">
                          <span className="line-clamp-2">{p.signal ?? "—"}</span>
                        </td>
                        <td>
                          <Chip>{prospectStatusLabel(p.status)}</Chip>
                          {p.statusReason && <div className="mt-1 text-xs text-muted">{p.statusReason}</div>}
                        </td>
                        <td className="text-sm whitespace-nowrap text-muted">
                          {p.doNotContact ? "Do not contact" : p.nextFollowUpAt ? formatIst(p.nextFollowUpAt) : p.status === "to_contact" ? "Now" : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle aside={<span className="text-sm text-muted">All time</span>}>What converts, by industry</CardTitle>
          <FunnelTable rows={board.byIndustry} />
        </Card>
        <Card>
          <CardTitle>By area</CardTitle>
          <FunnelTable rows={board.byArea} />
        </Card>
        <Card>
          <CardTitle aside={<span className="text-sm text-muted">30 days</span>}>Objections you hear most</CardTitle>
          {board.objections.length === 0 ? (
            <p className="text-sm text-muted">None logged yet. Pick the objection when you log a call.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {board.objections.map((o) => (
                <li key={o.id} className="flex justify-between gap-3">
                  <span>{o.label}</span>
                  <span className="font-medium tabular-nums">{o.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle aside={<span className="text-sm text-muted">30 days, India time</span>}>When people pick up</CardTitle>
          {board.hours.length === 0 ? (
            <p className="text-sm text-muted">Log a few calls to see which hours connect best.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {board.hours.map((h) => (
                <li key={h.hour} className="grid grid-cols-[4.5rem_1fr_4rem] items-center gap-3">
                  <span className="text-muted tabular-nums">
                    {String(h.hour).padStart(2, "0")}:00
                  </span>
                  <div className="h-2 rounded-full bg-subtle">
                    <div className="h-2 rounded-full bg-signal" style={{ width: pct(h.reached, h.dials) === "—" ? "0%" : pct(h.reached, h.dials) }} />
                  </div>
                  <span className="text-right tabular-nums">
                    {pct(h.reached, h.dials)} <span className="text-muted">of {h.dials}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle aside={<span className="text-sm text-muted">10% of year-one payments</span>}>CA partners</CardTitle>
          {partners.length === 0 ? (
            <p className="text-sm text-muted">No partners yet. When a CA firm agrees to refer clients, open it and create its referral link.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {partners.map((pt) => (
                <li key={pt.prospect.id} className="py-2.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/hq/outreach/${pt.prospect.id}`} className="font-medium underline-offset-4 hover:underline">
                      {pt.prospect.name}
                    </Link>
                    <span className="text-muted tabular-nums">
                      {pt.clicks} clicks · {pt.leads} leads · {pt.won} won
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted">
                    Collected <Money amounts={pt.collected} empty="₹0" /> · share owed <Money amounts={pt.share} empty="₹0" />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle aside={<span className="text-sm text-muted">{response.summary.tests} tests</span>}>Pune response report</CardTitle>
          {response.summary.settled === 0 ? (
            <p className="text-sm text-muted">
              Send businesses a genuine enquiry and time the reply (on each prospect’s page). After 30+ tests, Claude turns the numbers into a post and a pitch: “61% of Pune businesses never replied”.
            </p>
          ) : (
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-muted">Median reply</dt>
                <dd className="text-xl font-semibold">{response.summary.medianHoursToReply === null ? "—" : `${response.summary.medianHoursToReply.toFixed(1)} h`}</dd>
              </div>
              <div>
                <dt className="text-muted">No reply in 24 h</dt>
                <dd className="text-xl font-semibold">{pct(response.summary.noReplyWithin24h, response.summary.settled)}</dd>
              </div>
              <div>
                <dt className="text-muted">Replied within 1 h</dt>
                <dd className="text-xl font-semibold">{pct(response.summary.within1h, response.summary.settled)}</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>

      <div id="add" className="grid scroll-mt-6 gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Paste a list</CardTitle>
          <p className="-mt-2 mb-4 text-sm text-muted">
            One per line, from a sheet or your phone notes: name, then phone, area and industry in any order. Duplicates are skipped.
          </p>
          <ActionForm action={importProspectsAction} submitLabel="Add to the desk" pendingLabel="Adding…">
            <Field label="Rows" htmlFor="rows">
              <textarea id="rows" name="rows" required rows={7} className={`${inputClass} font-mono text-sm`} placeholder={"Rahul Joshi, 98220 12345, Kothrud, friend's father · textiles\nShah Distributors, 98500 00000, Market Yard"} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <KindSelect id="import-kind" />
              <IndustrySelect id="import-industry" label="Industry, if not in the rows" />
            </div>
          </ActionForm>
        </Card>

        <Card>
          <CardTitle>Add one</CardTitle>
          <ActionForm action={addProspectAction} submitLabel="Add prospect" pendingLabel="Adding…">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business or name" htmlFor="p-name">
                <input id="p-name" name="name" required maxLength={200} className={inputClass} />
              </Field>
              <Field label="Contact person" htmlFor="p-contact" optional>
                <input id="p-contact" name="contactName" maxLength={120} className={inputClass} />
              </Field>
              <Field label="Phone" htmlFor="p-phone" optional>
                <input id="p-phone" name="phone" inputMode="tel" maxLength={30} className={inputClass} />
              </Field>
              <Field label="Area" htmlFor="p-area" optional>
                <input id="p-area" name="area" maxLength={120} placeholder="Baner, Bhosari MIDC…" className={inputClass} />
              </Field>
              <KindSelect id="p-kind" />
              <IndustrySelect id="p-industry" label="Industry" />
            </div>
            <Field label="Why now / notes" htmlFor="p-signal" optional>
              <textarea id="p-signal" name="signal" rows={2} maxLength={1000} placeholder="Hiring a telecaller · bad reviews about replies · my uncle's friend" className={inputClass} />
            </Field>
          </ActionForm>
        </Card>
      </div>

      <Card>
        <CardTitle>Claude works this desk with you</CardTitle>
        <p className="text-sm text-muted">
          From Claude Code on your laptop (your own Claude plan), Claude researches prospects with a reason to call, writes each brief and opening line, reads every touch, reviews recorded
          calls, and leaves the nightly review above. Setup: <code className="rounded bg-subtle px-1.5 py-0.5 text-xs">docs/growth-engine.md</code>.
        </p>
      </Card>
    </div>
  );
}

function FunnelTable({ rows }: { rows: { segment: string; prospects: number; contacted: number; reached: number; talked: number; meetings: number; leads: number; won: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Nothing yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:py-2 [&_td]:pr-3 [&_th]:pb-2 [&_th]:pr-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted">
        <thead>
          <tr>
            <th>Segment</th>
            <th>Contacted</th>
            <th>Reached</th>
            <th>Talked</th>
            <th>Meetings</th>
            <th>Leads</th>
            <th>Won</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.slice(0, 8).map((r) => (
            <tr key={r.segment}>
              <td className="font-medium">{r.segment}</td>
              <td>
                {r.contacted}
                <span className="text-muted">/{r.prospects}</span>
              </td>
              <td>{pct(r.reached, r.contacted)}</td>
              <td>{pct(r.talked, r.contacted)}</td>
              <td>{r.meetings}</td>
              <td>{r.leads}</td>
              <td>{r.won}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KindSelect({ id }: { id: string }) {
  return (
    <Field label="Kind" htmlFor={id}>
      <select id={id} name="kind" defaultValue="business" className={inputClass}>
        {PROSPECT_KINDS.map((k) => (
          <option key={k.id} value={k.id}>
            {k.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function IndustrySelect({ id, label }: { id: string; label: string }) {
  return (
    <Field label={label} htmlFor={id} optional>
      <select id={id} name="industry" defaultValue="" className={inputClass}>
        <option value="">Not set</option>
        {BUSINESS_TYPES.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
    </Field>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx("rounded-full px-3 py-1.5 text-sm ring-1 ring-line", active ? "bg-fg font-medium text-page ring-fg" : "bg-surface text-fg/80 hover:bg-subtle")}
    >
      {children}
    </Link>
  );
}
