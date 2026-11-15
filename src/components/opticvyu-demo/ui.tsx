"use client";

import { useState, type ReactNode } from "react";
import type { Tone } from "./data";

// The Ops One look: warm-white page, white panels on 1px hairlines, one violet for actions,
// status colours only for state (always with a word or arrow, never colour alone), tabular
// figures everywhere, and hand-built SVG charts with crosshairs and tooltips.

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Chart series, validated for colour-blind separation on the light surface. */
export const SERIES = ["#6250d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];
export const AGE_RAMP = ["#f7c9a3", "#ef9a5d", "#dd6a2c", "#a8451b"];

export const TONE: Record<Tone, { text: string; bg: string; dot: string; ring: string }> = {
  good: { text: "text-[#15803d]", bg: "bg-[#ebf7ef]", dot: "bg-[#16a34a]", ring: "ring-[#bfe5cd]" },
  warn: { text: "text-[#a16207]", bg: "bg-[#fdf5e1]", dot: "bg-[#eab308]", ring: "ring-[#f3dfa6]" },
  bad: { text: "text-[#c2410c]", bg: "bg-[#fdefe8]", dot: "bg-[#ea580c]", ring: "ring-[#f6d3c3]" },
  info: { text: "text-[#5b47e0]", bg: "bg-[#f0eefd]", dot: "bg-[#6d5ef0]", ring: "ring-[#d9d3fb]" },
  brand: { text: "text-[#5b47e0]", bg: "bg-[#f0eefd]", dot: "bg-[#5b47e0]", ring: "ring-[#d9d3fb]" },
  muted: { text: "text-[#5f636b]", bg: "bg-[#f2f2ef]", dot: "bg-[#b4b7bd]", ring: "ring-[#e4e4df]" },
};

export function Dot({ tone = "muted", pulse }: { tone?: Tone; pulse?: boolean }) {
  return <span aria-hidden className={cx("inline-block size-[7px] shrink-0 rounded-full", TONE[tone].dot, pulse && "ov-pulse")} />;
}

export function Badge({ tone = "muted", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] text-[11.5px] leading-tight font-medium whitespace-nowrap", TONE[tone].bg, TONE[tone].text, className)}>{children}</span>;
}

export function Delta({ v, good = true, unit = "%", suffix }: { v: number; good?: boolean; unit?: string; suffix?: string }) {
  const up = v >= 0;
  const tone: Tone = up === good ? "good" : "bad";
  return (
    <span className={cx("inline-flex items-center gap-0.5 text-[11.5px] font-medium tabular-nums", TONE[tone].text)}>
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(v)}
      {unit}
      {suffix && <span className="ml-1 font-normal text-[#8a8e95]">{suffix}</span>}
    </span>
  );
}

export function Panel({ title, sub, right, children, className, flush }: { title?: ReactNode; sub?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cx("min-w-0 rounded-xl border border-[#e9e9e5] bg-white shadow-[0_1px_1px_rgba(16,17,20,0.03)]", className)}>
      {(title || right) && (
        <header className={cx("flex items-start justify-between gap-3", flush ? "px-4 pt-3.5 pb-3 sm:px-5" : "px-4 pt-3.5 sm:px-5")}>
          <div className="min-w-0">
            {title && <h3 className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#111113]">{title}</h3>}
            {sub && <p className="mt-0.5 text-[12px] leading-snug text-[#7b7f86]">{sub}</p>}
          </div>
          {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={cx(!flush && "px-4 pt-3 pb-4 sm:px-5")}>{children}</div>
    </section>
  );
}

export function Btn({ children, onClick, kind = "primary", size = "md", className, disabled }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "secondary" | "ghost" | "good" | "dark"; size?: "xs" | "sm" | "md"; className?: string; disabled?: boolean }) {
  const k = {
    primary: "bg-[#5b47e0] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(91,71,224,0.4)] hover:bg-[#4c39d1]",
    secondary: "bg-white text-[#111113] shadow-[inset_0_0_0_1px_#dfdfdb,0_1px_1px_rgba(0,0,0,0.03)] hover:bg-[#f7f7f5]",
    ghost: "text-[#5b47e0] hover:bg-[#f0eefd]",
    good: "bg-[#16a34a] text-white hover:bg-[#15803d]",
    dark: "bg-[#111113] text-white hover:bg-[#2a2a2e]",
  }[kind];
  const sz = { xs: "h-7 px-2.5 text-[12px]", sm: "h-8 px-3 text-[12.5px]", md: "h-9 px-3.5 text-[13px]" }[size];
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40", sz, k, className)}>
      {children}
    </button>
  );
}

export function Seg<T extends string>({ value, options, onChange, size = "sm" }: { value: T; options: { id: T; label: ReactNode }[]; onChange: (v: T) => void; size?: "sm" | "xs" }) {
  return (
    <div className="inline-flex rounded-lg bg-[#f1f1ee] p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} className={cx("rounded-md font-medium whitespace-nowrap transition", size === "xs" ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-[12px]", value === o.id ? "bg-white text-[#111113] shadow-[0_1px_2px_rgba(0,0,0,0.08)]" : "text-[#6b6f76] hover:text-[#111113]")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { id: T; label: string; n?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-5 overflow-x-auto border-b border-[#ececE8] [scrollbar-width:none]">
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)} className={cx("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 text-[13px] font-medium whitespace-nowrap transition", value === t.id ? "border-[#5b47e0] text-[#111113]" : "border-transparent text-[#7b7f86] hover:text-[#111113]")}>
          {t.label}
          {t.n !== undefined && <span className={cx("rounded px-1 text-[11px] tabular-nums", value === t.id ? "bg-[#f0eefd] text-[#5b47e0]" : "bg-[#f2f2ef] text-[#7b7f86]")}>{t.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, size = 26, dark }: { name: string; size?: number; dark?: boolean }) {
  const initials = name.split(" ").map((x) => x[0]).join("").slice(0, 2);
  const hue = [...name].reduce((t, c) => t + c.charCodeAt(0), 0) % 5;
  const bg = dark ? "#111113" : ["#ece9fd", "#fde7dc", "#dcf3ea", "#fbefd0", "#fbe3ec"][hue];
  const fg = dark ? "#fff" : ["#4c39d1", "#b4441a", "#147a55", "#8a5a00", "#a8336a"][hue];
  return (
    <span aria-hidden style={{ width: size, height: size, fontSize: size * 0.38, background: bg, color: fg }} className="grid shrink-0 place-items-center rounded-full font-semibold">
      {initials}
    </span>
  );
}

export function ViewHead({ title, line, agent, right }: { title: string; line: string; agent?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-[78ch]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-[21px] leading-tight font-semibold tracking-[-0.025em] text-[#111113]">{title}</h2>
          {agent && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ebf7ef] px-2 py-0.5 text-[11.5px] font-medium text-[#15803d]">
              <Dot tone="good" pulse />
              {agent}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6f76]">{line}</p>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

/** A Stripe-style row of headline numbers in one panel, split by hairlines. */
export type Metric = { label: string; value: ReactNode; delta?: { v: number; good?: boolean; unit?: string; suffix?: string }; foot?: ReactNode; spark?: number[]; tone?: Tone; onClick?: () => void };
export function MetricStrip({ items, cols = 4 }: { items: Metric[]; cols?: 3 | 4 | 5 | 6 }) {
  const grid = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5", 6: "lg:grid-cols-6" }[cols];
  return (
    <div className={cx("grid grid-cols-2 overflow-hidden rounded-xl border border-[#e9e9e5] bg-[#e9e9e5] gap-px", grid)}>
      {items.map((k) => {
        const body = (
          <>
            <p className="flex items-center gap-1.5 text-[12px] text-[#6b6f76]">
              {k.tone && <Dot tone={k.tone} />}
              {k.label}
            </p>
            <div className="mt-1.5 flex items-end justify-between gap-2">
              <p className="text-[21px] leading-none font-semibold tracking-[-0.03em] text-[#111113] tabular-nums">{k.value}</p>
              {k.spark && <AreaSpark data={k.spark} />}
            </div>
            <div className="mt-1.5 flex min-h-[16px] flex-wrap items-center gap-x-2 text-[11.5px] text-[#7b7f86]">
              {k.delta && <Delta {...k.delta} />}
              {k.foot}
            </div>
          </>
        );
        return k.onClick ? (
          <button key={k.label} type="button" onClick={k.onClick} className="min-w-0 bg-white px-4 py-3.5 text-left transition hover:bg-[#fbfbfa]">
            {body}
          </button>
        ) : (
          <div key={k.label} className="min-w-0 bg-white px-4 py-3.5">
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function AreaSpark({ data, color = "#6250d6", w = 72, h = 26 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const id = `g${color.slice(1)}${w}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.22" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.2" fill={color} />
    </svg>
  );
}

export function Bar({ value, tone = "brand", h = 6 }: { value: number; tone?: Tone; h?: number }) {
  return (
    <span className="block w-full overflow-hidden rounded-full bg-[#efefec]" style={{ height: h }}>
      <span className={cx("block h-full rounded-full transition-[width] duration-700", TONE[tone].dot)} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </span>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cx("sticky top-0 border-b border-[#ececE8] bg-[#fbfbfa] px-3 py-2 text-left text-[11.5px] font-medium whitespace-nowrap text-[#7b7f86] first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5", className)}>{children}</th>;
}
export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx("border-b border-[#f2f2ef] px-3 py-2.5 align-middle text-[12.5px] text-[#2a2d33] first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5", className)}>{children}</td>;
}
export function Table({ children, min = 640 }: { children: ReactNode; min?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse tabular-nums" style={{ minWidth: min }}>
        {children}
      </table>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#6b6f76]">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          {i.dash ? <span className="w-3.5 border-t-2 border-dashed" style={{ borderColor: i.color }} /> : <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />}
          {i.label}
        </span>
      ))}
    </div>
  );
}

function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  // x in chart units (0..w); y as a percentage of the chart height.
  const left = Math.min(Math.max(x, 70), w - 70);
  return (
    <div className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-[#e4e4df] bg-white/95 px-2.5 py-2 text-[11.5px] whitespace-nowrap shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)] backdrop-blur" style={{ left: `${(left / w) * 100}%`, top: `calc(${y}% - 8px)` }}>
      {children}
    </div>
  );
}
const Row = ({ c, k, v }: { c: string; k: string; v: ReactNode }) => (
  <p className="flex items-center justify-between gap-4">
    <span className="inline-flex items-center gap-1.5 text-[#6b6f76]">
      <span className="size-2 rounded-[2px]" style={{ background: c }} />
      {k}
    </span>
    <b className="font-semibold text-[#111113] tabular-nums">{v}</b>
  </p>
);

/** Monthly revenue movements: new, extensions and add-ons up, projects ending down. ₹ lakh. */
export function MovementChart({ data, height = 230 }: { data: { m: string; fresh: number; ext: number; addon: number; ended: number }[]; height?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const W = 720, H = height, L = 34, R = 8, T = 10, B = 24;
  const max = 10, min = -6;
  const y = (v: number) => T + ((max - v) / (max - min)) * (H - T - B);
  const bw = (W - L - R) / data.length;
  const keys = [
    { k: "fresh", c: SERIES[0], label: "New sites" },
    { k: "ext", c: SERIES[2], label: "PO extensions" },
    { k: "addon", c: SERIES[3], label: "Add-ons" },
  ] as const;
  return (
    <div className="relative" onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Monthly revenue gained and lost">
        {[-5, 0, 5, 10].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#cfcfca" : "#f0f0ec"} />
            <text x={L - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill="#9a9ea5">
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + i * bw + bw * 0.22, w = bw * 0.56;
          let acc = 0;
          const net = d.fresh + d.ext + d.addon + d.ended;
          return (
            <g key={d.m} onMouseEnter={() => setHi(i)} opacity={hi === null || hi === i ? 1 : 0.45} style={{ transition: "opacity .2s" }}>
              <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
              {keys.map((k) => {
                const v = d[k.k];
                const y0 = y(acc + v), h = y(acc) - y(acc + v) - 1.5;
                acc += v;
                return <rect key={k.k} x={x} y={y0} width={w} height={Math.max(0, h)} rx="2.5" fill={k.c} />;
              })}
              <rect x={x} y={y(0) + 1.5} width={w} height={y(d.ended) - y(0) - 1.5} rx="2.5" fill={SERIES[1]} />
              <circle cx={x + w / 2} cy={y(net)} r="3" fill="#111113" stroke="#fff" strokeWidth="1.5" />
              <text x={x + w / 2} y={H - 7} textAnchor="middle" fontSize="10.5" fill="#9a9ea5">
                {d.m}
              </text>
            </g>
          );
        })}
      </svg>
      {hi !== null && (
        <Tip x={L + hi * bw + bw / 2} y={(y(data[hi].fresh + data[hi].ext + data[hi].addon) / H) * 100} w={W}>
          <p className="mb-1 font-semibold">{data[hi].m} · net +₹{(data[hi].fresh + data[hi].ext + data[hi].addon + data[hi].ended).toFixed(1)} L a month</p>
          <Row c={SERIES[0]} k="New sites" v={`+${data[hi].fresh}`} />
          <Row c={SERIES[2]} k="PO extensions" v={`+${data[hi].ext}`} />
          <Row c={SERIES[3]} k="Add-ons" v={`+${data[hi].addon}`} />
          <Row c={SERIES[1]} k="Projects ended" v={data[hi].ended} />
        </Tip>
      )}
    </div>
  );
}

/** Actual line, forecast line and 80% band, with a crosshair. ₹ lakh a month. */
export function ForecastChart({ months, actual, fMonths, mid, low, high, height = 230 }: { months: string[]; actual: number[]; fMonths: string[]; mid: number[]; low: number[]; high: number[]; height?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const all = [...months, ...fMonths];
  const W = 720, H = height, L = 34, R = 10, T = 12, B = 24;
  const max = 170, min = 70;
  const x = (i: number) => L + (i / (all.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const off = months.length - 1;
  const a = actual.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const f = [actual[off], ...mid].map((v, i) => `${x(off + i)},${y(v)}`).join(" ");
  const band = [...[actual[off], ...high].map((v, i) => `${x(off + i)},${y(v)}`), ...[actual[off], ...low].map((v, i) => `${x(off + i)},${y(v)}`).reverse()].join(" ");
  const val = (i: number) => (i <= off ? { v: actual[i], lo: 0, hiV: 0, f: false } : { v: mid[i - off - 1], lo: low[i - off - 1], hiV: high[i - off - 1], f: true });
  return (
    <div
      className="relative"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        setHi(Math.max(0, Math.min(all.length - 1, Math.round(((px - L) / (W - L - R)) * (all.length - 1)))));
      }}
      onMouseLeave={() => setHi(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Revenue a month with a six-month forecast">
        <defs>
          <linearGradient id="fa" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#111113" stopOpacity="0.08" />
            <stop offset="1" stopColor="#111113" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[80, 100, 120, 140, 160].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#f0f0ec" />
            <text x={L - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill="#9a9ea5">
              {t}
            </text>
          </g>
        ))}
        <rect x={x(off)} y={T} width={W - R - x(off)} height={H - T - B} fill="#f7f6fe" />
        <polygon points={`${x(0)},${y(min)} ${a} ${x(off)},${y(min)}`} fill="url(#fa)" />
        <polygon points={band} fill={SERIES[0]} opacity="0.13" />
        <polyline points={a} fill="none" stroke="#111113" strokeWidth="2" strokeLinejoin="round" />
        <polyline points={f} fill="none" stroke={SERIES[0]} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
        <text x={x(off) + 6} y={T + 12} fontSize="10.5" fill="#6b6f76">
          forecast
        </text>
        {all.map((m, i) => (
          <text key={m + i} x={x(i)} y={H - 7} textAnchor="middle" fontSize="10.5" fill="#9a9ea5">
            {m}
          </text>
        ))}
        {hi !== null && (
          <>
            <line x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} stroke="#c9c9c4" strokeDasharray="3 3" />
            <circle cx={x(hi)} cy={y(val(hi).v)} r="4.5" fill={val(hi).f ? SERIES[0] : "#111113"} stroke="#fff" strokeWidth="2" />
          </>
        )}
      </svg>
      {hi !== null && (
        <Tip x={x(hi)} y={(y(val(hi).v) / H) * 100} w={W}>
          <p className="font-semibold">
            {all[hi]} · ₹{val(hi).v} L {val(hi).f ? "expected" : "actual"}
          </p>
          {val(hi).f && <p className="text-[#6b6f76]">80% range ₹{val(hi).lo}–{val(hi).hiV} L</p>}
        </Tip>
      )}
    </div>
  );
}

/** 13-week bank balance with weekly money in and out on hover. ₹ lakh. */
export function CashChart({ weeks, start, height = 200 }: { weeks: { w: string; inflow: number; outflow: number }[]; start: number; height?: number }) {
  const [hi, setHi] = useState<number | null>(null);
  const pts = weeks.reduce<number[]>((acc, w) => [...acc, (acc.length ? acc[acc.length - 1] : start) + w.inflow - w.outflow], []);
  const W = 720, H = height, L = 34, R = 10, T = 14, B = 24;
  const max = 280, min = 140;
  const x = (i: number) => L + (i / (weeks.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const low = pts.indexOf(Math.min(...pts));
  const line = pts.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    <div className="relative" onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Bank balance over the next 13 weeks">
        <defs>
          <linearGradient id="cg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={SERIES[2]} stopOpacity="0.22" />
            <stop offset="1" stopColor={SERIES[2]} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[150, 200, 250].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#f0f0ec" />
            <text x={L - 6} y={y(t) + 3.5} textAnchor="end" fontSize="10.5" fill="#9a9ea5">
              {t}
            </text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(180)} y2={y(180)} stroke="#ea580c" strokeDasharray="4 4" opacity="0.6" />
        <text x={W - R} y={y(180) - 5} textAnchor="end" fontSize="10.5" fill="#c2410c">
          safety floor ₹180 L
        </text>
        <polygon points={`${x(0)},${y(min)} ${line} ${x(weeks.length - 1)},${y(min)}`} fill="url(#cg)" />
        <polyline points={line} fill="none" stroke="#148a61" strokeWidth="2" strokeLinejoin="round" />
        {pts.map((v, i) => (
          <g key={i} onMouseEnter={() => setHi(i)}>
            <rect x={x(i) - (W - L - R) / weeks.length / 2} y={T} width={(W - L - R) / weeks.length} height={H - T - B} fill="transparent" />
            <circle cx={x(i)} cy={y(v)} r={hi === i || i === low ? 4.5 : 2.5} fill={i === low ? "#ea580c" : "#148a61"} stroke="#fff" strokeWidth="1.5" />
            <text x={x(i)} y={H - 7} textAnchor="middle" fontSize="10.5" fill="#9a9ea5">
              {weeks[i].w}
            </text>
          </g>
        ))}
        <text x={x(low)} y={y(pts[low]) + 18} textAnchor="middle" fontSize="10.5" fill="#c2410c" fontWeight="600">
          low ₹{pts[low]} L
        </text>
      </svg>
      {hi !== null && (
        <Tip x={x(hi)} y={(y(pts[hi]) / H) * 100} w={W}>
          <p className="mb-1 font-semibold">
            {weeks[hi].w} · balance ₹{pts[hi]} L
          </p>
          <Row c="#148a61" k="Money in" v={`₹${weeks[hi].inflow} L`} />
          <Row c="#ea580c" k="Money out" v={`₹${weeks[hi].outflow} L`} />
        </Tip>
      )}
    </div>
  );
}

/** Horizontal stacked bars for overdue by age. */
export function AgingBars({ rows }: { rows: { client: string; b0: number; b30: number; b60: number; b90: number }[] }) {
  const [hi, setHi] = useState<string | null>(null);
  const max = Math.max(...rows.map((r) => r.b0 + r.b30 + r.b60 + r.b90));
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const total = r.b0 + r.b30 + r.b60 + r.b90;
        const parts = [r.b0, r.b30, r.b60, r.b90];
        return (
          <div key={r.client} className="relative grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3.5rem] items-center gap-3 text-[12px]" onMouseEnter={() => setHi(r.client)} onMouseLeave={() => setHi(null)}>
            <span className="truncate text-[#3f434a]">{r.client}</span>
            <span className="flex h-3.5 gap-[2px]" style={{ width: `${(total / max) * 100}%` }}>
              {parts.map((p, i) => (p > 0 ? <span key={i} className="h-full first:rounded-l last:rounded-r" style={{ width: `${(p / total) * 100}%`, background: AGE_RAMP[i] }} /> : null))}
            </span>
            <span className="text-right font-medium tabular-nums">₹{total.toFixed(1)} L</span>
            {hi === r.client && (
              <div className="pointer-events-none absolute -top-2 left-40 z-10 -translate-y-full rounded-lg border border-[#e4e4df] bg-white px-2.5 py-2 text-[11.5px] shadow-lg">
                {["0–30 days", "31–60 days", "61–90 days", "90+ days"].map((k, i) => (
                  <Row key={k} c={AGE_RAMP[i]} k={k} v={`₹${parts[i]} L`} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A grid of values coloured by level, with a tooltip. */
export function Heat({ rows, cols, cell, label }: { rows: string[]; cols: string[]; cell: (r: number, c: number) => { bg: string; tip: string; text?: string }; label?: string }) {
  const [hi, setHi] = useState<[number, number] | null>(null);
  return (
    <div className="relative overflow-x-auto" onMouseLeave={() => setHi(null)}>
      <table className="w-full border-separate" style={{ borderSpacing: 3, minWidth: 120 + cols.length * 26 }} aria-label={label}>
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c} className="text-center text-[10.5px] font-normal text-[#9a9ea5]">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r}>
              <td className="pr-2 text-[12px] whitespace-nowrap text-[#3f434a]">{r}</td>
              {cols.map((c, j) => {
                const v = cell(i, j);
                return (
                  <td key={c} onMouseEnter={() => setHi([i, j])} className={cx("h-[22px] min-w-[22px] rounded-[4px] text-center text-[10px] font-medium text-white transition", hi && hi[0] === i && hi[1] === j && "ring-2 ring-[#111113] ring-offset-1")} style={{ background: v.bg }}>
                    {v.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {hi && <p className="mt-2 text-[12px] text-[#3f434a]">{cell(hi[0], hi[1]).tip}</p>}
    </div>
  );
}

/** A small single-series line with a crosshair. */
export function TrendLine({ data, labels, unit = "", color = SERIES[0], height = 120, invert }: { data: number[]; labels: string[]; unit?: string; color?: string; height?: number; invert?: boolean }) {
  const [hi, setHi] = useState<number | null>(null);
  const W = 400, H = height, L = 26, R = 8, T = 10, B = 20;
  const max = Math.ceil(Math.max(...data) / 5) * 5 + 2, min = Math.floor(Math.min(...data) / 5) * 5 - 2;
  const x = (i: number) => L + (i / (data.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  return (
    <div className="relative" onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Trend">
        {[min + 2, Math.round((min + max) / 2), max - 2].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#f0f0ec" />
            <text x={L - 5} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#9a9ea5">
              {t}
            </text>
          </g>
        ))}
        <polyline points={data.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        {data.map((v, i) => (
          <g key={i} onMouseEnter={() => setHi(i)}>
            <rect x={x(i) - 12} y={T} width={24} height={H - T - B} fill="transparent" />
            {(hi === i || i === data.length - 1) && <circle cx={x(i)} cy={y(v)} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5" />}
            {i % 2 === 0 && (
              <text x={x(i)} y={H - 5} textAnchor="middle" fontSize="10" fill="#9a9ea5">
                {labels[i]}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hi !== null && (
        <Tip x={x(hi)} y={(y(data[hi]) / H) * 100} w={W}>
          <b className="font-semibold">
            {labels[hi]} · {data[hi]}
            {unit}
          </b>
          {hi > 0 && <span className="ml-2">{<Delta v={data[hi] - data[hi - 1]} good={!invert} unit={unit} />}</span>}
        </Tip>
      )}
    </div>
  );
}

export function Illustrative() {
  return <span className="rounded border border-[#e3e3de] px-1.5 py-[1px] text-[10px] font-medium tracking-[0.05em] text-[#8a8e95] uppercase">illustrative</span>;
}

export function Impact({ items }: { items: { label: string; before: string; now: string }[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-[#e9e9e5] bg-[#e9e9e5] sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="bg-[#fbfbfa] px-4 py-3">
          <p className="text-[11.5px] font-medium tracking-[0.04em] text-[#8a8e95] uppercase">{i.label}</p>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[13px]">
            <span className="text-[#9a9ea5] line-through decoration-[#d4d4cf]">{i.before}</span>
            <span aria-hidden className="text-[#c4c6cb]">→</span>
            <span className="font-semibold text-[#111113]">{i.now}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
