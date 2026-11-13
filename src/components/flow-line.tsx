"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The signature drawing: one order moving from enquiry to payment, told in two acts.
// Today it stops where work usually gets stuck (orange, and orange means nothing else on
// the site) while the days to get paid pile up. With amfire the same order runs straight
// through and each of those points is handled (green). Day counts illustrate the pattern;
// they are not a client's figures.

const STAGES = ["Enquiry", "Quote", "Order", "Delivery", "Invoice", "Paid"];

type Mode = "today" | "amfire";

/** Each stuck point sits halfway between two stages (index of the stage before it). */
const STUCK = [
  { after: 0, today: "Reply waits in an inbox", wait: 2, amfire: "Answered", took: "4 min" },
  { after: 2, today: "Order typed in again", wait: 1, amfire: "Entered once", took: "40 sec" },
  { after: 4, today: "Payment chased at month end", wait: 26, amfire: "Reminded on time", took: "Day 30" },
];

const TOTAL = { today: 75, amfire: 40 };
const WAITED = STUCK.reduce((n, s) => n + s.wait, 0);
const MOVE_DAYS = { today: TOTAL.today - WAITED, amfire: TOTAL.amfire };

// Timeline in seconds. Today walks and pauses at each stuck point, then holds at Paid.
// With amfire runs straight through, then holds. Then it loops.
const LEN = STAGES.length - 1;
const SPEED = { today: 0.85, amfire: 1.7 }; // stages per second
const PAUSE = 1.6;
const HOLD = { today: 2.2, amfire: 3.2 };
const TODAY_DUR = LEN / SPEED.today + STUCK.length * PAUSE + HOLD.today;
const AMFIRE_DUR = LEN / SPEED.amfire + HOLD.amfire;
const CYCLE = TODAY_DUR + AMFIRE_DUR;

type Frame = { mode: Mode; p: number; days: number; stoppedAt: number | null };

function frameAt(t: number): Frame {
  let s = ((t % CYCLE) + CYCLE) % CYCLE;
  if (s < TODAY_DUR) {
    let p = 0;
    let waited = 0;
    const stops = STUCK.map((x) => x.after + 0.5);
    for (let i = 0; i <= stops.length; i++) {
      const to = i < stops.length ? stops[i] : LEN;
      const walk = (to - p) / SPEED.today;
      if (s < walk) {
        p += s * SPEED.today;
        return { mode: "today", p, days: (p / LEN) * MOVE_DAYS.today + waited, stoppedAt: null };
      }
      s -= walk;
      p = to;
      if (i < stops.length) {
        if (s < PAUSE) {
          waited += (s / PAUSE) * STUCK[i].wait;
          return { mode: "today", p, days: (p / LEN) * MOVE_DAYS.today + waited, stoppedAt: i };
        }
        s -= PAUSE;
        waited += STUCK[i].wait;
      }
    }
    return { mode: "today", p: LEN, days: TOTAL.today, stoppedAt: null };
  }
  s -= TODAY_DUR;
  const p = Math.min(LEN, s * SPEED.amfire);
  return { mode: "amfire", p, days: (p / LEN) * TOTAL.amfire, stoppedAt: null };
}

const pct = (p: number) => `${(p / LEN) * 100}%`;

/** What the cards and colours depend on; changes only a few times per loop. */
type Discrete = { mode: Mode; stoppedAt: number | null; reached: number; passed: number };
const REST: Frame = { mode: "today", p: LEN, days: TOTAL.today, stoppedAt: null };
function discreteOf(fr: Frame): Discrete {
  return {
    mode: fr.mode,
    stoppedAt: fr.stoppedAt,
    reached: STUCK.filter((s) => fr.p >= s.after + 0.5 - 0.001).length,
    passed: Math.floor(fr.p + 0.001) + 1,
  };
}
const keyOf = (x: Discrete) => `${x.mode}|${x.stoppedAt}|${x.reached}|${x.passed}`;

export function FlowLine({ className }: { className?: string }) {
  // At rest (before the browser runs, and for visitors who ask for less motion) the card
  // shows the finished "today" picture, so it reads without moving.
  //
  // Smoothness: the order, the rail and the counters move every frame by writing straight to
  // the DOM (transforms and text), so nothing re-renders 60 times a second. React state only
  // changes on real events (a stage passed, a stop starting or ending, the act changing),
  // which is what the cards and colours react to.
  const [d, setD] = useState<Discrete>(discreteOf(REST));
  const [still, setStill] = useState(true);
  const offset = useRef(0);
  const elapsed = useRef(0);
  const fill = useRef<HTMLDivElement>(null);
  const chip = useRef<HTMLDivElement>(null);
  const fillV = useRef<HTMLDivElement>(null);
  const chipV = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const wait = useRef<HTMLElement>(null);
  const lastKey = useRef(keyOf(discreteOf(REST)));
  const root = useRef<HTMLElement>(null);

  const paint = useCallback((fr: Frame) => {
    const x = fr.p / LEN;
    if (fill.current) fill.current.style.transform = `scaleX(${x})`;
    if (chip.current) chip.current.style.transform = `translate3d(${x * 100}%,0,0)`;
    if (fillV.current) fillV.current.style.transform = `scaleY(${x})`;
    if (chipV.current) chipV.current.style.transform = `translate3d(0,${x * 100}%,0)`;
    if (num.current) num.current.textContent = String(Math.round(fr.days));
    if (wait.current) wait.current.textContent = `${fr.mode === "today" ? Math.max(0, Math.round(fr.days - x * MOVE_DAYS.today)) : 0} days`;
    const next = discreteOf(fr);
    const k = keyOf(next);
    if (k !== lastKey.current) {
      lastKey.current = k;
      setD(next);
    }
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = root.current;
    if (!el) return;
    let raf = 0;
    let base = 0; // performance.now() at which elapsed would have been 0, so a resumed loop picks up where it paused
    const loop = (now: number) => {
      elapsed.current = (now - base) / 1000;
      paint(frameAt(elapsed.current + offset.current));
      raf = requestAnimationFrame(loop);
    };
    const run = () => {
      if (raf) return;
      raf = requestAnimationFrame((now) => {
        base = now - elapsed.current * 1000;
        setStill(false);
        loop(now);
      });
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    // Animate only while the drawing is on screen. It sits below the first screen, and frames
    // nobody sees cost a phone's processor right when the page is loading.
    const watch = new IntersectionObserver(([entry]) => (entry.isIntersecting ? run() : pause()));
    watch.observe(el);
    return () => {
      watch.disconnect();
      pause();
    };
  }, [paint]);

  function show(m: Mode) {
    if (still) {
      paint({ mode: m, p: LEN, days: TOTAL[m], stoppedAt: null });
      return;
    }
    offset.current = (m === "today" ? 0 : TODAY_DUR) - elapsed.current;
  }

  const today = d.mode === "today";
  const accent = today ? "text-ember" : "text-success";

  return (
    <figure ref={root} className={`relative overflow-hidden rounded-[22px] border border-line bg-white/70 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_30px_60px_-40px_rgba(11,11,12,0.25)] ${className ?? ""}`}>
      <style>{`
        @keyframes fl-ring { 0% { transform: translate(-50%,-50%) scale(.6); opacity: .55 } 100% { transform: translate(-50%,-50%) scale(2.6); opacity: 0 } }
        @keyframes fl-tick { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
        .fl-ring { animation: fl-ring 1.3s ease-out infinite }
        .fl-tick { animation: fl-tick 1s ease-in-out infinite }
        @media (prefers-reduced-motion: reduce) { .fl-ring, .fl-tick { animation: none } }
      `}</style>

      {/* Soft light behind the number, warm today and cool with amfire. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-24 h-[420px] w-[620px] rounded-full blur-3xl transition-colors duration-1000"
        style={{ background: today ? "radial-gradient(closest-side, rgba(232,72,42,0.10), transparent)" : "radial-gradient(closest-side, rgba(6,118,71,0.10), transparent)" }}
      />

      <div className="relative px-6 pt-7 pb-8 sm:px-10 sm:pt-9 sm:pb-10">
        {/* Header: the story and the switch */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[13px] font-medium tracking-[0.12em] text-muted uppercase">One order, two ways to run it</p>
            <div className="mt-4 flex items-end gap-3">
              <span className={`font-medium leading-[0.8] tracking-[-0.05em] tabular-nums transition-colors duration-700 ${accent} text-[length:clamp(4rem,9vw,6.5rem)]`} ref={num}>
                {TOTAL.today}
              </span>
              <span className="pb-1.5 text-[length:clamp(1.1rem,1.6vw,1.35rem)] leading-tight tracking-tight">
                days
                <span className="block text-muted">from enquiry to cash</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:items-end">
            <div role="group" aria-label="Show the order" className="relative grid w-full grid-cols-2 rounded-full border border-line bg-page/80 p-1 text-[13.5px] whitespace-nowrap sm:w-[240px]">
              <span
                aria-hidden
                className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-fg shadow-sm transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)]"
                style={{ transform: today ? "translateX(0)" : "translateX(100%)" }}
              />
              {(["today", "amfire"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={d.mode === m}
                  onClick={() => show(m)}
                  className={`relative z-10 rounded-full px-4 py-2 font-medium transition-colors duration-300 ${d.mode === m ? "text-page" : "text-muted hover:text-fg"}`}
                >
                  {m === "today" ? "Today" : "With amfire"}
                </button>
              ))}
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-left sm:text-right">
              <dt className="text-[12px] text-muted">Waiting on people</dt>
              <dt className="text-[12px] text-muted">Handled by agents</dt>
              <dd ref={wait} className={`font-mono text-[15px] tabular-nums ${today ? "text-ember" : "text-fg"}`}>
                {WAITED} days
              </dd>
              <dd className={`font-mono text-[15px] tabular-nums ${today ? "text-fg" : "text-success"}`}>{today ? "0 of 3" : `${d.reached} of 3`}</dd>
            </dl>
          </div>
        </div>

        <p className="sr-only">
          {today
            ? `Today the order waits three times: ${STUCK.map((s) => `${s.today.toLowerCase()}, ${s.wait} day${s.wait === 1 ? "" : "s"}`).join("; ")}. ${TOTAL.today} days from enquiry to cash.`
            : `With amfire: ${STUCK.map((s) => `${s.amfire.toLowerCase()} (${s.took})`).join("; ")}. ${TOTAL.amfire} days from enquiry to cash.`}
        </p>

        {/* The track (wide screens) */}
        <div className="relative mt-14 hidden px-[4%] lg:block" aria-hidden>
          <div className="relative h-[150px]">
            {/* Stage labels */}
            {STAGES.map((s, i) => {
              const passed = i < d.passed;
              return (
                <div key={s} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: pct(i) }}>
                  <span className={`text-[12.5px] tracking-[0.08em] uppercase transition-colors duration-500 ${passed ? "text-fg" : "text-muted/70"}`}>{s}</span>
                </div>
              );
            })}

            {/* Rail */}
            <div className="absolute top-[44px] right-0 left-0 h-[3px] rounded-full bg-fg/[0.08]" />
            <div
              ref={fill}
              className={`absolute top-[44px] right-0 left-0 h-[3px] origin-left rounded-full will-change-transform ${today ? "bg-fg" : "bg-success shadow-[0_0_14px_rgba(6,118,71,0.55)]"}`}
              style={{ transform: "scaleX(1)" }}
            />

            {/* Stage nodes */}
            {STAGES.map((s, i) => {
              const passed = i < d.passed;
              const last = i === STAGES.length - 1;
              return (
                <span
                  key={s}
                  className={`absolute top-[45.5px] size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-300 ${passed ? (today ? "border-fg bg-fg" : "border-success bg-success") : "border-fg/20 bg-page"} ${last ? "size-[15px]" : ""}`}
                  style={{ left: pct(i) }}
                />
              );
            })}

            {/* Stuck points and their cards */}
            {STUCK.map((s, i) => {
              const at = s.after + 0.5;
              const reached = i < d.reached;
              const here = d.stoppedAt === i;
              return (
                <div key={s.after} className="absolute top-[45.5px]" style={{ left: pct(at) }}>
                  <span className={`absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500 ${reached ? (today ? "bg-ember" : "bg-success") : "bg-fg/15"}`} />
                  {here && <span className="fl-ring absolute size-[14px] rounded-full border border-ember" />}
                  <span className={`absolute top-[6px] h-[26px] w-px -translate-x-1/2 transition-colors duration-500 ${reached ? (today ? "bg-ember/40" : "bg-success/40") : "bg-fg/10"}`} />
                  <div
                    className={`absolute top-[34px] w-max rounded-xl border bg-white ${i === 0 ? "-translate-x-[22%]" : i === STUCK.length - 1 ? "-translate-x-[80%]" : "-translate-x-1/2"} px-3.5 py-2.5 shadow-[0_12px_30px_-18px_rgba(11,11,12,0.35)] transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)] ${reached ? "translate-y-0 opacity-100" : "translate-y-2 opacity-40"} ${here ? "border-ember/50" : "border-line"}`}
                  >
                    <p className="flex items-center gap-2 text-[14px] leading-none">
                      {today ? (
                        <svg aria-hidden viewBox="0 0 16 16" className={`size-3.5 text-ember ${here ? "fl-tick" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6">
                          <circle cx="8" cy="8" r="6.2" />
                          <path d="M8 4.8V8l2.2 1.4" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 text-success" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M3.5 8.4 6.6 11.4 12.5 4.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {today ? s.today : s.amfire}
                      <span className={`font-mono text-[13px] ${today ? "text-ember" : "text-success"}`}>{today ? `+${s.wait} day${s.wait === 1 ? "" : "s"}` : s.took}</span>
                    </p>
                  </div>
                </div>
              );
            })}

            {/* The order */}
            {/* A full-width carrier slides by a share of the track; the ticket sits on its left edge. */}
            <div ref={chip} className="absolute inset-x-0 top-[45.5px] z-10 h-0 will-change-transform" style={{ transform: "translate3d(100%,0,0)" }}>
              <span className="absolute top-0 left-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-fg py-1 pr-2.5 pl-2 font-mono text-[11.5px] whitespace-nowrap text-page shadow-[0_8px_20px_-8px_rgba(11,11,12,0.6)]">
                <span className={`size-1.5 rounded-full transition-colors duration-300 ${today ? (d.stoppedAt !== null ? "bg-ember" : "bg-page") : "bg-[#3ccf8e]"}`} />
                SO-1182
              </span>
            </div>
          </div>
        </div>

        {/* Phones and tablets: the same story on a vertical rail. The order glides down
            through the stages, and each stuck point's card rises beside it as it arrives. */}
        <div className="relative mt-9 pb-3 lg:hidden" aria-hidden>
          <div className="relative h-[440px]">
            <div className="absolute top-0 bottom-0 left-[11px] w-[3px] rounded-full bg-fg/[0.08]" />
            <div
              ref={fillV}
              className={`absolute top-0 bottom-0 left-[11px] w-[3px] origin-top rounded-full will-change-transform ${today ? "bg-fg" : "bg-success shadow-[0_0_14px_rgba(6,118,71,0.55)]"}`}
              style={{ transform: "scaleY(1)" }}
            />

            {STAGES.map((s, i) => {
              const passed = i < d.passed;
              const last = i === STAGES.length - 1;
              return (
                <div key={s} className="absolute left-0 flex -translate-y-1/2 items-center gap-4" style={{ top: pct(i) }}>
                  <span
                    className={`ml-[6.5px] rounded-full border-2 transition-colors duration-300 ${last ? "size-[15px] -ml-[0.5px]" : "size-[12px]"} ${passed ? (today ? "border-fg bg-fg" : "border-success bg-success") : "border-fg/20 bg-page"}`}
                  />
                  <span className={`text-[12px] tracking-[0.1em] uppercase transition-colors duration-500 ${passed ? "text-fg" : "text-muted/70"} ${last ? "font-medium" : ""}`}>{s}</span>
                </div>
              );
            })}

            {STUCK.map((s, i) => {
              const at = s.after + 0.5;
              const reached = i < d.reached;
              const here = d.stoppedAt === i;
              return (
                <div key={s.after} className="absolute right-0 left-0" style={{ top: pct(at) }}>
                  <span className={`absolute left-[12.5px] size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500 ${reached ? (today ? "bg-ember" : "bg-success") : "bg-fg/15"}`} />
                  {here && <span className="fl-ring absolute left-[12.5px] size-[14px] rounded-full border border-ember" />}
                  <div
                    className={`absolute left-[34px] max-w-[calc(100%-34px)] -translate-y-1/2 rounded-xl border bg-white px-3 py-2 shadow-[0_12px_30px_-18px_rgba(11,11,12,0.35)] transition-all duration-500 ease-[cubic-bezier(.2,.7,.2,1)] ${reached ? "opacity-100" : "translate-x-1.5 opacity-40"} ${here ? "border-ember/50" : "border-line"}`}
                  >
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px] leading-tight">
                      <span aria-hidden className={`size-1.5 rounded-full ${today ? "bg-ember" : "bg-success"}`} />
                      {today ? s.today : s.amfire}
                      <span className={`font-mono text-[12.5px] ${today ? "text-ember" : "text-success"}`}>{today ? `+${s.wait} day${s.wait === 1 ? "" : "s"}` : s.took}</span>
                    </p>
                  </div>
                </div>
              );
            })}

            {/* The order: a glowing marker that glides down the rail. */}
            <div ref={chipV} className="absolute top-0 bottom-0 left-[12.5px] z-10 w-0 will-change-transform" style={{ transform: "translate3d(0,100%,0)" }}>
              <span
                className={`absolute top-0 left-0 size-[15px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-page transition-colors duration-300 ${today ? (d.stoppedAt !== null ? "bg-ember shadow-[0_0_0_5px_rgba(232,72,42,0.18)]" : "bg-fg shadow-[0_0_0_5px_rgba(11,11,12,0.12)]") : "bg-success shadow-[0_0_0_5px_rgba(6,118,71,0.2)]"}`}
              />
            </div>
          </div>
        </div>

        <figcaption className="mt-8 text-[14px] text-muted lg:mt-4">
          {today ? (
            <>
              Three moments where the order waits for a person. <span className="text-fg">With amfire: {TOTAL.amfire} days.</span>
            </>
          ) : (
            <>
              The same order. Agents handle the three moments, people approve what matters. <span className="text-fg">Today: {TOTAL.today} days.</span>
            </>
          )}
        </figcaption>
      </div>
    </figure>
  );
}
