"use client";

import { useState } from "react";
import {
  ATTENDANCE,
  CASH_13,
  CASH_START,
  CUSTOMERS,
  D_STEPS,
  DEDUCTIONS,
  DISPATCH_IMPACT,
  DISPATCH_STATS,
  DOWNTIME,
  EIGHT_DS,
  ENQUIRIES,
  FINANCE_IMPACT,
  FINANCE_STATS,
  HIRING,
  INSPECTIONS,
  MACHINES,
  MARGINS,
  MATERIALS,
  NCRS,
  ORDER_IMPACT,
  ORDER_STATS,
  ORDERS,
  PEOPLE_IMPACT,
  PEOPLE_STATS,
  PIPELINE,
  PLAN,
  PLAN_DAYS,
  POS,
  PRODUCTION_IMPACT,
  PRODUCTION_STATS,
  PURCHASE_IMPACT,
  PURCHASE_STATS,
  QUALITY_IMPACT,
  QUALITY_STATS,
  QUOTES,
  RECEIVABLES,
  SALES_IMPACT,
  SALES_STATS,
  SERVICE_IMPACT,
  SERVICE_STATS,
  SHIFTS,
  SHIPMENTS,
  SKILLS,
  SUPPLIERS,
  TICKETS,
  type Deal,
  type Machine,
  type Ticket,
} from "./data";
import { Badge, C, CashChart, Field, HBars, ImpactStrip, Panel, StageBar, StatGrid, Table, Tabs, TONE_TEXT, Thread, ViewHeader, toneOf, useDemo } from "./kit";
import { orderDrawer } from "./views-company";

// ---------------------------------------------------------------- Sales

export function Sales() {
  const { openDrawer } = useDemo();
  const [tab, setTab] = useState<"pipeline" | "enquiries" | "quotes" | "customers">("pipeline");
  const dealDrawer = (d: Deal, stage: string) => ({
    act: `deal:${d.id}`,
    eyebrow: `${d.id} · ${stage}`,
    title: `${d.customer}: ${d.title}`,
    body: (
      <div>
        <Field k="Annual value" v={d.value} />
        <Field k="Chance of winning" v={`${d.prob}%`} />
        <Field k="Weighted" v={`$${Math.round((parseFloat(d.value.replace(/[$K]/g, "")) * d.prob) / 100)}K`} />
        <Field k="Next step" v={d.next} />
        <Field k="Account owner" v={d.owner} />
        <Field k="In this stage" v={d.age} />
        {d.agent && <Field k="Agent" v={<span className="text-[#3ccf8e]">{d.agent}</span>} />}
      </div>
    ),
  });
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Sales" agent="Sales agent · 214 tasks today" line="Every enquiry answered within minutes, quotes priced from your own rates, and every open quote followed up until there is a decision. Your team spends its time with buyers, not on email." />
      <StatGrid stats={SALES_STATS} />
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs
            tabs={[
              { id: "pipeline", label: "Pipeline", n: 42 },
              { id: "enquiries", label: "Enquiries", n: ENQUIRIES.length },
              { id: "quotes", label: "Quotes", n: QUOTES.length },
              { id: "customers", label: "Customers", n: CUSTOMERS.length },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        {tab === "pipeline" && (
          <div className="od-scroll overflow-x-auto p-3">
            <div className="grid min-w-[1060px] grid-cols-5 gap-2.5">
              {PIPELINE.map((col) => (
                <div key={col.stage} className="flex flex-col gap-2 rounded-lg bg-white/[0.03] p-2">
                  <p className="flex justify-between px-1 pt-0.5 text-[12.5px]">
                    <span className="font-medium">{col.stage}</span>
                    <span className="font-mono text-[#8b8b92]">{col.total}</span>
                  </p>
                  {col.deals.map((d) => (
                    <button key={d.id} type="button" onClick={() => openDrawer(dealDrawer(d, col.stage))} className="flex flex-col gap-1.5 rounded-lg border border-white/[0.07] bg-[#141417] p-2.5 text-left transition-colors hover:border-white/20">
                      <span className="flex justify-between gap-2 text-[12px] text-[#8b8b92]">
                        <span>{d.id}</span>
                        <span>{d.age}</span>
                      </span>
                      <span className="text-[13px] leading-snug font-medium">{d.customer}</span>
                      <span className="text-[12px] leading-snug text-[#b9b9b4]">{d.title}</span>
                      <span className="flex items-center justify-between gap-2 font-mono text-[12.5px]">
                        <span>{d.value}</span>
                        <span className="text-[#8b8b92]">{d.prob}%</span>
                      </span>
                      <span className="text-[12px] leading-snug text-[#f5b54a]">{d.next}</span>
                      {d.agent && <span className="text-[11.5px] text-[#3ccf8e]">● {d.agent}</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "enquiries" && (
          <Table
            rowKey={(e) => e.time + e.from}
            rows={ENQUIRIES}
            cols={[
              { key: "time", label: "Received", render: (e) => <span className="font-mono text-[12.5px] whitespace-nowrap">{e.time}</span> },
              { key: "from", label: "From", render: (e) => e.from },
              { key: "channel", label: "Channel", render: (e) => <span className="text-[#b9b9b4]">{e.channel}</span> },
              { key: "ask", label: "Request", render: (e) => <span className="text-[12.5px] text-[#b9b9b4]">{e.ask}</span> },
              { key: "value", label: "Value", right: true, render: (e) => e.value },
              { key: "reply", label: "Replied in", right: true, render: (e) => <span className="text-[#3ccf8e]">{e.reply}</span> },
              { key: "status", label: "Status", render: (e) => <Badge tone={toneOf(e.status)}>{e.status}</Badge> },
            ]}
          />
        )}
        {tab === "quotes" && (
          <Table
            rowKey={(q) => q.no}
            rows={QUOTES}
            cols={[
              { key: "no", label: "Quote", render: (q) => <span className="font-mono">{q.no}</span> },
              { key: "customer", label: "Customer", render: (q) => q.customer },
              { key: "part", label: "Part", render: (q) => <span className="text-[#b9b9b4]">{q.part}</span> },
              { key: "value", label: "Value", right: true, render: (q) => q.value },
              { key: "margin", label: "Margin", right: true, render: (q) => <span className={parseFloat(q.margin) < 20 ? "text-[#f5b54a]" : ""}>{q.margin}</span> },
              { key: "valid", label: "Valid to", render: (q) => q.valid },
              { key: "follow", label: "Follow-ups", render: (q) => <span className="text-[#b9b9b4]">{q.follow}</span> },
              { key: "status", label: "Status", render: (q) => <Badge tone={toneOf(q.status)}>{q.status}</Badge> },
            ]}
          />
        )}
        {tab === "customers" && (
          <Table
            rowKey={(c) => c.name}
            rows={CUSTOMERS}
            cols={[
              { key: "name", label: "Customer", render: (c) => (<span>{c.name}<span className="block text-[12px] text-[#8b8b92]">{c.segment}</span></span>) },
              { key: "ytd", label: "Sales this year", right: true, render: (c) => c.ytd },
              { key: "open", label: "Open orders", right: true, render: (c) => c.open },
              { key: "pays", label: "Pays in", right: true, render: (c) => c.pays },
              { key: "otif", label: "On time to them", right: true, render: (c) => c.otif },
              { key: "health", label: "Account", render: (c) => <Badge tone={toneOf(c.health)}>{c.health}</Badge> },
            ]}
          />
        )}
      </Panel>
      <ImpactStrip items={SALES_IMPACT} />
    </div>
  );
}

// ---------------------------------------------------------------- Customer service

export function Service() {
  const { openDrawer } = useDemo();
  const types = ["All", "Complaint", "Order status", "Documents", "Return", "Change request"] as const;
  const [t, setT] = useState<(typeof types)[number]>("All");
  const rows = TICKETS.filter((x) => t === "All" || x.type === t);
  const drawer = (k: Ticket) => ({
    act: `ticket:${k.id}`,
    eyebrow: `${k.id} · ${k.type} · ${k.pri} · ${k.channel}`,
    title: `${k.customer}: ${k.subject}`,
    body: (
      <div className="flex flex-col gap-4">
        <div>
          <Field k="Status" v={<Badge tone={toneOf(k.status)}>{k.status}</Badge>} />
          <Field k="Deadline" v={<span className={TONE_TEXT[k.slaTone]}>{k.sla}</span>} />
          <Field k="Owner" v={k.owner} />
          {k.link && <Field k="Linked to" v={<span className="font-mono text-[12.5px]">{k.link}</span>} />}
        </div>
        <Thread items={k.thread} />
      </div>
    ),
  });
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Customer service" agent="Service agent · 389 tasks today" line="Every question and complaint from email, WhatsApp, phone and customer portals becomes a ticket with a deadline. The agent answers what it can from your records in seconds and routes the rest to the right person with the full history." />
      <StatGrid stats={SERVICE_STATS} />
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs tabs={types.map((x) => ({ id: x, label: x === "All" ? "All tickets" : x, n: TICKETS.filter((k) => x === "All" || k.type === x).length }))} value={t} onChange={setT} />
        </div>
        <Table
          min={900}
          rowKey={(k) => k.id}
          rows={rows}
          onRow={(k) => openDrawer(drawer(k))}
          cols={[
            { key: "id", label: "Ticket", render: (k) => (<span><span className="font-mono">{k.id}</span><span className="block text-[12px] text-[#8b8b92]">{k.channel}</span></span>) },
            { key: "customer", label: "Customer", render: (k) => k.customer },
            { key: "subject", label: "Subject", render: (k) => <span className="text-[#b9b9b4]">{k.subject}</span> },
            { key: "type", label: "Type", render: (k) => <span className="text-[12.5px] whitespace-nowrap">{k.type}</span> },
            { key: "pri", label: "Priority", render: (k) => <Badge tone={k.pri === "P1" ? "bad" : k.pri === "P2" ? "warn" : "muted"}>{k.pri}</Badge> },
            { key: "sla", label: "Deadline", render: (k) => <span className={`text-[12.5px] whitespace-nowrap ${TONE_TEXT[k.slaTone]}`}>{k.sla}</span> },
            { key: "status", label: "Status", render: (k) => (<span className="text-[12.5px]">{k.status}<span className="block text-[12px] text-[#8b8b92]">{k.owner}</span></span>) },
          ]}
        />
      </Panel>
      <ImpactStrip items={SERVICE_IMPACT} />
    </div>
  );
}

// ---------------------------------------------------------------- Orders and planning

export function Orders() {
  const { openDrawer } = useDemo();
  const [tab, setTab] = useState<"orders" | "plan">("orders");
  const open = ORDERS.filter((o) => o.stage <= 4);
  const KIND = { job: "bg-[#3ccf8e]/20 text-[#bff3dc] border-[#3ccf8e]/30", risk: "bg-[#f5b54a]/20 text-[#ffe2ad] border-[#f5b54a]/40", down: "bg-[#ff6a4d]/20 text-[#ffc2b5] border-[#ff6a4d]/40", ot: "bg-[#7cb4ff]/20 text-[#cfe2ff] border-[#7cb4ff]/40" };
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Orders and planning" agent="Order and planning agents · 105 tasks today" line="Customer purchase orders are read and entered once. The plan stays current with what actually happens on the floor, and a date at risk is flagged days ahead with a way to recover it." />
      <StatGrid stats={ORDER_STATS} />
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs tabs={[{ id: "orders", label: "Orders in progress", n: open.length }, { id: "plan", label: "Machine plan, next 7 days" }]} value={tab} onChange={setTab} />
        </div>
        {tab === "orders" ? (
          <Table
            min={880}
            rowKey={(o) => o.so}
            rows={open}
            onRow={(o) => openDrawer(orderDrawer(o))}
            cols={[
              { key: "so", label: "Order", render: (o) => (<span><span className="font-mono">{o.so}</span><span className="block text-[12px] text-[#8b8b92]">{o.customer}</span></span>) },
              { key: "part", label: "Part", render: (o) => (<span>{o.part}<span className="block text-[12px] text-[#8b8b92]">{o.qty}</span></span>) },
              { key: "value", label: "Value", right: true, render: (o) => o.value },
              { key: "due", label: "Due", render: (o) => <span className="whitespace-nowrap">{o.due}</span> },
              { key: "stage", label: "Status", className: "w-[190px]", render: (o) => <StageBar stage={o.stage} risk={o.risk} /> },
              { key: "risk", label: "Risk", render: (o) => (<span className="flex max-w-[240px] flex-col items-start gap-1"><Badge tone={o.risk === "Late" ? "bad" : o.risk === "At risk" ? "warn" : "good"}>{o.risk}</Badge>{o.why && <span className="text-[12px] leading-snug text-[#8b8b92]">{o.why}</span>}</span>) },
            ]}
          />
        ) : (
          <div className="od-scroll overflow-x-auto p-4">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] text-[12px] text-[#8b8b92]">
                <span />
                {PLAN_DAYS.map((d) => (
                  <span key={d} className="border-l border-white/[0.06] px-2 pb-2">{d}</span>
                ))}
              </div>
              {PLAN.map((m) => (
                <div key={m.machine} className="grid grid-cols-[140px_repeat(7,minmax(0,1fr))] items-stretch border-t border-white/[0.06]">
                  <span className="py-2.5 pr-2 text-[12.5px]">{m.machine}</span>
                  <div className="relative col-span-7 grid grid-cols-7 gap-1 py-1.5">
                    {m.blocks.map((b) => (
                      <span key={b.label} style={{ gridColumn: `${b.start + 1} / span ${b.len}` }} className={`truncate rounded-md border px-2 py-1.5 text-[11.5px] ${KIND[b.kind]}`}>
                        {b.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8b8b92]">
                <span>Green: planned job</span>
                <span className="text-[#f5b54a]">Amber: at risk</span>
                <span className="text-[#ff8a72]">Red: machine down or maintenance</span>
                <span className="text-[#9cc6ff]">Blue: overtime, waiting for approval</span>
              </p>
            </div>
          </div>
        )}
      </Panel>
      <ImpactStrip items={ORDER_IMPACT} />
    </div>
  );
}

// ---------------------------------------------------------------- Production

const MSTATE: Record<Machine["status"], { dot: string; text: string }> = {
  Running: { dot: "bg-[#3ccf8e]", text: "text-[#3ccf8e]" },
  Setup: { dot: "bg-[#f5b54a]", text: "text-[#f5b54a]" },
  Down: { dot: "bg-[#ff6a4d]", text: "text-[#ff8a72]" },
  Idle: { dot: "bg-[#55555c]", text: "text-[#8b8b92]" },
};

export function Production() {
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Production" agent="Production agent · collecting from 12 machines" line="Output, stoppages and their reasons come in from the floor as they happen, not on paper the next day. You see every machine, every shift, and why time was lost." />
      <StatGrid stats={PRODUCTION_STATS} />
      <Panel title="Machines right now">
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {MACHINES.map((m) => (
            <div key={m.id} className={`flex flex-col gap-2 rounded-lg border p-3 ${m.status === "Down" ? "border-[#ff6a4d]/40 bg-[#ff6a4d]/[0.06]" : "border-white/[0.07] bg-[#0e0e10]"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13.5px] font-medium">{m.id}</span>
                <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${MSTATE[m.status].text}`}>
                  <span aria-hidden className={`size-[7px] rounded-full ${MSTATE[m.status].dot}`} />
                  {m.status}
                </span>
              </div>
              <span className="text-[12.5px] leading-snug text-[#b9b9b4]">{m.job}</span>
              <div>
                <div className="flex justify-between text-[12px] text-[#8b8b92]">
                  <span>{m.target ? `${m.made.toLocaleString("en-US")} / ${m.target.toLocaleString("en-US")}` : "—"}</span>
                  <span className="font-mono">OEE {m.oee}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${MSTATE[m.status].dot}`} style={{ width: `${m.target ? Math.min(100, (m.made / m.target) * 100) : 0}%` }} />
                </div>
              </div>
              <span className="text-[12px] text-[#8b8b92]">{m.note ?? `Operator: ${m.operator}`}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Panel title="Where time was lost this week (hours)">
          <HBars rows={DOWNTIME.map((d) => ({ label: d.reason, value: d.hours }))} tone="warn" />
          <p className="mt-3 text-[12.5px] text-[#8b8b92]">Changeover is the biggest loss. The agent suggested grouping Press 1 jobs by die: 2.1 h a week back.</p>
        </Panel>
        <Panel title="Shifts" flush>
          <Table
            min={560}
            rowKey={(s) => s.shift}
            rows={SHIFTS}
            cols={[
              { key: "shift", label: "Shift", render: (s) => s.shift },
              { key: "planned", label: "Planned", right: true, render: (s) => s.planned },
              { key: "made", label: "Made", right: true, render: (s) => s.made },
              { key: "scrap", label: "Scrap", right: true, render: (s) => s.scrap },
              { key: "oee", label: "OEE", right: true, render: (s) => s.oee },
              { key: "note", label: "Note", render: (s) => <span className="text-[12.5px] text-[#b9b9b4]">{s.note}</span> },
            ]}
          />
        </Panel>
      </div>
      <ImpactStrip items={PRODUCTION_IMPACT} />
    </div>
  );
}

// ---------------------------------------------------------------- Quality

export function Quality() {
  const [tab, setTab] = useState<"8d" | "ncr" | "insp">("8d");
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Quality" agent="Quality agent · 52 tasks today" line="Every inspection recorded, every rejection traced to its cause, and every customer complaint run as an 8D with containment the same day. Your PPM and cost of poor quality, always current." />
      <StatGrid stats={QUALITY_STATS} />
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs tabs={[{ id: "8d", label: "Customer complaints (8D)", n: EIGHT_DS.length }, { id: "ncr", label: "Nonconformities", n: NCRS.length }, { id: "insp", label: "Inspections today", n: INSPECTIONS.length }]} value={tab} onChange={setTab} />
        </div>
        {tab === "8d" && (
          <ul className="px-4 pb-2">
            {EIGHT_DS.map((d) => (
              <li key={d.id} className="grid gap-3 border-b border-white/[0.05] py-3.5 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center">
                <div className="min-w-0">
                  <p className="text-[13.5px]"><span className="font-mono">{d.id}</span> · {d.customer} · {d.part}</p>
                  <p className="text-[12.5px] text-[#b9b9b4]">{d.issue}</p>
                  <p className="text-[12px] text-[#8b8b92]">Opened {d.opened} · {d.owner} · {d.due}</p>
                </div>
                <ol className="grid grid-cols-8 gap-1">
                  {D_STEPS.map((s, i) => (
                    <li key={s} className="flex flex-col items-center gap-1">
                      <span className={`h-1.5 w-full rounded-full ${i + 1 < d.step || d.step === 8 ? "bg-[#3ccf8e]" : i + 1 === d.step ? "od-blink bg-[#f5b54a]" : "bg-white/[0.08]"}`} />
                      <span className="text-[10.5px] text-[#8b8b92]">D{i + 1}</span>
                      <span className="hidden text-center text-[10.5px] leading-tight text-[#8b8b92] xl:block">{s}</span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
        {tab === "ncr" && (
          <Table
            rowKey={(n) => n.no}
            rows={NCRS}
            cols={[
              { key: "no", label: "NCR", render: (n) => <span className="font-mono">{n.no}</span> },
              { key: "part", label: "Part", render: (n) => n.part },
              { key: "defect", label: "Defect", render: (n) => <span className="text-[#b9b9b4]">{n.defect}</span> },
              { key: "qty", label: "Quantity", render: (n) => n.qty },
              { key: "source", label: "Source", render: (n) => <span className="text-[12.5px] text-[#b9b9b4]">{n.source}</span> },
              { key: "action", label: "Decision", render: (n) => <span className="text-[12.5px]">{n.action}</span> },
              { key: "cost", label: "Cost", right: true, render: (n) => n.cost },
              { key: "status", label: "Status", render: (n) => <Badge tone={toneOf(n.status)}>{n.status}</Badge> },
            ]}
          />
        )}
        {tab === "insp" && (
          <Table
            min={600}
            rowKey={(n) => n.lot}
            rows={INSPECTIONS}
            cols={[
              { key: "time", label: "Time", render: (n) => <span className="font-mono text-[12.5px]">{n.time}</span> },
              { key: "lot", label: "Lot", render: (n) => <span className="font-mono">{n.lot}</span> },
              { key: "part", label: "Part", render: (n) => n.part },
              { key: "type", label: "Type", render: (n) => <span className="text-[#b9b9b4]">{n.type}</span> },
              { key: "by", label: "By", render: (n) => <span className="text-[#b9b9b4]">{n.by}</span> },
              { key: "result", label: "Result", render: (n) => <Badge tone={n.result === "Pass" ? "good" : "warn"}>{n.result}</Badge> },
            ]}
          />
        )}
      </Panel>
      <ImpactStrip items={QUALITY_IMPACT} />
    </div>
  );
}

// ---------------------------------------------------------------- Purchase and stock

export function Purchase() {
  const [tab, setTab] = useState<"stock" | "po" | "sup">("stock");
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Purchase and stock" agent="Purchase agent · 41 tasks today" line="Every morning the plan is checked against stock. Shortages are caught days ahead, suppliers compared, orders drafted, late deliveries chased, and supplier invoices matched to the PO and goods receipt." />
      <StatGrid stats={PURCHASE_STATS} />
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs tabs={[{ id: "stock", label: "Materials", n: MATERIALS.length }, { id: "po", label: "Purchase orders", n: POS.length }, { id: "sup", label: "Suppliers", n: SUPPLIERS.length }]} value={tab} onChange={setTab} />
        </div>
        {tab === "stock" && (
          <Table
            min={900}
            rowKey={(m) => m.code}
            rows={MATERIALS}
            cols={[
              { key: "code", label: "Item", render: (m) => (<span>{m.name}<span className="block font-mono text-[12px] text-[#8b8b92]">{m.code}</span></span>) },
              { key: "onHand", label: "On hand", right: true, render: (m) => m.onHand },
              { key: "alloc", label: "Promised to orders", right: true, render: (m) => m.alloc },
              { key: "cover", label: "Days left", className: "w-[150px]", render: (m) => (<span className="flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"><span className={`block h-full rounded-full ${m.cover <= 4 ? "bg-[#ff6a4d]" : m.cover <= 7 ? "bg-[#f5b54a]" : "bg-[#3ccf8e]"}`} style={{ width: `${Math.min(100, (m.cover / 21) * 100)}%` }} /></span><span className="w-6 text-right font-mono">{m.cover}</span></span>) },
              { key: "status", label: "Status", render: (m) => <Badge tone={toneOf(m.status)}>{m.status}</Badge> },
              { key: "action", label: "Agent action", render: (m) => <span className="text-[12.5px] text-[#b9b9b4]">{m.action}</span> },
            ]}
          />
        )}
        {tab === "po" && (
          <Table
            rowKey={(p) => p.no}
            rows={POS}
            cols={[
              { key: "no", label: "PO", render: (p) => <span className="font-mono">{p.no}</span> },
              { key: "supplier", label: "Supplier", render: (p) => p.supplier },
              { key: "item", label: "Item", render: (p) => <span className="text-[#b9b9b4]">{p.item}</span> },
              { key: "value", label: "Value", right: true, render: (p) => p.value },
              { key: "due", label: "Due", render: (p) => p.due },
              { key: "status", label: "Status", render: (p) => <Badge tone={toneOf(p.status)}>{p.status}</Badge> },
            ]}
          />
        )}
        {tab === "sup" && (
          <Table
            rowKey={(s) => s.name}
            rows={SUPPLIERS}
            cols={[
              { key: "name", label: "Supplier", render: (s) => s.name },
              { key: "category", label: "Supplies", render: (s) => <span className="text-[#b9b9b4]">{s.category}</span> },
              { key: "otif", label: "On time", right: true, render: (s) => s.otif },
              { key: "reject", label: "Rejected", right: true, render: (s) => s.reject },
              { key: "price", label: "Price vs last quarter", right: true, render: (s) => s.price },
              { key: "rating", label: "Rating", render: (s) => <Badge tone={toneOf(s.rating)}>{s.rating}</Badge> },
            ]}
          />
        )}
      </Panel>
      <ImpactStrip items={PURCHASE_IMPACT} />
    </div>
  );
}

// ---------------------------------------------------------------- Dispatch

export function Dispatch() {
  const DOCS = ["Invoice", "Packing list", "Certificate"];
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Dispatch" agent="Dispatch agent · 38 tasks today" line="Documents are ready before the truck arrives. Customers are told what left and when it will arrive, and proof of delivery is collected and filed so invoices are never disputed." />
      <StatGrid stats={DISPATCH_STATS} />
      <Panel title="Shipments" flush>
        <Table
          min={940}
          rowKey={(s) => s.no}
          rows={SHIPMENTS}
          cols={[
            { key: "no", label: "Shipment", render: (s) => (<span><span className="font-mono">{s.no}</span><span className="block font-mono text-[12px] text-[#8b8b92]">{s.so}</span></span>) },
            { key: "customer", label: "Customer", render: (s) => s.customer },
            { key: "load", label: "Load", render: (s) => <span className="text-[12.5px] text-[#b9b9b4]">{s.load}</span> },
            { key: "vehicle", label: "Truck", render: (s) => <span className="text-[12.5px]">{s.vehicle}</span> },
            { key: "docs", label: "Documents", render: (s) => (<span className="flex flex-col gap-0.5">{DOCS.map((d, i) => (<span key={d} className={`text-[12px] ${s.docs[i] ? "text-[#3ccf8e]" : "text-[#8b8b92]"}`}>{s.docs[i] ? "✓" : "○"} {d}</span>))}{s.note && <span className="text-[11.5px] text-[#f5b54a]">{s.note}</span>}</span>) },
            { key: "eta", label: "Arrives", render: (s) => <span className="whitespace-nowrap">{s.eta}</span> },
            { key: "status", label: "Status", render: (s) => <Badge tone={toneOf(s.status)}>{s.status}</Badge> },
          ]}
        />
      </Panel>
      <ImpactStrip items={DISPATCH_IMPACT} />
    </div>
  );
}

// ---------------------------------------------------------------- Finance

export function Finance() {
  const [tab, setTab] = useState<"ar" | "ded" | "cash" | "margin">("ar");
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="Finance" agent="Finance agent · 302 tasks today" line="Invoices go out the day goods leave. Every payment is matched, every short payment explained and disputed where it's wrong, reminders run on schedule, and you see your cash 13 weeks ahead." />
      <StatGrid stats={FINANCE_STATS} />
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs tabs={[{ id: "ar", label: "Owed to you" }, { id: "ded", label: "Short payments", n: DEDUCTIONS.length }, { id: "cash", label: "Cash, 13 weeks" }, { id: "margin", label: "Margin by customer" }]} value={tab} onChange={setTab} />
        </div>
        {tab === "ar" && (
          <Table
            min={940}
            rowKey={(r) => r.customer}
            rows={RECEIVABLES}
            cols={[
              { key: "customer", label: "Customer", render: (r) => r.customer },
              { key: "current", label: "Not due", right: true, render: (r) => r.current },
              { key: "d30", label: "1–30 late", right: true, render: (r) => <span className={r.d30 !== "$0" ? "text-[#f5b54a]" : "text-[#55555c]"}>{r.d30}</span> },
              { key: "d60", label: "31–60 late", right: true, render: (r) => <span className={r.d60 !== "$0" ? "text-[#ff8a72]" : "text-[#55555c]"}>{r.d60}</span> },
              { key: "d90", label: "60+ late", right: true, render: (r) => <span className={r.d90 !== "$0" ? "text-[#ff6a4d]" : "text-[#55555c]"}>{r.d90}</span> },
              { key: "total", label: "Total", right: true, render: (r) => <b className="font-medium">{r.total}</b> },
              { key: "pays", label: "Pays in", right: true, render: (r) => r.pays },
              { key: "next", label: "Agent's next step", render: (r) => <span className="text-[12.5px] text-[#b9b9b4]">{r.next}</span> },
            ]}
          />
        )}
        {tab === "ded" && (
          <Table
            min={920}
            rowKey={(d) => d.invoice}
            rows={DEDUCTIONS}
            cols={[
              { key: "customer", label: "Customer", render: (d) => (<span>{d.customer}<span className="block font-mono text-[12px] text-[#8b8b92]">{d.invoice}</span></span>) },
              { key: "amount", label: "Deducted", right: true, render: (d) => d.amount },
              { key: "reason", label: "Reason the agent found", render: (d) => <span className="text-[12.5px] text-[#b9b9b4]">{d.reason}</span> },
              { key: "recover", label: "Recoverable", right: true, render: (d) => <span className={d.recover !== "$0" ? "text-[#3ccf8e]" : "text-[#55555c]"}>{d.recover}</span> },
              { key: "status", label: "Status", render: (d) => <Badge tone={toneOf(d.status)}>{d.status}</Badge> },
            ]}
          />
        )}
        {tab === "cash" && (
          <div className="p-4">
            <CashChart weeks={CASH_13} start={CASH_START} />
            <p className="mt-3 text-[12.5px] text-[#8b8b92]">Built from open invoices and each customer&rsquo;s real payment habits, supplier bills, payroll and loan repayments. Updated every morning.</p>
          </div>
        )}
        {tab === "margin" && (
          <div className="p-4">
            <HBars rows={MARGINS.map((m) => ({ label: m.customer, value: m.margin, note: m.revenue }))} unit="%" max={35} />
            <p className="mt-3 text-[12.5px] text-[#8b8b92]">Kiran Motors is your third-largest customer and your lowest margin, and pays slowest. The FLG-77 price review in Sales is open.</p>
          </div>
        )}
      </Panel>
      <ImpactStrip items={FINANCE_IMPACT} />
    </div>
  );
}

// ---------------------------------------------------------------- People

export function People() {
  const [tab, setTab] = useState<"att" | "hire" | "skills">("att");
  const SK = ["—", "Training", "Certified"];
  return (
    <div className="flex flex-col gap-5">
      <ViewHeader title="People" agent="People agent · 18 tasks today" line="Attendance by shift, overtime, hiring and onboarding in one place. Applications are screened against your must-haves, interviews booked, and new joiners get the same first week every time." />
      <StatGrid stats={PEOPLE_STATS} />
      <Panel flush>
        <div className="px-4 pt-2">
          <Tabs tabs={[{ id: "att", label: "Attendance today" }, { id: "hire", label: "Hiring", n: HIRING.length }, { id: "skills", label: "Who can run what" }]} value={tab} onChange={setTab} />
        </div>
        {tab === "att" && (
          <Table
            min={620}
            rowKey={(a) => a.team + a.shift}
            rows={ATTENDANCE}
            cols={[
              { key: "team", label: "Team", render: (a) => a.team },
              { key: "shift", label: "Shift", render: (a) => <span className="text-[#b9b9b4]">{a.shift}</span> },
              { key: "planned", label: "Planned", right: true, render: (a) => a.planned },
              { key: "present", label: "Present", right: true, render: (a) => <span className="text-[#3ccf8e]">{a.present}</span> },
              { key: "leave", label: "On leave", right: true, render: (a) => a.leave },
              { key: "absent", label: "Absent", right: true, render: (a) => <span className={a.absent ? "text-[#ff8a72]" : "text-[#55555c]"}>{a.absent}</span> },
            ]}
          />
        )}
        {tab === "hire" && (
          <Table
            min={820}
            rowKey={(h) => h.role}
            rows={HIRING}
            cols={[
              { key: "role", label: "Role", render: (h) => h.role },
              { key: "applied", label: "Applied", right: true, render: (h) => h.applied },
              { key: "screened", label: "Fit", right: true, render: (h) => h.screened },
              { key: "interview", label: "Interviews", right: true, render: (h) => h.interview },
              { key: "offer", label: "Offers", right: true, render: (h) => h.offer },
              { key: "open", label: "Open for", right: true, render: (h) => h.open },
              { key: "next", label: "Next", render: (h) => <span className="text-[12.5px] text-[#b9b9b4]">{h.next}</span> },
            ]}
          />
        )}
        {tab === "skills" && (
          <div className="od-scroll overflow-x-auto p-4">
            <table className="min-w-[560px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th scope="col" className="pr-4 pb-2 text-left font-medium text-[#8b8b92]">Operator</th>
                  {SKILLS.machines.map((m) => (
                    <th key={m} scope="col" className="px-2 pb-2 font-medium text-[#8b8b92]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SKILLS.people.map((p) => (
                  <tr key={p.name} className="border-t border-white/[0.05]">
                    <td className="py-2 pr-4">{p.name}</td>
                    {p.s.map((v, i) => (
                      <td key={i} className="px-2 py-2 text-center">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[11.5px] ${v === 2 ? "bg-[#3ccf8e]/15 text-[#3ccf8e]" : v === 1 ? "bg-[#f5b54a]/15 text-[#f5b54a]" : "text-[#55555c]"}`}>{SK[v]}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className={`mt-3 text-[12.5px] ${C.mute}`}>Only 3 people are certified on Press 2, and one of them is on the night shift. The agent has scheduled training for K. Iqbal.</p>
          </div>
        )}
      </Panel>
      <ImpactStrip items={PEOPLE_IMPACT} />
    </div>
  );
}
