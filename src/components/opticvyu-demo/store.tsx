"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import {
  ACTIVITY,
  APPROVALS,
  CAMERAS,
  FAULTY,
  FLEET,
  INVOICES,
  ITEMS,
  KITS,
  OFFICES,
  PAYMENTS,
  PEOPLE,
  PRICE,
  PROJECTS,
  SITES,
  STAGES,
  TEAM_LEAD,
  TICKETS,
  WORK_ORDERS,
  officeById,
  siteById,
  type Activity,
  type Camera,
  type Invoice,
  type Item,
  type OfficeId,
  type Payment,
  type Project,
  type Team,
  type Site,
  type Ticket,
  type ViewId,
  type WOCol,
  type WorkOrder,
} from "./data";

// One store for the founder's whole company. Every action writes to the shared records and
// logs what the agents did, so the command centre, sites, billing, payments, stock, care,
// attendance and the phone all change together: one connected system, not nine dashboards.

export type Gap = { id: string; site: string; text: string; amount: number; per: "month" | "once" };
const GAPS: Gap[] = [
  { id: "g1", site: "s3", text: "OV-PTZ-0441 added on request on 22 Oct. Not on PO-MER-188, so never billed.", amount: PRICE.monthly, per: "month" },
  { id: "g2", site: "s10", text: "Second drone flight done on 6 Nov. No invoice raised.", amount: 45000, per: "once" },
];

export type Toast = { id: number; title: string; body: string; tone?: "good" | "info" | "warn" };
export type Drawer = { kind: "site" | "activity" | "install" | "ticket" | "person" | "project"; id: string } | null;
export type Attempt = { id: number; who: string; office: OfficeId; distance: number; ok: boolean; reason: string; time: string };
export type Rules = { selfie: boolean; mock: boolean; hours: boolean; offline: boolean };
export type Scope = "all" | OfficeId;
type Kits = typeof KITS;
type Faulty = typeof FAULTY;

type State = {
  view: ViewId;
  scope: Scope;
  sites: Site[];
  cameras: Camera[];
  invoices: Invoice[];
  payments: Payment[];
  orders: WorkOrder[];
  tickets: Ticket[];
  projects: Project[];
  items: Item[];
  kits: Kits;
  faulty: Faulty;
  pending: string[];
  activity: Activity[];
  gaps: Gap[];
  learned: Record<string, string>;
  payroll: number;
  radius: Record<OfficeId, number>;
  rules: Rules;
  attempts: Attempt[];
  phone: boolean;
  palette: boolean;
  drawer: Drawer;
  toasts: Toast[];
  popup: string | null;
  extraLive: number;
  collectedToday: number;
  invSeq: number;
  paySeq: number;
};

type Action =
  | { t: "view"; view: ViewId }
  | { t: "scope"; scope: Scope }
  | { t: "drawer"; d: Drawer }
  | { t: "phone"; on?: boolean }
  | { t: "palette"; on?: boolean }
  | { t: "toast-off"; id: number }
  | { t: "popup"; id: string | null }
  | { t: "install"; wo: string }
  | { t: "confirm-pay"; id: string }
  | { t: "match-jv"; id: string }
  | { t: "pay-link"; inv: string }
  | { t: "client-pays"; inv: string }
  | { t: "bill-gap"; id: string }
  | { t: "check-in-return"; site: string }
  | { t: "approve"; id: string }
  | { t: "reassign"; wo: string; who: string }
  | { t: "snooze"; wo: string }
  | { t: "wo-move"; wo: string; col: WOCol }
  | { t: "ticket-send"; id: string }
  | { t: "radius"; office: OfficeId; m: number }
  | { t: "rule"; k: keyof Rules }
  | { t: "try-checkin"; office: OfficeId; distance: number }
  | { t: "report-faulty"; who: string; item: string }
  | { t: "transfer"; item: string; to: OfficeId; qty: number }
  | { t: "payroll-next" }
  | { t: "learn"; id: string; v: string }
  | { t: "note"; id: string; text: string; team: Team }
  | { t: "tick"; id: string }
  | { t: "next-stage"; id: string }
  | { t: "gate"; id: string };

let toastSeq = 1;
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export const now = (offsetMs = 0) => fmt.format(new Date(Date.now() + offsetMs));

function log(s: State, a: Omit<Activity, "id" | "time">, extra: Omit<Activity, "id" | "time">[] = []): Activity[] {
  const t = now();
  const mk = (x: Omit<Activity, "id" | "time">, i: number): Activity => ({ ...x, id: `x${Date.now()}${i}${Math.random().toString(36).slice(2, 5)}`, time: t });
  return [...extra.map(mk).reverse(), mk(a, 9), ...s.activity];
}
function toast(s: State, title: string, body: string, tone: Toast["tone"] = "good"): Toast[] {
  return [...s.toasts.slice(-2), { id: toastSeq++, title, body, tone }];
}

export function inr(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}
/** ₹ in lakh or crore, the way an Indian founder reads money. */
export function money(n: number, d?: number) {
  const a = Math.abs(n),
    sign = n < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(d ?? 2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(d ?? (a >= 1e6 ? 1 : 2))} L`;
  return `${sign}₹${inr(a)}`;
}
export function clientName(id: string) {
  return (
    ({ c1: "Meridian Infra", c2: "Skyline Developers", c3: "Arcadia Homes", c4: "Northgate Metro EPC", c5: "Vantage Realty", c6: "Coastline Infra", c7: "Gulf Crest Contracting", c8: "Sunrise Estates", c9: "Lakeshore Developers" } as Record<string, string>)[id] ?? id
  );
}

function reduce(s: State, a: Action): State {
  switch (a.t) {
    case "view":
      return { ...s, view: a.view, drawer: null, palette: false };
    case "scope":
      return { ...s, scope: a.scope };
    case "drawer":
      return { ...s, drawer: a.d, palette: false };
    case "phone":
      return { ...s, phone: a.on ?? !s.phone };
    case "palette":
      return { ...s, palette: a.on ?? !s.palette };
    case "toast-off":
      return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };
    case "popup":
      return { ...s, popup: a.id };

    case "install": {
      const wo = s.orders.find((o) => o.id === a.wo);
      if (!wo || wo.col === "Done") return s;
      const site = s.sites.find((x) => x.id === wo.site)!;
      const n = site.cameras;
      const balance = PRICE.cameraSystem * n * (1 - PRICE.advanceShare);
      const invId = `INV-${s.invSeq}`;
      const t = now();
      return {
        ...s,
        orders: s.orders.map((o) => (o.id === wo.id ? { ...o, col: "Done", due: `Done ${t}`, firstFix: true, sla: "met" } : o)),
        sites: s.sites.map((x) =>
          x.id === site.id
            ? {
                ...x,
                status: "Live",
                liveSince: "Today",
                poUsed: 6,
                timeline: [
                  ...x.timeline.filter((e) => e.when !== "Today"),
                  { when: `Today ${t}`, text: `Installation complete: ${n} cameras live, 4 geo-tagged photos, serials scanned`, who: wo.who },
                  { when: `Today ${t}`, text: `Balance invoice ${invId} sent with a payment link; monthly billing started`, who: "Billing agent" },
                  { when: `Today ${t}`, text: "Client told on WhatsApp with the install photos", who: "Care agent" },
                ],
              }
            : x,
        ),
        cameras: s.cameras.map((c) => (c.site === site.id ? { ...c, status: "Live", uptime: 100, dataUsed: 1 } : c)),
        invoices: [{ id: invId, site: site.id, kind: "Balance on install", amount: balance, raised: "Today", due: "In 7 days", status: "Sent", note: "Raised the second the site went live. Payment link and UPI QR sent." }, ...s.invoices],
        projects: s.projects.map((p) =>
          p.site === site.id
            ? { ...p, stage: 7, inStage: 0, done: 1, health: "On track", next: "First monthly invoice on 1 Dec", logs: [...p.logs, { stage: 6, team: "Field", who: wo.who, when: `Today ${t}`, text: "Installation complete. Photos and serials recorded.", kind: "update" }, { stage: 7, team: "Support", who: "Work-order agent", when: `Today ${t}`, text: "Moved to Live and monitored. Handed to Support; billing started.", kind: "auto" }] }
            : p,
        ),
        invSeq: s.invSeq + 1,
        extraLive: s.extraLive + n,
        activity: log(s, { agent: "Work-order agent", kind: "done", view: "workorders", text: `Installation complete at ${site.name}. ${n} cameras live` }, [
          { agent: "Billing agent", kind: "done", view: "billing", text: `Balance invoice ${invId} (₹${inr(balance)}) sent; monthly billing starts today` },
          { agent: "Care agent", kind: "done", view: "care", text: `${clientName(site.client)} told on WhatsApp, with install photos` },
          { agent: "Inventory agent", kind: "done", view: "inventory", text: `${n} cameras moved from dispatched to live at ${site.name}` },
        ]),
        drawer: null,
        toasts: toast(s, "Site is live. Billing started itself.", `${site.name}: ${n} cameras live, balance invoice ${invId} sent, client told on WhatsApp. Sites, billing, inventory and the command centre are updated.`),
      };
    }

    case "confirm-pay": {
      const p = s.payments.find((x) => x.id === a.id);
      if (!p || p.state === "Matched") return s;
      const ids = new Set(p.alloc.map((x) => x.invoice));
      return {
        ...s,
        payments: s.payments.map((x) => (x.id === p.id ? { ...x, state: "Matched", confidence: x.confidence ?? 100 } : x)),
        invoices: s.invoices.map((i) => (ids.has(i.id) ? { ...i, status: "Paid", note: `Paid by ${p.channel.toLowerCase()}, ${p.when.toLowerCase()}` } : i)),
        tickets: s.tickets.map((t) => (p.id === "PAY-7784" && t.id === "T-5801" ? { ...t, status: "Resolved", csat: 5, draft: undefined } : t)),
        collectedToday: s.collectedToday + p.amount,
        activity: log(s, { agent: "Payments agent", kind: "done", view: "payments", text: `₹${inr(p.amount)} by ${p.channel.toLowerCase()} confirmed and posted in Zoho Books` }),
        toasts: toast(s, "Payment recorded.", `₹${inr(p.amount)} posted to the right site in Zoho Books. Overdue, the site profile and the command centre are updated.`),
      };
    }
    case "match-jv": {
      const alloc = [
        { invoice: "INV-11050", amount: 28500 },
        { invoice: "INV-11051", amount: 19000 },
      ];
      return reduce({ ...s, payments: s.payments.map((x) => (x.id === a.id ? { ...x, alloc, state: "Suggested", confidence: 95 } : x)) }, { t: "confirm-pay", id: a.id });
    }
    case "pay-link": {
      const inv = s.invoices.find((i) => i.id === a.inv);
      if (!inv) return s;
      return {
        ...s,
        invoices: s.invoices.map((i) => (i.id === inv.id ? { ...i, note: `Payment link and UPI QR sent at ${now()} on WhatsApp and email` } : i)),
        activity: log(s, { agent: "Collections agent", kind: "done", view: "billing", text: `Payment link for ${inv.id} sent to ${clientName(siteById(inv.site).client)}` }),
        toasts: toast(s, "Payment link sent.", `${inv.id}: the client pays by UPI, card or net banking in two taps, and it matches itself.`, "info"),
      };
    }
    case "client-pays": {
      const inv = s.invoices.find((i) => i.id === a.inv);
      if (!inv || inv.status === "Paid") return s;
      const site = siteById(inv.site);
      const pay: Payment = { id: `PAY-${s.paySeq}`, when: `Today ${now()}`, client: site.client, amount: inv.amount, channel: "Payment link", state: "Matched", confidence: 100, raw: `Payment link · ${inv.id} · UPI`, alloc: [{ invoice: inv.id, amount: inv.amount }], why: "Paid on the link sent with the invoice." };
      return {
        ...s,
        paySeq: s.paySeq + 1,
        payments: [pay, ...s.payments],
        invoices: s.invoices.map((i) => (i.id === inv.id ? { ...i, status: "Paid", note: `Paid on the payment link at ${now()}` } : i)),
        collectedToday: s.collectedToday + inv.amount,
        activity: log(s, { agent: "Payments agent", kind: "done", view: "payments", text: `${site.name} paid ${inv.id} (₹${inr(inv.amount)}) on the payment link` }),
        toasts: toast(s, "The client paid. Nobody had to match it.", `₹${inr(inv.amount)} for ${site.name} landed and was posted to ${inv.id} in Zoho Books.`),
      };
    }
    case "bill-gap": {
      const g = s.gaps.find((x) => x.id === a.id);
      if (!g) return s;
      const invId = `INV-${s.invSeq}`;
      return {
        ...s,
        gaps: s.gaps.filter((x) => x.id !== g.id),
        invSeq: s.invSeq + 1,
        invoices: [{ id: invId, site: g.site, kind: g.per === "month" ? "Monthly service" : "Drone survey", amount: g.per === "month" ? g.amount * 2 : g.amount, raised: "Today", due: "In 30 days", status: "Draft", note: g.per === "month" ? "Back-billed from 22 Oct with a PO change order" : "Flight log and outputs attached" }, ...s.invoices],
        activity: log(s, { agent: "Billing agent", kind: "done", view: "billing", text: `Live-but-not-billed closed: ${invId} drafted for ${siteById(g.site).name}` }),
        toasts: toast(s, "Gap closed.", `${invId} drafted for ${siteById(g.site).name}. Billed vs live is back in step.`),
      };
    }
    case "check-in-return": {
      const n = s.cameras.filter((c) => c.site === a.site && c.status === "Returning").length;
      if (!n) return s;
      const refund = PRICE.cameraSystem * PRICE.buybackShare * n;
      return {
        ...s,
        cameras: s.cameras.map((c) => (c.site === a.site && c.status === "Returning" ? { ...c, status: "Refurbishing", idleDays: 0, site: null } : c)),
        sites: s.sites.map((x) => (x.id === a.site ? { ...x, status: "Closed", timeline: [...x.timeline, { when: `Today ${now()}`, text: `${n} cameras checked in at Mumbai stores. Buy-back ₹${inr(refund)} waits for approval`, who: "Stores" }] } : x)),
        orders: s.orders.map((o) => (o.site === a.site && o.type === "Dismantle and return" ? { ...o, col: "Done", due: `Done ${now()}`, late: undefined, sla: "closed" } : o)),
        invoices: [{ id: "CN-0418", site: a.site, kind: "Buy-back refund", amount: refund, raised: "Today", due: "After approval", status: "Refund due", note: `40% of ₹${inr(PRICE.cameraSystem)} per camera × ${n}` }, ...s.invoices],
        activity: log(s, { agent: "Inventory agent", kind: "ask", view: "approvals", text: `${n} cameras from ${siteById(a.site).name} checked in. Buy-back ₹${inr(refund)} waits for you` }),
        toasts: toast(s, "Cameras checked in.", `${n} cameras are refurbishing in Mumbai. Billing for the site stopped and the 40% buy-back (₹${inr(refund)}) waits in Approvals.`, "info"),
      };
    }
    case "approve": {
      const ap = APPROVALS.find((x) => x.id === a.id);
      if (!ap || !s.pending.includes(a.id)) return s;
      let next: State = { ...s, pending: s.pending.filter((x) => x !== a.id) };
      if (a.id === "ap1") {
        const has = next.invoices.some((i) => i.kind === "Buy-back refund");
        next = {
          ...next,
          invoices: has
            ? next.invoices.map((i) => (i.kind === "Buy-back refund" ? { ...i, status: "Refunded", note: "Credit note issued in Zoho Books" } : i))
            : [{ id: "CN-0418", site: "s6", kind: "Buy-back refund", amount: 96000, raised: "Today", due: "Issued", status: "Refunded", note: "Credit note issued in Zoho Books" }, ...next.invoices],
        };
      }
      if (a.id === "ap2") next = { ...next, payroll: 6 };
      next = { ...next, projects: next.projects.map((p) => (p.gate?.ap === a.id ? { ...p, gate: undefined, health: "On track", logs: [...p.logs, { stage: p.stage, team: "Founder", who: "Founder", when: `Today ${now()}`, text: `Approved: ${ap.title}`, kind: "approval" }] } : p)) };
      if (a.id === "ap3") next = { ...next, sites: next.sites.map((x) => (x.id === "s4" ? { ...x, timeline: [...x.timeline, { when: `Today ${now()}`, text: "Extension request sent to Meridian Infra's procurement", who: "Billing agent" }] } : x)) };
      if (a.id === "ap5") next = { ...next, faulty: next.faulty.map((f) => (f.serial === "RT-6620" ? { ...f, state: "Replaced from Hyderabad stock" } : f)) };
      return { ...next, activity: log(next, { agent: "Approvals", kind: "done", view: "approvals", text: `Approved: ${ap.title}` }), toasts: toast(next, "Approved. The agent carried on.", ap.result) };
    }
    case "reassign":
      return {
        ...s,
        orders: s.orders.map((o) => (o.id === a.wo ? { ...o, who: a.who, col: "Scheduled", late: undefined, sla: "re-planned", due: "Today 16:00", reminders: [...o.reminders, { at: now(), to: a.who, via: "App" }] } : o)),
        popup: null,
        activity: log(s, { agent: "Work-order agent", kind: "done", view: "workorders", text: `${a.wo} reassigned to ${a.who}, due today 16:00` }),
        toasts: toast(s, "Reassigned.", `${a.wo} is with ${a.who} now, in their app with the site, kit list and history.`),
      };
    case "snooze":
      return { ...s, popup: null, toasts: toast(s, "Snoozed for 2 hours.", `${a.wo} comes back at ${now(72e5)}. The escalation trail is kept.`, "info") };
    case "wo-move": {
      const o = s.orders.find((x) => x.id === a.wo);
      if (!o) return s;
      if (a.col === "Done" && o.type === "Install") return reduce(s, { t: "install", wo: o.id });
      return { ...s, orders: s.orders.map((x) => (x.id === a.wo ? { ...x, col: a.col, late: a.col === "Done" ? undefined : x.late, sla: a.col === "Done" ? "met" : x.sla } : x)), activity: log(s, { agent: "Work-order agent", kind: "done", view: "workorders", text: `${a.wo} moved to ${a.col.toLowerCase()}` }) };
    }
    case "ticket-send": {
      const tk = s.tickets.find((x) => x.id === a.id);
      if (!tk || !tk.draft) return s;
      return {
        ...s,
        tickets: s.tickets.map((x) => (x.id === a.id ? { ...x, status: "Resolved", slaLeft: 0, csat: 5, thread: [...x.thread, { who: "OpticVyu", text: x.draft!, time: now(), side: "us" as const }], draft: undefined } : x)),
        activity: log(s, { agent: "Care agent", kind: "done", view: "care", text: `${tk.id} answered and resolved for ${clientName(tk.client)}` }),
        toasts: toast(s, "Reply sent. Ticket resolved.", `${tk.id}: sent on ${tk.channel}. A one-tap rating request goes to the client.`),
      };
    }
    case "radius":
      return { ...s, radius: { ...s.radius, [a.office]: a.m } };
    case "rule":
      return { ...s, rules: { ...s.rules, [a.k]: !s.rules[a.k] } };
    case "try-checkin": {
      const r = s.radius[a.office];
      const ok = a.distance <= r;
      const at: Attempt = { id: Date.now(), who: "Aditya Kulkarni", office: a.office, distance: a.distance, ok, reason: ok ? `Inside the ${r} m boundary${s.rules.selfie ? ", selfie matched" : ""}` : `${a.distance - r} m outside the ${r} m boundary`, time: now() };
      return {
        ...s,
        attempts: [at, ...s.attempts].slice(0, 6),
        activity: log(s, { agent: "Attendance agent", kind: ok ? "done" : "flag", view: "attendance", text: ok ? `Aditya Kulkarni marked in at ${officeById(a.office).short}` : `Check-in rejected: ${a.distance} m from ${officeById(a.office).short} (boundary ${r} m)` }),
        toasts: toast(s, ok ? "Marked in." : "Check-in rejected.", `${at.reason}.`, ok ? "good" : "warn"),
      };
    }
    case "report-faulty": {
      const kit = s.kits.find((k) => k.who === a.who);
      if (!kit) return s;
      const line = kit.lines.find((l) => l.item === a.item);
      return {
        ...s,
        kits: s.kits.map((k) => (k.who === a.who ? { ...k, lines: k.lines.map((l) => (l.item === a.item ? { ...l, status: "Faulty" as const, last: `Reported faulty today ${now()}` } : l)) } : k)),
        faulty: [{ item: a.item, serial: line?.serial ?? "—", office: kit.office, by: a.who, issue: "Reported from the app", decision: "Swap from office stock", cost: 0, state: "Spare issued" }, ...s.faulty],
        activity: log(s, { agent: "Inventory agent", kind: "done", view: "inventory", text: `${a.who} reported ${a.item} faulty. Spare issued from ${officeById(kit.office).short}` }),
        toasts: toast(s, "Faulty item logged.", `${a.item} from ${a.who}'s kit is marked faulty, a spare is issued from ${officeById(kit.office).short}, and the repair decision is queued.`, "info"),
      };
    }
    case "transfer": {
      const it = s.items.find((x) => x.id === a.item);
      if (!it || it.stock.hyd < a.qty) return s;
      return {
        ...s,
        items: s.items.map((x) => (x.id === a.item ? { ...x, stock: { ...x.stock, hyd: x.stock.hyd - a.qty, [a.to]: x.stock[a.to] + a.qty } } : x)),
        activity: log(s, { agent: "Inventory agent", kind: "done", view: "inventory", text: `${a.qty} × ${it.name} sent from Hyderabad to ${officeById(a.to).short}` }),
        toasts: toast(s, "Stock transfer raised.", `${a.qty} × ${it.name} from Hyderabad to ${officeById(a.to).short}. Courier booked, arrives in 2 days.`),
      };
    }
    case "payroll-next":
      if (s.payroll === 4) return reduce(s, { t: "approve", id: "ap2" });
      return { ...s, payroll: Math.min(6, s.payroll + 1) };
    case "learn":
      return { ...s, learned: { ...s.learned, [a.id]: a.v } };
    case "note": {
      const p = s.projects.find((x) => x.id === a.id);
      if (!p || !a.text.trim()) return s;
      return {
        ...s,
        projects: s.projects.map((x) => (x.id === a.id ? { ...x, logs: [...x.logs, { stage: x.stage, team: a.team, who: TEAM_LEAD[a.team], when: `Today ${now()}`, text: a.text.trim(), kind: "note" }] } : x)),
        toasts: toast(s, "Update added.", `${p.name}: everyone on the project sees it, and it's on your tracker.`, "info"),
      };
    }
    case "tick": {
      const p = s.projects.find((x) => x.id === a.id);
      if (!p) return s;
      const checks = STAGES[p.stage].checks;
      if (p.done >= checks.length) return s;
      return { ...s, projects: s.projects.map((x) => (x.id === a.id ? { ...x, done: x.done + 1, logs: [...x.logs, { stage: x.stage, team: STAGES[x.stage].team, who: TEAM_LEAD[STAGES[x.stage].team], when: `Today ${now()}`, text: `Done: ${checks[x.done]}`, kind: "update" }] } : x)) };
    }
    case "next-stage": {
      const p = s.projects.find((x) => x.id === a.id);
      if (!p || p.stage >= STAGES.length - 1 || p.gate) return s;
      const to = STAGES[p.stage + 1];
      return {
        ...s,
        projects: s.projects.map((x) => (x.id === a.id ? { ...x, stage: x.stage + 1, inStage: 0, done: 0, health: "On track", next: `${to.checks[0]}`, logs: [...x.logs, { stage: x.stage + 1, team: to.team, who: "Tracker", when: `Today ${now()}`, text: `Moved to ${to.label}. Handed to ${to.team} (${TEAM_LEAD[to.team]}), who was told in the app.`, kind: "auto" }] } : x)),
        activity: log(s, { agent: "Tracker", kind: "done", view: "tracker", text: `${p.name} moved to ${to.label}; ${to.team} notified` }),
        toasts: toast(s, `Handed to ${to.team}.`, `${p.name} is now at ${to.label}. ${TEAM_LEAD[to.team]} has it in the app with the full history.`),
      };
    }
    case "gate": {
      const p = s.projects.find((x) => x.id === a.id);
      if (!p?.gate) return s;
      const g = p.gate;
      let next: State = { ...s, projects: s.projects.map((x) => (x.id === a.id ? { ...x, gate: undefined, health: "On track", logs: [...x.logs, { stage: x.stage, team: "Founder", who: "Founder", when: `Today ${now()}`, text: `Approved: ${g.title}`, kind: "approval" }] } : x)) };
      if (g.ap && next.pending.includes(g.ap)) next = reduce(next, { t: "approve", id: g.ap });
      return { ...next, toasts: toast(next, "Approved. The team carries on.", `${p.name}: ${g.title.toLowerCase()}. ${STAGES[p.stage].team} was told in the app.`) };
    }
  }
}

const initial: State = {
  view: "overview",
  scope: "all",
  sites: SITES,
  cameras: CAMERAS,
  invoices: INVOICES,
  payments: PAYMENTS,
  orders: WORK_ORDERS,
  tickets: TICKETS,
  projects: PROJECTS,
  items: ITEMS,
  kits: KITS,
  faulty: FAULTY,
  pending: APPROVALS.map((a) => a.id),
  activity: ACTIVITY,
  gaps: GAPS,
  learned: {},
  payroll: 3,
  radius: Object.fromEntries(OFFICES.map((o) => [o.id, o.radius])) as Record<OfficeId, number>,
  rules: { selfie: true, mock: true, hours: true, offline: true },
  attempts: [],
  phone: false,
  palette: false,
  drawer: null,
  toasts: [],
  popup: null,
  extraLive: 0,
  collectedToday: 0,
  invSeq: 11215,
  paySeq: 7790,
};

/** Company-wide totals beyond the records in the demo (illustrative). */
const BASE = { outstanding: 18600000, overdue: 4120000, collectedMonth: 9640000, mrr: 11900000, cash: 21400000 };

function derive(s: State) {
  const open = s.invoices.filter((i) => ["Sent", "Awaiting sign-off", "Overdue"].includes(i.status));
  const live = FLEET.live + s.extraLive;
  const inScope = (o: OfficeId) => s.scope === "all" || s.scope === o;
  const people = PEOPLE.filter((p) => inScope(p.office));
  const present = people.filter((p) => ["In office", "At site", "Late", "Travelling"].includes(p.today)).length;
  return {
    inScope,
    live,
    billed: live - s.gaps.filter((g) => g.per === "month").length,
    gapCount: s.gaps.length,
    gapValue: s.gaps.reduce((t, g) => t + g.amount, 0),
    outstanding: BASE.outstanding + open.reduce((t, i) => t + i.amount, 0),
    overdue: BASE.overdue + s.invoices.filter((i) => i.status === "Overdue").reduce((t, i) => t + i.amount, 0),
    collected: BASE.collectedMonth + s.collectedToday,
    cash: BASE.cash + s.collectedToday,
    mrr: BASE.mrr + s.extraLive * PRICE.monthly,
    sitesLive: 512 + s.sites.filter((x) => x.liveSince === "Today").length,
    lateOrders: s.orders.filter((o) => o.late && o.col !== "Done"),
    toReview: s.payments.filter((p) => p.state !== "Matched"),
    offline: FLEET.offline + s.cameras.filter((c) => c.status === "Offline").length - 1,
    openTickets: s.tickets.filter((t) => t.status !== "Resolved"),
    breached: s.tickets.filter((t) => t.status !== "Resolved" && t.slaLeft < 0),
    people,
    present,
  };
}

type Ctx = { s: State; d: React.Dispatch<Action>; m: ReturnType<typeof derive> };
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, d] = useReducer(reduce, initial);
  const m = useMemo(() => derive(s), [s]);
  const v = useMemo(() => ({ s, d, m }), [s, m]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useOps() {
  const c = useContext(C);
  if (!c) throw new Error("useOps outside StoreProvider");
  return c;
}
