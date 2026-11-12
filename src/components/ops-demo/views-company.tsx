"use client";

import { useEffect, useRef, useState } from "react";
import {
  ACTIVITY,
  AGENT_STATS,
  AGENTS,
  ALERTS,
  APPROVALS,
  AUDIT,
  CASH_WEEKS,
  CASH_START,
  COMPANY,
  DEPT_TILES,
  DOC_STATS,
  DOCUMENTS,
  HEALTH,
  HOME_KPIS,
  ORDERS,
  OWNER,
  REVENUE_DAYS,
  REVENUE_TARGET,
  RULES,
  STAGE_COUNTS,
  STAGES,
  SYNC_EVENTS,
  SYNC_SOURCES,
  type Activity,
  type Order,
} from "./data";
import { Badge, C, CashChart, Dot, Field, Panel, RevenueChart, StageBar, StatGrid, Table, Tabs, ViewHeader, greeting, hhmm, toneOf, useDemo, useIST } from "./kit";

const LEVEL = { high: "bad", medium: "warn", low: "info" } as const;

// ---------------------------------------------------------------- Command centre

export function Home() {
  const { go, approved } = useDemo();
  const now = useIST(60_000);
  const waiting = APPROVALS.filter((a) => !approved[a.id]).length;
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader
        title={`${now ? greeting(now.h) : "Hello"}, ${OWNER.first}. Here is ${COMPANY.name} today.`}
        line={`Agents handled 1,146 tasks since midnight. ${waiting} decision${waiting === 1 ? "" : "s"} wait for you. 5 alerts are open, each with an owner and a plan.`}
      />
      <SyncFlow />
      <StatGrid stats={HOME_KPIS} cols={8} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Revenue this month" action={<span className="font-mono text-[12.5px] text-[#3ccf8e]">108% of pace</span>}>
          <RevenueChart days={REVENUE_DAYS} target={REVENUE_TARGET} />
        </Panel>
        <ApprovalsMini />
      </div>

      <Panel title="Every order, where it is right now" action={<button type="button" onClick={() => go("trace")} className="text-[12.5px] text-[#3ccf8e] hover:underline">Open order tracker →</button>}>
        <StageStrip />
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Alerts raised by agents" flush>
          <ul>
            {ALERTS.map((a) => (
              <li key={a.text}>
                <button type="button" onClick={() => go(a.dept)} className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-white/[0.05] px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-white/[0.03]">
                  <span className="pt-1.5"><Dot tone={LEVEL[a.level]} /></span>
                  <span className="text-[13.5px] leading-snug">{a.text}</span>
                  <span />
                  <span className="flex flex-wrap gap-x-3 text-[12px] text-[#8b8b92]">
                    <span>{a.time}</span>
                    <span>Owner: {a.owner}</span>
                    <span className="text-[#b9b9b4]">{a.state}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Departments" flush>
          <ul className="grid sm:grid-cols-2">
            {DEPT_TILES.map((d) => (
              <li key={d.id} className="border-t border-white/[0.05] sm:odd:border-r">
                <button type="button" onClick={() => go(d.id)} className="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]">
                  <span className="flex items-center justify-between gap-2 text-[13.5px] font-medium">
                    <span className="flex items-center gap-2"><Dot tone={HEALTH[d.id] ?? "good"} />{d.label}</span>
                    <span className="font-mono text-[12.5px] font-normal text-[#b9b9b4]">{d.figure}</span>
                  </span>
                  <span className="text-[12px] leading-snug text-[#8b8b92]">{d.line}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <LiveWork />
        <Panel title="Cash, next 8 weeks">
          <CashChart weeks={CASH_WEEKS} start={CASH_START} />
        </Panel>
      </div>
    </div>
  );
}

function ApprovalsMini() {
  const { go, approved, approve } = useDemo();
  const open = APPROVALS.filter((a) => !approved[a.id]);
  return (
    <Panel title="Waiting for your decision" action={<span className="font-mono text-[12.5px]">{open.length}</span>}>
      {open.length === 0 ? (
        <p className="rounded-lg bg-[#3ccf8e]/[0.08] p-3 text-[13.5px] text-[#3ccf8e]">All decided. The agents have carried on.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {open.slice(0, 3).map((a, i) => (
            <li key={a.id} className="rounded-lg border border-white/[0.07] bg-[#0e0e10] p-3">
              <p className="text-[13.5px] leading-snug font-medium">{a.title}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-[#8b8b92]">{a.ask}</p>
              <div className="mt-2.5 flex gap-2">
                <button type="button" onClick={() => approve(a.id)} className={`rounded-md bg-[#f2f1ec] px-3 py-1.5 text-[12.5px] font-medium text-[#0b0b0c] hover:bg-white ${i === 0 ? "od-pulse" : ""}`}>
                  Approve
                </button>
                <button type="button" onClick={() => go("approvals")} className="rounded-md px-3 py-1.5 text-[12.5px] font-medium shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:bg-white/5">
                  See the facts
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function StageStrip() {
  const { go } = useDemo();
  return (
    <div className="od-scroll overflow-x-auto">
      <ol className="grid min-w-[720px] grid-cols-8 gap-1.5">
        {STAGES.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => go("trace")} className="flex h-full w-full flex-col gap-1 rounded-lg bg-white/[0.04] p-2.5 text-left transition-colors hover:bg-white/[0.07]">
              <span className="text-[11.5px] text-[#8b8b92]">{i + 1}. {s}</span>
              <span className="font-mono text-[1.2rem] leading-none font-medium">{STAGE_COUNTS[i].n}</span>
              <span className="text-[11.5px] leading-tight text-[#b9b9b4]">{STAGE_COUNTS[i].value}</span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-[#8b8b92]">
        <span className="inline-flex items-center gap-1.5"><Dot tone="warn" />3 orders at risk, all with a recovery plan</span>
        <span className="inline-flex items-center gap-1.5"><Dot tone="bad" />1 delivery late (agreed) · 1 payment overdue</span>
      </p>
    </div>
  );
}

function LiveWork() {
  const { openDrawer } = useDemo();
  const now = useIST(20_000);
  const [feed, setFeed] = useState(ACTIVITY);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      setFeed((f) => [f[f.length - 1], ...f.slice(0, -1)]);
      setTick((n) => n + 1);
    }, 3400);
    return () => window.clearInterval(t);
  }, []);
  const base = now ? now.h * 60 + now.m : 0;
  return (
    <Panel title="Live: what the agents are doing" action={<span className="text-[12px] text-[#8b8b92]">Click a line to see every step</span>} flush>
      <ul className="pb-1">
        {feed.slice(0, 7).map((a, i) => (
          <li key={a.id} className={i === 0 && tick > 0 ? "od-in" : ""}>
            <button type="button" onClick={() => openDrawer(traceDrawer(a, clock(base - i * 2)))} className="grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-start gap-3 border-t border-white/[0.05] px-4 py-2.5 text-left text-[13px] transition-colors first:border-t-0 hover:bg-white/[0.03]">
              <span className="pt-px font-mono text-[12px] text-[#8b8b92] tabular-nums">{clock(base - i * 2)}</span>
              <span className="min-w-0 leading-snug">
                {a.text}
                <span className="block text-[11.5px] text-[#8b8b92]">{a.agent}</span>
              </span>
              <Badge tone={a.kind === "done" ? "good" : a.kind === "flag" ? "warn" : "muted"}>{a.kind === "done" ? "Done" : a.kind === "flag" ? "Flagged" : "Needs approval"}</Badge>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function traceDrawer(a: Activity, time: string) {
  return {
    eyebrow: `${a.agent} · ${time}`,
    title: a.text,
    body: (
      <div className="flex flex-col gap-4">
        <ol className="flex flex-col">
          {a.trace.map((t, i) => (
            <li key={t.label} className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-3">
              <span className="relative flex justify-center">
                <span aria-hidden className={`mt-1 size-3 rounded-full ${t.label === "Asked" ? "bg-[#ededea]" : t.label === "Flagged" ? "bg-[#f5b54a]" : "bg-[#3ccf8e]"}`} />
                {i < a.trace.length - 1 && <span aria-hidden className="absolute top-5 bottom-0 w-px bg-white/[0.1]" />}
              </span>
              <div className="pb-4">
                <p className={C.label}>{t.label}</p>
                <p className="mt-0.5 text-[13.5px] leading-snug">{t.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="rounded-lg bg-white/[0.04] p-3 text-[12.5px] leading-snug text-[#b9b9b4]">Every action is on record like this: what the agent saw, what it checked, what it did, and who approved it.</p>
      </div>
    ),
  };
}

const clock = hhmm;

// ---------------------------------------------------------------- Live sync
// Each team keeps working in its own system (CRM, machine tablets, inspection app, accounts).
// Everything they enter flows into the owner's view in real time. Shown as one strip of team
// systems feeding a single line into this dashboard, with the latest update spelled out.

function SyncFlow() {
  const { go } = useDemo();
  const now = useIST(1000);
  const [k, setK] = useState(0);
  const [last, setLast] = useState<number[]>(() => SYNC_SOURCES.map((_, i) => 2 + ((i * 7) % 23)));

  const svg = useRef<SVGSVGElement>(null);

  // A new update arrives every few seconds; the team that sent it shows "synced now".
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      svg.current?.pauseAnimations();
      return;
    }
    let count = 0;
    const t = window.setInterval(() => {
      count += 1;
      const from = SYNC_EVENTS[count % SYNC_EVENTS.length].from;
      setK(count);
      setLast((l) => l.map((s, i) => (i === from ? 0 : s)));
    }, 2200);
    return () => window.clearInterval(t);
  }, []);

  // Seconds since each team last synced.
  useEffect(() => {
    const t = window.setInterval(() => setLast((l) => l.map((s) => s + 1)), 1000);
    return () => window.clearInterval(t);
  }, []);
  const event = SYNC_EVENTS[k % SYNC_EVENTS.length];

  const n = SYNC_SOURCES.length;
  const W = 900;
  const xs = SYNC_SOURCES.map((_, i) => (W / n) * (i + 0.5));
  const hot = k > 0 ? event.from : -1;

  return (
    <section className="rounded-xl border border-white/[0.07] bg-[#121215] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className={C.label}>Every team works in its own system. It all flows here, live.</h4>
        <span className="inline-flex items-center gap-2 text-[12px] text-[#3ccf8e]">
          <span aria-hidden className="od-ping size-[7px] rounded-full bg-[#3ccf8e]" />
          9 systems in sync
        </span>
      </div>

      <ol className="mt-3 grid grid-cols-3 gap-1.5 md:grid-cols-9 md:gap-1">
        {SYNC_SOURCES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => go(s.id)}
              className={`flex h-full w-full flex-col items-center gap-0.5 rounded-lg border px-1.5 py-2 text-center transition-colors duration-500 hover:border-white/25 ${i === hot ? "border-[#3ccf8e]/60 bg-[#3ccf8e]/[0.10]" : "border-white/[0.07] bg-[#0e0e10]"}`}
            >
              <span className="text-[12px] font-medium">{s.team}</span>
              <span className="text-[10.5px] leading-tight text-[#8b8b92]">{s.system}</span>
              <span className={`mt-0.5 font-mono text-[10.5px] tabular-nums ${last[i] < 3 ? "text-[#3ccf8e]" : "text-[#55555c]"}`}>
                {last[i] < 3 ? "synced now" : `${last[i]}s ago`}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <svg ref={svg} viewBox={`0 0 ${W} 64`} className="hidden h-auto w-full md:block" aria-hidden>
        {xs.map((x, i) => {
          const d = `M${x},0 C${x},34 ${W / 2},26 ${W / 2},62`;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={i === hot ? "#3ccf8e" : "rgba(255,255,255,0.10)"} strokeWidth={i === hot ? 1.6 : 1} />
              <circle r="2.4" fill="#3ccf8e" opacity="0.85">
                <animateMotion dur="2.6s" begin={`${(i * 0.29).toFixed(2)}s`} repeatCount="indefinite" path={d} />
              </circle>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-col items-center gap-2 md:mt-0">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#3ccf8e]/30 bg-[#3ccf8e]/[0.08] px-3 py-1.5 text-[12px] font-medium text-[#3ccf8e]">
          <span aria-hidden className="od-ping size-[7px] rounded-full bg-[#3ccf8e]" />
          {OWNER.first}&rsquo;s dashboard · updated {now ? now.time : "live"} IST
        </span>
        <p key={k} className="od-in text-center text-[12.5px] leading-snug text-[#b9b9b4]">
          <span className="text-[#ededea]">{SYNC_SOURCES[event.from].team}</span> · {event.text}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Order tracker

type TrackFilter = "all" | "risk" | "factory" | "road" | "unpaid" | "paid";
const FILTERS: { id: TrackFilter; label: string; test: (o: Order) => boolean }[] = [
  { id: "all", label: "All orders", test: () => true },
  { id: "risk", label: "At risk or late", test: (o) => o.risk === "At risk" || o.risk === "Late" },
  { id: "factory", label: "In the factory", test: (o) => o.stage <= 3 },
  { id: "road", label: "Shipped", test: (o) => o.stage === 4 || o.stage === 5 },
  { id: "unpaid", label: "Waiting for payment", test: (o) => o.stage === 6 },
  { id: "paid", label: "Paid", test: (o) => o.stage === 7 },
];

export function Tracker() {
  const { openDrawer } = useDemo();
  const [f, setF] = useState<TrackFilter>("all");
  const rows = ORDERS.filter(FILTERS.find((x) => x.id === f)!.test);
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Order tracker" agent="Order, planning and finance agents keep this current" line="Every order from the customer's purchase order to the money in your bank. Where it is right now, how long it has been there, what happens next, and who owns it. Click any order for its full history." />
      <Panel title="Open orders by stage">
        <StageStrip />
      </Panel>
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs tabs={FILTERS.map((x) => ({ id: x.id, label: x.label, n: ORDERS.filter(x.test).length }))} value={f} onChange={setF} />
        </div>
        <Table
          min={960}
          rowKey={(o) => o.so}
          rows={rows}
          onRow={(o) => openDrawer(orderDrawer(o))}
          cols={[
            { key: "so", label: "Order", render: (o) => (<span><span className="font-mono">{o.so}</span><span className="block text-[12px] text-[#8b8b92]">{o.customer}</span></span>) },
            { key: "part", label: "Part", render: (o) => (<span>{o.part}<span className="block text-[12px] text-[#8b8b92]">{o.qty} · {o.value}</span></span>) },
            { key: "stage", label: "Status", className: "w-[200px]", render: (o) => <StageBar stage={o.stage} risk={o.risk} /> },
            { key: "since", label: "In stage", render: (o) => <span className="font-mono text-[12.5px]">{o.since}</span> },
            { key: "next", label: "Next", className: "max-w-[230px]", render: (o) => <span className="text-[12.5px] leading-snug text-[#b9b9b4]">{o.next}</span> },
            { key: "owner", label: "Owner", render: (o) => <span className="text-[12.5px]">{o.owner}</span> },
            { key: "money", label: "Money", className: "max-w-[170px]", render: (o) => <span className="text-[12.5px] leading-snug text-[#b9b9b4]">{o.money}</span> },
            { key: "risk", label: "Due", render: (o) => (<span className="flex flex-col items-start gap-1"><Badge tone={o.risk === "Late" ? "bad" : o.risk === "At risk" ? "warn" : "good"}>{o.risk}</Badge><span className="text-[12px] text-[#8b8b92]">{o.due}</span></span>) },
          ]}
        />
      </Panel>
    </div>
  );
}

export function orderDrawer(o: Order) {
  return {
    eyebrow: `${o.so} · ${o.customer}`,
    title: `${o.part} · ${o.qty} pieces · ${o.value}`,
    body: (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <StageBar stage={o.stage} risk={o.risk} />
          <p className="mt-2 text-[13.5px]">
            Now: <b className="font-medium">{STAGES[o.stage]}</b> for {o.since}. Next: {o.next}.
          </p>
          {o.why && <p className="mt-1 text-[13px] text-[#f5b54a]">{o.why}</p>}
        </div>
        <div>
          <Field k="Due" v={o.due} />
          <Field k="Owner" v={o.owner} />
          <Field k="Money" v={o.money} />
        </div>
        <ol className="flex flex-col">
          {STAGES.map((s, i) => {
            const h = o.history.filter((x) => x.stage === i);
            const state = i < o.stage ? "done" : i === o.stage ? "now" : "next";
            return (
              <li key={s} className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-3">
                <span className="relative flex justify-center">
                  <span aria-hidden className={`mt-1 size-3 rounded-full border-2 ${state === "done" ? "border-[#3ccf8e] bg-[#3ccf8e]" : state === "now" ? "border-[#ededea] bg-[#ededea]" : "border-[#55555c] bg-transparent"}`} />
                  {i < STAGES.length - 1 && <span aria-hidden className="absolute top-5 bottom-0 w-px bg-white/[0.1]" />}
                </span>
                <div className="pb-3.5">
                  <p className={`text-[13.5px] font-medium ${state === "next" ? "text-[#8b8b92]" : ""}`}>{s}</p>
                  {h.map((x) => (
                    <p key={x.text} className="mt-0.5 text-[12.5px] leading-snug text-[#b9b9b4]">
                      <span className="text-[#8b8b92]">{x.when} · {x.by}.</span> {x.text}
                    </p>
                  ))}
                  {state === "next" && <p className="text-[12px] text-[#55555c]">Not started</p>}
                  {state !== "next" && h.length === 0 && <p className="text-[12px] text-[#8b8b92]">Completed</p>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    ),
  };
}

// ---------------------------------------------------------------- Approvals

export function Approvals() {
  const { approved, approve } = useDemo();
  const open = APPROVALS.filter((a) => !approved[a.id]);
  const done = APPROVALS.filter((a) => approved[a.id]);
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader
        title={open.length ? `${open.length} decision${open.length === 1 ? "" : "s"} for you. Everything else is handled.` : "Nothing needs you right now."}
        line="Agents act alone only inside the rules you set. Anything above a limit comes here, prepared with the facts, so you decide in seconds and the work carries on."
      />
      <div className="grid gap-3 xl:grid-cols-2">
        {open.map((a, i) => (
          <article key={a.id} className="flex flex-col rounded-xl border border-white/[0.07] bg-[#141417] p-4">
            <p className="text-[12px] text-[#8b8b92]">Prepared by the {a.who.toLowerCase()} · rule: {a.rule}</p>
            <h4 className="mt-1.5 text-[15.5px] leading-snug font-medium">{a.title}</h4>
            <p className="mt-1.5 text-[13.5px] leading-snug text-[#b9b9b4]">{a.ask}</p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {a.facts.map((f) => (
                <li key={f} className="flex gap-2 text-[13px] text-[#b9b9b4]">
                  <span aria-hidden className="text-[#3ccf8e]">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <button type="button" onClick={() => approve(a.id)} className={`rounded-md bg-[#f2f1ec] px-4 py-2 text-[13px] font-medium text-[#0b0b0c] hover:bg-white ${i === 0 ? "od-pulse" : ""}`}>
                Approve
              </button>
              <span className="rounded-md px-4 py-2 text-[13px] text-[#8b8b92] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">Change</span>
              <span className="rounded-md px-4 py-2 text-[13px] text-[#8b8b92] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">Call me</span>
            </div>
          </article>
        ))}
      </div>
      {done.length > 0 && (
        <Panel title="Decided today">
          <ul className="flex flex-col gap-2">
            {done.map((a) => (
              <li key={a.id} className="flex gap-2.5 text-[13.5px]">
                <span aria-hidden className="text-[#3ccf8e]">✓</span>
                <span>
                  {a.title}
                  <span className="block text-[12.5px] text-[#8b8b92]">{a.result}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Documents

export function Documents() {
  const { openDrawer } = useDemo();
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Documents" agent="Document agent running" line="Every purchase order, invoice, certificate, drawing and debit note is read the moment it arrives, matched to the right record, and filed. Only the unclear ones reach a person." />
      <StatGrid stats={DOC_STATS} cols={4} />
      <Panel title="Read today" flush>
        <Table
          min={900}
          rowKey={(d) => d.time + d.type}
          rows={DOCUMENTS}
          onRow={(d) =>
            openDrawer({
              eyebrow: `${d.type} · ${d.from} · ${d.time}`,
              title: "What the agent read",
              body: (
                <div className="flex flex-col gap-3">
                  {d.fields.split(" · ").map((f, i) => (
                    <Field key={f} k={`Field ${i + 1}`} v={f} />
                  ))}
                  <Field k="Matched to" v={d.matched} />
                  <Field k="Status" v={<Badge tone={toneOf(d.status)}>{d.status}</Badge>} />
                </div>
              ),
            })
          }
          cols={[
            { key: "time", label: "Received", render: (d) => <span className="font-mono text-[12.5px]">{d.time}</span> },
            { key: "type", label: "Document", render: (d) => (<span>{d.type}<span className="block text-[12px] text-[#8b8b92]">{d.from}</span></span>) },
            { key: "fields", label: "What it says", render: (d) => <span className="text-[12.5px] text-[#b9b9b4]">{d.fields}</span> },
            { key: "matched", label: "Matched to", render: (d) => <span className="text-[12.5px]">{d.matched}</span> },
            { key: "status", label: "Status", render: (d) => <Badge tone={toneOf(d.status)}>{d.status}</Badge> },
          ]}
        />
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------- Agents and audit

export function Agents() {
  const [tab, setTab] = useState<"team" | "rules" | "log">("team");
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Agents and audit" line="Your digital team: what each agent does, how much it handles alone, the rules it can never break, and a record of every action it took." />
      <StatGrid stats={AGENT_STATS} cols={4} />
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs tabs={[{ id: "team", label: "Agents", n: AGENTS.length }, { id: "rules", label: "Rules you set", n: RULES.length }, { id: "log", label: "Audit log" }]} value={tab} onChange={setTab} />
        </div>
        {tab === "team" && (
          <Table
            min={820}
            rowKey={(a) => a.name}
            rows={AGENTS}
            cols={[
              { key: "name", label: "Agent", render: (a) => (<span className="flex items-center gap-2"><span aria-hidden className="od-ping size-[7px] rounded-full bg-[#3ccf8e]" />{a.name}</span>) },
              { key: "dept", label: "Department", render: (a) => <span className="text-[#b9b9b4]">{a.dept}</span> },
              { key: "does", label: "What it does", render: (a) => <span className="text-[12.5px] text-[#b9b9b4]">{a.does}</span> },
              { key: "tasks", label: "Tasks today", right: true, render: (a) => a.tasks },
              { key: "alone", label: "Done alone", right: true, render: (a) => a.alone },
              { key: "asked", label: "Asked a person", right: true, render: (a) => a.asked },
            ]}
          />
        )}
        {tab === "rules" && (
          <ul className="px-4 pb-3">
            {RULES.map((r) => (
              <li key={r.rule} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.05] py-3 text-[13.5px] last:border-b-0">
                <span>{r.rule}</span>
                <Badge tone={r.who === "Blocked" ? "bad" : "info"}>{r.who}</Badge>
              </li>
            ))}
          </ul>
        )}
        {tab === "log" && (
          <Table
            min={860}
            rowKey={(a) => a.time + a.action}
            rows={AUDIT}
            cols={[
              { key: "time", label: "Time", render: (a) => <span className="font-mono text-[12.5px]">{a.time}</span> },
              { key: "agent", label: "Agent", render: (a) => a.agent },
              { key: "action", label: "Action", render: (a) => <span className="text-[#b9b9b4]">{a.action}</span> },
              { key: "record", label: "Record", render: (a) => <span className="font-mono text-[12px]">{a.record}</span> },
              { key: "by", label: "Allowed by", render: (a) => <span className="text-[12.5px] text-[#b9b9b4]">{a.by}</span> },
              { key: "result", label: "Result", render: (a) => <Badge tone={toneOf(a.result)}>{a.result}</Badge> },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}
