"use client";

import { useEffect, useRef, useState } from "react";
import { FLOW_EVENTS, SOURCES, type ViewId } from "./data";
import { useOps } from "./store";
import { cx } from "./ui";

// The command centre's opening: the nine systems OpticVyu already runs keep working, and every
// change in them flows into one core, then out to every module it touches. Ambient packets run
// on every line; each real event fires a packet from its source, through the core, to the
// modules it updated, while the ticker spells it out.

const OUT: { label: string; view: ViewId }[] = [
  { label: "Billing", view: "billing" },
  { label: "Payments", view: "payments" },
  { label: "Sites", view: "sites" },
  { label: "Customer care", view: "care" },
  { label: "Fleet", view: "fleet" },
  { label: "Inventory", view: "inventory" },
  { label: "Attendance", view: "attendance" },
  { label: "Approvals", view: "approvals" },
];

export function Icon({ k, className = "size-4" }: { k: number; className?: string }) {
  const p = [
    <><rect x="3" y="7" width="14" height="10" rx="2" /><path d="M17 10l4-2v8l-4-2" /></>, // camera
    <><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>, // box
    <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></>, // invoice
    <><path d="M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4z" /><path d="M20 5h-4a3 3 0 0 0-2 1" /></>, // books
    <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></>, // card
    <><path d="M3 10l9-6 9 6M5 10v8M19 10v8M9 10v8M15 10v8M3 20h18" /></>, // bank
    <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><circle cx="12" cy="10" r="2.5" /><path d="M9.5 16h5" /></>, // phone app
    <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>, // mail
    <><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1z" /></>, // chat
  ][k];
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {p}
    </svg>
  );
}

export function Flow() {
  const { d } = useOps();
  const [k, setK] = useState(0);
  const [count, setCount] = useState(18432);
  const [last, setLast] = useState<number[]>(() => SOURCES.map((_, i) => 3 + ((i * 7) % 26)));
  const svg = useRef<SVGSVGElement>(null);
  const mIn = useRef<SVGAnimationElement>(null);
  const oIn = useRef<SVGAnimationElement>(null);
  const mOut = useRef<SVGAnimationElement>(null);
  const oOut = useRef<SVGAnimationElement>(null);

  // Each event fires a packet from its source into the core, then out to the module it updated.
  useEffect(() => {
    if (k === 0) return;
    try {
      mIn.current?.beginElement();
      oIn.current?.beginElement();
    } catch {}
    const t = window.setTimeout(() => {
      try {
        mOut.current?.beginElement();
        oOut.current?.beginElement();
      } catch {}
    }, 850);
    return () => window.clearTimeout(t);
  }, [k]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      svg.current?.pauseAnimations();
      return;
    }
    let n = 0;
    const t = window.setInterval(() => {
      n += 1;
      const ev = FLOW_EVENTS[n % FLOW_EVENTS.length];
      setK(n);
      setCount((c) => c + 3 + (n % 5));
      setLast((l) => l.map((s, i) => (i === ev.from ? 0 : s)));
    }, 2600);
    const s = window.setInterval(() => setLast((l) => l.map((x) => x + 1)), 1000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(s);
    };
  }, []);

  const ev = FLOW_EVENTS[k % FLOW_EVENTS.length];
  const hot = k > 0 ? ev.from : -1;
  const hotOut = k > 0 ? OUT.findIndex((o) => o.label === ev.to) : -1;

  const W = 1000;
  const n = SOURCES.length;
  const xs = SOURCES.map((_, i) => (W / n) * (i + 0.5));
  const xo = OUT.map((_, i) => (W / OUT.length) * (i + 0.5));
  const inPath = (x: number) => `M${x},0 C${x},60 ${W / 2},40 ${W / 2},96`;
  const outPath = (x: number) => `M${W / 2},0 C${W / 2},40 ${x},30 ${x},88`;

  return (
    <section className="relative overflow-hidden rounded-xl border border-[#e9e9e5] bg-white">
      <style>{`
        @keyframes fl-ring { 0% { transform: scale(.8); opacity: .55 } 100% { transform: scale(1.9); opacity: 0 } }
        @keyframes fl-in { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        .fl-ring { animation: fl-ring 1.6s ease-out }
        .fl-in { animation: fl-in .45s ease-out }
        @media (prefers-reduced-motion: reduce) { .fl-ring, .fl-in { animation: none } }
      `}</style>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,rgba(98,80,214,0.07),transparent_60%)]" />
      <header className="relative flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 sm:px-5">
        <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">Your nine systems keep working. Everything flows here, live.</h3>
        <span className="inline-flex items-center gap-3 text-[12px] text-[#6b6f76]">
          <span className="tabular-nums">
            <b className="font-semibold text-[#111113]">{count.toLocaleString("en-IN")}</b> events today
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#15803d]">
            <span className="ov-pulse size-[7px] rounded-full bg-[#16a34a]" />9 of 9 in sync
          </span>
        </span>
      </header>

      <div className="relative px-3 pt-3 pb-4 sm:px-4">
        <ol className="relative z-10 grid grid-cols-3 gap-1.5 sm:grid-cols-9">
          {SOURCES.map((s, i) => (
            <li key={s.name}>
              <button type="button" onClick={() => d({ t: "view", view: "connected" })} className={cx("flex h-full w-full flex-col items-center gap-1 rounded-lg border px-1 py-2 text-center transition-colors duration-500", i === hot ? "border-[#cbc3f7] bg-[#f5f3fe]" : "border-[#eeeeea] bg-white hover:border-[#dcdcd7]")}>
                <span className={cx("grid size-7 place-items-center rounded-md transition-colors duration-500", i === hot ? "bg-[#5b47e0] text-white" : "bg-[#f3f3f0] text-[#4a4e55]")}>
                  <Icon k={i} />
                </span>
                <span className="text-[11.5px] leading-tight font-medium text-[#111113]">{s.name}</span>
                <span className={cx("text-[10.5px] tabular-nums", last[i] < 3 ? "font-medium text-[#15803d]" : "text-[#9a9ea5]")}>{last[i] < 3 ? "synced now" : `${last[i]}s ago`}</span>
              </button>
            </li>
          ))}
        </ol>

        <svg ref={svg} viewBox={`0 0 ${W} 96`} className="hidden h-auto w-full sm:block" aria-hidden>
          {xs.map((x, i) => (
            <g key={i}>
              <path d={inPath(x)} fill="none" stroke={i === hot ? "#6250d6" : "#e6e6e1"} strokeWidth={i === hot ? 1.8 : 1.1} style={{ transition: "stroke .4s" }} />
              <circle r="2.3" fill="#6250d6" opacity="0.55" visibility="hidden">
                <set attributeName="visibility" to="visible" begin={`${(i * 0.33).toFixed(2)}s`} />
                <animateMotion dur="3s" begin={`${(i * 0.33).toFixed(2)}s`} repeatCount="indefinite" path={inPath(x)} />
              </circle>
            </g>
          ))}
          <circle r="5" fill="#6250d6" stroke="#fff" strokeWidth="2" opacity="0">
            <animateMotion ref={mIn} begin="indefinite" dur="0.9s" fill="freeze" path={inPath(xs[Math.max(0, hot)])} calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines=".45 0 .25 1" />
            <animate ref={oIn} attributeName="opacity" begin="indefinite" dur="1.1s" values="1;1;0" keyTimes="0;0.82;1" fill="freeze" />
          </circle>
        </svg>

        <div className="relative z-10 my-3 flex flex-col items-center gap-2 sm:my-0">
          <span className="relative inline-flex">
            <span key={`ring-${k}`} aria-hidden className={cx("absolute inset-0 rounded-full bg-[#6250d6]", k > 0 && "fl-ring")} style={{ opacity: 0 }} />
            <span className="relative inline-flex items-center gap-2.5 rounded-full bg-[#111113] py-2 pr-4 pl-2.5 text-white shadow-[0_10px_30px_-10px_rgba(17,17,19,0.6)]">
              <span className="grid size-6 place-items-center rounded-full bg-[#5b47e0] text-[11px] font-bold">O1</span>
              <span className="text-[13px] font-semibold">Ops One core</span>
              <span className="text-[11.5px] text-[#a8a8ad] max-sm:hidden">one record for every client, site, camera, rupee and person</span>
            </span>
          </span>
          <p key={`t-${k}`} className="fl-in min-h-[18px] max-w-[64ch] text-center text-[12.5px] leading-snug text-[#3f434a]">
            {k > 0 ? (
              <>
                <b className="font-semibold text-[#111113]">{SOURCES[ev.from].name}</b> · {ev.text} <span className="text-[#9a9ea5]">→ {ev.to}</span>
              </>
            ) : (
              "Watching 9 systems. The next change appears here the second it happens."
            )}
          </p>
        </div>

        <svg viewBox={`0 0 ${W} 88`} className="hidden h-auto w-full sm:block" aria-hidden>
          {xo.map((x, i) => (
            <g key={i}>
              <path d={outPath(x)} fill="none" stroke={i === hotOut ? "#6250d6" : "#ecece8"} strokeWidth={i === hotOut ? 1.8 : 1} style={{ transition: "stroke .4s" }} />
              <circle r="2" fill="#1baf7a" opacity="0.5" visibility="hidden">
                <set attributeName="visibility" to="visible" begin={`${(i * 0.31 + 0.6).toFixed(2)}s`} />
                <animateMotion dur="2.6s" begin={`${(i * 0.31 + 0.6).toFixed(2)}s`} repeatCount="indefinite" path={outPath(x)} />
              </circle>
            </g>
          ))}
          <circle r="4.5" fill="#1baf7a" stroke="#fff" strokeWidth="2" opacity="0">
            <animateMotion ref={mOut} begin="indefinite" dur="0.8s" fill="freeze" path={outPath(xo[Math.max(0, hotOut)])} />
            <animate ref={oOut} attributeName="opacity" begin="indefinite" dur="1s" values="1;1;0" keyTimes="0;0.8;1" fill="freeze" />
          </circle>
        </svg>

        <ol className="relative z-10 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
          {OUT.map((o, i) => (
            <li key={o.label}>
              <button type="button" onClick={() => d({ t: "view", view: o.view })} className={cx("w-full rounded-full border px-2 py-1.5 text-[11.5px] font-medium transition-colors duration-500", i === hotOut ? "border-[#9fdcc4] bg-[#eaf8f2] text-[#147a55]" : "border-[#eeeeea] bg-[#fbfbfa] text-[#4a4e55] hover:border-[#dcdcd7]")}>
                {o.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
