"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { APPROVALS, COMPANY, HEALTH, NAV, OWNER, type ViewId } from "./data";
import { Demo, Dot, useIST, type DemoApi, type DrawerContent } from "./kit";
import { Agents, Approvals, Documents, Home, Tracker } from "./views-company";
import { Dispatch, Finance, Orders, People, Production, Purchase, Quality, Sales, Service } from "./views-depts";

// The Services hero: a working operating system for a fictional manufacturer, Halden Precision.
// A founder can open any department, track any order from purchase order to payment, approve a
// decision and watch the agent carry on, and open any action to see what the agent checked and
// who allowed it. Everything is illustrative; the page says so under the frame.

const START = "/start";

const VIEWS: Record<ViewId, () => React.JSX.Element> = {
  home: Home,
  trace: Tracker,
  approvals: Approvals,
  sales: Sales,
  service: Service,
  orders: Orders,
  production: Production,
  quality: Quality,
  purchase: Purchase,
  dispatch: Dispatch,
  finance: Finance,
  people: People,
  documents: Documents,
  agents: Agents,
};

/**
 * `page`: the demo is the whole page (the shareable /demo link). It fills its container,
 * scrolls inside, and has no preview fade or full-screen toggle.
 */
export function OpsDemo({ page = false }: { page?: boolean } = {}) {
  const [view, setView] = useState<ViewId>("home");
  const [drawer, setDrawer] = useState<DrawerContent | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [city, setCity] = useState<string>(COMPANY.defaultCity);

  // Place the demo company near the visitor, from the city their request comes from.
  // No browser permission is asked; unknown or blocked means Pune.
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/geo", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((g: { city?: string | null } | null) => {
        if (g?.city && g.city.length < 40) setCity(g.city);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (drawer) setDrawer(null);
      else if (full) setFull(false);
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = full ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [drawer, full]);

  const go = useCallback((v: ViewId) => {
    setView(v);
    setDrawer(null);
  }, []);

  const api: DemoApi = useMemo(
    () => ({
      city,
      go,
      openDrawer: setDrawer,
      approved,
      approve: (id) => {
        const a = APPROVALS.find((x) => x.id === id);
        setApproved((s) => ({ ...s, [id]: true }));
        if (a) setToast(a.result);
      },
    }),
    [city, go, approved],
  );

  const waiting = APPROVALS.filter((a) => !approved[a.id]).length;
  const View = VIEWS[view];

  const frame = (
    <Demo.Provider value={api}>
      <div
        className={`flex flex-col overflow-hidden bg-[#0e0e10] text-left text-[13px] text-[#ededea] ${full ? "fixed inset-0 z-[1000]" : page ? "h-full sm:rounded-2xl sm:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" : "rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06),0_50px_100px_-40px_rgba(11,11,12,0.55),0_30px_60px_-30px_rgba(232,72,42,0.18)]"}`}
        style={full ? { paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" } : undefined}
      >
        <style>{`
          @keyframes od-in { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
          @keyframes od-ping { to { box-shadow: 0 0 0 7px rgba(60,207,142,0) } }
          @keyframes od-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(242,241,236,.5) } 50% { box-shadow: 0 0 0 6px rgba(242,241,236,0) } }
          @keyframes od-up { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
          @keyframes od-slide { from { transform: translateX(28px) } to { transform: none } }
          @keyframes od-blink { 50% { opacity: .45 } }
          .od-in { animation: od-in .5s cubic-bezier(.2,.7,.2,1) }
          .od-ping { box-shadow: 0 0 0 0 rgba(60,207,142,.6); animation: od-ping 2s ease-out infinite }
          .od-pulse { animation: od-pulse 2s ease-in-out infinite }
          .od-up { animation: od-up .3s ease-out }
          .od-slide { animation: od-slide .28s cubic-bezier(.2,.7,.2,1) }
          .od-blink { animation: od-blink 1.6s ease-in-out infinite }
          .od-scroll, .od-nav { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.15) transparent }
          @media (max-width: 1023.98px) { .od-nav { scrollbar-width: none } .od-nav::-webkit-scrollbar { display: none } }
          @media (prefers-reduced-motion: reduce) { .od-in, .od-ping, .od-pulse, .od-up, .od-slide, .od-blink { animation: none } }
        `}</style>

        {/* Title bar */}
        {/* One line at every width: the company on the left (truncating), the owner always far right.
            Less important details drop out as the frame narrows instead of wrapping. */}
        <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.07] px-3 py-2.5 sm:gap-4 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-md bg-[#f2f1ec] text-[12px] font-bold text-[#0b0b0c]">HP</span>
            <div className="min-w-0 leading-tight">
              <p className="flex items-center gap-2 truncate font-medium">
                {COMPANY.name}
                <span className="rounded border border-white/10 px-1.5 py-px text-[10.5px] font-normal text-[#8b8b92] max-sm:hidden">Demo company</span>
              </p>
              <p className="truncate text-[12px] text-[#8b8b92]">
                <span className="max-2xl:hidden">{COMPANY.line} · </span>
                {COMPANY.people} · 2 plants in {city} · {COMPANY.customers}
              </p>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2.5 text-[12px] text-[#8b8b92] sm:gap-3">
            <span className="inline-flex items-center gap-2 text-[#3ccf8e] max-2xl:hidden">
              <span aria-hidden className="od-ping size-[7px] rounded-full bg-[#3ccf8e]" />
              11 agents running
            </span>
            <span className="inline-flex items-center gap-1.5 max-xl:hidden">
              <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 14s4.5-4.2 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14Z" />
                <circle cx="8" cy="6.5" r="1.6" />
              </svg>
              {city}
            </span>
            <IstClock />
            {!page && (
            <button
              type="button"
              onClick={() => setFull((f) => !f)}
              aria-label={full ? "Close full screen" : "Full screen"}
              className="inline-flex items-center gap-1.5 rounded-md p-1.5 text-[12px] font-medium whitespace-nowrap text-[#ededea] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] hover:bg-white/5 sm:px-2.5"
            >
              <svg aria-hidden viewBox="0 0 16 16" className="size-4 sm:hidden" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                {full ? <path d="M4 4l8 8M12 4l-8 8" /> : <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />}
              </svg>
              <span className="max-sm:hidden">{full ? "Close full screen" : "Full screen"}</span>
            </button>
            )}
            <span className="flex shrink-0 items-center gap-2 border-l border-white/[0.08] pl-2.5 sm:pl-3" title={`Signed in as ${OWNER.name}`}>
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[#e8482a] to-[#f5b54a] text-[11px] font-semibold text-[#0b0b0c]">
                {OWNER.initials}
              </span>
              <span className="leading-tight whitespace-nowrap max-md:hidden">
                <span className="block text-[12.5px] font-medium text-[#ededea]">{OWNER.name}</span>
                <span className="block text-[11px] text-[#8b8b92]">{OWNER.role}</span>
              </span>
            </span>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 max-lg:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* Navigation */}
          <nav
            aria-label="Halden Precision modules"
            className="od-nav flex shrink-0 snap-x scroll-px-3 gap-1.5 overflow-x-auto border-b border-white/[0.07] px-3 py-2.5 max-lg:[mask-image:linear-gradient(90deg,#000_88%,transparent)] lg:flex-col lg:gap-1 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-3"
          >
            {NAV.map((g) => (
              <div key={g.group} className="contents lg:flex lg:flex-col lg:gap-0.5 lg:pb-3">
                <p className="hidden px-2.5 pt-1 pb-1.5 text-[11px] font-medium tracking-[0.1em] text-[#55555c] uppercase lg:block">{g.group}</p>
                {g.items.map((it) => {
                  const active = view === it.id;
                  const health = HEALTH[it.id];
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => go(it.id)}
                      aria-current={active ? "page" : undefined}
                      className={`flex shrink-0 snap-start items-center gap-2.5 px-2.5 py-[6px] text-left text-[13px] whitespace-nowrap transition-colors max-lg:rounded-full max-lg:border max-lg:px-3.5 max-lg:py-[7px] lg:rounded-lg ${active ? "bg-white/[0.09] text-[#ededea] max-lg:border-[#f2f1ec] max-lg:bg-[#f2f1ec] max-lg:text-[#0b0b0c]" : "text-[#b9b9b4] hover:bg-white/[0.04] hover:text-[#ededea] max-lg:border-white/[0.09]"}`}
                    >
                      {health ? <Dot tone={health} /> : <span aria-hidden className="size-[7px] shrink-0 rounded-sm bg-white/25" />}
                      <span className="flex-1">{it.label}</span>
                      {it.id === "approvals" && waiting > 0 && <span className="rounded-full bg-[#f2f1ec] px-1.5 font-mono text-[11px] text-[#0b0b0c]">{waiting}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="mt-auto hidden pt-2 lg:block">
              <div className="rounded-xl border border-white/[0.07] bg-[#141417] p-3.5">
                <p className="text-[13px] leading-snug">Your company, run like this.</p>
                <Link href={START} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#3ccf8e] hover:underline">
                  Start a conversation <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </nav>

          {/* View */}
          <div className="relative min-h-0 min-w-0">
            <div className={`od-scroll isolate p-4 sm:p-5 ${full || page ? "h-full overflow-y-auto" : "max-lg:h-[560px] max-lg:overflow-hidden lg:h-[720px] lg:overflow-y-auto"}`}>
              <div key={view} className="od-up">
                <View />
              </div>
            </div>

            {/* Phones: the page shows a preview; the demo itself opens full screen, like an app. */}
            {!full && !page && (
              <div className="absolute inset-x-0 bottom-0 z-[5] flex h-60 flex-col items-center justify-end gap-2.5 bg-gradient-to-b from-transparent via-[#0e0e10]/85 to-[#0e0e10] px-5 pb-6 text-center lg:hidden">
                <button
                  type="button"
                  onClick={() => setFull(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f2f1ec] px-5 py-3 text-[14px] font-medium text-[#0b0b0c] shadow-[0_10px_30px_-10px_rgba(242,241,236,0.45)] active:scale-[0.98]"
                >
                  <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
                  </svg>
                  Open the live demo
                </button>
                <p className="text-[12px] text-[#8b8b92]">14 modules · tap anything · approve a decision</p>
              </div>
            )}

            {drawer && (
              <div className="absolute inset-0 z-10 flex justify-end bg-black/55" onClick={() => setDrawer(null)}>
                <aside
                  role="dialog"
                  aria-modal="true"
                  aria-label={drawer.title}
                  onClick={(e) => e.stopPropagation()}
                  className="od-slide od-scroll flex h-full w-full max-w-[440px] flex-col gap-4 overflow-y-auto border-l border-white/[0.08] bg-[#121215] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-medium tracking-[0.09em] text-[#8b8b92] uppercase">{drawer.eyebrow}</p>
                      <h4 className="mt-1.5 text-[1.05rem] leading-snug font-medium">{drawer.title}</h4>
                    </div>
                    <button type="button" onClick={() => setDrawer(null)} aria-label="Close" className="rounded-md px-2 py-1 text-[#8b8b92] hover:bg-white/5 hover:text-[#ededea]">
                      ✕
                    </button>
                  </div>
                  {drawer.body}
                </aside>
              </div>
            )}

            {toast && (
              <div role="status" className="od-up absolute inset-x-3 bottom-3 z-20 rounded-xl border border-[#3ccf8e]/30 bg-[#0f1d17] p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:w-[390px]">
                <p className="flex items-start gap-2.5 text-[13.5px] leading-snug">
                  <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#3ccf8e] text-[11px] font-bold text-[#0b0b0c]">✓</span>
                  <span>
                    <b className="font-medium">Approved. The agent carried on.</b>
                    <span className="mt-1 block text-[#b9b9b4]">{toast}</span>
                  </span>
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-3 text-[13px]">
                  <span className="text-[#b9b9b4]">One tap from your phone. That&rsquo;s your whole job.</span>
                  <Link href={START} className="font-medium whitespace-nowrap text-[#3ccf8e] hover:underline">
                    Get this →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Phones, full screen: the way out is always one tap away. */}
        {(full || page) && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-4 py-3 text-[13px] lg:hidden">
            <span className="text-[#b9b9b4]">Your company, run like this.</span>
            <Link href={START} className="rounded-full bg-[#3ccf8e] px-4 py-2 font-medium whitespace-nowrap text-[#0b0b0c]">
              Start a conversation
            </Link>
          </div>
        )}
      </div>
    </Demo.Provider>
  );

  // Full screen lifts the frame out of the page so the site header can't sit on top of it.
  // (IstClock is defined below; it ticks on its own so the rest of the demo doesn't re-render.)
  if (full) {
    return (
      <>
        <div aria-hidden className="h-[680px] rounded-2xl bg-[#0e0e10] lg:h-[790px]" />
        {createPortal(frame, document.body)}
      </>
    );
  }
  return frame;
}

function IstClock() {
  const now = useIST();
  return (
    <span className="font-mono text-[12px] whitespace-nowrap tabular-nums max-sm:hidden" aria-label="Indian Standard Time">
      <span className="max-xl:hidden">{now ? `${now.date} · ` : ""}</span>
      {now ? `${now.time} IST` : "IST"}
    </span>
  );
}
