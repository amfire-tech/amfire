"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AGING, APPROVALS, COMPANY, NAV, OFFICES, PEOPLE, siteById, type ViewId } from "./data";
import { Engage, useVisit } from "./engage";
import { FounderPhone, ScreenOnly } from "./phone";
import { StoreProvider, money, useOps, type Scope } from "./store";
import { Avatar, Btn, Dot, cx } from "./ui";
import { CommandCentre } from "./views-home";
import { Care, Fleet, InstallDrawer, LiveMap, SiteDrawer, Sites, TicketDrawer, WorkOrders } from "./views-ops";
import { Billing, Growth, Payments } from "./views-money";
import { Attendance, EmployeeApp, PeopleView } from "./views-people";
import { Inventory } from "./views-stock";
import { ActivityDrawer, Agents, Approvals, Connected, Learning } from "./views-system";
import { ProjectDrawer, ProjectTracker } from "./views-tracker";

// Ops One for OpticVyu: the founder's operating system. One live store underneath every
// module, an office filter across all of them, a phone that shares the same data, and an
// Ask bar that answers from the records.

const VIEWS: Record<ViewId, () => React.JSX.Element> = {
  overview: CommandCentre,
  tracker: ProjectTracker,
  map: LiveMap,
  approvals: Approvals,
  sites: Sites,
  care: Care,
  workorders: WorkOrders,
  fleet: Fleet,
  inventory: Inventory,
  billing: Billing,
  payments: Payments,
  growth: Growth,
  attendance: Attendance,
  people: PeopleView,
  app: EmployeeApp,
  agents: Agents,
  learning: Learning,
  connected: Connected,
};

/** `screen` renders one phone screen full size (for captures); `shot` turns off tracking and prompts. */
export function OpsOneDemo({ screen, shot }: { screen?: string | null; shot?: boolean } = {}) {
  return (
    <StoreProvider>
      {shot && <style>{"nextjs-portal{display:none!important}"}</style>}
      {screen ? <ScreenOnly name={screen} /> : <Shell live={!shot} />}
    </StoreProvider>
  );
}

function Shell({ live }: { live: boolean }) {
  const { s, d } = useOps();
  const visit = useVisit(s.view, live);
  const View = VIEWS[s.view];

  // Deep links from the proposal: ?view=tracker opens that module first.
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v && v in VIEWS) d({ t: "view", view: v as ViewId });
  }, [d]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [s.view]);
  useEffect(() => {
    if (!s.toasts.length) return;
    const last = s.toasts[s.toasts.length - 1];
    const t = window.setTimeout(() => d({ t: "toast-off", id: last.id }), 8000);
    return () => window.clearTimeout(t);
  }, [s.toasts, d]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        d({ t: "palette" });
      }
      if (e.key === "Escape") {
        d({ t: "drawer", d: null });
        d({ t: "palette", on: false });
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [d]);

  return (
    <div className="flex min-h-screen bg-[#f7f7f5] font-sans text-[#111113] antialiased [font-feature-settings:'cv11','ss01'] selection:bg-[#dcd6fb]">
      <style>{`
        @keyframes ov-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,.45) } 50% { box-shadow: 0 0 0 5px rgba(22,163,74,0) } }
        @keyframes ov-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @keyframes ov-slide { from { transform: translateX(28px); opacity: .5 } to { transform: none; opacity: 1 } }
        @keyframes ov-scan { 0%,100% { top: 18% } 50% { top: 78% } }
        @keyframes ov-glow { 0%,100% { box-shadow: 0 0 0 0 rgba(91,71,224,.45) } 50% { box-shadow: 0 0 0 5px rgba(91,71,224,0) } }
        .ov-pulse { animation: ov-pulse 2s ease-in-out infinite }
        .ov-in { animation: ov-in .35s ease-out both }
        .ov-slide { animation: ov-slide .28s cubic-bezier(.2,.7,.2,1) }
        .ov-scan { animation: ov-scan 2.2s ease-in-out infinite }
        .ov-glow { animation: ov-glow 2.2s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .ov-pulse, .ov-in, .ov-slide, .ov-scan, .ov-glow { animation: none } }
      `}</style>
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <MobileNav />
        <div className="flex gap-6 px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
          <main key={s.view} className="ov-in min-w-0 flex-1">
            <View />
          </main>
          {s.phone && (
            <aside className="sticky top-[76px] hidden h-fit shrink-0 2xl:block" aria-label="Phone view">
              <FounderPhone />
              <p className="mt-3 text-center text-[11.5px] text-[#6b6f76]">Same data, live. Tap Approve.</p>
            </aside>
          )}
        </div>
        <footer className="mt-auto px-7 pb-6 text-[11px] text-[#9a9ea5]">A working demo by amfire for OpticVyu. Clients, people and figures are illustrative.</footer>
      </div>
      {s.phone && <PhoneOverlay />}
      <Drawer />
      <Palette />
      {live && <Engage active={visit.active} note={visit.note} gate={visit.gate} submitName={visit.submitName} />}
      <Toasts />
    </div>
  );
}

function useCounts(): Partial<Record<ViewId, number>> {
  const { s, m } = useOps();
  return {
    approvals: APPROVALS.filter((a) => s.pending.includes(a.id)).length,
    tracker: s.projects.filter((p) => p.gate).length,
    care: m.openTickets.length,
    workorders: m.lateOrders.length,
    billing: m.gapCount,
    payments: m.toReview.length,
    inventory: s.faulty.filter((f) => !/Replaced|Spare issued/.test(f.state)).length,
  };
}

function SideNav() {
  const { s, d } = useOps();
  const counts = useCounts();
  return (
    <nav aria-label="Modules" className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-[#e9e9e5] bg-[#fbfbfa] lg:flex">
      <div className="flex h-[58px] shrink-0 items-center gap-2.5 border-b border-[#e9e9e5] px-4">
        <span className="grid size-8 place-items-center rounded-lg bg-[#111113] text-[12px] font-bold text-white">{COMPANY.initials}</span>
        <div className="min-w-0 leading-tight">
          <p className="text-[13.5px] font-semibold">{COMPANY.name}</p>
          <p className="text-[11px] text-[#8a8e95]">Ops One · founder</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-3 [scrollbar-width:thin]">
        {NAV.map((g) => (
          <div key={g.group} className="flex flex-col gap-px pb-3">
            <p className="px-2.5 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-[#9a9ea5] uppercase">{g.group}</p>
            {g.items.map((it) => {
              const active = s.view === it.id;
              const n = counts[it.id];
              return (
                <button key={it.id} type="button" onClick={() => d({ t: "view", view: it.id })} aria-current={active ? "page" : undefined} className={cx("flex items-center gap-2 rounded-md px-2.5 py-[6px] text-left text-[13px] transition", active ? "bg-white font-medium text-[#111113] shadow-[0_0_0_1px_#e6e6e1,0_1px_2px_rgba(0,0,0,0.04)]" : "text-[#4a4e55] hover:bg-[#f1f1ee] hover:text-[#111113]")}>
                  <span className={cx("h-3.5 w-[3px] rounded-full", active ? "bg-[#5b47e0]" : "bg-transparent")} />
                  <span className="flex-1">{it.label}</span>
                  {n ? <span className={cx("rounded px-1.5 text-[10.5px] font-semibold tabular-nums", active ? "bg-[#5b47e0] text-white" : "bg-[#ececE8] text-[#4a4e55]")}>{n}</span> : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="m-2.5 rounded-lg border border-[#e9e9e5] bg-white p-3">
        <p className="flex items-center gap-2 text-[12px] font-medium">
          <Dot tone="good" pulse />
          12 agents running
        </p>
        <p className="mt-1 text-[11px] leading-snug text-[#6b6f76]">1,312 tasks since midnight. Every one logged.</p>
      </div>
    </nav>
  );
}

function Clock() {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const tick = () => setT(f.format(new Date()));
    tick();
    const i = window.setInterval(tick, 15000);
    return () => window.clearInterval(i);
  }, []);
  return <span className="hidden text-[12px] whitespace-nowrap text-[#6b6f76] tabular-nums xl:inline">{t ? `${t} IST` : ""}</span>;
}

function TopBar() {
  const { s, d, m } = useOps();
  const alerts = APPROVALS.filter((a) => s.pending.includes(a.id)).length + m.lateOrders.length + m.breached.length;
  const current = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group }))).find((i) => i.id === s.view);
  return (
    <header className="sticky top-0 z-30 flex h-[58px] items-center gap-3 border-b border-[#e9e9e5] bg-white/85 px-3 backdrop-blur-md sm:px-5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#111113] text-[12px] font-bold text-white lg:hidden">{COMPANY.initials}</span>
      <p className="hidden min-w-0 items-center gap-1.5 text-[13px] md:flex">
        <span className="text-[#8a8e95]">{current?.group}</span>
        <span className="text-[#c4c6cb]">/</span>
        <span className="truncate font-medium">{current?.label}</span>
      </p>
      <select
        value={s.scope}
        onChange={(e) => d({ t: "scope", scope: e.target.value as Scope })}
        aria-label="Office"
        className={cx("h-8 rounded-lg border bg-white px-2 text-[12.5px] font-medium focus:outline-2 focus:outline-[#5b47e0]", s.scope === "all" ? "border-[#dfdfdb]" : "border-[#b9b2f2] bg-[#f5f3fe] text-[#4c39d1]")}
      >
        <option value="all">All offices</option>
        {OFFICES.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => d({ t: "palette", on: true })} className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-[#f2f2ef] px-2.5 text-left text-[12.5px] text-[#8a8e95] hover:bg-[#ececE8] md:max-w-[360px]">
        <svg viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
        <span className="truncate">Ask Ops One anything…</span>
        <span className="ml-auto hidden rounded border border-[#dfdfdb] bg-white px-1 text-[10.5px] font-medium sm:inline">Ctrl K</span>
      </button>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Clock />
        <button type="button" onClick={() => d({ t: "phone" })} aria-pressed={s.phone} className={cx("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-medium", s.phone ? "bg-[#5b47e0] text-white" : "bg-white shadow-[inset_0_0_0_1px_#dfdfdb] hover:bg-[#f7f7f5]")}>
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <rect x="4.5" y="1.5" width="7" height="13" rx="1.8" />
            <path d="M7 12.5h2" />
          </svg>
          <span className="max-sm:hidden">Phone</span>
        </button>
        <button type="button" onClick={() => d({ t: "view", view: "approvals" })} className="relative grid size-8 place-items-center rounded-lg hover:bg-[#f2f2ef]" aria-label={`${alerts} things need you`}>
          <svg viewBox="0 0 16 16" className="size-[17px]" fill="none" stroke="#4a4e55" strokeWidth="1.5" aria-hidden>
            <path d="M4 11V7a4 4 0 0 1 8 0v4l1.2 1.5H2.8z" />
            <path d="M6.5 14a1.6 1.6 0 0 0 3 0" />
          </svg>
          {alerts > 0 && <span className="absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ea580c] px-1 text-[9.5px] font-bold text-white">{alerts}</span>}
        </button>
        <span className="flex items-center gap-2 border-l border-[#ececE8] pl-2 sm:pl-3">
          <Avatar name="Opticvyu Founder" size={28} dark />
          <span className="hidden leading-tight lg:block">
            <span className="block text-[12.5px] font-medium">Founder</span>
            <span className="block text-[10.5px] text-[#8a8e95]">full access</span>
          </span>
        </span>
      </div>
    </header>
  );
}

function MobileNav() {
  const { s, d } = useOps();
  const counts = useCounts();
  return (
    <nav aria-label="Modules" className="sticky top-[58px] z-20 flex gap-1.5 overflow-x-auto border-b border-[#e9e9e5] bg-white/95 px-3 py-2 backdrop-blur [scrollbar-width:none] lg:hidden">
      {NAV.flatMap((g) => g.items).map((it) => (
        <button key={it.id} type="button" onClick={() => d({ t: "view", view: it.id })} className={cx("shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] whitespace-nowrap", s.view === it.id ? "border-[#5b47e0] bg-[#5b47e0] text-white" : "border-[#e3e3de] bg-white text-[#3f434a]")}>
          {it.label}
          {counts[it.id] ? <span className="ml-1.5 text-[10.5px] opacity-80">{counts[it.id]}</span> : null}
        </button>
      ))}
    </nav>
  );
}

function PhoneOverlay() {
  const { d } = useOps();
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#111113]/30 p-4 backdrop-blur-[2px] 2xl:hidden" onClick={() => d({ t: "phone", on: false })}>
      <div onClick={(e) => e.stopPropagation()} className="ov-in flex origin-center flex-col items-center gap-3 [@media(max-height:760px)]:scale-[0.86] [@media(max-height:640px)]:scale-[0.76]">
        <FounderPhone />
        <button type="button" onClick={() => d({ t: "phone", on: false })} className="rounded-full bg-white px-4 py-2 text-[12.5px] font-medium shadow">
          Close phone view
        </button>
      </div>
    </div>
  );
}

function Drawer() {
  const { s, d } = useOps();
  if (!s.drawer) return null;
  const dr = s.drawer;
  const meta =
    dr.kind === "site"
      ? { eb: "Site profile", title: siteById(dr.id).name }
      : dr.kind === "install"
        ? { eb: dr.id, title: "Installation complete" }
        : dr.kind === "ticket"
          ? { eb: `Ticket ${dr.id}`, title: s.tickets.find((t) => t.id === dr.id)?.subject ?? "" }
          : dr.kind === "project"
            ? { eb: `Project ${dr.id}`, title: s.projects.find((p) => p.id === dr.id)?.name ?? "" }
          : { eb: "What the agent did", title: s.activity.find((a) => a.id === dr.id)?.text ?? "" };
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#111113]/25" onClick={() => d({ t: "drawer", d: null })}>
      <aside role="dialog" aria-modal="true" aria-label={meta.title} onClick={(e) => e.stopPropagation()} className="ov-slide flex h-full w-full max-w-[500px] flex-col gap-5 overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.07em] text-[#8a8e95] uppercase">{meta.eb}</p>
            <h3 className="mt-1 text-[18px] leading-snug font-semibold tracking-[-0.02em]">{meta.title}</h3>
          </div>
          <button type="button" onClick={() => d({ t: "drawer", d: null })} aria-label="Close" className="rounded-md px-2 py-1 text-[#8a8e95] hover:bg-[#f2f2ef]">
            ✕
          </button>
        </div>
        {dr.kind === "site" && <SiteDrawer id={dr.id} />}
        {dr.kind === "install" && <InstallDrawer id={dr.id} />}
        {dr.kind === "ticket" && <TicketDrawer id={dr.id} />}
        {dr.kind === "activity" && <ActivityDrawer id={dr.id} />}
        {dr.kind === "project" && <ProjectDrawer id={dr.id} />}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------- Ask Ops One

type Answer = { q: string; a: string; cites: string[]; go: ViewId; goLabel: string };

function useAnswers(): Answer[] {
  const { s, m } = useOps();
  return useMemo(() => {
    const away = PEOPLE.filter((p) => ["On leave", "Not marked"].includes(p.today));
    const over60 = AGING.map((r) => ({ c: r.client, v: r.b60 + r.b90 })).sort((a, b) => b.v - a.v);
    return [
      { q: "Which POs end in the next 60 days?", a: "7 POs covering 19 cameras. Meridian Infra has 3, and two of its sites are running late, so extensions are likely. PO-MER-207 (Harbour Line Depot) ends first, on 4 Dec; its extension request is waiting for you.", cites: ["PO-MER-207", "PO-SKY-098", "+5 more"], go: "sites", goLabel: "Open sites" },
      { q: "Who is not at work today?", a: `${away.length} people: ${away.slice(0, 5).map((p) => `${p.name} (${p.today.toLowerCase()})`).join(", ")}${away.length > 5 ? ` and ${away.length - 5} more` : ""}. ${m.present} of ${PEOPLE.length} are in, ${PEOPLE.filter((p) => p.today === "At site").length} of them at client sites.`, cites: ["GPS check-ins", "Leave records"], go: "attendance", goLabel: "Open attendance" },
      { q: "How much is overdue over 60 days, and from whom?", a: `₹${over60.reduce((t, r) => t + r.v, 0).toFixed(1)} lakh. ${over60[0].c} owes the most (₹${over60[0].v.toFixed(1)} L), mostly invoices waiting in their vendor portal since early October; the collections agent switched them to Tuesday WhatsApp reminders, which they answer.`, cites: ["Zoho Books ledger", "Vendor portal log"], go: "payments", goLabel: "Open collections" },
      { q: "Which site costs us the most to serve?", a: "Harbour Line Depot: 4 visits this month for solar battery faults, so its cost to serve is 91% of its revenue. Swapping both batteries on the next visit removes about 3 visits a month.", cites: ["WO-2280", "Parts log", "OV-4M-2280 battery"], go: "inventory", goLabel: "Open usage by site" },
      { q: "How many cameras are sitting idle?", a: `${61} in stock, 23 of them idle for over 3 weeks, mostly in Hyderabad (31 units). Pune and Mumbai need 14 for January installs: moving 9 from Hyderabad covers most of it before buying new.`, cites: ["Fleet register", "Pipeline"], go: "inventory", goLabel: "Open inventory" },
      { q: "What did we collect this month?", a: `${money(m.collected)} so far in November, ${m.toReview.length ? `with ${m.toReview.length} payments waiting for a confirm` : "all of it matched to sites"}. Days to get paid is down to 41 from 52 a year ago.`, cites: ["Bank feed", "Client app payments"], go: "payments", goLabel: "Open payments" },
      { q: "Which complaints missed their promise?", a: `${m.breached.length} open ones: ${m.breached.map((t) => `${t.id} (${t.subject.toLowerCase()})`).join("; ") || "none"}. Both have an owner and a fix time.`, cites: s.tickets.filter((t) => t.slaLeft < 0).map((t) => t.id), go: "care", goLabel: "Open customer care" },
    ];
  }, [s, m]);
}

function Palette() {
  const { s, d } = useOps();
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<Answer | null>(null);
  const answers = useAnswers();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (s.palette) window.setTimeout(() => input.current?.focus(), 30);
  }, [s.palette]);
  if (!s.palette) return null;
  const close = () => {
    d({ t: "palette", on: false });
    setPick(null);
    setQ("");
  };
  const ql = q.toLowerCase();
  const mods = NAV.flatMap((g) => g.items).filter((i) => ql && i.label.toLowerCase().includes(ql));
  const qs = answers.filter((a) => !ql || a.q.toLowerCase().includes(ql) || ql.split(" ").some((w) => w.length > 3 && a.q.toLowerCase().includes(w)));
  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center bg-[#111113]/30 px-4 pt-[12vh] backdrop-blur-[2px]" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="ov-in w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/5">
        <div className="flex items-center gap-2.5 border-b border-[#efefeb] px-4">
          <span className="grid size-6 place-items-center rounded-md bg-[#5b47e0] text-[10px] font-bold text-white">O1</span>
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPick(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && qs[0]) setPick(qs[0]);
            }}
            placeholder="Ask about any client, site, camera, rupee or person…"
            className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#9a9ea5]"
          />
          <span className="rounded border border-[#e3e3de] px-1.5 text-[10.5px] text-[#8a8e95]">Esc</span>
        </div>
        {pick ? (
          <div className="flex flex-col gap-3 p-4">
            <p className="text-[12px] text-[#8a8e95]">{pick.q}</p>
            <p className="text-[14px] leading-relaxed">{pick.a}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#6b6f76]">
              Sources:
              {pick.cites.map((c) => (
                <span key={c} className="rounded-md bg-[#f2f2ef] px-1.5 py-0.5 font-medium text-[#3f434a]">
                  {c}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Btn size="sm" onClick={() => { d({ t: "view", view: pick.go }); setPick(null); setQ(""); }}>
                {pick.goLabel}
              </Btn>
              <Btn size="sm" kind="secondary" onClick={() => setPick(null)}>
                Ask something else
              </Btn>
            </div>
          </div>
        ) : (
          <div className="max-h-[52vh] overflow-y-auto p-2">
            {mods.length > 0 && <p className="px-2.5 pt-1 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-[#9a9ea5] uppercase">Go to</p>}
            {mods.map((mm) => (
              <button key={mm.id} type="button" onClick={() => { d({ t: "view", view: mm.id }); setQ(""); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[#f5f3fe]">
                <span className="text-[#9a9ea5]">→</span> {mm.label}
              </button>
            ))}
            <p className="px-2.5 pt-1 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-[#9a9ea5] uppercase">Ask</p>
            {qs.map((a) => (
              <button key={a.q} type="button" onClick={() => setPick(a)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-[#f5f3fe]">
                <span className="text-[#5b47e0]">✦</span> {a.q}
              </button>
            ))}
            {!qs.length && !mods.length && <p className="px-2.5 py-4 text-[13px] text-[#6b6f76]">In the live system, any question about your records is answered here, with the sources it used.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Toasts() {
  const { s, d } = useOps();
  return (
    <div className="pointer-events-none fixed right-4 bottom-20 z-[60] flex w-[min(400px,calc(100vw-2rem))] flex-col gap-2">
      {s.toasts.map((t) => (
        <div key={t.id} role="status" className={cx("ov-in pointer-events-auto rounded-xl border bg-white p-3.5 shadow-[0_20px_50px_-20px_rgba(17,17,19,0.35)]", t.tone === "info" ? "border-[#d9d3fb]" : t.tone === "warn" ? "border-[#f6d3c3]" : "border-[#bfe5cd]")}>
          <div className="flex items-start gap-2.5">
            <span className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white", t.tone === "info" ? "bg-[#5b47e0]" : t.tone === "warn" ? "bg-[#ea580c]" : "bg-[#16a34a]")}>{t.tone === "warn" ? "!" : "✓"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">{t.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-[#4a4e55]">{t.body}</p>
            </div>
            <button type="button" onClick={() => d({ t: "toast-off", id: t.id })} aria-label="Dismiss" className="text-[#8a8e95] hover:text-[#111113]">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
