"use client";

import { useState } from "react";
import { CARE_TREND, ENGINEERS, OFFICES, SITES, UPTIME_DAYS, clientById, officeById, siteById, uptimeRow, type GpsStatus, type OfficeId, type SiteStatus, type Ticket, type Tone, type WOCol } from "./data";
import { TileMap, type Pin } from "./map";
import { clientName, inr, money, useOps } from "./store";
import { Avatar, Badge, Bar, Btn, Dot, Heat, Illustrative, Impact, MetricStrip, Panel, SERIES, Seg, Table, Tabs, Td, Th, ViewHead, cx } from "./ui";
import { PersonChip } from "./views-home";

export const SITE_POS: Record<string, [number, number]> = {
  s1: [18.5945, 73.7305], s2: [18.5603, 73.7861], s3: [19.033, 73.0297], s4: [18.9537, 72.8415], s5: [28.6139, 77.2295], s6: [19.2052, 72.9752], s7: [12.9784, 77.7408],
  s8: [17.4239, 78.4738], s9: [13.0418, 80.2341], s10: [12.9352, 77.6245], s11: [22.5867, 88.4021], s12: [25.0805, 55.1403], s13: [21.1098, 79.0711], s14: [17.4325, 78.4483],
};
const GPS_TONE: Record<GpsStatus, { tone: Tone; color: string }> = {
  "On site": { tone: "good", color: "#16a34a" },
  "En route": { tone: "info", color: "#5b47e0" },
  "At office": { tone: "muted", color: "#6b6f76" },
  "GPS off": { tone: "bad", color: "#ea580c" },
};
export const SITE_TONE: Record<SiteStatus, Tone> = { "Quote sent": "info", "PO received": "info", "Install scheduled": "warn", Live: "good", "Ending soon": "warn", Returning: "warn", Closed: "muted" };

// ---------------------------------------------------------------- Live map

export function LiveMap() {
  const { s, d } = useOps();
  const start: OfficeId = s.scope !== "all" && ENGINEERS.some((e) => e.office === s.scope) ? s.scope : "pun";
  const [city, setCity] = useState<OfficeId>(start);
  const [sel, setSel] = useState<string | null>("e1");
  const office = officeById(city);
  const eng = ENGINEERS.filter((e) => e.office === city);
  const sites = SITES.filter((x) => x.office === city && SITE_POS[x.id]);
  const pins: Pin[] = [
    { id: `o-${city}`, lat: office.lat, lon: office.lon, kind: "office", label: office.name, sub: `boundary ${s.radius[city]} m`, ring: s.radius[city] },
    ...sites.map((x) => ({ id: x.id, lat: SITE_POS[x.id][0], lon: SITE_POS[x.id][1], kind: "site" as const, label: x.name, sub: `${x.cameras} cameras · ${x.status}`, ring: 150, ringColor: "#eb6834", color: "#eb6834" })),
    ...eng.map((e) => ({ id: e.id, lat: e.path[0][0], lon: e.path[0][1], kind: "engineer" as const, label: e.name, sub: e.status, color: GPS_TONE[e.status].color, path: e.status === "En route" ? e.path : undefined })),
  ];
  const picked = ENGINEERS.find((e) => e.id === sel && e.office === city);
  const cities: OfficeId[] = ["pun", "mum", "hyd", "del"];
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="Live map"
        agent="GPS from 24 engineer phones"
        line="Where every engineer is right now, which site they're at and what job they're on, with each office's and site's GPS boundary drawn to scale. Location is tracked only in working hours, with each person's consent."
        right={<Seg value={city} onChange={(v) => { setCity(v); setSel(null); }} options={cities.map((c) => ({ id: c, label: officeById(c).short }))} />}
      />
      <MetricStrip
        cols={5}
        items={[
          { label: "On site", value: ENGINEERS.filter((e) => e.status === "On site").length, tone: "good" },
          { label: "En route", value: ENGINEERS.filter((e) => e.status === "En route").length, tone: "info" },
          { label: "At office", value: ENGINEERS.filter((e) => e.status === "At office").length },
          { label: "GPS off in work hours", value: ENGINEERS.filter((e) => e.status === "GPS off").length, tone: "bad", foot: "manager told after 30 min" },
          { label: "Distance today", value: `${ENGINEERS.reduce((t, e) => t + e.kmToday, 0).toFixed(0)} km`, foot: "claims checked against it" },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel flush className="overflow-hidden p-1.5">
          <TileMap
            key={city}
            center={[office.lat + (city === "pun" ? -0.012 : city === "mum" ? -0.06 : city === "del" ? 0.03 : 0.04), office.lon + (city === "pun" ? 0.02 : city === "mum" ? 0.05 : city === "del" ? -0.08 : -0.04)]}
            zoom={city === "pun" ? 13 : 11}
            height={520}
            pins={pins}
            active={sel}
            onPin={(id) => setSel(id)}
            overlay={
              picked ? (
                <div className="absolute bottom-3 left-3 z-30 w-[290px] rounded-xl bg-white/95 p-3.5 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5 backdrop-blur">
                  <div className="flex items-start justify-between gap-2">
                    <PersonChip name={picked.name} sub={`${officeById(picked.office).short} · field engineer`} />
                    <Badge tone={GPS_TONE[picked.status].tone}>{picked.status}</Badge>
                  </div>
                  <p className="mt-2.5 text-[12.5px] leading-snug">{picked.job}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11.5px] text-[#6b6f76]">
                    <span>
                      Battery <b className="block text-[13px] font-semibold text-[#111113]">{picked.battery}%</b>
                    </span>
                    <span>
                      Last ping <b className="block text-[13px] font-semibold text-[#111113]">{picked.ping}</b>
                    </span>
                    <span>
                      Today <b className="block text-[13px] font-semibold text-[#111113]">{picked.kmToday} km</b>
                    </span>
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    <Btn size="xs" kind="secondary">Call</Btn>
                    <Btn size="xs" kind="secondary">WhatsApp</Btn>
                    <Btn size="xs" onClick={() => d({ t: "view", view: "workorders" })}>Work order</Btn>
                  </div>
                </div>
              ) : null
            }
          />
        </Panel>
        <Panel flush title={`${office.short} team`} sub={`${eng.length} engineers with GPS · tap to find`}>
          <div className="flex flex-col">
            {eng.map((e) => (
              <button key={e.id} type="button" onClick={() => setSel(e.id)} className={cx("flex items-center justify-between gap-2 border-t border-[#f2f2ef] px-4 py-3 text-left transition sm:px-5", sel === e.id ? "bg-[#f5f3fe]" : "hover:bg-[#fbfbfa]")}>
                <PersonChip name={e.name} sub={e.job} />
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={GPS_TONE[e.status].tone}>{e.status}</Badge>
                  <span className="text-[11px] text-[#8a8e95]">{e.ping}</span>
                </span>
              </button>
            ))}
            <div className="border-t border-[#f2f2ef] px-4 py-3 text-[12px] leading-snug text-[#6b6f76] sm:px-5">
              <p className="mb-1 font-medium text-[#111113]">Legend</p>
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                {(Object.keys(GPS_TONE) as GpsStatus[]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: GPS_TONE[k].color }} />
                    {k}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#eb6834]" />
                  Client site
                </span>
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sites

export function Sites() {
  const { s, d, m } = useOps();
  const [f, setF] = useState<"all" | "live" | "attention" | "ending">("all");
  const rows = s.sites
    .filter((x) => m.inScope(x.office))
    .filter((x) => (f === "all" ? true : f === "live" ? x.status === "Live" : f === "attention" ? x.health > 0 && x.health < 75 : x.status === "Ending soon" || x.poUsed >= 90));
  return (
    <div className="flex flex-col gap-4">
      <ViewHead title="Sites and projects" line="Every site from enquiry to redeploy: cameras, PO, money, visits, parts, tickets and profit on one page. Click a site to trace everything that ever happened there." right={<Illustrative />} />
      <MetricStrip
        cols={5}
        items={[
          { label: "Sites live", value: m.sitesLive, delta: { v: 6, unit: "", suffix: "this week" } },
          { label: "Average site health", value: "86 / 100", foot: "uptime, tickets, payments, visits" },
          { label: "Needs attention", value: s.sites.filter((x) => x.health > 0 && x.health < 75).length + 9, tone: "warn", foot: "health under 75" },
          { label: "POs ending in 90 days", value: 23, tone: "warn", foot: "11 likely to extend" },
          { label: "Average profit per site", value: "78%", foot: "after visits, parts, SIM, cloud" },
        ]}
      />
      <Panel flush right={<Seg value={f} onChange={setF} options={[{ id: "all", label: "All" }, { id: "live", label: "Live" }, { id: "attention", label: "Needs attention" }, { id: "ending", label: "PO ending" }]} />} title={`${rows.length} sites`} sub="A sample of the 512 live sites.">
        <Table min={1040}>
          <thead>
            <tr>
              <Th>Site</Th>
              <Th>Office</Th>
              <Th>Status</Th>
              <Th className="text-right">Cameras</Th>
              <Th>Health</Th>
              <Th className="text-right">Revenue a month</Th>
              <Th className="text-right">Cost to serve</Th>
              <Th className="text-right">Profit</Th>
              <Th>PO used</Th>
              <Th className="text-right">Owed</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const owed = s.invoices.filter((i) => i.site === x.id && ["Sent", "Overdue", "Awaiting sign-off"].includes(i.status)).reduce((t, i) => t + i.amount, 0);
              const late = s.invoices.some((i) => i.site === x.id && i.status === "Overdue");
              const margin = x.monthly ? Math.round(((x.monthly - x.costToServe) / x.monthly) * 100) : null;
              return (
                <tr key={x.id} className="cursor-pointer hover:bg-[#fbfbfa]" onClick={() => d({ t: "drawer", d: { kind: "site", id: x.id } })}>
                  <Td>
                    <span className="font-medium text-[#111113]">{x.name}</span>
                    <span className="block text-[11px] text-[#8a8e95]">{clientById(x.client).name}</span>
                  </Td>
                  <Td>{officeById(x.office).short}</Td>
                  <Td>
                    <Badge tone={SITE_TONE[x.status]}>{x.status}</Badge>
                  </Td>
                  <Td className="text-right">{x.cameras}</Td>
                  <Td>
                    {x.health ? (
                      <span className="inline-flex w-24 items-center gap-2">
                        <Bar value={x.health} tone={x.health >= 85 ? "good" : x.health >= 75 ? "warn" : "bad"} h={5} />
                        {x.health}
                      </span>
                    ) : (
                      <span className="text-[#9a9ea5]">—</span>
                    )}
                  </Td>
                  <Td className="text-right">{x.monthly ? money(x.monthly) : "—"}</Td>
                  <Td className="text-right text-[#6b6f76]">{x.costToServe ? money(x.costToServe) : "—"}</Td>
                  <Td className={cx("text-right font-medium", margin !== null && margin < 75 && "text-[#a16207]")}>{margin !== null ? `${margin}%` : "—"}</Td>
                  <Td>
                    {x.poUsed ? (
                      <span className="inline-flex w-24 items-center gap-2">
                        <Bar value={x.poUsed} tone={x.poUsed >= 90 ? "bad" : "brand"} h={5} />
                        {x.poUsed}%
                      </span>
                    ) : (
                      <span className="text-[#9a9ea5]">—</span>
                    )}
                  </Td>
                  <Td className={cx("text-right", late && "font-medium text-[#c2410c]")}>{owed ? money(owed) : "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-[#8a8e95] uppercase">{children}</p>;
}

export function SiteDrawer({ id }: { id: string }) {
  const { s, d } = useOps();
  const x = s.sites.find((y) => y.id === id)!;
  const inv = s.invoices.filter((i) => i.site === id);
  const cams = s.cameras.filter((c) => c.site === id);
  const wos = s.orders.filter((o) => o.site === id);
  const tks = s.tickets.filter((t) => t.site === id);
  const margin = x.monthly ? Math.round(((x.monthly - x.costToServe) / x.monthly) * 100) : 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={SITE_TONE[x.status]}>{x.status}</Badge>
        {x.services.map((v) => (
          <Badge key={v}>{v}</Badge>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[#ececE8] bg-[#ececE8] text-center">
        {[
          ["Revenue/mo", x.monthly ? money(x.monthly) : "—"],
          ["Cost/mo", x.costToServe ? money(x.costToServe) : "—"],
          ["Profit", x.monthly ? `${margin}%` : "—"],
          ["Health", x.health || "—"],
        ].map(([k, v]) => (
          <div key={k as string} className="bg-white px-2 py-2.5">
            <p className="text-[10.5px] text-[#8a8e95]">{k}</p>
            <p className="text-[14px] font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[12.5px]">
        {[
          ["Client", clientById(x.client).name],
          ["Office", officeById(x.office).name],
          ["PO", x.po],
          ["PO ends", x.poEnds],
          ["PO used", `${x.poUsed}%`],
          ["Site lead", x.lead],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-[#8a8e95]">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {x.status === "Returning" && (
        <div className="rounded-xl border border-[#f3dfa6] bg-[#fdf9ee] p-3.5">
          <p className="text-[13px] font-semibold">Cameras coming back</p>
          <p className="mt-1 text-[12.5px] leading-snug text-[#6b6f76]">On check-in, 40% of the camera cost (₹96,000) goes back to the client as a buy-back. Billing stops the same moment and the cameras go to refurbishing.</p>
          <Btn size="sm" className="mt-2.5" onClick={() => d({ t: "check-in-return", site: x.id })}>
            Check in both cameras
          </Btn>
        </div>
      )}
      <div>
        <H>Money</H>
        {inv.length ? (
          inv.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-2 border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
              <span>
                <span className="text-[11.5px] text-[#8a8e95]">{i.id}</span> {i.kind}
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                {i.kind === "Buy-back refund" ? "−" : ""}
                {money(i.amount)}
                <Badge tone={i.status === "Paid" || i.status === "Refunded" ? "good" : i.status === "Overdue" ? "bad" : i.status === "Draft" ? "muted" : "warn"}>{i.status}</Badge>
              </span>
            </div>
          ))
        ) : (
          <p className="text-[12.5px] text-[#6b6f76]">No invoices yet.</p>
        )}
      </div>
      {cams.length > 0 && (
        <div>
          <H>Cameras</H>
          {cams.map((c) => (
            <div key={c.serial} className="flex items-center justify-between border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
              <span>
                <span className="font-medium">{c.serial}</span> <span className="text-[#8a8e95]">{c.model}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[11.5px] text-[#8a8e95] tabular-nums">{c.uptime ? `${c.uptime}%` : ""}</span>
                <Badge tone={c.status === "Live" ? "good" : c.status === "Offline" ? "bad" : "warn"}>{c.status}</Badge>
              </span>
            </div>
          ))}
        </div>
      )}
      {(wos.length > 0 || tks.length > 0) && (
        <div>
          <H>Visits and tickets</H>
          {wos.map((o) => (
            <p key={o.id} className="flex justify-between border-b border-[#f2f2ef] py-2 text-[12.5px]">
              <span>
                {o.id} · {o.type} · {o.who}
              </span>
              <Badge tone={o.col === "Done" ? "good" : o.late ? "bad" : "info"}>{o.col}</Badge>
            </p>
          ))}
          {tks.map((t) => (
            <button key={t.id} type="button" onClick={() => d({ t: "drawer", d: { kind: "ticket", id: t.id } })} className="flex w-full justify-between border-b border-[#f2f2ef] py-2 text-left text-[12.5px] hover:bg-[#fbfbfa]">
              <span className="truncate pr-2">
                {t.id} · {t.subject}
              </span>
              <Badge tone={t.status === "Resolved" ? "good" : "warn"}>{t.status}</Badge>
            </button>
          ))}
        </div>
      )}
      <div>
        <H>Everything that happened</H>
        <ol className="relative flex flex-col gap-3 border-l border-[#e4e4df] pl-4">
          {x.timeline.map((e, i) => (
            <li key={i} className="relative text-[12.5px]">
              <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-white bg-[#5b47e0]" />
              <span className="text-[11px] text-[#8a8e95] tabular-nums">{e.when}</span>
              <p className="leading-snug">{e.text}</p>
              <p className="text-[11px] text-[#8a8e95]">{e.who}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Customer care

const PRI_TONE = { P1: "bad", P2: "warn", P3: "muted" } as const;
function slaText(t: Ticket) {
  if (t.status === "Resolved") return { text: "met", tone: "good" as Tone };
  if (t.slaLeft < 0) return { text: `missed by ${Math.abs(t.slaLeft) >= 60 ? `${Math.round(Math.abs(t.slaLeft) / 60)} h` : `${Math.abs(t.slaLeft)} min`}`, tone: "bad" as Tone };
  if (t.slaLeft < 120) return { text: `${t.slaLeft} min left`, tone: "warn" as Tone };
  return { text: `${Math.round(t.slaLeft / 60)} h left`, tone: "muted" as Tone };
}

export function Care() {
  const { s, d, m } = useOps();
  const [tab, setTab] = useState<"open" | "waiting" | "resolved" | "all">("open");
  const rows = s.tickets.filter((t) => m.inScope(siteById(t.site).office)).filter((t) => (tab === "all" ? true : tab === "open" ? ["New", "Assigned", "In progress"].includes(t.status) : tab === "waiting" ? t.status === "Waiting on client" : t.status === "Resolved"));
  const n = (k: typeof tab) => s.tickets.filter((t) => (k === "all" ? true : k === "open" ? ["New", "Assigned", "In progress"].includes(t.status) : k === "waiting" ? t.status === "Waiting on client" : t.status === "Resolved")).length;
  const maxW = Math.max(...CARE_TREND.flatMap((w) => [w.opened, w.solved]));
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="Customer care"
        agent="Care agent · 64% answered alone"
        line="Every complaint and request from WhatsApp, email, phone, your client app and vendor portals becomes a ticket with a response promise. The agent answers what it can from your records in seconds, opens work orders for the rest, and chases the promise until it's kept."
      />
      <MetricStrip
        cols={6}
        items={[
          { label: "Open tickets", value: m.openTickets.length + 23, foot: "across 512 sites" },
          { label: "Promise missed", value: m.breached.length, tone: m.breached.length ? "bad" : "good", foot: "response or fix" },
          { label: "First reply", value: "2 min", delta: { v: -94, good: false, unit: "%", suffix: "vs email era" } },
          { label: "Fixed same day", value: "71%", delta: { v: 8 } },
          { label: "Client rating", value: "4.6 / 5", foot: "after every ticket" },
          { label: "Answered by agent", value: "64%", foot: "status, reports, access" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Opened vs solved, by week" sub="Last 7 weeks">
          <div className="flex h-[120px] items-end gap-2">
            {CARE_TREND.map((w) => (
              <div key={w.wk} className="flex flex-1 flex-col items-center gap-1" title={`${w.wk}: ${w.opened} opened, ${w.solved} solved`}>
                <div className="flex h-[96px] w-full items-end justify-center gap-[2px]">
                  <span className="w-1/3 rounded-t-[3px]" style={{ height: `${(w.opened / maxW) * 100}%`, background: SERIES[1] }} />
                  <span className="w-1/3 rounded-t-[3px]" style={{ height: `${(w.solved / maxW) * 100}%`, background: SERIES[2] }} />
                </div>
                <span className="text-[10.5px] text-[#9a9ea5]">{w.wk}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 flex gap-4 text-[11.5px] text-[#6b6f76]">
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: SERIES[1] }} />Opened</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: SERIES[2] }} />Solved</span>
          </p>
        </Panel>
        <Panel title="Where tickets come from" sub="Last 30 days">
          {[["WhatsApp", 46], ["Email", 28], ["Phone", 12], ["Client app", 10], ["Vendor portal", 4]].map(([k, v]) => (
            <div key={k as string} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 py-1.5 text-[12px]">
              <span>{k as string}</span>
              <Bar value={((v as number) / 46) * 100} h={6} />
              <span className="text-right tabular-nums">{v as number}%</span>
            </div>
          ))}
        </Panel>
        <Panel title="Complaints that point to a cause" sub="Patterns the care agent found">
          <div className="flex flex-col gap-2.5 text-[12.5px]">
            <p className="flex gap-2"><Dot tone="warn" /><span><b className="font-semibold">Mumbai solar cameras</b>: 9 offline tickets in 30 days, all battery. Battery checks booked for June.</span></p>
            <p className="flex gap-2"><Dot tone="warn" /><span><b className="font-semibold">Northgate Metro EPC</b>: 3 tickets on SIM data. Plan moved to a bigger data pack.</span></p>
            <p className="flex gap-2"><Dot tone="info" /><span><b className="font-semibold">Time-lapse requests</b> spike before launches. Self-serve time-lapse in the client app would remove 22 tickets a month.</span></p>
          </div>
        </Panel>
      </div>
      <Panel flush>
        <div className="px-4 pt-3 sm:px-5">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "open", label: "Open", n: n("open") }, { id: "waiting", label: "Waiting on client", n: n("waiting") }, { id: "resolved", label: "Resolved", n: n("resolved") }, { id: "all", label: "All", n: n("all") }]} />
        </div>
        <Table min={1000}>
          <thead>
            <tr>
              <Th>Ticket</Th>
              <Th>Client · site</Th>
              <Th>Category</Th>
              <Th>Channel</Th>
              <Th>Priority</Th>
              <Th>Promise</Th>
              <Th>Owner</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const sla = slaText(t);
              return (
                <tr key={t.id} className="cursor-pointer hover:bg-[#fbfbfa]" onClick={() => d({ t: "drawer", d: { kind: "ticket", id: t.id } })}>
                  <Td className="max-w-[300px]">
                    <span className="text-[11px] text-[#8a8e95]">{t.id} · {t.opened}</span>
                    <span className="block truncate font-medium text-[#111113]">{t.subject}</span>
                  </Td>
                  <Td>
                    {clientName(t.client)}
                    <span className="block text-[11px] text-[#8a8e95]">{siteById(t.site).name}</span>
                  </Td>
                  <Td>{t.cat}</Td>
                  <Td>{t.channel}</Td>
                  <Td><Badge tone={PRI_TONE[t.pri]}>{t.pri}</Badge></Td>
                  <Td><Badge tone={sla.tone}>{sla.text}</Badge></Td>
                  <Td>{t.owner}</Td>
                  <Td>
                    {t.status}
                    {t.csat ? <span className="block text-[11px] text-[#15803d]">rated {t.csat}/5</span> : t.draft ? <span className="block text-[11px] text-[#5b47e0]">reply drafted</span> : null}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
      <Impact items={[{ label: "First reply", before: "next morning", now: "2 minutes" }, { label: "Complaint → work order", before: "a phone call", now: "automatic" }, { label: "Promises tracked", before: "none", now: "every ticket" }, { label: "Client rating", before: "not asked", now: "after every ticket" }]} />
    </div>
  );
}

export function TicketDrawer({ id }: { id: string }) {
  const { s, d } = useOps();
  const t = s.tickets.find((x) => x.id === id)!;
  const sla = slaText(t);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={PRI_TONE[t.pri]}>{t.pri}</Badge>
        <Badge>{t.cat}</Badge>
        <Badge>{t.channel}</Badge>
        <Badge tone={sla.tone}>Promise: {sla.text}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        {[["Client", clientName(t.client)], ["Site", siteById(t.site).name], ["Owner", t.owner], ["Linked", t.link ?? "—"]].map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-[#8a8e95]">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2.5 rounded-xl bg-[#f7f7f5] p-3">
        {t.thread.map((m, i) => (
          <div key={i} className={cx("max-w-[88%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug", m.side === "client" ? "self-start rounded-bl-md bg-white ring-1 ring-[#ececE8]" : m.side === "agent" ? "self-end rounded-br-md bg-[#f0eefd] text-[#2f2580]" : "self-end rounded-br-md bg-[#111113] text-white")}>
            <p className={cx("mb-0.5 text-[10.5px] font-medium", m.side === "us" ? "text-[#b4b4ba]" : "text-[#8a8e95]")}>
              {m.who} · {m.time}
            </p>
            {m.text}
          </div>
        ))}
      </div>
      {t.draft && (
        <div className="rounded-xl border border-[#d9d3fb] p-3.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-[#5b47e0]">
            <Dot tone="brand" /> Reply drafted by the care agent, from your records
          </p>
          <p className="text-[13px] leading-snug">{t.draft}</p>
          <div className="mt-3 flex gap-2">
            <Btn size="sm" onClick={() => d({ t: "ticket-send", id: t.id })}>Send on {t.channel}</Btn>
            <Btn size="sm" kind="secondary">Edit</Btn>
          </div>
        </div>
      )}
      {t.status === "Resolved" && <p className="rounded-xl bg-[#ebf7ef] p-3 text-[12.5px] text-[#15803d]">Resolved{t.csat ? ` · client rated ${t.csat}/5` : ""}.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Work orders

const COLS: WOCol[] = ["Scheduled", "En route", "On site", "Blocked", "Done"];
const NEXT: Record<WOCol, WOCol | null> = { Scheduled: "En route", "En route": "On site", "On site": "Done", Blocked: "Scheduled", Done: null };

export function WorkOrders() {
  const { s, d, m } = useOps();
  const list = s.orders.filter((o) => m.inScope(siteById(o.site).office));
  const late = list.filter((o) => o.late && o.col !== "Done");
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="Work orders"
        agent="Work-order agent · reminds and escalates"
        line="Every install, move, repair, 360° walk, drone flight and return is a card with an owner, a promise and the parts it needs. Late cards remind the engineer, then the city manager, then you, and pop up until someone acts."
      />
      <MetricStrip
        cols={6}
        items={[
          { label: "Jobs today", value: list.filter((o) => o.due.startsWith("Today")).length + 41, foot: "across 9 locations" },
          { label: "Late", value: late.length, tone: late.length ? "bad" : "good", foot: "each escalated" },
          { label: "On time, 30 days", value: "94%", delta: { v: 3 } },
          { label: "First-time fix", value: "83%", delta: { v: 4 }, foot: "industry ~75%" },
          { label: "Hours to fix", value: "6.2 h", delta: { v: -1.4, good: false, unit: " h" } },
          { label: "Jobs per engineer a day", value: "2.4", delta: { v: 0.3, unit: "" } },
        ]}
      />
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {COLS.map((c) => {
          const cards = list.filter((o) => o.col === c);
          return (
            <div key={c} className="flex w-[252px] shrink-0 flex-col gap-2 rounded-xl bg-[#f0f0ec] p-2">
              <p className="flex items-center justify-between px-1.5 pt-1 text-[12px] font-semibold text-[#3f434a]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: ["#b9b2f2", SERIES[0], "#1baf7a", "#ea580c", "#b4b7bd"][COLS.indexOf(c)] }} />
                  {c}
                </span>
                <span className="text-[#8a8e95] tabular-nums">{cards.length}</span>
              </p>
              {cards.map((o) => {
                const site = siteById(o.site);
                return (
                  <div key={o.id} className={cx("ov-in flex flex-col gap-2 rounded-lg bg-white p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1", o.late && o.col !== "Done" ? "ring-[#f6d3c3]" : "ring-[#ececE8]")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#8a8e95]">{o.id}</span>
                      <Badge tone={o.late && o.col !== "Done" ? "bad" : o.sla.startsWith("P1") ? "warn" : o.col === "Done" ? "good" : "muted"}>{o.late && o.col !== "Done" ? `${o.late} late` : o.sla}</Badge>
                    </div>
                    <p className="text-[13px] leading-tight font-semibold">{o.type}</p>
                    <button type="button" onClick={() => d({ t: "drawer", d: { kind: "site", id: o.site } })} className="text-left text-[12px] leading-snug text-[#4a4e55] hover:underline">
                      {site.name} · {site.city}
                    </button>
                    {o.parts && (
                      <div className="flex flex-wrap gap-1">
                        {o.parts.map((p) => (
                          <span key={p} className="rounded bg-[#f3f3f0] px-1.5 py-[1px] text-[10.5px] text-[#4a4e55]">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 border-t border-[#f2f2ef] pt-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] text-[#4a4e55]">
                        <Avatar name={o.who} size={20} />
                        <span className="truncate">{o.who}</span>
                      </span>
                      {o.type === "Install" && o.col === "On site" ? (
                        <Btn size="xs" kind="good" onClick={() => d({ t: "drawer", d: { kind: "install", id: o.id } })}>
                          Complete
                        </Btn>
                      ) : o.late && o.col !== "Done" ? (
                        <Btn size="xs" kind="secondary" onClick={() => d({ t: "reassign", wo: o.id, who: "Ravi Kumar" })}>
                          Reassign
                        </Btn>
                      ) : NEXT[o.col] ? (
                        <button type="button" onClick={() => d({ t: "wo-move", wo: o.id, col: NEXT[o.col]! })} className="rounded-md px-1.5 py-0.5 text-[11.5px] font-medium text-[#5b47e0] hover:bg-[#f0eefd]">
                          → {NEXT[o.col]}
                        </button>
                      ) : o.firstFix !== undefined ? (
                        <span className={cx("text-[11px]", o.firstFix ? "text-[#15803d]" : "text-[#a16207]")}>{o.firstFix ? "fixed first visit" : "needed 2nd visit"}</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="How a late job climbs" sub="WO-2289, dismantle at Arcadia Heights">
          <ol className="relative flex flex-col gap-3 border-l border-[#e4e4df] pl-5">
            {s.orders.find((o) => o.id === "WO-2289")!.reminders.map((r, i, a) => (
              <li key={i} className="relative text-[12.5px]">
                <span className={cx("absolute top-0.5 -left-[29px] grid size-[18px] place-items-center rounded-full text-[10px] font-semibold", i === a.length - 1 ? "bg-[#fdefe8] text-[#c2410c]" : "bg-[#f2f2ef] text-[#4a4e55]")}>{i + 1}</span>
                <span className="font-medium">{r.to}</span> <span className="text-[#8a8e95]">· {r.via} · {r.at}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="Parts used today" sub="Logged by engineers in the app, against the job">
          {[["Skyline Towers B", "2 pole mount clamps, 30 m Cat6, 2 junction boxes", "₹6,140"], ["Northgate Depot", "SIM top-up", "₹499"], ["Harbour Line Depot", "Lens cover", "₹480"]].map(([a, b, c]) => (
            <div key={a} className="flex items-start justify-between gap-3 border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
              <span>
                <span className="block font-medium">{a}</span>
                <span className="text-[#6b6f76]">{b}</span>
              </span>
              <span className="tabular-nums">{c}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

export function InstallDrawer({ id }: { id: string }) {
  const { s, d } = useOps();
  const o = s.orders.find((x) => x.id === id)!;
  const site = siteById(o.site);
  const cams = s.cameras.filter((c) => c.site === o.site);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12.5px] text-[#6b6f76]">
        {site.name}, {site.city} · {o.who} · {site.po}
      </p>
      <div className="flex flex-col gap-2">
        {[`Serials scanned: ${cams.map((c) => c.serial).join(", ")}`, "4 photos, geo-tagged inside the site boundary at 11:41", "Power checked, 4G signal strong", "First image received by the camera platform", "Parts logged: 2 clamps, 30 m Cat6, 2 junction boxes"].map((t) => (
          <p key={t} className="flex items-start gap-2.5 text-[12.5px]">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#16a34a] text-[9px] font-bold text-white">✓</span>
            {t}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="aspect-square rounded-lg" style={{ background: `linear-gradient(${140 + i * 30}deg,#d8d3c6,#8e8a80 60%,#5f5d58)` }} />
        ))}
      </div>
      <div className="rounded-xl bg-[#f7f7f5] p-3.5">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-[#8a8e95] uppercase">One tap does all of this</p>
        <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px]">
          <li>Site marked live, from this minute</li>
          <li>Balance invoice (50% on install, ₹{inr(120000 * site.cameras * 0.5)}) sent with a payment link</li>
          <li>Monthly billing starts today, per camera, against the PO</li>
          <li>Client told on WhatsApp, with the photos</li>
          <li>Stock, sites, billing and your command centre updated</li>
        </ul>
      </div>
      <Btn kind="good" className="h-11 text-[14px]" onClick={() => d({ t: "install", wo: id })}>
        Confirm installation complete
      </Btn>
    </div>
  );
}

// ---------------------------------------------------------------- Fleet and uptime

export function Fleet() {
  const { s, m } = useOps();
  const live = SITES.filter((x) => x.status === "Live" || x.status === "Ending soon");
  const color = (v: number) => (v >= 99.5 ? "#15803d" : v >= 98.5 ? "#4fb37a" : v >= 96 ? "#e2b23a" : v >= 90 ? "#ef8a4b" : "#d4471c");
  return (
    <div className="flex flex-col gap-4">
      <ViewHead title="Fleet and uptime" agent="Uptime agent · watching 1,184 cameras" line="Every camera's heartbeat, uploads, SIM data and solar battery, checked every five minutes. Remote fixes are tried first; a visit is booked only when needed, joined to a trip already planned." />
      <MetricStrip
        cols={6}
        items={[
          { label: "Cameras live", value: inr(m.live) },
          { label: "Offline now", value: m.offline, tone: "bad", foot: "3 fixes under way" },
          { label: "Uptime, 7 days", value: "99.1%", foot: "promise 98%" },
          { label: "Fixed remotely", value: "58%", delta: { v: 12 }, foot: "no trip needed" },
          { label: "SIMs ending in 7 days", value: 3, tone: "warn", foot: "renewals queued" },
          { label: "Failures predicted", value: 4, tone: "warn", foot: "next 30 days" },
        ]}
      />
      <Panel title="Daily uptime by site, last 14 days" sub="Hover a square for the day. Green is at or above the promise; orange is below." right={<Illustrative />}>
        <Heat
          label="Uptime heatmap"
          rows={live.map((x) => x.name)}
          cols={UPTIME_DAYS}
          cell={(r, c) => {
            const v = uptimeRow(SITES.indexOf(live[r]))[c];
            return { bg: color(v), tip: `${live[r].name}, ${UPTIME_DAYS[c]} Nov: ${v}% uptime${v < 95 ? " · SIM data ran out at 02:14" : ""}` };
          }}
        />
        <div className="mt-3 flex flex-wrap gap-3 text-[11.5px] text-[#6b6f76]">
          {[["≥ 99.5%", "#15803d"], ["98.5–99.5", "#4fb37a"], ["96–98.5", "#e2b23a"], ["90–96", "#ef8a4b"], ["< 90", "#d4471c"]].map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: c }} />
              {k}
            </span>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="SIM data used this month" sub="Cameras close to their limit">
          {s.cameras.filter((c) => c.dataUsed >= 70).sort((a, b) => b.dataUsed - a.dataUsed).map((c) => (
            <div key={c.serial} className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-2 py-1.5 text-[12px]">
              <span className="truncate">{c.serial}</span>
              <Bar value={c.dataUsed} tone={c.dataUsed >= 95 ? "bad" : c.dataUsed >= 85 ? "warn" : "good"} h={6} />
              <span className="text-right tabular-nums">{c.dataUsed}%</span>
            </div>
          ))}
        </Panel>
        <Panel title="Failures predicted" sub="From heartbeat gaps, battery and season">
          {[["OV-4M-2280", "Harbour Line Depot", "Solar battery fading, 68%. Swap on next visit."], ["OV-8M-4418", "Northgate Depot", "SIM data will run out on 24 Nov."], ["OV-8M-3902", "Meridian Business Park", "Upload gaps every evening: router overheating."], ["OV-4M-2281", "Harbour Line Depot", "Battery 71%. Book with 2280."]].map(([a, b, c]) => (
            <div key={a} className="border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
              <p className="font-medium">
                {a} <span className="font-normal text-[#8a8e95]">· {b}</span>
              </p>
              <p className="text-[#6b6f76]">{c}</p>
            </div>
          ))}
        </Panel>
        <Panel title="Last night's incident" sub="OV-8M-4417 at Northgate Depot">
          <ol className="relative flex flex-col gap-2.5 border-l border-[#e4e4df] pl-4 text-[12.5px]">
            {[["02:14", "Stopped uploading", "bad"], ["02:16", "Remote reboot and SIM check tried", "muted"], ["07:48", "Client complained on WhatsApp (T-5812)", "warn"], ["07:49", "Care agent replied with cause and fix time", "info"], ["11:02", "Top-up done by Naveen, rebooting", "good"]].map(([t, x, tone]) => (
              <li key={t} className="relative">
                <span className="absolute top-1.5 -left-[21px]">
                  <Dot tone={tone as Tone} />
                </span>
                <span className="text-[11px] text-[#8a8e95] tabular-nums">{t}</span> {x}
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

export const OFFICE_LIST = OFFICES;
