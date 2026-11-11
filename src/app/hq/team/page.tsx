import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Button, Card, CardTitle, Chip, EmptyState, Field, PageHeader, cx, inputClass, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { BELTS, type BeltId } from "@/knowledge/engine";
import { requireStaffActor } from "@/lib/session";
import { packCandidates, teamBoard } from "@/server/team-tasks";
import { cancelTaskAction, queuePackAction, queueResearchAction } from "./actions";
import { LiveRefresh } from "./live-refresh";

export const metadata = { title: "Revenue team" };

const STATUS: Record<string, { label: string; tone: string }> = {
  queued: { label: "Waiting", tone: "" },
  running: { label: "Working", tone: "!bg-[#f0f9ff] !text-[#026aa2]" },
  done: { label: "Done", tone: "!bg-[#ecfdf3] !text-[#05603a]" },
  failed: { label: "Failed", tone: "!bg-[#fef3f2] !text-[#b42318]" },
  cancelled: { label: "Cancelled", tone: "" },
};

type Applied = {
  targets?: { id: string; name: string; created: boolean; score: number | null }[];
  rejected?: { name: string; reason: string }[];
  packed?: number;
  held?: { prospectId: string; what: string; problems: string[] }[];
};

const hhmm = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default async function TeamPage({ searchParams }: PageProps<"/hq/team">) {
  const actor = await requireStaffActor();
  const db = await getDb();
  const params = await searchParams;
  const belt = (BELTS.find((b) => b.id === params.belt)?.id ?? "bhosari") as BeltId;
  const [board, candidates] = await Promise.all([teamBoard(db, actor), packCandidates(db, actor, { belt })]);
  const busy = board.queued + board.running > 0;

  return (
    <div className="space-y-6">
      <LiveRefresh busy={busy} />
      <PageHeader
        title="Revenue team"
        description="Ask the team for research or for packs. Your laptop runner does the work on your own Claude plan, and everything lands on the outreach desk for you to check. Nothing is ever sent without you."
        actions={
          <span className={cx("rounded-full px-3 py-1 text-sm", board.online ? "bg-[#ecfdf3] text-[#05603a]" : "bg-subtle text-muted")}>
            {board.online ? "Team online" : board.lastSeen ? `Team offline · last online ${timeAgo(board.lastSeen)}` : "Runner not started yet"}
          </span>
        }
      />

      {!board.online && (
        <p className="text-sm text-muted">
          Tasks wait here until you start the runner on your laptop: <code className="text-xs">npm run team</code> in the amfire folder. No runner key yet?{" "}
          <Link href="/hq/outreach/engine/claude" className="underline underline-offset-4">
            Create one
          </Link>
          .
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Find new accounts</CardTitle>
          <p className="-mt-2 mb-4 text-sm text-muted">
            The Research Analyst finds Indian-owned manufacturers of ₹10 Cr+ in the belt, with the person who decides and a dated reason, each fact with its source. Contact details its source doesn’t show are removed.
          </p>
          <ActionForm action={queueResearchAction} submitLabel="Queue research" pendingLabel="Queuing…" variant="primary">
            <Field label="Belt" htmlFor="r-belt">
              <select id="r-belt" name="belt" defaultValue={belt} className={inputClass}>
                {BELTS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <Field label="Village or MIDC phase" htmlFor="r-area" optional>
                <input id="r-area" name="area" maxLength={80} placeholder="e.g. Ranjangaon MIDC" className={inputClass} />
              </Field>
              <Field label="How many" htmlFor="r-count">
                <input id="r-count" name="count" type="number" min={1} max={10} defaultValue={10} className={inputClass} />
              </Field>
            </div>
            <Field label="Notes for the analyst" htmlFor="r-brief" optional>
              <input id="r-brief" name="brief" maxLength={1000} placeholder="e.g. auto components only" className={inputClass} />
            </Field>
          </ActionForm>
        </Card>

        <Card>
          <CardTitle>Pack accounts</CardTitle>
          <p className="-mt-2 mb-3 text-sm text-muted">The SDR writes each account’s brief, opener, email draft and printed outline from what HQ already knows. Up to 10 at a time.</p>
          <nav className="mb-3 flex flex-wrap gap-2" aria-label="Belts">
            {BELTS.map((b) => (
              <Link
                key={b.id}
                href={`/hq/team?belt=${b.id}`}
                scroll={false}
                className={cx("rounded-full border px-3 py-1 text-sm", b.id === belt ? "border-ink bg-ink text-white" : "border-line hover:border-ink")}
                aria-current={b.id === belt ? "page" : undefined}
              >
                {b.label}
              </Link>
            ))}
          </nav>
          {candidates.length === 0 ? (
            <EmptyState title="No active manufacturers in this belt." />
          ) : (
            <ActionForm action={queuePackAction} submitLabel="Queue pack" pendingLabel="Queuing…" variant="primary">
              <ul className="max-h-80 divide-y divide-line overflow-y-auto text-sm">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-3 py-2">
                      <input type="checkbox" name="prospectId" value={c.id} className="size-4" />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted"> · {c.area}</span>
                      </span>
                      {c.packed && <Chip>Packed</Chip>}
                      <span className="w-8 text-right text-muted tabular-nums">{c.score}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </ActionForm>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle aside={<span className="text-sm text-muted">{busy ? `${board.running} working · ${board.queued} waiting` : "Nothing waiting"}</span>}>Tasks</CardTitle>
        {board.tasks.length === 0 ? (
          <EmptyState title="No tasks yet.">Queue research or a pack above.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {board.tasks.map((t) => {
              const status = STATUS[t.status] ?? { label: t.status, tone: "" };
              const applied = ((t.output as { applied?: Applied } | null)?.applied ?? {}) as Applied;
              const place = t.place.area ?? (t.place.near ? BELTS.find((b) => b.start === t.place.near?.area)?.label : null) ?? "Pune";
              return (
                <li key={t.id} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span className="font-medium">
                        {t.type === "research_batch" ? `Find ${t.count} manufacturers in ${place}` : `Pack ${t.accounts.length} account${t.accounts.length === 1 ? "" : "s"}`}
                      </span>
                      <span className="text-sm text-muted"> · asked {timeAgo(t.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Chip className={status.tone}>{status.label}</Chip>
                      {t.status === "queued" && (
                        <form action={cancelTaskAction.bind(null, t.id)}>
                          <Button size="sm" variant="ghost">
                            Cancel
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>

                  {t.type === "message_pack" && t.accounts.length > 0 && (
                    <p className="mt-1 text-sm text-muted">
                      {t.accounts.map((a, i) => (
                        <span key={a.id}>
                          {i > 0 && ", "}
                          <Link href={`/hq/outreach/${a.id}`} className="underline-offset-4 hover:underline">
                            {a.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}

                  {t.status === "queued" && t.nextAttemptAt && <p className="mt-1 text-sm text-muted">Trying again at {hhmm(t.nextAttemptAt)}. {t.error}</p>}

                  {t.status === "running" && (
                    <div className="mt-2 rounded-lg bg-subtle px-3 py-2 text-sm">
                      <p className="text-muted">Attempt {t.attempts} · started {t.claimedAt ? timeAgo(t.claimedAt) : "just now"}</p>
                      <ol className="mt-1 space-y-0.5">
                        {t.progress.slice(-6).map((p, i) => (
                          <li key={`${p.at}-${i}`} className="truncate">
                            <span className="text-muted tabular-nums">{hhmm(new Date(p.at))}</span> {p.text}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {t.status === "done" && (
                    <div className="mt-2 space-y-2 text-sm">
                      {t.result?.summary && <p className="whitespace-pre-line">{t.result.summary}</p>}
                      {applied.targets && applied.targets.length > 0 && (
                        <p>
                          <span className="text-muted">On the desk: </span>
                          {applied.targets.map((x, i) => (
                            <span key={x.id}>
                              {i > 0 && ", "}
                              <Link href={`/hq/outreach/${x.id}`} className="underline underline-offset-4">
                                {x.name}
                              </Link>
                              <span className="text-muted">
                                {" "}
                                ({x.created ? "new" : "updated"}, {x.score})
                              </span>
                            </span>
                          ))}
                        </p>
                      )}
                      {applied.rejected && applied.rejected.length > 0 && (
                        <p className="text-muted">Rejected: {applied.rejected.map((r) => `${r.name} (${r.reason})`).join("; ")}</p>
                      )}
                      {applied.held && applied.held.length > 0 && (
                        <p className="text-[#b42318]">
                          Held back for breaking the copy rules:{" "}
                          {applied.held.map((h) => `${t.accounts.find((a) => a.id === h.prospectId)?.name ?? "an account"}'s ${h.what} (${h.problems.join(", ")})`).join("; ")}. Write those yourself.
                        </p>
                      )}
                    </div>
                  )}

                  {t.status === "failed" && <p className="mt-1 text-sm text-[#b42318]">{t.error}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
