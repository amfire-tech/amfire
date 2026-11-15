"use client";

import { useState } from "react";
import { STAGES, APPROVALS, CASH, CASH_START, ENGINEERS, FORECAST, MONTHS, MOVES, OFFICES, PEOPLE, REVENUE, SCORE, needAt, officeById, siteById, type OfficeId, type Tone } from "./data";
import { Flow } from "./flow";
import { StageStrip } from "./views-tracker";
import { inr, money, useOps } from "./store";
import { AreaSpark, Avatar, Badge, Bar, Btn, CashChart, Delta, Dot, ForecastChart, Illustrative, Legend, MetricStrip, MovementChart, Panel, SERIES, Seg, Table, Td, Th, cx } from "./ui";

// ---------------------------------------------------------------- Command centre

export function CommandCentre() {
  const { s, m } = useOps();
  const waiting = APPROVALS.filter((a) => s.pending.includes(a.id)).length;
  const office = s.scope === "all" ? null : officeById(s.scope);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.025em]">Good morning. Here is OpticVyu today.</h2>
          <p className="mt-1 text-[13px] text-[#6b6f76]">
            Agents handled <b className="font-semibold text-[#111113]">1,312</b> tasks since midnight. <b className="font-semibold text-[#111113]">{waiting}</b> decisions wait for you. <b className="font-semibold text-[#111113]">{m.lateOrders.length + m.breached.length}</b> things are late, each with an owner.
          </p>
        </div>
        <span className="flex items-center gap-2 text-[12px] text-[#6b6f76]">
          <Illustrative /> Figures for a company of OpticVyu&rsquo;s size
        </span>
      </div>

      <Flow />

      {office ? <OfficeStrip id={office.id} /> : <CompanyStrip />}

      <ProjectsByStage />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <RevenuePanel />
        <Decisions />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Panel title="Cash, next 13 weeks" sub="Bank balance from expected payments (each client's real habit), payroll, vendor bills, GST, TDS and camera purchases. ₹ lakh." right={<Legend items={[{ label: "Balance", color: "#148a61" }, { label: "Safety floor", color: "#ea580c", dash: true }]} />}>
          <CashChart weeks={CASH} start={CASH_START} />
          <div className="mt-2 grid grid-cols-3 gap-3 border-t border-[#f2f2ef] pt-3 text-[12px]">
            <p>
              <span className="block text-[#7b7f86]">Lowest point</span>
              <b className="text-[14px] font-semibold tabular-nums">₹167 L · W49</b>
              <span className="block text-[#7b7f86]">payroll + 12-kit purchase</span>
            </p>
            <p>
              <span className="block text-[#7b7f86]">Biggest inflow</span>
              <b className="text-[14px] font-semibold tabular-nums">₹97 L · W1</b>
              <span className="block text-[#7b7f86]">Meridian quarter-end</span>
            </p>
            <p>
              <span className="block text-[#7b7f86]">Move the purchase to W50</span>
              <b className="text-[14px] font-semibold text-[#15803d] tabular-nums">+₹13 L at the low</b>
              <span className="block text-[#7b7f86]">suggested by the cash agent</span>
            </p>
          </div>
        </Panel>
        <FieldToday />
      </div>

      <Scoreboard />

      <div className="grid gap-4 lg:grid-cols-3">
        <Alerts />
        <CarePulse />
        <AgentFeed />
      </div>
    </div>
  );
}

function CompanyStrip() {
  const { d, m } = useOps();
  const net = MOVES[MOVES.length - 1];
  const netV = net.fresh + net.ext + net.addon + net.ended;
  return (
    <MetricStrip
      cols={4}
      items={[
        { label: "Revenue this month", value: money(m.mrr), delta: { v: 3.4, suffix: "vs October" }, spark: REVENUE, onClick: () => d({ t: "view", view: "growth" }) },
        { label: "Net new revenue a month", value: `+₹${netV.toFixed(1)} L`, delta: { v: -0.6, unit: " L", suffix: "vs October" }, foot: "4.9 L ended this month", onClick: () => d({ t: "view", view: "growth" }) },
        { label: "Cash in bank", value: money(m.cash), foot: "lowest ₹1.67 Cr in W49", spark: [176, 182, 191, 188, 199, 205, 214], onClick: () => d({ t: "view", view: "payments" }) },
        { label: "Days to get paid", value: "41 days", delta: { v: -1, good: false, unit: " d", suffix: "vs October" }, spark: [52, 50, 49, 48, 46, 45, 43, 41], onClick: () => d({ t: "view", view: "payments" }) },
        {
          label: "Cameras billed vs live",
          value: `${inr(m.billed)} / ${inr(m.live)}`,
          tone: m.gapCount ? "bad" : "good",
          foot: m.gapCount ? <span className="text-[#c2410c]">{m.gapCount} live but not billed · {money(m.gapValue)}</span> : <span className="text-[#15803d]">in step</span>,
          onClick: () => d({ t: "view", view: "billing" }),
        },
        { label: "Fleet earning", value: "92.6%", delta: { v: 1.8, suffix: "of 1,279 owned" }, foot: "61 in stock, 17 refurbishing", onClick: () => d({ t: "view", view: "inventory" }) },
        { label: "Uptime, 7 days", value: "99.1%", foot: <span>promise 98% · {m.offline} offline now</span>, tone: "good", onClick: () => d({ t: "view", view: "fleet" }) },
        { label: "Revenue per employee", value: "₹26.4 L", delta: { v: 11, suffix: "a year, vs last year" }, foot: "54 people", onClick: () => d({ t: "view", view: "people" }) },
      ]}
    />
  );
}

function OfficeStrip({ id }: { id: OfficeId }) {
  const { d } = useOps();
  const sc = SCORE[id];
  const ppl = PEOPLE.filter((p) => p.office === id);
  const present = ppl.filter((p) => ["In office", "At site", "Late", "Travelling"].includes(p.today)).length;
  const o = officeById(id);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-lg bg-[#f0eefd] px-3.5 py-2 text-[12.5px] text-[#4c39d1]">
        <span>
          Showing <b className="font-semibold">{o.name}</b> · {o.kind} · {o.address}
        </span>
        <button type="button" className="font-medium hover:underline" onClick={() => d({ t: "scope", scope: "all" })}>
          Back to all offices
        </button>
      </div>
      <MetricStrip
        cols={6}
        items={[
          { label: "Revenue a month", value: `₹${sc.revenue} L`, spark: sc.trend },
          { label: "Cameras live", value: sc.cams, foot: `${sc.util}% of stock earning` },
          { label: "Present today", value: `${present} / ${ppl.length}`, tone: present === ppl.length ? "good" : "warn", onClick: () => d({ t: "view", view: "attendance" }) },
          { label: "Jobs today", value: sc.jobs, onClick: () => d({ t: "view", view: "workorders" }) },
          { label: "First-time fix", value: `${sc.ftf}%`, tone: sc.ftf >= 80 ? "good" : "warn" },
          { label: "Days to get paid", value: sc.dso, tone: sc.dso > 45 ? "warn" : "good" },
        ]}
      />
    </div>
  );
}

function RevenuePanel() {
  const [mode, setMode] = useState<"moves" | "total">("moves");
  return (
    <Panel
      title={mode === "moves" ? "What moved revenue each month" : "Revenue a month, and the next six"}
      sub={mode === "moves" ? "₹ lakh a month. Bars above the line are new money; below it, projects that ended. The dot is the net." : "₹ lakh a month. The band is the range the forecast is 80% sure of, built from POs, pipeline and payment habits."}
      right={
        <Seg
          value={mode}
          onChange={setMode}
          options={[
            { id: "moves", label: "Movements" },
            { id: "total", label: "Total + forecast" },
          ]}
        />
      }
    >
      {mode === "moves" ? (
        <>
          <Legend items={[{ label: "New sites", color: SERIES[0] }, { label: "PO extensions", color: SERIES[2] }, { label: "Add-ons", color: SERIES[3] }, { label: "Projects ended", color: SERIES[1] }]} />
          <div className="mt-2">
            <MovementChart data={MOVES} />
          </div>
        </>
      ) : (
        <>
          <Legend items={[{ label: "Actual", color: "#111113" }, { label: "Forecast", color: SERIES[0], dash: true }]} />
          <div className="mt-2">
            <ForecastChart months={MONTHS} actual={REVENUE} fMonths={FORECAST.months} mid={FORECAST.mid} low={FORECAST.low} high={FORECAST.high} />
          </div>
        </>
      )}
      <div className="mt-2 grid grid-cols-2 gap-3 border-t border-[#f2f2ef] pt-3 text-[12px] sm:grid-cols-4">
        {[
          ["Growth, 12 months", "+54%", "₹78 L → ₹1.20 Cr"],
          ["Kept from clients", "112%", "net revenue retention"],
          ["Expected in May", "₹1.53 Cr", "range ₹1.40–1.66 Cr"],
          ["Ending in 90 days", "₹6.8 L", "23 POs, 11 likely to extend"],
        ].map(([a, b, c]) => (
          <p key={a}>
            <span className="block text-[#7b7f86]">{a}</span>
            <b className="text-[15px] font-semibold tabular-nums">{b}</b>
            <span className="block text-[#7b7f86]">{c}</span>
          </p>
        ))}
      </div>
    </Panel>
  );
}

function Decisions() {
  const { s, d } = useOps();
  const pending = APPROVALS.filter((a) => s.pending.includes(a.id));
  return (
    <Panel title="Waiting for your decision" sub="Everything an agent may not do alone, with the facts." right={<Badge tone={pending.length ? "info" : "good"}>{pending.length ? `${pending.length} waiting` : "clear"}</Badge>}>
      <div className="flex flex-col divide-y divide-[#f2f2ef]">
        {pending.slice(0, 4).map((a, i) => (
          <div key={a.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-[0.05em] text-[#8a8e95] uppercase">{a.area}</p>
                <p className="text-[13px] leading-snug font-medium">{a.title}</p>
              </div>
              {a.amount && <span className="shrink-0 text-[13px] font-semibold tabular-nums">{money(a.amount)}</span>}
            </div>
            <p className="text-[12px] leading-snug text-[#6b6f76]">{a.detail}</p>
            <div className="flex gap-1.5">
              <Btn size="xs" onClick={() => d({ t: "approve", id: a.id })} className={i === 0 ? "ov-glow" : ""}>
                Approve
              </Btn>
              <Btn size="xs" kind="secondary" onClick={() => d({ t: "view", view: "approvals" })}>
                See the facts
              </Btn>
            </div>
          </div>
        ))}
        {!pending.length && <p className="py-8 text-center text-[13px] text-[#6b6f76]">Nothing waiting. The agents carried on.</p>}
      </div>
    </Panel>
  );
}

function FieldToday() {
  const { s, d, m } = useOps();
  const eng = ENGINEERS.filter((e) => m.inScope(e.office));
  const by = (st: string) => eng.filter((e) => e.status === st).length;
  const cols = ["Scheduled", "En route", "On site", "Blocked", "Done"] as const;
  const orders = s.orders.filter((o) => m.inScope(siteById(o.site).office));
  return (
    <Panel title="In the field right now" sub="From engineers' phones (GPS) and the work-order board." right={<Btn size="xs" kind="secondary" onClick={() => d({ t: "view", view: "map" })}>Open live map</Btn>}>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ["On site", by("On site"), "good"],
          ["En route", by("En route"), "info"],
          ["At office", by("At office"), "muted"],
          ["GPS off", by("GPS off"), "bad"],
        ].map(([k, v, t]) => (
          <div key={k as string} className="rounded-lg bg-[#fbfbfa] py-2.5 ring-1 ring-[#efefeb]">
            <p className="text-[20px] font-semibold tabular-nums">{v as number}</p>
            <p className="flex items-center justify-center gap-1 text-[11px] text-[#6b6f76]">
              <Dot tone={t as Tone} />
              {k as string}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 mb-2 text-[11.5px] font-medium tracking-[0.05em] text-[#8a8e95] uppercase">Today&rsquo;s jobs</p>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded">
        {cols.map((c, i) => {
          const n = orders.filter((o) => o.col === c).length;
          return n ? <span key={c} title={`${c}: ${n}`} style={{ flex: n, background: ["#d6d1f7", SERIES[0], "#1baf7a", "#ea580c", "#b4b7bd"][i] }} /> : null;
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-[#6b6f76]">
        {cols.map((c, i) => (
          <span key={c} className="inline-flex items-center gap-1">
            <span className="size-2 rounded-[2px]" style={{ background: ["#d6d1f7", SERIES[0], "#1baf7a", "#ea580c", "#b4b7bd"][i] }} />
            {c} {orders.filter((o) => o.col === c).length}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {m.lateOrders.slice(0, 2).map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#fdf6f2] px-3 py-2 text-[12.5px]">
            <span className="min-w-0 truncate">
              <b className="font-semibold">{o.id}</b> {o.type.toLowerCase()} · {siteById(o.site).name} · <span className="text-[#c2410c]">{o.late} late</span>
            </span>
            <Btn size="xs" kind="secondary" onClick={() => d({ t: "reassign", wo: o.id, who: "Ravi Kumar" })}>
              Reassign
            </Btn>
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#f2f2ef] pt-3 text-[12px]">
        <p>
          <span className="block text-[#7b7f86]">First-time fix</span>
          <b className="text-[14px] font-semibold">83%</b> <Delta v={4} suffix="" />
        </p>
        <p>
          <span className="block text-[#7b7f86]">Hours to fix</span>
          <b className="text-[14px] font-semibold">6.2 h</b> <Delta v={-1.4} good={false} unit=" h" />
        </p>
        <p>
          <span className="block text-[#7b7f86]">Jobs on time</span>
          <b className="text-[14px] font-semibold">94%</b> <Delta v={3} />
        </p>
      </div>
    </Panel>
  );
}

function Scoreboard() {
  const { s, d } = useOps();
  return (
    <Panel flush title="Every office at a glance" sub="Click an office to see the whole dashboard for it." right={<Illustrative />}>
      <Table min={900}>
        <thead>
          <tr>
            <Th>Office</Th>
            <Th className="text-right">Revenue a month</Th>
            <Th>Trend, 8 months</Th>
            <Th className="text-right">Cameras live</Th>
            <Th className="text-right">Fleet earning</Th>
            <Th className="text-right">Present</Th>
            <Th className="text-right">First-time fix</Th>
            <Th className="text-right">Days to get paid</Th>
            <Th className="text-right">Open tickets</Th>
            <Th>Stock alerts</Th>
          </tr>
        </thead>
        <tbody>
          {OFFICES.map((o) => {
            const sc = SCORE[o.id];
            const ppl = PEOPLE.filter((p) => p.office === o.id);
            const present = ppl.filter((p) => ["In office", "At site", "Late", "Travelling"].includes(p.today)).length;
            const low = s.items.filter((it) => it.stock[o.id] < needAt(it.min, o.id)).length;
            const active = s.scope === o.id;
            return (
              <tr key={o.id} onClick={() => d({ t: "scope", scope: active ? "all" : o.id })} className={cx("cursor-pointer transition", active ? "bg-[#f5f3fe]" : "hover:bg-[#fbfbfa]")}>
                <Td className="whitespace-nowrap">
                  <span className="font-medium text-[#111113]">{o.name}</span>
                  <span className="block text-[11px] text-[#8a8e95]">{o.kind}</span>
                </Td>
                <Td className="text-right font-medium">₹{sc.revenue} L</Td>
                <Td>
                  <AreaSpark data={sc.trend} w={80} h={22} />
                </Td>
                <Td className="text-right">{sc.cams}</Td>
                <Td className="text-right">
                  <span className="inline-flex w-20 items-center gap-2">
                    <Bar value={sc.util} tone={sc.util >= 92 ? "good" : "warn"} h={5} />
                    {sc.util}%
                  </span>
                </Td>
                <Td className={cx("text-right", present < ppl.length && "text-[#a16207]")}>
                  {present}/{ppl.length}
                </Td>
                <Td className={cx("text-right", sc.ftf < 80 && "text-[#c2410c]")}>{sc.ftf}%</Td>
                <Td className={cx("text-right", sc.dso > 45 && "text-[#c2410c]")}>{sc.dso}</Td>
                <Td className="text-right">{sc.tickets}</Td>
                <Td>{low ? <Badge tone="warn">{low} low</Badge> : <Badge tone="good">ok</Badge>}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Panel>
  );
}

function Alerts() {
  const { s, d, m } = useOps();
  const items: { tone: Tone; text: string; owner: string; go: () => void }[] = [
    ...m.breached.map((t) => ({ tone: "bad" as Tone, text: `${t.id}: ${t.subject}. Response promise missed by ${Math.abs(t.slaLeft) >= 60 ? `${Math.round(Math.abs(t.slaLeft) / 60)} h` : `${Math.abs(t.slaLeft)} min`}`, owner: t.owner, go: () => d({ t: "drawer", d: { kind: "ticket", id: t.id } }) })),
    ...m.lateOrders.map((o) => ({ tone: "bad" as Tone, text: `${o.id} ${o.type.toLowerCase()} at ${siteById(o.site).name} is ${o.late} late`, owner: o.who, go: () => d({ t: "view", view: "workorders" }) })),
    ...s.cameras.filter((c) => c.status === "Offline").map((c) => ({ tone: "warn" as Tone, text: `${c.serial} offline at ${siteById(c.site!).name}: SIM data used up`, owner: "Uptime agent", go: () => d({ t: "view", view: "fleet" }) })),
    { tone: "warn", text: "Pune has 0 pole mount clamps; 2 installs need them this week", owner: "Inventory agent", go: () => d({ t: "view", view: "inventory" }) },
    { tone: "warn", text: "Rohit Yadav's phone GPS has been off for 48 minutes in work hours", owner: "Attendance agent", go: () => d({ t: "view", view: "attendance" }) },
  ];
  return (
    <Panel title="Alerts, each with an owner" sub="Raised by the agents. Nobody had to notice.">
      <div className="-mx-2 flex flex-col">
        {items.slice(0, 6).map((a) => (
          <button key={a.text} type="button" onClick={a.go} className="flex items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-[#fbfbfa]">
            <span className="mt-1.5">
              <Dot tone={a.tone} />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] leading-snug">{a.text}</span>
              <span className="text-[11px] text-[#8a8e95]">Owner: {a.owner}</span>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function CarePulse() {
  const { s, d, m } = useOps();
  const solved = s.tickets.filter((t) => t.csat);
  const csat = solved.reduce((t, x) => t + (x.csat ?? 0), 0) / (solved.length || 1);
  return (
    <Panel title="Customer care pulse" sub="Every complaint and request from every channel." right={<Btn size="xs" kind="secondary" onClick={() => d({ t: "view", view: "care" })}>Open</Btn>}>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[#fbfbfa] py-2.5 ring-1 ring-[#efefeb]">
          <p className="text-[20px] font-semibold tabular-nums">{m.openTickets.length + 23}</p>
          <p className="text-[11px] text-[#6b6f76]">open</p>
        </div>
        <div className="rounded-lg bg-[#fdf6f2] py-2.5 ring-1 ring-[#f6dccf]">
          <p className="text-[20px] font-semibold text-[#c2410c] tabular-nums">{m.breached.length}</p>
          <p className="text-[11px] text-[#6b6f76]">promise missed</p>
        </div>
        <div className="rounded-lg bg-[#fbfbfa] py-2.5 ring-1 ring-[#efefeb]">
          <p className="text-[20px] font-semibold tabular-nums">{csat.toFixed(1)}</p>
          <p className="text-[11px] text-[#6b6f76]">rating / 5</p>
        </div>
      </div>
      <p className="mt-4 mb-2 text-[11.5px] font-medium tracking-[0.05em] text-[#8a8e95] uppercase">What clients raise most, 30 days</p>
      {[
        ["Camera offline", 34],
        ["Time-lapse requests", 22],
        ["Billing queries", 15],
        ["Relocation", 11],
        ["Image quality", 9],
      ].map(([k, v]) => (
        <div key={k as string} className="grid grid-cols-[8.5rem_minmax(0,1fr)_2rem] items-center gap-2 py-1 text-[12px]">
          <span className="text-[#3f434a]">{k as string}</span>
          <Bar value={((v as number) / 34) * 100} tone="brand" h={5} />
          <span className="text-right tabular-nums">{v as number}</span>
        </div>
      ))}
      <p className="mt-2 text-[12px] text-[#6b6f76]">
        Median first reply <b className="font-semibold text-[#111113]">2 min</b> · 64% answered by the care agent
      </p>
    </Panel>
  );
}

function AgentFeed() {
  const { s, d } = useOps();
  return (
    <Panel title="What the agents are doing" sub="Click a line to see every step." right={<Badge tone="good"><Dot tone="good" pulse /> live</Badge>}>
      <div className="-mx-2 flex flex-col">
        {s.activity.slice(0, 7).map((a, i) => (
          <button key={a.id} type="button" onClick={() => (a.trace ? d({ t: "drawer", d: { kind: "activity", id: a.id } }) : d({ t: "view", view: a.view }))} className={cx("grid grid-cols-[38px_minmax(0,1fr)] gap-2 rounded-lg px-2 py-2 text-left hover:bg-[#fbfbfa]", i === 0 && "ov-in")}>
            <span className="pt-px text-[11px] text-[#8a8e95] tabular-nums">{a.time}</span>
            <span className="min-w-0">
              <span className="block text-[12.5px] leading-snug">{a.text}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#8a8e95]">
                {a.agent}
                <Badge tone={a.kind === "done" ? "good" : a.kind === "flag" ? "warn" : "info"}>{a.kind === "done" ? "done" : a.kind === "flag" ? "flagged" : "needs you"}</Badge>
              </span>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function PersonChip({ name, sub }: { name: string; sub?: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={name} size={24} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[12.5px] font-medium text-[#111113]">{name}</span>
        {sub && <span className="block truncate text-[11px] text-[#8a8e95]">{sub}</span>}
      </span>
    </span>
  );
}

function ProjectsByStage() {
  const { s, d, m } = useOps();
  const all = s.projects.filter((p) => m.inScope(p.office));
  const hot = all.filter((p) => p.health !== "On track").slice(0, 4);
  return (
    <Panel title="Every project, by stage" sub="Each stage is owned by one team. Click for the full tracker." right={<Btn size="xs" kind="secondary" onClick={() => d({ t: "view", view: "tracker" })}>Open project tracker</Btn>}>
      <div className="grid grid-cols-5 gap-1.5 lg:grid-cols-10">
        {STAGES.map((st, i) => {
          const here = all.filter((p) => p.stage === i);
          const bad = here.filter((p) => p.health !== "On track").length;
          return (
            <button key={st.key} type="button" onClick={() => d({ t: "view", view: "tracker" })} className="flex flex-col gap-0.5 rounded-lg bg-[#fbfbfa] px-2 py-2 text-left ring-1 ring-[#efefeb] hover:ring-[#dcdcd7]">
              <span className="truncate text-[11px] font-medium text-[#3f434a]">{st.label}</span>
              <span className="text-[10.5px] text-[#9a9ea5]">{st.team}</span>
              <span className="mt-1 flex items-center gap-1.5">
                <b className="text-[17px] font-semibold tabular-nums">{here.length + [6, 4, 5, 3, 2, 1, 1, 0, 2, 3][i]}</b>
                {bad > 0 && <span className="rounded bg-[#fdf5e1] px-1 text-[10px] font-medium text-[#a16207]">{bad} risk</span>}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {hot.map((p) => (
          <button key={p.id} type="button" onClick={() => d({ t: "drawer", d: { kind: "project", id: p.id } })} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ring-1 ring-[#efefeb] hover:bg-[#fbfbfa]">
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-medium">{p.name} <span className="font-normal text-[#8a8e95]">· {STAGES[p.stage].label}</span></span>
              <span className="block truncate text-[11.5px] text-[#6b6f76]">{p.next}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StageStrip stage={p.stage} health={p.health} size="sm" />
              <Badge tone={p.health === "Blocked" ? "bad" : "warn"}>{p.gate ? "needs you" : p.health}</Badge>
            </span>
          </button>
        ))}
      </div>
    </Panel>
  );
}
