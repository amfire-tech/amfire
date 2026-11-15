"use client";

import { useState } from "react";
import { AGING, CHANNEL_MIX, CLIENTS, COHORTS, DSO, FORECAST, MONTHS, MOVES, PIPELINE, PRICE, PRODUCT_SPLIT, REVENUE, SCORE, OFFICES, clientById, siteById, type Channel, type InvStatus, type Tone } from "./data";
import { clientName, inr, money, useOps } from "./store";
import { AGE_RAMP, AgingBars, Badge, Bar, Btn, Dot, ForecastChart, Illustrative, Impact, Legend, MetricStrip, Panel, SERIES, Seg, Table, Td, Th, TrendLine, ViewHead, cx } from "./ui";

const INV_TONE: Record<InvStatus, Tone> = { Draft: "muted", Sent: "info", "Awaiting sign-off": "warn", Overdue: "bad", Paid: "good", "Refund due": "warn", Refunded: "good" };
const CH_TONE: Record<Channel, Tone> = { "Client app": "brand", "Bank transfer": "muted", UPI: "muted", Cheque: "warn", "Payment link": "good", "Virtual account": "good" };

// ---------------------------------------------------------------- Billing

export function Billing() {
  const { s, d, m } = useOps();
  const [f, setF] = useState<"all" | "open" | "overdue" | "paid">("open");
  const list = s.invoices
    .filter((i) => m.inScope(siteById(i.site).office))
    .filter((i) => (f === "all" ? true : f === "open" ? ["Sent", "Awaiting sign-off", "Draft", "Refund due"].includes(i.status) : f === "overdue" ? i.status === "Overdue" : i.status === "Paid" || i.status === "Refunded"));
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="Billing"
        agent="Billing agent · 498 invoices on 1 Nov"
        line="Three kinds of money, handled the same way every time: the camera cost (50% advance, 50% on installation, or all on the day), the monthly charge per camera against the PO, and the 40% buy-back when a camera comes home. Every night each live camera is checked against an invoice."
      />
      <MetricStrip
        cols={5}
        items={[
          { label: "Cameras billed vs live", value: `${inr(m.billed)} / ${inr(m.live)}`, tone: m.gapCount ? "bad" : "good", foot: m.gapCount ? `${m.gapCount} items to bill · ${money(m.gapValue)}` : "in step" },
          { label: "Monthly run, 1 Nov", value: "498 / 498", tone: "good", foot: "all raised by 06:00" },
          { label: "Waiting for client sign-off", value: s.invoices.filter((i) => i.status === "Awaiting sign-off").length + 14, tone: "warn", foot: "chased every 3 days" },
          { label: "POs over 90% used", value: 7, tone: "warn", foot: "extensions drafted" },
          { label: "Buy-backs this quarter", value: "₹5.3 L", foot: "11 cameras returned" },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Live but not billed" sub="Found by the nightly check of every live camera and every service delivered." right={s.gaps.length ? <Badge tone="bad">{s.gaps.length} found</Badge> : <Badge tone="good">none</Badge>}>
          <div className="flex flex-col gap-2">
            {s.gaps.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#fdf6f2] p-3 ring-1 ring-[#f6dccf]">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold">{siteById(g.site).name}</p>
                  <p className="text-[12px] leading-snug text-[#6b6f76]">{g.text}</p>
                </div>
                <span className="text-[13px] font-semibold tabular-nums">
                  {money(g.amount)}
                  {g.per === "month" ? "/mo" : ""}
                </span>
                <Btn size="xs" onClick={() => d({ t: "bill-gap", id: g.id })}>
                  Bill it
                </Btn>
              </div>
            ))}
            {!s.gaps.length && <p className="rounded-lg bg-[#ebf7ef] p-3 text-[12.5px] text-[#15803d]">Every live camera and every service delivered is on an invoice.</p>}
          </div>
        </Panel>
        <Panel title="How one camera is billed" sub="The same rules for every site, posted in Zoho Books">
          <ol className="flex flex-col gap-2.5 text-[12.5px]">
            {[
              ["PO received", "Advance invoice with a payment link", `₹${inr(PRICE.cameraSystem * PRICE.advanceShare)}`],
              ["Installation complete", "Balance raised the same second", `₹${inr(PRICE.cameraSystem * (1 - PRICE.advanceShare))}`],
              ["1st of every month", "Monthly charge per camera, per PO", `₹${inr(PRICE.monthly)}`],
              ["PO 90% used", "Extension request drafted for approval", "—"],
              ["Camera returned", "40% buy-back as a credit note", `−₹${inr(PRICE.cameraSystem * PRICE.buybackShare)}`],
            ].map(([w, t, a], i) => (
              <li key={w} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-start gap-3">
                <span className="grid size-[22px] place-items-center rounded-full bg-[#f0eefd] text-[11px] font-semibold text-[#5b47e0]">{i + 1}</span>
                <span>
                  <span className="block font-medium">{w}</span>
                  <span className="text-[12px] text-[#6b6f76]">{t}</span>
                </span>
                <span className="font-medium tabular-nums">{a}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <Panel title="Waiting on the client's side" sub="Invoices sitting in a vendor portal or with a site engineer for sign-off. The agent chases the right person.">
        <div className="grid gap-2 md:grid-cols-3">
          {[["Northgate Metro EPC", "Vendor portal", "INV-11050 uploaded 3 Oct", 43], ["Meridian Infra · Metro Package 4", "Site engineer sign-off", "INV-11201 with R. Sharma", 9], ["Gulf Crest Contracting", "PMC approval", "3 invoices, AED 2,535", 6]].map(([a, b, c, n]) => (
            <div key={a as string} className="rounded-lg bg-[#fbfbfa] p-3 ring-1 ring-[#efefeb]">
              <p className="text-[12.5px] font-semibold">{a}</p>
              <p className="text-[12px] text-[#6b6f76]">
                {b} · {c}
              </p>
              <p className={cx("mt-1.5 text-[12px] font-medium", (n as number) > 30 ? "text-[#c2410c]" : "text-[#a16207]")}>{n as number} days waiting</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel
        flush
        title="Invoices"
        sub="Try Send link, then Client pays: the payment lands and matches itself."
        right={<Seg value={f} onChange={setF} options={[{ id: "open", label: "Open" }, { id: "overdue", label: "Overdue" }, { id: "paid", label: "Paid" }, { id: "all", label: "All" }]} />}
      >
        <Table min={980}>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th>Site · client</Th>
              <Th>Raised</Th>
              <Th>Due</Th>
              <Th className="text-right">Amount</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {list.map((i) => {
              const site = siteById(i.site);
              return (
                <tr key={i.id}>
                  <Td>
                    <span className="text-[11px] text-[#8a8e95]">{i.id}</span>
                    <span className="block font-medium">{i.kind}</span>
                  </Td>
                  <Td>
                    {site.name}
                    <span className="block text-[11px] text-[#8a8e95]">{clientById(site.client).name}</span>
                  </Td>
                  <Td className="text-[#6b6f76]">{i.raised}</Td>
                  <Td className="text-[#6b6f76]">{i.due}</Td>
                  <Td className={cx("text-right font-medium", i.kind === "Buy-back refund" && "text-[#5b47e0]")}>
                    {i.kind === "Buy-back refund" ? "−" : ""}
                    {money(i.amount)}
                  </Td>
                  <Td>
                    <Badge tone={INV_TONE[i.status]}>{i.status}</Badge>
                    {i.note && <span className="mt-1 block max-w-[260px] text-[11px] leading-snug text-[#8a8e95]">{i.note}</span>}
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {["Sent", "Overdue", "Awaiting sign-off"].includes(i.status) && (
                      <span className="inline-flex gap-1">
                        <Btn size="xs" kind="secondary" onClick={() => d({ t: "pay-link", inv: i.id })}>
                          Send link
                        </Btn>
                        <Btn size="xs" kind="ghost" onClick={() => d({ t: "client-pays", inv: i.id })}>
                          Client pays
                        </Btn>
                      </span>
                    )}
                    {i.status === "Refund due" && s.pending.includes("ap1") && (
                      <Btn size="xs" onClick={() => d({ t: "approve", id: "ap1" })}>
                        Approve buy-back
                      </Btn>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
      <Impact items={[{ label: "Install to first invoice", before: "days, if ever", now: "the same second" }, { label: "Monthly invoices", before: "a week of work", now: "done by 06:00 on the 1st" }, { label: "Live but not billed", before: "unknown", now: "checked every night" }, { label: "Buy-backs", before: "worked out by hand", now: "on check-in" }]} />
    </div>
  );
}

// ---------------------------------------------------------------- Payments and collections

export function Payments() {
  const { s, d, m } = useOps();
  const matched = s.payments.filter((p) => p.state === "Matched").length;
  const review = s.payments.filter((p) => p.state !== "Matched");
  const totals = [0, 1, 2, 3].map((b) => AGING.reduce((t, r) => t + [r.b0, r.b30, r.b60, r.b90][b], 0));
  return (
    <div className="flex flex-col gap-4">
      <ViewHead
        title="Payments and collections"
        agent="Payments agent · reads every channel"
        line="Clients pay however they like: in your app, by bank transfer, UPI, cheque or a payment link. Every rupee is read, matched to its invoice and posted to the right site in Zoho Books. What's owed is shown by client, by site and by age, and chased on each client's best channel."
      />
      <MetricStrip
        cols={5}
        items={[
          { label: "Collected this month", value: money(m.collected), delta: { v: 9, suffix: "vs October" } },
          { label: "Matched with no one", value: `${Math.round(((142 + matched) / (145 + s.payments.length)) * 100)}%`, foot: `${142 + matched} of ${145 + s.payments.length} this week` },
          { label: "Need a look", value: review.length, tone: review.length ? "warn" : "good", foot: "each with a suggestion" },
          { label: "Overdue", value: money(m.overdue), tone: "warn", foot: "₹6.6 L over 60 days" },
          { label: "Days to get paid", value: "41", delta: { v: -11, good: false, unit: " d", suffix: "in 12 months" } },
        ]}
      />
      <Panel title="Payments that need a look" sub="Ops One has already found the likely invoice. Confirm, and it posts in Zoho Books." right={review.length ? <Badge tone="warn">{review.length}</Badge> : <Badge tone="good">all matched</Badge>}>
        <div className="flex flex-col gap-2">
          {review.map((p) => (
            <div key={p.id} className="grid gap-3 rounded-lg p-3 ring-1 ring-[#ececE8] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                  {money(p.amount)} <Badge tone={CH_TONE[p.channel]}>{p.channel}</Badge>
                  <span className="text-[11px] font-normal text-[#8a8e95]">{p.when}</span>
                </p>
                <p className="mt-1 truncate font-mono text-[11px] text-[#6b6f76]">{p.raw}</p>
              </div>
              <div className="min-w-0 text-[12px] leading-snug text-[#4a4e55]">
                <span className="font-semibold text-[#111113]">{p.alloc.length ? `${p.alloc.map((a) => a.invoice).join(" + ")} · ${p.confidence}% sure` : "New payer account"}</span>
                <span className="block text-[#6b6f76]">{p.why}</span>
              </div>
              <div className="flex gap-1.5">
                <Btn size="xs" onClick={() => d({ t: p.alloc.length ? "confirm-pay" : "match-jv", id: p.id })}>
                  {p.alloc.length ? "Confirm match" : "Split across 2 sites"}
                </Btn>
                <Btn size="xs" kind="secondary">
                  Change
                </Btn>
              </div>
            </div>
          ))}
          {!review.length && <p className="rounded-lg bg-[#ebf7ef] p-3 text-[12.5px] text-[#15803d]">Every payment this week is matched to an invoice and a site.</p>}
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Owed, by client and by age" sub="₹ lakh, all sites. Hover a bar for the split." right={<Illustrative />}>
          <Legend items={["0–30 days", "31–60", "61–90", "90+"].map((k, i) => ({ label: `${k} · ₹${totals[i].toFixed(1)} L`, color: AGE_RAMP[i] }))} />
          <div className="mt-3">
            <AgingBars rows={AGING} />
          </div>
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Days to get paid" sub="Average, last 12 months">
            <TrendLine data={DSO} labels={MONTHS} unit=" d" invert />
          </Panel>
          <Panel title="How clients pay" sub="Share of money received, 30 days">
            {CHANNEL_MIX.map((c, i) => (
              <div key={c.label} className="grid grid-cols-[7rem_minmax(0,1fr)_2.5rem] items-center gap-2 py-1 text-[12px]">
                <span>{c.label}</span>
                <span className="h-[7px] overflow-hidden rounded-full bg-[#efefec]">
                  <span className="block h-full rounded-full" style={{ width: `${(c.value / 58) * 100}%`, background: SERIES[i] }} />
                </span>
                <span className="text-right tabular-nums">{c.value}%</span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ByClientSite />
        <EasyToPay />
      </div>
      <Panel flush title="Every payment this week" sub="From every channel, in one list.">
        <Table min={860}>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Client</Th>
              <Th>Channel</Th>
              <Th>What the bank said</Th>
              <Th className="text-right">Amount</Th>
              <Th>Matched to</Th>
            </tr>
          </thead>
          <tbody>
            {s.payments.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap text-[#6b6f76]">{p.when}</Td>
                <Td className="font-medium">{clientName(p.client)}</Td>
                <Td>
                  <Badge tone={CH_TONE[p.channel]}>{p.channel}</Badge>
                </Td>
                <Td className="max-w-[260px] truncate font-mono text-[11px] text-[#6b6f76]">{p.raw}</Td>
                <Td className="text-right font-medium">{money(p.amount)}</Td>
                <Td>{p.state === "Matched" ? <span className="flex items-center gap-2"><Badge tone="good">matched</Badge><span className="text-[11px] text-[#6b6f76]">{p.alloc.length > 1 ? `${p.alloc.length} invoices` : p.alloc[0]?.invoice}</span></span> : <Badge tone="warn">{p.state.toLowerCase()}</Badge>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Impact items={[{ label: "Sorting payments", before: "by hand in Zoho", now: "matched on arrival" }, { label: "Payments outside the app", before: "found days later", now: "read from the bank" }, { label: "Which site is paid", before: "a spreadsheet", now: "one click" }, { label: "Days to get paid", before: "52", now: "41, falling" }]} />
    </div>
  );
}

function ByClientSite() {
  const { s, d } = useOps();
  const [open, setOpen] = useState<string | null>("c1");
  return (
    <Panel title="Received and pending, by client and site" sub="Open a client to see every site.">
      <div className="grid grid-cols-[16px_minmax(0,1fr)_84px_84px] gap-3 pb-1 text-[11px] text-[#8a8e95]">
        <span />
        <span />
        <span className="text-right">received</span>
        <span className="text-right">pending</span>
      </div>
      {CLIENTS.filter((c) => c.totalSites > 0).map((c) => {
        const sites = s.sites.filter((x) => x.client === c.id);
        const inv = s.invoices.filter((i) => sites.some((x) => x.id === i.site));
        const paid = inv.filter((i) => i.status === "Paid").reduce((t, i) => t + i.amount, 0);
        const pend = inv.filter((i) => ["Sent", "Overdue", "Awaiting sign-off"].includes(i.status)).reduce((t, i) => t + i.amount, 0);
        const isOpen = open === c.id;
        return (
          <div key={c.id} className="border-t border-[#f2f2ef]">
            <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} className="grid w-full grid-cols-[16px_minmax(0,1fr)_84px_84px] items-center gap-3 py-2 text-left text-[12.5px] hover:bg-[#fbfbfa]">
              <span className={cx("text-[#8a8e95] transition", isOpen && "rotate-90")}>›</span>
              <span className="truncate font-medium">
                {c.name} <span className="font-normal text-[#8a8e95]">· pays in ~{c.paysIn} d</span>
              </span>
              <span className="text-right text-[#15803d] tabular-nums">{paid ? money(paid) : "—"}</span>
              <span className={cx("text-right tabular-nums", pend ? "text-[#a16207]" : "text-[#9a9ea5]")}>{pend ? money(pend) : "—"}</span>
            </button>
            {isOpen && (
              <div className="mb-2 ml-7 flex flex-col">
                {sites.map((x) => {
                  const si = s.invoices.filter((i) => i.site === x.id);
                  const p1 = si.filter((i) => i.status === "Paid").reduce((t, i) => t + i.amount, 0);
                  const p2 = si.filter((i) => ["Sent", "Overdue", "Awaiting sign-off"].includes(i.status)).reduce((t, i) => t + i.amount, 0);
                  return (
                    <button key={x.id} type="button" onClick={() => d({ t: "drawer", d: { kind: "site", id: x.id } })} className="grid grid-cols-[minmax(0,1fr)_84px_84px] gap-3 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[#f4f4f1]">
                      <span className="truncate text-[#4a4e55]">{x.name}</span>
                      <span className="text-right text-[#15803d] tabular-nums">{p1 ? money(p1) : "—"}</span>
                      <span className="text-right text-[#a16207] tabular-nums">{p2 ? money(p2) : "—"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

function EasyToPay() {
  return (
    <Panel title="Easy for clients to pay" sub="Fewer ways to get it wrong, so fewer payments to sort.">
      <div className="flex flex-col gap-3">
        {[
          ["A payment link and UPI QR on every invoice", "UPI, card or net banking in two taps. Matched the moment it lands."],
          ["A bank account number for each client", "A virtual account per client, so every NEFT or RTGS says who paid before anyone reads it."],
          ["Your client app stays first choice", "Payments in your app flow straight in against the invoice number."],
          ["Cheques and odd transfers are read too", "Bank narration, remittance emails and cheque images, matched with a confidence score."],
        ].map(([t, x]) => (
          <div key={t} className="flex gap-3">
            <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full bg-[#f0eefd] text-[10px] font-bold text-[#5b47e0]">✓</span>
            <span>
              <span className="block text-[12.5px] font-medium">{t}</span>
              <span className="text-[12px] leading-snug text-[#6b6f76]">{x}</span>
            </span>
          </div>
        ))}
        <div className="flex items-center gap-4 rounded-lg bg-[#f7f7f5] p-3">
          <svg viewBox="0 0 21 21" className="size-16 shrink-0 rounded bg-white p-1" aria-label="Sample UPI QR code">
            {Array.from({ length: 441 }).map((_, k) => {
              const x = k % 21, y = Math.floor(k / 21);
              const inF = (fx: number, fy: number) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
              const finder = inF(0, 0) || inF(14, 0) || inF(0, 14);
              const fx = x >= 14 ? x - 14 : x, fy = y >= 14 ? y - 14 : y;
              const on = finder ? fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4) : (x * 7 + y * 13 + x * y) % 5 < 2;
              return on ? <rect key={k} x={x} y={y} width="1" height="1" fill="#111113" /> : null;
            })}
          </svg>
          <div className="text-[12px]">
            <p className="font-semibold">INV-11160 · Sunrise Estates Phase 3</p>
            <p className="text-[#6b6f76]">₹1,20,000 advance · scan to pay</p>
            <p className="text-[11px] text-[#8a8e95]">opticvyu.pay/inv/11160</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------- Revenue and forecast

export function Growth() {
  const { m } = useOps();
  const [g, setG] = useState(50);
  const [cut, setCut] = useState(10);
  const now = MOVES[MOVES.length - 1];
  const start = REVENUE[REVENUE.length - 2];
  const yr = 120 * (1 + g / 100);
  const hiresPace = Math.round(54 * (g / 100));
  const hiresOps = Math.round(hiresPace * 0.45);
  const cashFreed = (120 / 30) * cut;
  return (
    <div className="flex flex-col gap-4">
      <ViewHead title="Revenue and forecast" agent="Forecast learns from payment habits" line="Every source joined up: live cameras, POs and their end dates, the pipeline, and how each client really pays. The forecast is built from those facts and gets sharper every month." right={<Illustrative />} />
      <MetricStrip
        cols={6}
        items={[
          { label: "Revenue this month", value: money(m.mrr), delta: { v: 3.4 }, spark: REVENUE },
          { label: "Yearly run rate", value: "₹14.3 Cr", delta: { v: 54, suffix: "in 12 months" } },
          { label: "Kept from clients", value: "112%", foot: "net revenue retention" },
          { label: "Net new a month", value: `+₹${(now.fresh + now.ext + now.addon + now.ended).toFixed(1)} L`, foot: "after ₹4.9 L ended" },
          { label: "Profit per camera a month", value: "₹7,600", foot: "after SIM, cloud, visits" },
          { label: "Weighted pipeline", value: "232 cameras", foot: "41 enquiries · 17 quotes" },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Revenue a month, and the next six" sub="₹ lakh. The band is the range the forecast is 80% sure of." right={<Legend items={[{ label: "Actual", color: "#111113" }, { label: "Forecast", color: SERIES[0], dash: true }]} />}>
          <ForecastChart months={MONTHS} actual={REVENUE} fMonths={FORECAST.months} mid={FORECAST.mid} low={FORECAST.low} high={FORECAST.high} height={250} />
        </Panel>
        <Panel title="This month, from ₹116 L to ₹120 L" sub="Where the change came from, ₹ lakh a month">
          {[
            { k: "October", v: start, base: true },
            { k: "New sites", v: now.fresh, c: SERIES[0] },
            { k: "PO extensions", v: now.ext, c: SERIES[2] },
            { k: "Add-ons", v: now.addon, c: SERIES[3] },
            { k: "Projects ended", v: now.ended, c: SERIES[1] },
            { k: "November", v: 120, base: true },
          ].map((r) => (
            <div key={r.k} className="grid grid-cols-[7rem_minmax(0,1fr)_3rem] items-center gap-2 py-1.5 text-[12px]">
              <span className={cx(r.base && "font-semibold")}>{r.k}</span>
              <span className="relative h-4 rounded bg-[#f6f6f3]">
                {r.base ? (
                  <span className="absolute inset-y-0 left-0 rounded bg-[#111113]" style={{ width: `${(r.v / 125) * 100}%` }} />
                ) : (
                  <>
                    <span aria-hidden className="absolute inset-y-[-2px] left-1/2 w-px bg-[#cfcfca]" />
                    <span className="absolute inset-y-0 rounded" style={{ left: r.v > 0 ? "50%" : `${50 - (Math.abs(r.v) / 6) * 50}%`, width: `${(Math.abs(r.v) / 6) * 50}%`, background: r.c }} />
                  </>
                )}
              </span>
              <span className="text-right font-medium tabular-nums">
                {r.base ? r.v : `${r.v > 0 ? "+" : ""}${r.v}`}
              </span>
            </div>
          ))}
          <p className="mt-2 text-[11.5px] text-[#8a8e95]">Black bars: total. Coloured bars: change, on their own scale (centre line = 0, edge = ±₹6 L).</p>
        </Panel>
      </div>
      <Panel title="Plan the next 12 months" sub="Move the sliders. Same facts as above, your assumptions.">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="flex flex-col gap-5">
            <label className="text-[12.5px]">
              <span className="flex justify-between">
                <span className="font-medium">Revenue growth</span>
                <b className="tabular-nums">{g}% a year</b>
              </span>
              <input type="range" min={20} max={80} step={5} value={g} onChange={(e) => setG(+e.target.value)} className="mt-2 w-full accent-[#5b47e0]" />
            </label>
            <label className="text-[12.5px]">
              <span className="flex justify-between">
                <span className="font-medium">Faster collection</span>
                <b className="tabular-nums">{cut} days sooner</b>
              </span>
              <input type="range" min={0} max={20} value={cut} onChange={(e) => setCut(+e.target.value)} className="mt-2 w-full accent-[#5b47e0]" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#ececE8] bg-[#ececE8] sm:grid-cols-4">
            {[
              ["Revenue a month in 12 months", `₹${(yr / 100).toFixed(2)} Cr`],
              ["Hires if headcount keeps pace", `+${hiresPace} people`],
              ["Hires with Ops One running", `+${hiresOps} people`],
              ["Cash freed once", `₹${cashFreed.toFixed(0)} L`],
            ].map(([k, v], i) => (
              <div key={k} className={cx("bg-white p-3", i === 2 && "bg-[#f5f3fe]")}>
                <p className="text-[11.5px] leading-snug text-[#6b6f76]">{k}</p>
                <p className={cx("mt-1 text-[18px] font-semibold tabular-nums", i === 2 && "text-[#4c39d1]")}>{v}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11.5px] text-[#8a8e95]">Hiring with Ops One assumes field, accounts and support work per head improves as automated work grows; your real figure is measured, not assumed.</p>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="One camera, one 24-month project" sub="Illustrative economics">
          {[
            ["Kit cost (camera, router, mount)", "−₹95,000"],
            ["Client pays for the camera", "+₹1,20,000"],
            ["Monthly charge × 24", "+₹2,28,000"],
            ["SIM, cloud, visits × 24", "−₹45,600"],
            ["Buy-back on return (40%)", "−₹48,000"],
            ["Refurbish for the next site", "−₹6,000"],
          ].map(([k, v]) => (
            <p key={k} className="flex justify-between border-b border-[#f2f2ef] py-1.5 text-[12.5px]">
              <span className="text-[#4a4e55]">{k}</span>
              <span className={cx("tabular-nums", v.startsWith("+") ? "text-[#15803d]" : "text-[#3f434a]")}>{v}</span>
            </p>
          ))}
          <p className="flex justify-between pt-2 text-[13px] font-semibold">
            <span>Profit, first lap</span>
            <span className="tabular-nums">₹1,53,400</span>
          </p>
          <p className="text-[11.5px] text-[#8a8e95]">The second lap starts with the camera already paid for.</p>
        </Panel>
        <Panel title="Revenue kept from each year's clients" sub="Year 1 = 100. Above 100 means they grew with you.">
          <Table min={300}>
            <thead>
              <tr>
                <Th>Joined</Th>
                {["Y1", "Y2", "Y3", "Y4", "Y5"].map((y) => (
                  <Th key={y} className="text-center">
                    {y}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COHORTS.map((c) => (
                <tr key={c.year}>
                  <Td>
                    {c.year} <span className="text-[11px] text-[#8a8e95]">· {c.clients}</span>
                  </Td>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Td key={i} className="text-center">
                      {c.kept[i] !== undefined ? (
                        <span className="inline-block min-w-9 rounded px-1 py-0.5 text-[11.5px] font-medium" style={{ background: `rgba(98,80,214,${0.08 + (c.kept[i] - 100) / 90})`, color: c.kept[i] > 135 ? "#fff" : "#2f2580" }}>
                          {c.kept[i]}
                        </span>
                      ) : null}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
        <Panel title="Pipeline and mix" sub="Deals · cameras">
          {PIPELINE.map((p, i) => (
            <div key={p.stage} className="flex items-center gap-2 py-1 text-[12px]">
              <span className="w-20 shrink-0">{p.stage}</span>
              <span className="h-5 rounded" style={{ width: `${100 - i * 15}%`, background: SERIES[0], opacity: 1 - i * 0.15 }} />
              <span className="w-14 shrink-0 text-right tabular-nums">
                {p.n} · {p.cams}
              </span>
            </div>
          ))}
          <p className="mt-3 mb-1.5 text-[11px] font-semibold tracking-[0.06em] text-[#8a8e95] uppercase">Revenue by product</p>
          <div className="flex h-3 gap-[2px] overflow-hidden rounded">
            {PRODUCT_SPLIT.map((p, i) => (
              <span key={p.label} title={`${p.label} ${p.value}%`} style={{ flex: p.value, background: SERIES[i] }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#6b6f76]">
            {PRODUCT_SPLIT.map((p, i) => (
              <span key={p.label} className="inline-flex items-center gap-1">
                <span className="size-2 rounded-[2px]" style={{ background: SERIES[i] }} />
                {p.label} {p.value}%
              </span>
            ))}
          </div>
        </Panel>
      </div>
      <Panel title="Revenue by office" sub="₹ lakh a month">
        {OFFICES.map((o) => (
          <div key={o.id} className="grid grid-cols-[7rem_minmax(0,1fr)_4rem] items-center gap-2 py-1 text-[12px]">
            <span>{o.short}</span>
            <Bar value={(SCORE[o.id].revenue / 31.2) * 100} h={7} />
            <span className="text-right tabular-nums">₹{SCORE[o.id].revenue} L</span>
          </div>
        ))}
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#6b6f76]">
          <Dot tone="good" /> Dubai grew fastest: ₹3 L to ₹9.2 L a month in 8 months.
        </p>
      </Panel>
    </div>
  );
}
