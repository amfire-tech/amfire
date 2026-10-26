import Link from "next/link";
import { ButtonLink, Card, Chip, EmptyState, PageHeader, StatusBadge, buttonClass, cx, timeAgo } from "@/components/ui";
import { getDb } from "@/db";
import { DAILY_TARGETS, OBJECTIONS, PROSPECT_KINDS, fillTemplate, hookFor, objectionLabel, outcomeLabel, prospectStatusLabel } from "@/knowledge/outreach";
import { requireStaffActor } from "@/lib/session";
import { whatsappLink } from "@/server/brain";
import { getScoreboard, nextInQueue } from "@/server/outreach";
import { logTouchAndNextAction } from "../actions";
import { TouchForm } from "../touch-form";

export const metadata = { title: "Calling" };

export default async function CallPage({ searchParams }: PageProps<"/hq/outreach/call">) {
  const actor = await requireStaffActor();
  const db = await getDb();
  const params = await searchParams;
  const kind = PROSPECT_KINDS.find((k) => k.id === params.kind)?.id;
  const skip = typeof params.skip === "string" ? params.skip.split(",").filter((id) => /^[0-9a-f-]{36}$/i.test(id)) : [];
  const [{ prospect: p, remaining, history, demo }, board] = await Promise.all([nextInQueue(db, actor, { skip, kind }), getScoreboard(db, actor)]);

  const skipHref = (id: string) => {
    const q = new URLSearchParams();
    if (kind) q.set("kind", kind);
    q.set("skip", [...skip, id].join(","));
    return `/hq/outreach/call?${q}`;
  };
  const kindHref = (k?: string) => (k ? `/hq/outreach/call?kind=${k}` : "/hq/outreach/call");
  const script = p && (
    <>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-fg/85">
        {hookFor(p.kind).callScript.map((line) => (
          <li key={line}>{fillTemplate(line, { contact: p.contactName, owner: actor.name.split(" ")[0], business: p.name })}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">The call’s only job is permission to send the demo or book a visit. Don’t hard-sell, and never redial someone who said no.</p>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <Link href="/hq/outreach" className="hover:underline">
            ← Outreach
          </Link>
        }
        title="Calling"
        description={
          <>
            Today: <strong className="text-fg">{board.today.touches}</strong> / {DAILY_TARGETS.touches} touches ·{" "}
            <strong className="text-fg">{board.today.conversations}</strong> conversations · <strong className="text-fg">{board.today.meetings}</strong> meetings
          </>
        }
      />
      <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-signal" style={{ width: `${Math.min(100, (board.today.touches / DAILY_TARGETS.touches) * 100)}%` }} />
      </div>

      <nav aria-label="Who to call" className="flex flex-wrap gap-2">
        {[{ id: undefined, label: "Everyone" }, ...PROSPECT_KINDS].map((k) => (
          <Link
            key={k.label}
            href={kindHref(k.id)}
            aria-current={kind === k.id ? "page" : undefined}
            className={cx("rounded-full px-3 py-1.5 text-sm ring-1 ring-line", kind === k.id ? "bg-fg font-medium text-page ring-fg" : "bg-surface text-fg/80 hover:bg-subtle")}
          >
            {k.label}
          </Link>
        ))}
      </nav>

      {!p ? (
        <EmptyState title={skip.length ? "That's everyone due right now." : "No one is due for contact."}>
          {skip.length ? (
            <Link href={kindHref(kind)} className="underline">
              Go through the skipped ones again
            </Link>
          ) : (
            <>
              Add prospects on the <Link href="/hq/outreach#add" className="underline">Outreach page</Link>, or ask Claude to research a new list.
            </>
          )}
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold">{p.name}</h2>
                  <p className="text-sm text-muted">
                    {[p.contactName && `${p.contactName}${p.contactRole ? `, ${p.contactRole}` : ""}`, p.industry, p.area].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>Tier {p.tier}</Chip>
                  {demo && <Chip className={demo.views ? "!bg-[#ecfdf3] !text-[#05603a]" : undefined}>{demo.views ? `Demo opened ${demo.views}×` : "Demo ready"}</Chip>}
                  <StatusBadge status={prospectStatusLabel(p.status)} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {p.phone && (
                  <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} className={buttonClass("primary")}>
                    Call {p.phone}
                  </a>
                )}
                {p.phone && (
                  <a
                    href={whatsappLink(p.phone, fillTemplate(history.length ? hookFor(p.kind).whatsapp : hookFor(p.kind).coldWhatsapp, { contact: p.contactName, owner: actor.name.split(" ")[0], business: p.name, demo: demo?.url }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("secondary")}
                  >
                    WhatsApp ↗
                  </a>
                )}
                {p.website && (
                  <a href={p.website} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
                    Website ↗
                  </a>
                )}
                {p.mapsUrl && (
                  <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost")}>
                    Google listing ↗
                  </a>
                )}
              </div>

              <dl className="mt-5 space-y-3 text-sm">
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
                  <div className="rounded-xl bg-subtle p-3">
                    <dt className="font-medium">Open with</dt>
                    <dd className="text-fg/90">“{p.opener}”</dd>
                  </div>
                )}
                {p.notes && (
                  <div>
                    <dt className="font-medium">Notes</dt>
                    <dd className="whitespace-pre-line text-fg/80">{p.notes}</dd>
                  </div>
                )}
              </dl>

              {/* Phones: the script sits above the outcome buttons, where it's needed during the call. */}
              <details className="mt-5 rounded-xl bg-subtle p-3 lg:hidden">
                <summary className="cursor-pointer text-sm font-medium">Script: {hookFor(p.kind).name}</summary>
                {script}
              </details>

              {history.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="text-sm font-medium">Last touches</p>
                  <ul className="mt-2 space-y-1 text-sm text-fg/80">
                    {history.map((t) => (
                      <li key={t.id}>
                        <span className="text-muted">{timeAgo(t.occurredAt)}:</span> {outcomeLabel(t.outcome)}
                        {t.objection && ` · ${objectionLabel(t.objection)}`}
                        {t.note && ` · ${t.note}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Card>
              <TouchForm action={logTouchAndNextAction.bind(null, p.id, { skip, kind })} channels={["call", "whatsapp", "visit", "email", "linkedin"]} />
              <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-sm">
                <Link href={skipHref(p.id)} className="text-muted underline-offset-4 hover:text-fg hover:underline">
                  Skip for now →
                </Link>
                <Link href={`/hq/outreach/${p.id}`} className="text-muted underline-offset-4 hover:text-fg hover:underline">
                  Open details
                </Link>
              </div>
            </Card>
            <p className="text-center text-sm text-muted">{remaining - 1 > 0 ? `${remaining - 1} more due after this one` : "Last one due right now"}</p>
          </div>

          <aside className="space-y-5">
            <Card className="hidden lg:block">
              <h2 className="text-base font-semibold">Script: {hookFor(p.kind).name}</h2>
              {script}
            </Card>
            <Card>
              <h2 className="text-base font-semibold">If they say…</h2>
              <div className="mt-2 divide-y divide-line">
                {OBJECTIONS.filter((o) => o.id !== "other").map((o) => (
                  <details key={o.id} className="group py-2 text-sm">
                    <summary className="cursor-pointer list-none font-medium marker:hidden">{o.label}</summary>
                    <p className="mt-1.5 text-fg/80">{o.reply}</p>
                  </details>
                ))}
              </div>
            </Card>
            <ButtonLink href="/hq/outreach" variant="ghost" className="w-full">
              Done for now
            </ButtonLink>
          </aside>
        </div>
      )}
    </div>
  );
}
