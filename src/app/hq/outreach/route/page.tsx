import Link from "next/link";
import { PrintButton } from "@/components/print-button";
import { Card, Chip, EmptyState, PageHeader, cx } from "@/components/ui";
import { getDb } from "@/db";
import { BELTS, type BeltId } from "@/knowledge/engine";
import { CHANNEL_LABELS } from "@/knowledge/outreach";
import { requireStaffActor } from "@/lib/session";
import { getVisitRoute, VISITS_PER_DAY } from "@/server/engine";

export const metadata = { title: "Visit route" };

const one = (v: string | string[] | undefined) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 40) : undefined);

/** Google Maps searches by name, since most plants only have an area centre so far. */
const placeQuery = (p: { name: string; area: string | null; city: string }) => `${p.name}, ${p.area ?? ""}, ${p.city}`;
const mapsSearch = (p: { name: string; area: string | null; city: string; mapsUrl: string | null }) =>
  p.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery(p))}`;

/** The day as one Google Maps route (the link format takes at most 9 stops between start and end). */
function mapsRoute(start: string, stops: { name: string; area: string | null; city: string }[]) {
  const picked = stops.slice(0, 10);
  if (picked.length === 0) return null;
  const q = new URLSearchParams({ api: "1", origin: `${start}, Pune`, destination: placeQuery(picked[picked.length - 1]), travelmode: "driving" });
  if (picked.length > 1) q.set("waypoints", picked.slice(0, -1).map(placeQuery).join("|"));
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

export default async function VisitRoutePage({ searchParams }: PageProps<"/hq/outreach/route">) {
  const actor = await requireStaffActor();
  const db = await getDb();
  const params = await searchParams;
  const belt = (BELTS.find((b) => b.id === one(params.belt))?.id ?? "chakan") as BeltId;
  const max = Math.min(Math.max(Number(one(params.max) ?? VISITS_PER_DAY) || VISITS_PER_DAY, 1), 40);
  const route = await getVisitRoute(db, actor, { belt, max });
  const directions = mapsRoute(route.belt.label.split(" ")[0], route.stops.map((s) => s.prospect));
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" });

  return (
    <div className="space-y-6">
      <style>{`@media print { @page { size: A4; margin: 12mm } html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="print:hidden">
        <PageHeader
          eyebrow={
            <Link href="/hq/outreach" className="hover:underline">
              ← Outreach
            </Link>
          }
          title="Visit route"
          description="One industrial belt per day out. Plants whose play says “visit” today come first, then the strongest; the order is the nearest plant next. Print it and write the outcome on the line under each stop."
          actions={<PrintButton label="Print the route" />}
        />
        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Belts">
          {BELTS.map((b) => (
            <Link
              key={b.id}
              href={`/hq/outreach/route?belt=${b.id}`}
              className={cx("rounded-full border px-3 py-1 text-sm", b.id === belt ? "border-ink bg-ink text-white" : "border-line hover:border-ink")}
              aria-current={b.id === belt ? "page" : undefined}
            >
              {b.label} · {route.counts[b.id]}
            </Link>
          ))}
          {route.elsewhere > 0 && <span className="px-2 py-1 text-sm text-muted">{route.elsewhere} elsewhere (no belt yet)</span>}
        </nav>
      </div>

      <header className="hidden print:block">
        <h1 className="text-xl font-semibold">
          {route.belt.label}: plant visits
        </h1>
        <p className="text-sm">{today}</p>
      </header>

      <p className="text-sm text-muted print:text-black">
        {route.stops.length} of {route.inBelt} plants in {route.belt.label}, about {route.totalKm} km between stops (straight line, from {route.belt.label.split(" ")[0]}).
        {route.left > 0 && ` ${route.left} more for another day.`}
        {directions && (
          <>
            {" "}
            <a href={directions} target="_blank" rel="noreferrer" className="underline underline-offset-4 print:hidden">
              Open the first {Math.min(route.stops.length, 10)} in Google Maps
            </a>
          </>
        )}
      </p>

      {route.stops.length === 0 ? (
        <EmptyState title={`No active plants in ${route.belt.label} yet`}>Add manufacturers with an area in this belt, and they appear here.</EmptyState>
      ) : (
        <ol className="space-y-3">
          {route.stops.map((s, i) => {
            const p = s.prospect;
            return (
              <li key={p.id} className="break-inside-avoid">
                <Card className="print:border-black print:p-3 print:shadow-none">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base font-semibold">
                      <span className="mr-2 text-muted print:text-black">{i + 1}.</span>
                      <Link href={`/hq/outreach/${p.id}`} className="underline-offset-4 hover:underline">
                        {p.name}
                      </Link>
                    </h2>
                    <div className="flex flex-wrap items-center gap-1 text-sm">
                      {s.visitDue && <Chip className="!bg-[#fff4e5] !text-[#93370d]">Visit due</Chip>}
                      <span className="text-muted print:text-black">
                        {p.area}
                        {s.approximate ? " (area centre)" : ""} · {i === 0 ? `${s.legKm} km from start` : `${s.legKm} km from the last stop`}
                      </span>
                    </div>
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
                    <dt className="text-muted print:text-black">Ask for</dt>
                    <dd>
                      {s.decider ? `${s.decider.name}${s.decider.title ? `, ${s.decider.title}` : ""}` : (p.contactName ?? "The managing director")}
                    </dd>
                    {(p.phone || s.decider?.phone) && (
                      <>
                        <dt className="text-muted print:text-black">Phone</dt>
                        <dd>
                          <a href={`tel:${(s.decider?.phone ?? p.phone)!.replace(/[^\d+]/g, "")}`} className="underline-offset-4 hover:underline">
                            {s.decider?.phone ?? p.phone}
                          </a>
                        </dd>
                      </>
                    )}
                    {s.next && (
                      <>
                        <dt className="text-muted print:text-black">Next step</dt>
                        <dd>
                          {CHANNEL_LABELS[s.next.channel]}: {s.next.goal}
                          {s.next.channel === "visit" && <p className="mt-1 text-muted print:text-black">{s.next.message}</p>}
                        </dd>
                      </>
                    )}
                    {p.brief && (
                      <>
                        <dt className="text-muted print:text-black">Note</dt>
                        <dd>{p.brief}</dd>
                      </>
                    )}
                    {p.notes && (
                      <>
                        <dt className="text-muted print:text-black">On file</dt>
                        <dd>{p.notes}</dd>
                      </>
                    )}
                    <dt className="text-muted print:text-black">Find it</dt>
                    <dd>
                      <a href={mapsSearch(p)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                        Google Maps
                      </a>
                    </dd>
                  </dl>
                  <div className="mt-3 hidden border-t border-dashed border-black pt-6 text-xs print:block">Outcome, who I met, next step</div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
