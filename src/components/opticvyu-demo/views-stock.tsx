"use client";

import { useState } from "react";
import { FLEET, OFFICES, USAGE, needAt, officeById, siteById, type ItemKind, type OfficeId } from "./data";
import { inr, money, useOps } from "./store";
import { Badge, Bar, Btn, Dot, Illustrative, Impact, MetricStrip, Panel, Seg, Table, Tabs, Td, Th, ViewHead, cx } from "./ui";
import { PersonChip } from "./views-home";

type Tab = "overview" | "assets" | "kits" | "stock" | "faulty" | "usage";

export function Inventory() {
  const { s, m } = useOps();
  const [tab, setTab] = useState<Tab>("overview");
  const offices = OFFICES.filter((o) => m.inScope(o.id));
  const value = s.items.reduce((t, it) => t + offices.reduce((u, o) => u + it.stock[o.id], 0) * it.cost, 0);
  const lowCells = s.items.flatMap((it) => offices.filter((o) => it.stock[o.id] < need(it.min, o.id)).map((o) => ({ it, o })));
  const faultyOpen = s.faulty.filter((f) => !/Replaced|Spare issued/.test(f.state)).length;
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="Inventory"
        agent="Inventory agent · counts every movement"
        line="Three kinds of stock in one place, per office and per site: cameras and kits deployed at client sites, the tools each engineer carries, and the parts they use up. Every item is logged against the job it was used on."
      />
      <MetricStrip
        cols={6}
        items={[
          { label: "Stock value on shelves", value: money(value), foot: s.scope === "all" ? "9 locations" : officeById(s.scope as OfficeId).short },
          { label: "Fleet earning", value: "92.6%", foot: `${FLEET.live} of ${FLEET.owned} cameras` },
          { label: "Below minimum", value: lowCells.length, tone: lowCells.length ? "warn" : "good", foot: "item × office" },
          { label: "Faulty, open", value: faultyOpen, tone: faultyOpen ? "warn" : "good", foot: "repair, return or replace" },
          { label: "Idle over 3 weeks", value: 23, tone: "warn", foot: "cameras in stock" },
          { label: "Parts used this month", value: "₹3.8 L", delta: { v: -6, good: false, suffix: "per job" } },
        ]}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "assets", label: "Deployed assets", n: s.cameras.length },
          { id: "kits", label: "Engineer kits", n: s.kits.length },
          { id: "stock", label: "Office stock", n: lowCells.length },
          { id: "faulty", label: "Faulty and repairs", n: s.faulty.length },
          { id: "usage", label: "Used by site" },
        ]}
      />
      {tab === "overview" && <Overview lowCells={lowCells} />}
      {tab === "assets" && <Assets />}
      {tab === "kits" && <Kits />}
      {tab === "stock" && <OfficeStock />}
      {tab === "faulty" && <Faulty />}
      {tab === "usage" && <Usage />}
    </div>
  );
}

const need = needAt;

function Overview({ lowCells }: { lowCells: { it: { id: string; name: string; min: number; stock: Record<OfficeId, number> }; o: { id: OfficeId; short: string } }[] }) {
  const { s, d, m } = useOps();
  const kinds: { k: ItemKind; title: string; line: string }[] = [
    { k: "Deployed asset", title: "Deployed at client sites", line: "Cameras, routers, solar kits and SIMs, tracked by serial from purchase to refurbishment." },
    { k: "Engineer tool", title: "Carried by engineers", line: "360° cameras, drones, drills, harnesses and testers, issued to a person and inspected on a schedule." },
    { k: "Consumable", title: "Used up on jobs", line: "Cable, mounts, PoE injectors, junction boxes and SD cards, logged against every work order." },
  ];
  const byOffice = OFFICES.filter((o) => m.inScope(o.id)).map((o) => ({ o, v: s.items.reduce((t, it) => t + it.stock[o.id] * it.cost, 0), low: s.items.filter((it) => it.stock[o.id] < need(it.min, o.id)).length }));
  const maxV = Math.max(...byOffice.map((b) => b.v));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {kinds.map((k, i) => {
          const items = s.items.filter((it) => it.kind === k.k);
          const qty = items.reduce((t, it) => t + Object.values(it.stock).reduce((a, b) => a + b, 0) * it.cost, 0);
          return (
            <Panel key={k.k}>
              <p className="text-[11px] font-semibold tracking-[0.06em] text-[#8a8e95] uppercase">{["1", "2", "3"][i]} · {k.k}</p>
              <p className="mt-1 text-[15px] font-semibold">{k.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-[#6b6f76]">{k.line}</p>
              <div className="mt-3 flex items-end justify-between border-t border-[#f2f2ef] pt-3">
                <span className="text-[12px] text-[#6b6f76]">{items.length} item types</span>
                <span className="text-[16px] font-semibold tabular-nums">{money(qty)}</span>
              </div>
            </Panel>
          );
        })}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Panel title="Stock value by office" sub="On shelves, not counting cameras at client sites">
          {byOffice.map((b) => (
            <div key={b.o.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem_3.5rem] items-center gap-2 py-1.5 text-[12px]">
              <span>{b.o.short}</span>
              <Bar value={(b.v / maxV) * 100} h={7} />
              <span className="text-right tabular-nums">{money(b.v)}</span>
              <span className="text-right">{b.low ? <Badge tone="warn">{b.low} low</Badge> : <Badge tone="good">ok</Badge>}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Running low" sub="Below each office's minimum. Hyderabad holds the buffer stock." right={<Badge tone="warn">{lowCells.length}</Badge>}>
          <div className="flex max-h-[290px] flex-col overflow-y-auto">
            {lowCells.slice(0, 9).map(({ it, o }) => {
              const short = need(it.min, o.id) - it.stock[o.id];
              return (
                <div key={it.id + o.id} className="flex items-center justify-between gap-2 border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{it.name}</span>
                    <span className="text-[11.5px] text-[#8a8e95]">
                      {o.short}: {it.stock[o.id]} left, minimum {need(it.min, o.id)}
                    </span>
                  </span>
                  {o.id !== "hyd" && it.stock.hyd >= short ? (
                    <Btn size="xs" kind="secondary" onClick={() => d({ t: "transfer", item: it.id, to: o.id, qty: short })}>
                      Send {short} from HQ
                    </Btn>
                  ) : (
                    <Btn size="xs" kind="secondary" onClick={() => d({ t: "view", view: "approvals" })}>
                      Raise purchase
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
      <Impact items={[{ label: "Where is camera X?", before: "ask accounts", now: "one search" }, { label: "Parts per job", before: "unknown", now: "logged in the app" }, { label: "Stock-outs", before: "found on site", now: "warned a week ahead" }, { label: "Faulty items", before: "lost in a drawer", now: "repair, return or replace" }]} />
    </div>
  );
}

function Assets() {
  const { s, d, m } = useOps();
  const stages = [
    { k: "Owned", n: FLEET.owned, c: "#111113" },
    { k: "In stock", n: FLEET.inStock, c: "#9a9ea5" },
    { k: "Dispatched", n: FLEET.inTransit + s.cameras.filter((c) => c.status === "Dispatched").length - 2, c: "#b9b2f2" },
    { k: "Live at sites", n: m.live, c: "#16a34a" },
    { k: "Returning", n: s.cameras.filter((c) => c.status === "Returning").length, c: "#eda100" },
    { k: "Refurbishing", n: FLEET.refurbishing + s.cameras.filter((c) => c.status === "Refurbishing").length - 1, c: "#6250d6" },
    { k: "Faulty", n: FLEET.faulty, c: "#ea580c" },
  ];
  const cams = s.cameras.filter((c) => m.inScope(c.office));
  const returning = s.cameras.filter((c) => c.status === "Returning");
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Where every camera is in its life" sub="Bought once, earning at a site, back, refurbished, out again. A camera that skips a lap earns nothing.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {stages.map((st, i) => (
            <div key={st.k} className="relative rounded-lg bg-[#fbfbfa] p-3 ring-1 ring-[#efefeb]">
              <p className="flex items-center gap-1.5 text-[11.5px] text-[#6b6f76]">
                <span className="size-2 rounded-full" style={{ background: st.c }} />
                {st.k}
              </p>
              <p className="mt-1 text-[20px] font-semibold tabular-nums">{inr(st.n)}</p>
              {i > 0 && i < stages.length - 1 && <span aria-hidden className="absolute top-1/2 -right-2 z-10 hidden text-[#c4c6cb] lg:block">›</span>}
            </div>
          ))}
        </div>
      </Panel>
      {returning.length > 0 && (
        <Panel title="Coming back from Arcadia Heights" sub="On check-in: 40% buy-back to the client, billing stops, cameras go to refurbishing.">
          <div className="flex flex-wrap items-center gap-2">
            {returning.map((c) => (
              <Badge key={c.serial} tone="warn">
                {c.serial}
              </Badge>
            ))}
            <span className="text-[12.5px] tabular-nums">Buy-back ₹{inr(48000 * returning.length)}</span>
            <Btn size="sm" className="ml-auto" onClick={() => d({ t: "check-in-return", site: "s6" })}>
              Check in at Mumbai stores
            </Btn>
          </div>
        </Panel>
      )}
      <Panel flush title="By serial" sub="A sample of the fleet" right={<Illustrative />}>
        <Table min={900}>
          <thead>
            <tr>
              <Th>Serial</Th>
              <Th>Office</Th>
              <Th>Where</Th>
              <Th>Status</Th>
              <Th>SIM</Th>
              <Th>Data used</Th>
              <Th className="text-right">Uptime</Th>
              <Th>Bought</Th>
            </tr>
          </thead>
          <tbody>
            {cams.map((c) => (
              <tr key={c.serial}>
                <Td>
                  <span className="font-medium">{c.serial}</span>
                  <span className="block text-[11px] text-[#8a8e95]">{c.model}</span>
                </Td>
                <Td>{officeById(c.office).short}</Td>
                <Td>{c.site ? siteById(c.site).name : `Stores${c.idleDays ? ` · idle ${c.idleDays} d` : ""}`}</Td>
                <Td>
                  <Badge tone={c.status === "Live" ? "good" : c.status === "Offline" || c.status === "Faulty" ? "bad" : c.status === "In stock" ? "muted" : "warn"}>{c.status}</Badge>
                </Td>
                <Td className="text-[#6b6f76]">
                  {c.sim} · {c.simEnds}
                </Td>
                <Td>
                  {c.dataUsed ? (
                    <span className="inline-flex w-20 items-center gap-2">
                      <Bar value={c.dataUsed} tone={c.dataUsed >= 95 ? "bad" : c.dataUsed >= 85 ? "warn" : "good"} h={5} />
                      {c.dataUsed}%
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="text-right">{c.uptime ? `${c.uptime}%` : "—"}</Td>
                <Td className="text-[#6b6f76]">{c.bought}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}

const KIT_TONE = { "In use": "good", Spare: "muted", Faulty: "bad", "Replace due": "warn" } as const;

function Kits() {
  const { s, d, m } = useOps();
  const kits = s.kits.filter((k) => m.inScope(k.office));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {kits.map((k) => (
          <Panel key={k.who} title={<PersonChip name={k.who} sub={`${officeById(k.office).short} · kit value ${money(k.value)}`} />} right={<Badge tone={k.lines.some((l) => l.status === "Faulty" || l.status === "Replace due") ? "warn" : "good"}>{k.lines.filter((l) => l.status === "Faulty" || l.status === "Replace due").length ? `${k.lines.filter((l) => l.status === "Faulty" || l.status === "Replace due").length} to act on` : "all good"}</Badge>}>
            <div className="flex flex-col">
              {k.lines.map((l) => (
                <div key={l.item} className="flex items-center justify-between gap-3 border-b border-[#f2f2ef] py-2 text-[12.5px] last:border-0">
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {l.qty > 1 ? `${l.qty} × ` : l.qty === 0 ? "0 × " : ""}
                      {l.item}
                      {l.serial && <span className="ml-1.5 font-normal text-[#8a8e95]">{l.serial}</span>}
                    </span>
                    <span className="text-[11.5px] text-[#8a8e95]">{l.last}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge tone={KIT_TONE[l.status]}>{l.status}</Badge>
                    {l.status === "In use" && (
                      <button type="button" onClick={() => d({ t: "report-faulty", who: k.who, item: l.item })} className="text-[11.5px] font-medium text-[#5b47e0] hover:underline">
                        Report faulty
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      <p className="text-[12px] text-[#6b6f76]">Engineers report a faulty tool from the app with a photo. A spare is issued from the nearest office, and the repair-or-replace decision lands in Faulty and repairs.</p>
    </div>
  );
}

function OfficeStock() {
  const { s, d, m } = useOps();
  const [kind, setKind] = useState<ItemKind>("Consumable");
  const offices = OFFICES.filter((o) => m.inScope(o.id));
  const items = s.items.filter((it) => it.kind === kind);
  return (
    <Panel
      flush
      title="Stock by office"
      sub="Orange cells are below that office's minimum. Click one to send stock from Hyderabad."
      right={<Seg value={kind} onChange={setKind} options={[{ id: "Deployed asset", label: "Deployed" }, { id: "Engineer tool", label: "Tools" }, { id: "Consumable", label: "Consumables" }]} />}
    >
      <Table min={940}>
        <thead>
          <tr>
            <Th>Item</Th>
            {offices.map((o) => (
              <Th key={o.id} className="text-right">
                {o.short}
              </Th>
            ))}
            <Th className="text-right">Total</Th>
            <Th className="text-right">Unit cost</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => {
            const total = Object.values(it.stock).reduce((a, b) => a + b, 0);
            return (
              <tr key={it.id}>
                <Td>
                  <span className="font-medium">{it.name}</span>
                  <span className="block text-[11px] text-[#8a8e95]">
                    minimum {inr(it.min)} {it.unit} company-wide
                  </span>
                </Td>
                {offices.map((o) => {
                  const q = it.stock[o.id];
                  const low = q < need(it.min, o.id);
                  const short = need(it.min, o.id) - q;
                  return (
                    <Td key={o.id} className="text-right">
                      {low && o.id !== "hyd" && it.stock.hyd >= short ? (
                        <button type="button" title={`Send ${short} from Hyderabad`} onClick={() => d({ t: "transfer", item: it.id, to: o.id, qty: short })} className="rounded-md bg-[#fdefe8] px-1.5 py-0.5 font-medium text-[#c2410c] hover:ring-1 hover:ring-[#f0b9a0]">
                          {inr(q)}
                        </button>
                      ) : (
                        <span className={cx(low && "rounded-md bg-[#fdefe8] px-1.5 py-0.5 font-medium text-[#c2410c]")}>{inr(q)}</span>
                      )}
                    </Td>
                  );
                })}
                <Td className="text-right font-medium">{inr(total)}</Td>
                <Td className="text-right text-[#6b6f76]">₹{inr(it.cost)}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Panel>
  );
}

function Faulty() {
  const { s, d } = useOps();
  return (
    <Panel flush title="Faulty, under repair or being replaced" sub="Each one has a decision: repair, return to the maker under warranty, or replace.">
      <Table min={900}>
        <thead>
          <tr>
            <Th>Item</Th>
            <Th>Office</Th>
            <Th>Reported by</Th>
            <Th>Issue</Th>
            <Th>Decision</Th>
            <Th className="text-right">Cost</Th>
            <Th>Where it stands</Th>
          </tr>
        </thead>
        <tbody>
          {s.faulty.map((f, i) => (
            <tr key={f.serial + i}>
              <Td>
                <span className="font-medium">{f.item}</span>
                <span className="block text-[11px] text-[#8a8e95]">{f.serial}</span>
              </Td>
              <Td>{officeById(f.office).short}</Td>
              <Td>{f.by}</Td>
              <Td>{f.issue}</Td>
              <Td>{f.decision}</Td>
              <Td className="text-right">{f.cost ? `₹${inr(f.cost)}` : "₹0"}</Td>
              <Td>
                {f.state === "Needs approval" && s.pending.includes("ap5") ? (
                  <Btn size="xs" onClick={() => d({ t: "approve", id: "ap5" })}>
                    Approve ₹{inr(f.cost)}
                  </Btn>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Dot tone={/Replaced|Spare|Planned|Sent/.test(f.state) ? "good" : "warn"} />
                    {f.state === "Needs approval" ? "Approved" : f.state}
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Panel>
  );
}

function Usage() {
  const max = Math.max(...USAGE.map((u) => u.parts + u.travel));
  return (
    <Panel flush title="What each site costs to serve, this month" sub="Parts logged against jobs, plus travel from engineers' GPS and claims.">
      <Table min={820}>
        <thead>
          <tr>
            <Th>Site</Th>
            <Th className="text-right">Visits</Th>
            <Th className="text-right">Parts</Th>
            <Th className="text-right">Travel</Th>
            <Th>Cost to serve</Th>
            <Th className="text-right">Revenue a month</Th>
            <Th className="text-right">Cost as share</Th>
          </tr>
        </thead>
        <tbody>
          {USAGE.map((u) => {
            const site = siteById(u.site);
            const cost = u.parts + u.travel;
            const share = Math.round((cost / site.monthly) * 100);
            return (
              <tr key={u.site}>
                <Td>
                  <span className="font-medium">{site.name}</span>
                  <span className="block text-[11px] text-[#8a8e95]">{officeById(site.office).short}</span>
                </Td>
                <Td className="text-right">{u.visits}</Td>
                <Td className="text-right">₹{inr(u.parts)}</Td>
                <Td className="text-right">₹{inr(u.travel)}</Td>
                <Td>
                  <span className="inline-flex w-36 items-center gap-2">
                    <Bar value={(cost / max) * 100} tone={share > 45 ? "bad" : share > 30 ? "warn" : "brand"} h={6} />₹{inr(cost)}
                  </span>
                </Td>
                <Td className="text-right">{money(site.monthly)}</Td>
                <Td className={cx("text-right font-medium", share > 45 ? "text-[#c2410c]" : share > 30 && "text-[#a16207]")}>{share}%</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <p className="px-4 py-3 text-[12px] text-[#6b6f76] sm:px-5">Harbour Line Depot costs 91% of its revenue this month: 4 visits for battery faults. The solar battery swap is planned, which removes 3 visits a month.</p>
    </Panel>
  );
}
