"use client";

import { useEffect, useRef, useState } from "react";
import { Button, cx } from "@/components/ui";
import { DemoFrame } from "./demo-frame";

const BASE = [380, 410, 395, 402, 420, 398, 405, 390, 412, 400, 396, 404];
const SPIKE = [640, 1180, 2100, 2800, 2400, 1300, 620, 450, 410, 400];

const EVENTS = [
  { t: "8:41 PM", text: "Alert: checkout response time 2.8 s (threshold 1.5 s)", tone: "bad" },
  { t: "8:42 PM", text: "On-call engineer acknowledged", tone: "neutral" },
  { t: "8:44 PM", text: "Extra capacity added, CDN cache warmed", tone: "neutral" },
  { t: "8:51 PM", text: "Response time back to 0.4 s", tone: "good" },
  { t: "8:55 PM", text: "Incident summary posted to your Client Hub", tone: "good" },
] as const;

const SERVICES = [
  { name: "Storefront (Shopify)", uptime: "99.98%" },
  { name: "Order tracking app", uptime: "99.95%" },
  { name: "Payments (Razorpay)", uptime: "100%" },
  { name: "Returns API", uptime: "99.97%" },
];

export function OperateDemo() {
  const [series, setSeries] = useState(BASE);
  const [events, setEvents] = useState(0);
  const [running, setRunning] = useState(false);
  const tick = useRef(0);

  useEffect(() => {
    if (!running) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- jump straight to the end state
      setSeries((s) => [...s, ...SPIKE].slice(-BASE.length));
      setEvents(EVENTS.length);
      setRunning(false);
      return;
    }
    const id = setInterval(() => {
      const i = tick.current++;
      if (i >= SPIKE.length) {
        clearInterval(id);
        setRunning(false);
        return;
      }
      setSeries((s) => [...s.slice(1), SPIKE[i]]);
      setEvents(Math.min(EVENTS.length, [0, 1, 1, 2, 2, 3, 3, 4, 5, 5][i] ?? 5));
    }, 650);
    return () => clearInterval(id);
  }, [running]);

  const latest = series[series.length - 1];
  const degraded = latest > 1500;
  const max = 3000;
  const points = series.map((v, i) => `${(i / (series.length - 1)) * 300},${100 - (v / max) * 100}`).join(" ");

  function start() {
    tick.current = 0;
    setSeries(BASE);
    setEvents(0);
    setRunning(true);
  }

  return (
    <DemoFrame label="Operate demo · Festive sale monitoring" note="Sample data. Times and figures are illustrative.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl bg-subtle p-4 ring-1 ring-line">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Checkout response time</p>
              <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", degraded ? "bg-danger/15 text-danger" : "bg-success/15 text-success")}>
                {(latest / 1000).toFixed(1)} s
              </span>
            </div>
            <svg viewBox="0 0 300 100" className="mt-3 h-28 w-full" preserveAspectRatio="none" role="img" aria-label={`Response time chart, latest ${(latest / 1000).toFixed(1)} seconds`}>
              <line x1="0" x2="300" y1={100 - (1500 / max) * 100} y2={100 - (1500 / max) * 100} stroke="currentColor" className="text-danger/50" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <polyline points={points} fill="none" stroke="url(#opgrad)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              <defs>
                <linearGradient id="opgrad" x1="0" x2="1">
                  <stop offset="0" stopColor="#ff453a" />
                  <stop offset="1" stopColor="#ff8747" />
                </linearGradient>
              </defs>
            </svg>
            <p className="mt-1 text-[11px] text-muted">Dashed line: alert threshold (1.5 s)</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SERVICES.map((s, i) => {
              const bad = degraded && i === 0;
              return (
                <li key={s.name} className="flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line">
                  <span aria-hidden className={cx("size-2.5 rounded-full", bad ? "animate-pulse-soft bg-danger" : "bg-success")} />
                  <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                  <span className="text-xs text-muted">{bad ? "Degraded" : s.uptime}</span>
                </li>
              );
            })}
          </ul>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
              <p className="text-muted">Last backup</p>
              <p className="mt-0.5 font-medium">Today, 2:00 AM IST</p>
              <p className="text-success">Restore test passed</p>
            </div>
            <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
              <p className="text-muted">SSL certificate</p>
              <p className="mt-0.5 font-medium">Renews in 61 days</p>
              <p className="text-success">Auto-renew on</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl bg-surface p-4 ring-1 ring-line">
          <p className="text-sm font-medium">Incident timeline</p>
          <ol className="mt-3 flex-1 space-y-3" aria-live="polite">
            {events === 0 ? (
              <li className="text-sm text-muted">All systems normal. Simulate the Diwali sale rush to see how an incident is handled.</li>
            ) : (
              EVENTS.slice(0, events).map((e) => (
                <li key={e.t} className="flex animate-rise gap-3 text-sm">
                  <span className="w-14 shrink-0 text-xs text-muted tabular-nums">{e.t}</span>
                  <span className={cx(e.tone === "bad" && "text-danger", e.tone === "good" && "text-success")}>{e.text}</span>
                </li>
              ))
            )}
          </ol>
          <Button size="sm" className="mt-4" onClick={start} disabled={running}>
            {running ? "Sale traffic incoming…" : events ? "Run it again" : "Simulate Diwali sale traffic"}
          </Button>
        </div>
      </div>
    </DemoFrame>
  );
}
