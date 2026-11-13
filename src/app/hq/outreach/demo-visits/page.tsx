import Link from "next/link";
import { StatTile } from "@/components/hq";
import { Card, CardTitle, Chip, EmptyState, PageHeader, cx } from "@/components/ui";
import { getDb } from "@/db";
import { prospectStatusLabel } from "@/knowledge/outreach";
import { requireStaffActor } from "@/lib/session";
import { demoUnlockLink, demoVisitStats, listDemoVisits, type VisitFilter } from "@/server/demo-visits";
import { VisitDetails, duration } from "../demo-visit-ui";

export const metadata = { title: "Demo visits" };

const FILTERS: { id: VisitFilter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "prospects", label: "Your prospects" },
  { id: "anonymous", label: "Anonymous" },
];

// Who tried the live demo (amfire.in/demo and the demo on the Services page), newest
// first. Prospects who used their personal link are named, with a way to call them;
// everyone else is shown by city, device and where they came from.

export default async function DemoVisitsPage({ searchParams }: PageProps<"/hq/outreach/demo-visits">) {
  const actor = await requireStaffActor();
  const db = await getDb();
  const params = await searchParams;
  const who = FILTERS.find((f) => f.id === params.who)?.id ?? "all";
  const [rows, stats] = await Promise.all([listDemoVisits(db, actor, { who, limit: 150 }), demoVisitStats(db, actor, { days: 7 })]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/hq/outreach" className="hover:underline">
            ← Outreach
          </Link>
        }
        title="Demo visits"
        description="Everyone who tried the live demo. Send each prospect their personal link from their page here, so you know it was them. Call while it's fresh: the first visit puts them at the top of your list and emails you."
      />

      <Card>
        <CardTitle>Unlock link for WhatsApp replies</CardTitle>
        <div className="space-y-2 text-sm">
          <p className="text-muted">
            Visitors you don&rsquo;t know see 2 of 14 modules. When one messages you on WhatsApp to unlock it, reply with this link. It opens the full demo in their browser and keeps it open.
          </p>
          <code className="block rounded bg-subtle px-2 py-1.5 text-xs break-all select-all">{demoUnlockLink()}</code>
          <p className="text-xs text-muted">
            Suggested reply: &ldquo;Thanks! Here&rsquo;s your full demo: {demoUnlockLink()}. Happy to walk you through it on a call too.&rdquo; Save it as a WhatsApp quick reply. If the link ever spreads, set a new DEMO_UNLOCK_CODE in Vercel and this changes.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Visits, last 7 days">{stats.visits}</StatTile>
        <StatTile label="From your prospects" hint={`${stats.prospects} ${stats.prospects === 1 ? "company" : "companies"}`}>
          {stats.known}
        </StatTile>
        <StatTile label="Really engaged" hint="a minute or more, or did something" tone={stats.engaged ? "good" : undefined}>
          {stats.engaged}
        </StatTile>
        <StatTile label="Average time">{duration(stats.avgSeconds)}</StatTile>
      </div>

      <Card>
        <CardTitle
          aside={
            <nav className="flex gap-1 text-sm" aria-label="Filter visits">
              {FILTERS.map((f) => (
                <Link
                  key={f.id}
                  href={f.id === "all" ? "/hq/outreach/demo-visits" : `/hq/outreach/demo-visits?who=${f.id}`}
                  aria-current={who === f.id ? "page" : undefined}
                  className={cx("rounded-full px-3 py-1", who === f.id ? "bg-fg text-page" : "text-muted hover:bg-subtle hover:text-fg")}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          }
        >
          Visits
        </CardTitle>

        {rows.length === 0 ? (
          <EmptyState title="No visits yet">
            Open a prospect in Outreach, copy their personal demo link, and send it. Visits from the Services page appear here too.
          </EmptyState>
        ) : (
          <ol className="divide-y divide-line">
            {rows.map(({ visit: v, prospect: p }) => (
              <li key={v.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-6">
                <div className="min-w-0">
                  {p ? (
                    <>
                      <Link href={`/hq/outreach/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-sm text-muted">{[p.contactName, p.phone].filter(Boolean).join(" · ") || "No contact saved"}</p>
                      <p className="mt-1 flex flex-wrap gap-1">
                        <Chip>{prospectStatusLabel(p.status)}</Chip>
                        {p.demoVisits > 1 && <Chip className="!bg-[#eff8ff] !text-[#175cd3]">{p.demoVisits} visits</Chip>}
                      </p>
                      {p.phone && (
                        <a href={`tel:${p.phone}`} className="mt-2 inline-block text-sm font-medium text-success underline-offset-4 hover:underline">
                          Call {p.phone}
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Anonymous visitor</p>
                      <p className="text-sm text-muted">{[v.city, v.country].filter(Boolean).join(", ") || "Location unknown"}</p>
                      <p className="text-xs text-muted">{v.page === "services" ? "On the Services page" : "On amfire.in/demo"}</p>
                    </>
                  )}
                </div>
                <VisitDetails v={v} />
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
