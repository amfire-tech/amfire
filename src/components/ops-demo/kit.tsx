"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { STAGES, type Impact, type Risk, type Stat, type Tone, type ViewId } from "./data";

// Shared pieces for the Halden Precision demo: one dark, dense, readable look.

export type DrawerContent = { eyebrow: string; title: string; body: ReactNode };
export type DemoApi = {
  city: string;
  go: (v: ViewId) => void;
  openDrawer: (d: DrawerContent) => void;
  approved: Record<string, boolean>;
  approve: (id: string) => void;
};
export const Demo = createContext<DemoApi | null>(null);
export function useDemo() {
  const d = useContext(Demo);
  if (!d) throw new Error("useDemo outside the demo");
  return d;
}

// ---------- Live Indian time: the demo always runs on IST, ticking in the visitor's browser.

const IST = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export type IstNow = { date: string; time: string; hm: string; h: number; m: number };

export function istNow(d = new Date()): IstNow {
  const parts = IST.formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  const h = Number(get("hour"));
  const m = Number(get("minute"));
  return { date: `${get("weekday")} ${get("day")} ${get("month")}`, time: `${get("hour")}:${get("minute")}:${get("second")}`, hm: `${get("hour")}:${get("minute")}`, h, m };
}

/** IST that ticks. Null until the browser has rendered, so the server and browser agree. */
export function useIST(every = 1000) {
  const [now, setNow] = useState<IstNow | null>(null);
  useEffect(() => {
    const tick = () => setNow(istNow());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, every);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [every]);
  return now;
}

export function greeting(h: number) {
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Minutes after midnight, IST, shown as HH:MM (wraps past midnight). */
export function hhmm(total: number) {
  const t = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

export const C = {
  fg: "text-[#ededea]",
  mute: "text-[#8b8b92]",
  soft: "text-[#b9b9b4]",
  label: "text-[11.5px] font-medium tracking-[0.09em] text-[#8b8b92] uppercase",
};

export const TONE_TEXT: Record<Tone, string> = {
  good: "text-[#3ccf8e]",
  warn: "text-[#f5b54a]",
  bad: "text-[#ff6a4d]",
  info: "text-[#7cb4ff]",
  muted: "text-[#8b8b92]",
};
export const TONE_DOT: Record<Tone, string> = {
  good: "bg-[#3ccf8e]",
  warn: "bg-[#f5b54a]",
  bad: "bg-[#ff6a4d]",
  info: "bg-[#7cb4ff]",
  muted: "bg-[#55555c]",
};
const TONE_BADGE: Record<Tone, string> = {
  good: "bg-[#3ccf8e]/12 text-[#3ccf8e]",
  warn: "bg-[#f5b54a]/12 text-[#f5b54a]",
  bad: "bg-[#ff6a4d]/14 text-[#ff8a72]",
  info: "bg-[#7cb4ff]/12 text-[#9cc6ff]",
  muted: "bg-white/[0.07] text-[#b9b9b4]",
};

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[12px] font-medium whitespace-nowrap ${TONE_BADGE[tone]}`}>{children}</span>;
}

export function Dot({ tone }: { tone: Tone }) {
  return <span aria-hidden className={`inline-block size-[7px] shrink-0 rounded-full ${TONE_DOT[tone]}`} />;
}

/** Guess a tone from the words a status uses, so tables stay honest without extra fields. */
export function toneOf(s: string): Tone {
  const t = s.toLowerCase();
  if (/(overdue|late|down|critical|lost|bad|fault|blocked|disputes|hold|missing)/.test(t)) return "bad";
  if (/(approval|waiting|at risk|reorder|setup|watch|review|needs|revised|chased|quiet|negotiation|planned)/.test(t)) return "warn";
  if (/(won|paid|done|pass|approved|in transit|sent|summarised|matched|resolved|recovered|delivered|ready|running|on track|preferred|ok|closed|accepted|confirmed|growing|nothing overdue|filed)/.test(t)) return "good";
  return "muted";
}

export function Panel({ title, action, children, className = "", flush }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`min-w-0 rounded-xl border border-white/[0.07] bg-[#141417] ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
          <h4 className={C.label}>{title}</h4>
          {action}
        </header>
      )}
      <div className={flush ? "" : "px-4 pb-4"}>{children}</div>
    </section>
  );
}

export function ViewHeader({ title, agent, line }: { title: string; agent?: string; line: string }) {
  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-[1.15rem] font-medium tracking-[-0.015em]">{title}</h3>
        {agent && (
          <span className="inline-flex items-center gap-2 text-[12.5px] text-[#3ccf8e]">
            <span aria-hidden className="od-ping size-[7px] rounded-full bg-[#3ccf8e]" />
            {agent}
          </span>
        )}
      </div>
      <p className={`max-w-[52rem] text-[13px] leading-relaxed ${C.soft}`}>{line}</p>
    </header>
  );
}

export function StatGrid({ stats, cols = 6 }: { stats: Stat[]; cols?: 4 | 6 | 8 }) {
  const { go } = useDemo();
  const grid = cols === 8 ? "grid-cols-2 sm:grid-cols-4" : cols === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-6";
  return (
    <div className={`grid gap-2.5 ${grid}`}>
      {stats.map((s) => {
        const inner = (
          <>
            <span className="text-[12px] leading-tight text-[#8b8b92]">{s.label}</span>
            <span className={`font-mono text-[1.15rem] leading-none font-medium tabular-nums ${s.tone && s.tone !== "good" ? TONE_TEXT[s.tone] : ""}`}>{s.value}</span>
            {s.sub && <span className={`text-[11.5px] leading-snug ${s.tone === "good" ? "text-[#3ccf8e]" : "text-[#8b8b92]"}`}>{s.sub}</span>}
          </>
        );
        const cls = "flex min-w-0 flex-col gap-1.5 rounded-xl border border-white/[0.07] bg-[#141417] p-3 text-left";
        return s.go ? (
          <button key={s.label} type="button" onClick={() => go(s.go!)} className={`${cls} transition-colors hover:border-white/20`}>
            {inner}
          </button>
        ) : (
          <div key={s.label} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; n?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div role="tablist" className="od-scroll flex gap-1 overflow-x-auto border-b border-white/[0.07]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-[13px] whitespace-nowrap transition-colors ${value === t.id ? "border-[#ededea] font-medium text-[#ededea]" : "border-transparent text-[#8b8b92] hover:text-[#ededea]"}`}
        >
          {t.label}
          {t.n !== undefined && <span className="rounded bg-white/[0.08] px-1.5 font-mono text-[11px]">{t.n}</span>}
        </button>
      ))}
    </div>
  );
}

export type Col<T> = { key: string; label: string; render: (r: T) => ReactNode; className?: string; right?: boolean };

export function Table<T>({ cols, rows, onRow, min = 720, rowKey }: { cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; min?: number; rowKey: (r: T) => string }) {
  return (
    <div className="od-scroll overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]" style={{ minWidth: min }}>
        <thead>
          <tr className="border-b border-white/[0.07]">
            {cols.map((c) => (
              <th key={c.key} scope="col" className={`px-3 py-2 font-medium whitespace-nowrap text-[#8b8b92] ${c.right ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRow ? () => onRow(r) : undefined}
              onKeyDown={onRow ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRow(r)) : undefined}
              tabIndex={onRow ? 0 : undefined}
              className={`border-b border-white/[0.05] last:border-b-0 ${onRow ? "cursor-pointer transition-colors hover:bg-white/[0.035] focus-visible:bg-white/[0.05] focus-visible:outline-none" : ""}`}
            >
              {cols.map((c) => (
                <td key={c.key} className={`px-3 py-2.5 align-top ${c.right ? "text-right font-mono tabular-nums" : ""} ${c.className ?? ""}`}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ImpactStrip({ items }: { items: Impact[] }) {
  return (
    <div className="rounded-xl border border-[#3ccf8e]/20 bg-[#3ccf8e]/[0.04] p-4">
      <p className={C.label}>Since the agents went live</p>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="min-w-0">
            <p className="text-[12.5px] text-[#8b8b92]">{i.label}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-[15px] tabular-nums">
              <span className="text-[#8b8b92] line-through decoration-[#ff6a4d]/60">{i.before}</span>
              <span aria-hidden className="text-[#55555c]">→</span>
              <span className="font-medium text-[#3ccf8e]">{i.now}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The eight-step order status, from order to paid. */
export function StageBar({ stage, risk, compact }: { stage: number; risk: Risk; compact?: boolean }) {
  const now = risk === "Late" ? "bg-[#ff6a4d]" : risk === "At risk" ? "bg-[#f5b54a]" : "bg-[#3ccf8e]";
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center gap-[3px]" aria-label={`Stage ${stage + 1} of ${STAGES.length}: ${STAGES[stage]}`}>
        {STAGES.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${i < stage ? "bg-[#3ccf8e]/70" : i === stage ? `${now} ${risk === "Done" ? "" : "od-blink"}` : "bg-white/[0.08]"}`}
          />
        ))}
      </div>
      {!compact && <span className="text-[12px] text-[#b9b9b4]">{STAGES[stage]}</span>}
    </div>
  );
}

export function HBars({ rows, unit, tone = "good", max }: { rows: { label: string; value: number; note?: string }[]; unit?: string; tone?: Tone; max?: number }) {
  const m = max ?? Math.max(...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.label}>
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="shrink-0 font-mono tabular-nums">
              {r.value}
              {unit}
              {r.note && <span className="ml-2 text-[#8b8b92]">{r.note}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className={`h-full rounded-full ${TONE_DOT[i === 0 && tone === "bad" ? "bad" : tone]}`} style={{ width: `${Math.max(2, (r.value / m) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Weekly money in and out as paired columns, with the running balance as a line. */
export function CashChart({ weeks, start }: { weeks: { wk: string; in: number; out: number }[]; start: number }) {
  const W = 640;
  const H = 180;
  const pad = { l: 34, r: 8, t: 10, b: 22 };
  const max = Math.max(...weeks.flatMap((w) => [w.in, w.out]));
  const slot = (W - pad.l - pad.r) / weeks.length;
  const bw = Math.min(12, slot / 3);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const balances = weeks.reduce<number[]>((acc, w) => [...acc, (acc.length ? acc[acc.length - 1] : start) + w.in - w.out], []);
  const bmin = Math.min(...balances, start);
  const bmax = Math.max(...balances, start);
  const by = (v: number) => pad.t + (1 - (v - bmin) / (bmax - bmin || 1)) * (H - pad.t - pad.b);
  const line = balances.map((b, i) => `${pad.l + slot * i + slot / 2},${by(b)}`).join(" ");
  const low = balances.indexOf(Math.min(...balances));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-[240px] w-full" role="img" aria-label="Weekly cash in and out with running balance">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 6} y={y(max * f) + 4} textAnchor="end" fontSize="10" fill="#8b8b92">
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => {
          const x = pad.l + slot * i + slot / 2;
          return (
            <g key={w.wk}>
              <rect x={x - bw - 1} y={y(w.in)} width={bw} height={H - pad.b - y(w.in)} rx="2" fill="#3ccf8e" opacity="0.85" />
              <rect x={x + 1} y={y(w.out)} width={bw} height={H - pad.b - y(w.out)} rx="2" fill="#8b8b92" opacity="0.6" />
              <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="#8b8b92">
                {w.wk}
              </text>
            </g>
          );
        })}
        <polyline points={line} fill="none" stroke="#ededea" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx={pad.l + slot * low + slot / 2} cy={by(balances[low])} r="3.5" fill="#f5b54a" />
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8b8b92]">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#3ccf8e]" />Money in, $K</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[#8b8b92]" />Money out, $K</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-px w-3 bg-[#ededea]" />Bank balance</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#f5b54a]" />Lowest point: ${(balances[low] / 1000).toFixed(2)}M in {weeks[low].wk}</span>
      </div>
    </div>
  );
}

/** Cumulative revenue this month against the straight-line target. */
export function RevenueChart({ days, target }: { days: number[]; target: number }) {
  const W = 640;
  const H = 230;
  const pad = { l: 40, r: 10, t: 10, b: 22 };
  const total = 30;
  const x = (d: number) => pad.l + (d / total) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / target) * (H - pad.t - pad.b);
  const actual = days.map((v, i) => `${x(i + 1)},${y(v)}`).join(" ");
  const rate = days[days.length - 1] / days.length;
  const fx = x(total);
  const fy = y(Math.min(target * 1.1, rate * total));
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-[290px] w-full" role="img" aria-label="Revenue this month against target">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={W - pad.r} y1={y(target * f)} y2={y(target * f)} stroke="rgba(255,255,255,0.06)" />
            <text x={pad.l - 6} y={y(target * f) + 4} textAnchor="end" fontSize="10" fill="#8b8b92">
              {(target * f / 1000).toFixed(1)}M
            </text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(total)} y2={y(target)} stroke="#8b8b92" strokeDasharray="4 4" />
        <polyline points={`${x(days.length)},${y(days[days.length - 1])} ${fx},${fy}`} fill="none" stroke="#3ccf8e" strokeOpacity="0.45" strokeDasharray="3 4" strokeWidth="1.6" />
        <polyline points={`${x(0)},${y(0)} ${actual}`} fill="none" stroke="#3ccf8e" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx={x(days.length)} cy={y(days[days.length - 1])} r="4" fill="#3ccf8e" />
        {[1, 10, 20, 30].map((d) => (
          <text key={d} x={x(d)} y={H - 6} textAnchor="middle" fontSize="10" fill="#8b8b92">
            {d} Nov
          </text>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8b8b92]">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[#3ccf8e]" />Actual</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-px w-3 border-t border-dashed border-[#3ccf8e]" />At today&rsquo;s pace</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-px w-3 border-t border-dashed border-[#8b8b92]" />Target $3.2M</span>
      </div>
    </div>
  );
}

export function Thread({ items }: { items: { who: string; text: string; time: string }[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((m, i) => {
        const agent = /agent/i.test(m.who);
        const staff = /head|engineer|md|planner/i.test(m.who) && !/·/.test(m.who);
        return (
          <li key={i} className={`rounded-lg p-3 text-[13.5px] leading-snug ${agent ? "bg-[#3ccf8e]/[0.07]" : staff ? "bg-white/[0.06]" : "bg-[#0e0e10]"}`}>
            <p className="flex justify-between gap-3 text-[12px]">
              <span className={agent ? "text-[#3ccf8e]" : "text-[#b9b9b4]"}>{m.who}</span>
              <span className="text-[#8b8b92]">{m.time}</span>
            </p>
            <p className="mt-1">{m.text}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function Field({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/[0.06] py-2 text-[13.5px] last:border-b-0">
      <span className="text-[#8b8b92]">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
