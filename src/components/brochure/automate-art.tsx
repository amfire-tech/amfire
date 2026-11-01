"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Automation, FlowStep, LogLine } from "@/knowledge/brochures";
import { cx } from "../ui";
import { Icon } from "./icons";

// Motion scenes for the Automate brochure: work moving through an automation
// on its own. Each scene only runs while it is on screen, and holds still
// (fully done) for readers who prefer reduced motion.

/**
 * Steps through `length` stages, holds a beat with everything done, then
 * starts again. `runs` counts finished passes.
 */
export function useLoop(length: number, ms: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  const on = inView && !reduce;
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setTick((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [on, ms]);
  const cycle = length + 2;
  return { ref, step: reduce ? length : tick % cycle, runs: Math.floor(tick / cycle), reduce };
}

function Live({ label = "Running" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/15 px-2.5 py-1 text-[11px] font-semibold text-[#22c55e]">
      <span className="relative grid size-2 place-items-center">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
        <span className="relative size-2 rounded-full bg-[#22c55e]" />
      </span>
      {label}
    </span>
  );
}

/** The cover: an order travelling through an automation, over and over. */
export function HeroFlow({ steps }: { steps: FlowStep[] }) {
  const { ref, step, runs } = useLoop(steps.length, 750);
  const done = step >= steps.length;
  return (
    <div ref={ref} className="w-full max-w-4xl rounded-[1.75rem] bg-white/5 p-4 text-left ring-1 ring-white/10 backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <Live label="Live demo" />
        <p className="text-xs text-white/60">
          Orders handled while you read: <span className="font-semibold text-white tabular-nums">{runs + (done ? 1 : 0)}</span>
        </p>
      </div>
      <ol className="mt-5 flex flex-col gap-0 sm:flex-row sm:items-start">
        {steps.map((s, i) => {
          const lit = i <= step;
          const active = i === step;
          return (
            <li key={s.label} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-stretch sm:gap-0">
              <div className="flex flex-col items-center sm:flex-row">
                <span
                  className={cx(
                    "relative grid size-12 shrink-0 place-items-center rounded-2xl transition duration-300",
                    lit ? "bg-brand text-ink shadow-[0_0_28px_rgba(255,69,58,0.55)]" : "bg-white/10 text-white/50",
                    active && "scale-110",
                  )}
                >
                  <Icon name={s.icon} />
                  {active && <span className="absolute inset-0 animate-ping rounded-2xl ring-2 ring-flame" />}
                </span>
                {i < steps.length - 1 && (
                  <span className="relative my-1 block h-6 w-0.5 overflow-hidden rounded-full bg-white/15 sm:mx-2 sm:my-0 sm:h-0.5 sm:w-auto sm:flex-1">
                    <span className={cx("bg-brand absolute inset-0 origin-top transition-transform duration-500 sm:origin-left", i < step ? "scale-100" : "scale-0")} />
                  </span>
                )}
              </div>
              <p className={cx("text-sm transition sm:mt-3 sm:pr-3 sm:text-xs", lit ? "text-white" : "text-white/50")}>{s.label}</p>
            </li>
          );
        })}
      </ol>
      <motion.p
        key={runs}
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 1 : 0 }}
        className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#22c55e]"
      >
        <Icon name="check" className="size-4" />
        Done — no one typed anything.
      </motion.p>
    </div>
  );
}

/** One automation, its trigger and steps lighting up in turn. */
export function FlowCard({ automation, delay }: { automation: Automation; delay: number }) {
  const nodes = [automation.trigger, ...automation.steps, { icon: "check" as const, label: automation.result }];
  const { ref, step, runs } = useLoop(nodes.length, 650 + delay * 90);
  return (
    <div ref={ref} className="flex h-full flex-col rounded-[1.5rem] bg-ink p-5 text-white ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{automation.title}</h3>
        <Live />
      </div>
      <ol className="mt-5 space-y-0">
        {nodes.map((n, i) => {
          const lit = i <= step;
          const last = i === nodes.length - 1;
          return (
            <li key={n.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cx(
                    "grid size-9 shrink-0 place-items-center rounded-xl transition duration-300",
                    lit ? (last ? "bg-[#22c55e] text-ink" : "bg-brand text-ink") : "bg-white/10 text-white/50",
                    i === step && "scale-110",
                  )}
                >
                  <Icon name={n.icon} className="size-4.5" />
                </span>
                {!last && (
                  <span className="relative h-5 w-0.5 overflow-hidden rounded-full bg-white/15">
                    <span className={cx("bg-brand absolute inset-0 origin-top transition-transform duration-500", i < step ? "scale-100" : "scale-0")} />
                  </span>
                )}
              </div>
              <div className="pt-1.5">
                {i === 0 && <p className="text-[10px] font-semibold tracking-widest text-flame uppercase">When</p>}
                <p className={cx("text-sm transition", lit ? "text-white" : "text-white/50", last && lit && "font-semibold text-[#22c55e]")}>{n.label}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-auto pt-4 text-xs text-white/50">
        {runs === 0 ? (
          "Watch it run…"
        ) : (
          <>
            Ran <span className="font-semibold text-white/80 tabular-nums">{runs}</span> {runs === 1 ? "time" : "times"} while you watched
          </>
        )}
      </p>
    </div>
  );
}

/** A console that writes the automation's log line by line, approvals included. */
export function LiveLog({ lines }: { lines: LogLine[] }) {
  const { ref, step } = useLoop(lines.length, 900);
  const shown = lines.slice(0, Math.min(step + 1, lines.length));
  return (
    <div ref={ref} className="overflow-hidden rounded-[1.5rem] bg-[#0f0f0f] font-mono text-[12px] text-white ring-1 ring-white/10 sm:text-[13px]">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
        {["#ff453a", "#ff8747", "#3a3a3a"].map((c) => (
          <span key={c} className="size-2.5 rounded-full" style={{ background: c }} />
        ))}
        <span className="ml-2 font-sans text-xs text-white/50">amfire · activity log</span>
        <span className="ml-auto">
          <Live label="Live" />
        </span>
      </div>
      <ol className="min-h-[17rem] space-y-1.5 p-4" aria-live="off">
        {shown.map((l, i) => (
          <motion.li key={`${i}-${l.text}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3">
            <span className="shrink-0 text-white/35">{l.time}</span>
            <span className={cx(l.kind === "approve" ? "text-flame" : l.kind === "info" ? "text-white/70" : "text-white")}>
              {l.kind === "ok" && <span className="mr-1.5 text-[#22c55e]">✓</span>}
              {l.kind === "approve" && <span className="mr-1.5">⚠</span>}
              {l.kind === "info" && <span className="mr-1.5 text-white/40">→</span>}
              {l.text}
              {l.kind === "approve" && (
                <span className="bg-brand ml-2 inline-block rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold text-ink">Waiting for a person</span>
              )}
            </span>
          </motion.li>
        ))}
        <li aria-hidden className="h-4 w-2 animate-pulse bg-white/60" />
      </ol>
    </div>
  );
}

/** The FLOW method: a marker moves through the four stages. */
export function MethodTrack({ method }: { method: { letter: string; title: string; body: string; pay: string }[] }) {
  const { ref, step } = useLoop(method.length, 1100);
  return (
    <div ref={ref}>
      <div className="relative mx-4 hidden h-1 rounded-full bg-line sm:block">
        <motion.span
          className="bg-brand absolute top-0 left-0 h-1 rounded-full"
          animate={{ width: `${(Math.min(step, method.length - 1) / (method.length - 1)) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <ol className="mt-0 grid gap-3 sm:mt-6 sm:grid-cols-4">
        {method.map((m, i) => {
          const lit = i <= step;
          return (
            <li key={m.letter} className={cx("flex flex-col rounded-card p-5 ring-1 transition duration-500", lit ? "bg-surface ring-signal/40" : "bg-surface ring-line")}>
              <span className={cx("text-6xl leading-none font-bold transition duration-500", lit ? "text-brand" : "text-fg/20")}>{m.letter}</span>
              <p className="mt-3 font-semibold">{m.title}</p>
              <p className="mt-1 text-sm text-muted">{m.body}</p>
              <p className={cx("mt-auto pt-4 text-xs font-semibold transition", lit ? "text-signal" : "text-muted")}>{m.pay}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
