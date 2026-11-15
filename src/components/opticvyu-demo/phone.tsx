"use client";

import { Fragment, createContext, useContext, useState, type ReactNode } from "react";
import { APPROVALS } from "./data";
import { money, useOps } from "./store";
import { cx } from "./ui";

// The same system on a phone. The founder's app reads and writes the same store as the web
// dashboard beside it; the employee screens show what everyone at OpticVyu gets.

/** When true, phone screens render full-viewport without the bezel, for screen captures. */
export const BareScreen = createContext(false);

export function PhoneFrame({ children, time = "11:42", tab = 0, small }: { children: ReactNode; time?: string; tab?: number; small?: boolean }) {
  const bare = useContext(BareScreen);
  if (bare)
    return (
      <div className="fixed inset-0 bg-[#f6f6f3]">
      <div className="flex origin-top-left flex-col text-[12.5px] text-[#111113]" style={{ width: 312.5, height: 676.25, transform: "scale(1.6)" }}>
        <div className="flex shrink-0 justify-between px-7 pt-4 pb-3 text-[13px] font-semibold">
          <span>{time}</span>
          <span>5G ▮▮▮</span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-4 pb-3">{children}</div>
        <div className="flex shrink-0 justify-around border-t border-[#ececE8] bg-white px-2 pt-2.5 pb-7 text-[11px] text-[#8a8e95]">
          {["Home", "Work", "Money", "Me"].map((t, i) => (
            <span key={t} className={cx("flex flex-col items-center gap-0.5", i === tab && "font-medium text-[#5b47e0]")}>
              <span className={cx("size-1.5 rounded-full", i === tab ? "bg-[#5b47e0]" : "bg-transparent")} />
              {t}
            </span>
          ))}
        </div>
      </div>
      </div>
    );
  return (
    <div className={cx("relative shrink-0 rounded-[46px] bg-[#111113] p-[10px] shadow-[0_0_0_1.5px_#3a3a3d,0_30px_60px_-30px_rgba(17,17,19,0.5)]", small ? "h-[540px] w-[262px]" : "h-[600px] w-[292px]")}>
      <span className="absolute top-[19px] left-1/2 z-10 h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-[#111113]" />
      <div className="relative flex h-full flex-col overflow-hidden rounded-[37px] bg-[#f6f6f3] text-[12px] text-[#111113]">
        <div className="flex shrink-0 justify-between px-6 pt-3 pb-2 text-[11px] font-semibold">
          <span>{time}</span>
          <span>5G ▮▮▮</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-3 [scrollbar-width:none]">{children}</div>
        <div className="flex shrink-0 justify-around border-t border-[#ececE8] bg-white/90 px-2 pt-2 pb-3 text-[9.5px] text-[#8a8e95]">
          {["Home", "Work", "Money", "Me"].map((t, i) => (
            <span key={t} className={cx("flex flex-col items-center gap-0.5", i === tab && "font-medium text-[#5b47e0]")}>
              <span className={cx("size-1.5 rounded-full", i === tab ? "bg-[#5b47e0]" : "bg-transparent")} />
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const T = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx("rounded-2xl bg-white p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]", className)}>{children}</div>;
const B = ({ children, onClick, tone = "brand" }: { children: ReactNode; onClick?: () => void; tone?: "brand" | "good" | "line" }) => (
  <button type="button" onClick={onClick} className={cx("w-full rounded-xl py-2.5 text-[12px] font-semibold active:scale-[0.98]", tone === "brand" && "bg-[#5b47e0] text-white", tone === "good" && "bg-[#16a34a] text-white", tone === "line" && "bg-white shadow-[inset_0_0_0_1px_#dfdfdb]")}>
    {children}
  </button>
);
const Lbl = ({ children }: { children: ReactNode }) => <p className="text-[10px] text-[#8a8e95]">{children}</p>;

export function FounderPhone() {
  const { s, d, m } = useOps();
  const pending = APPROVALS.filter((a) => s.pending.includes(a.id));
  return (
    <PhoneFrame>
      <p className="text-[10.5px] text-[#8a8e95]">Ops One · Founder</p>
      <h4 className="mt-0.5 mb-2.5 text-[19px] font-semibold tracking-[-0.02em]">Good morning</h4>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Revenue, Nov", money(m.mrr)],
          ["Cash in bank", money(m.cash)],
          ["Billed vs live", m.gapCount ? `${m.gapCount} gaps` : "in step"],
          ["Late jobs", String(m.lateOrders.length)],
        ].map(([k, v]) => (
          <T key={k}>
            <Lbl>{k}</Lbl>
            <p className="text-[15px] font-semibold tracking-[-0.02em] tabular-nums">{v}</p>
          </T>
        ))}
      </div>
      <p className="mt-3 mb-1.5 text-[10.5px] font-medium text-[#8a8e95]">{pending.length ? `${pending.length} decisions wait for you` : "Nothing waiting"}</p>
      <div className="flex flex-col gap-2">
        {pending.slice(0, 2).map((a) => (
          <T key={a.id}>
            <p className="text-[12px] leading-snug font-semibold">{a.title}</p>
            {a.amount && <p className="text-[11px] text-[#6b6f76] tabular-nums">{money(a.amount)}</p>}
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <B onClick={() => d({ t: "approve", id: a.id })}>Approve</B>
              <B tone="line">Ask</B>
            </div>
          </T>
        ))}
        <T>
          <Lbl>Latest</Lbl>
          <p className="text-[11.5px] leading-snug">{s.activity[0]?.text}</p>
        </T>
      </div>
    </PhoneFrame>
  );
}

export function EmployeeScreens({ only }: { only?: number } = {}) {
  const [inside, setInside] = useState(true);
  const [marked, setMarked] = useState(false);
  const [leave, setLeave] = useState(false);
  const items = [
      <div key="checkin" className="flex flex-col items-center gap-2">
        <PhoneFrame small time="09:11">
          <Lbl>Ops One · Ravi Kumar</Lbl>
          <h4 className="mb-2.5 text-[17px] font-semibold">Mark attendance</h4>
          <div className="relative h-[170px] overflow-hidden rounded-2xl bg-[#e9ebe8]">
            <svg viewBox="0 0 240 170" className="absolute inset-0 h-full w-full" aria-hidden>
              <path d="M0 50 L240 80 M0 130 L240 110 M70 0 L95 170 M170 0 L150 170" stroke="#fff" strokeWidth="9" />
              <circle cx="120" cy="88" r="52" fill="rgba(91,71,224,.12)" stroke="#5b47e0" strokeDasharray="4 4" />
              <circle cx={inside ? 112 : 205} cy={inside ? 92 : 30} r="7" fill={inside ? "#16a34a" : "#ea580c"} stroke="#fff" strokeWidth="2.5" />
            </svg>
            <span className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium">Skyline Towers B · 150 m</span>
          </div>
          <div className="mt-2 flex rounded-lg bg-[#ececE8] p-0.5 text-[10.5px]">
            <button type="button" onClick={() => { setInside(true); setMarked(false); }} className={cx("flex-1 rounded-md py-1", inside && "bg-white font-medium shadow-sm")}>Inside</button>
            <button type="button" onClick={() => { setInside(false); setMarked(false); }} className={cx("flex-1 rounded-md py-1", !inside && "bg-white font-medium shadow-sm")}>800 m away</button>
          </div>
          <div className="mt-2">
            {marked ? (
              <T className="bg-[#ebf7ef]">
                <p className="text-[11.5px] font-semibold text-[#15803d]">✓ Marked in · 09:12 · selfie matched</p>
              </T>
            ) : inside ? (
              <B tone="good" onClick={() => setMarked(true)}>Take selfie and mark in</B>
            ) : (
              <T className="bg-[#fdefe8]">
                <p className="text-[11.5px] font-semibold text-[#c2410c]">You are 650 m outside the boundary</p>
                <p className="mt-0.5 text-[10.5px] text-[#6b6f76]">Move closer, or ask for a correction with a reason.</p>
              </T>
            )}
          </div>
        </PhoneFrame>
        <p className="text-[12px] font-medium">GPS check-in</p>
      </div>,

      <div key="install" className="flex flex-col items-center gap-2">
        <PhoneFrame small time="11:40" tab={1}>
          <Lbl>Today · 3 jobs</Lbl>
          <h4 className="mb-2.5 text-[17px] font-semibold">WO-2291 · Install</h4>
          <div className="relative grid h-[130px] place-items-center overflow-hidden rounded-2xl bg-[#1b1b1e]">
            <svg viewBox="0 0 21 21" className="size-[72px] rounded bg-white p-1" aria-hidden>
              {Array.from({ length: 441 }).map((_, k) => {
                const x = k % 21, y = Math.floor(k / 21);
                const inF = (fx: number, fy: number) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;
                const fx = x >= 14 ? x - 14 : x, fy = y >= 14 ? y - 14 : y;
                const on = inF(0, 0) || inF(14, 0) || inF(0, 14) ? fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4) : (x * 5 + y * 11 + x * y) % 5 < 2;
                return on ? <rect key={k} x={x} y={y} width="1" height="1" fill="#111113" /> : null;
              })}
            </svg>
            <span className="ov-scan absolute inset-x-10 h-0.5 bg-[#3ccf8e] shadow-[0_0_10px_#3ccf8e]" />
          </div>
          <T className="mt-2">
            <p className="flex justify-between text-[11px]"><span className="text-[#8a8e95]">Serial</span>OV-8M-4821 ✓</p>
            <p className="flex justify-between text-[11px]"><span className="text-[#8a8e95]">Photos</span>4 geo-tagged ✓</p>
            <p className="flex justify-between text-[11px]"><span className="text-[#8a8e95]">Parts</span>2 clamps, 30 m Cat6</p>
          </T>
          <div className="mt-2">
            <B tone="good">Installation complete</B>
          </div>
        </PhoneFrame>
        <p className="text-[12px] font-medium">Jobs and install</p>
      </div>,

      <div key="payslip" className="flex flex-col items-center gap-2">
        <PhoneFrame small time="18:05" tab={2}>
          <Lbl>Payslip</Lbl>
          <h4 className="mb-2.5 text-[17px] font-semibold">October 2026</h4>
          <T>
            <Lbl>Net pay · credited 1 Nov</Lbl>
            <p className="text-[24px] font-semibold tracking-[-0.03em] tabular-nums">₹27,840</p>
          </T>
          <T className="mt-2">
            {[["Basic + allowances", "₹31,250"], ["Travel claims", "+ ₹1,840"], ["PF", "− ₹1,800"], ["Professional tax", "− ₹200"], ["TDS", "− ₹3,250"]].map(([k, v]) => (
              <p key={k} className="flex justify-between py-0.5 text-[11px]">
                <span className="text-[#8a8e95]">{k}</span>
                <span className="tabular-nums">{v}</span>
              </p>
            ))}
          </T>
          <div className="mt-2">
            <B tone="line">Download PDF</B>
          </div>
        </PhoneFrame>
        <p className="text-[12px] font-medium">Payslips</p>
      </div>,

      <div key="leave" className="flex flex-col items-center gap-2">
        <PhoneFrame small time="16:20" tab={3}>
          <Lbl>Leave</Lbl>
          <h4 className="mb-2.5 text-[17px] font-semibold">Apply for leave</h4>
          <div className="grid grid-cols-3 gap-1.5">
            {[["Casual", "4.5"], ["Sick", "3"], ["Earned", "7.5"]].map(([k, v]) => (
              <T key={k} className="p-2 text-center">
                <p className="text-[15px] font-semibold">{v}</p>
                <Lbl>{k}</Lbl>
              </T>
            ))}
          </div>
          <T className="mt-2">
            <p className="text-[11px] text-[#8a8e95]">Dates</p>
            <p className="text-[12px] font-medium">Fri 28 – Sat 29 Nov · 2 days</p>
            <p className="mt-1.5 text-[11px] text-[#8a8e95]">Who covers your sites</p>
            <p className="text-[12px] font-medium">Aditya Kulkarni (suggested)</p>
          </T>
          <div className="mt-2">{leave ? <T className="bg-[#ebf7ef]"><p className="text-[11.5px] font-semibold text-[#15803d]">✓ Sent to your manager</p></T> : <B onClick={() => setLeave(true)}>Send request</B>}</div>
        </PhoneFrame>
        <p className="text-[12px] font-medium">Leave</p>
      </div>,

      <div key="claims" className="flex flex-col items-center gap-2">
        <PhoneFrame small time="17:30" tab={2}>
          <Lbl>Claims</Lbl>
          <h4 className="mb-2.5 text-[17px] font-semibold">Pune site travel</h4>
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="aspect-square rounded-lg" style={{ background: `linear-gradient(${150 + i * 25}deg,#d6d0c0,#9b9488 55%,#4d4b47)` }} />
            ))}
          </div>
          <T className="mt-2">
            <p className="flex justify-between text-[11.5px]"><span className="text-[#8a8e95]">Amount</span><b>₹1,840</b></p>
            <p className="flex justify-between text-[11.5px]"><span className="text-[#8a8e95]">Linked job</span>WO-2291</p>
            <p className="flex justify-between text-[11.5px]"><span className="text-[#8a8e95]">GPS distance</span>14.2 km ✓</p>
          </T>
          <T className="mt-2 bg-[#ebf7ef]"><p className="text-[11.5px] font-semibold text-[#15803d]">✓ Checked · paid with salary</p></T>
        </PhoneFrame>
        <p className="text-[12px] font-medium">Claims</p>
      </div>,

      <div key="kit" className="flex flex-col items-center gap-2">
        <PhoneFrame small time="12:05" tab={3}>
          <Lbl>My kit</Lbl>
          <h4 className="mb-2.5 text-[17px] font-semibold">Issued to me</h4>
          {[["Insta360 X4", "IX4-2207", "In use", "#15803d"], ["Cordless drill", "", "In use", "#15803d"], ["Safety harness", "", "Check due", "#a16207"], ["4G signal tester", "ST-0418", "In use", "#15803d"], ["Pole clamps", "", "0 left", "#c2410c"]].map(([a, b, c, col]) => (
            <T key={a} className="mb-1.5 flex items-center justify-between p-2.5">
              <span>
                <span className="block text-[11.5px] font-medium">{a}</span>
                {b && <span className="text-[10px] text-[#8a8e95]">{b}</span>}
              </span>
              <span className="text-[10.5px] font-semibold" style={{ color: col }}>{c}</span>
            </T>
          ))}
          <B tone="line">Report a faulty item</B>
        </PhoneFrame>
        <p className="text-[12px] font-medium">My kit</p>
      </div>,
  ];
  if (only !== undefined) return items[only] ?? null;
  return (
    <div className="-mx-1 flex gap-5 overflow-x-auto px-1 pt-1 pb-4 [scrollbar-width:thin]">
      {items.map((x, i) => (
        <Fragment key={i}>{x}</Fragment>
      ))}
    </div>
  );
}

const SCREENS = ["checkin", "install", "payslip", "leave", "claims", "kit"];

/** One app screen, full size, for capturing real phone screens: ?screen=founder|checkin|install|… */
export function ScreenOnly({ name }: { name: string }) {
  const i = SCREENS.indexOf(name);
  return <BareScreen.Provider value={true}>{name === "founder" ? <FounderPhone /> : i >= 0 ? <EmployeeScreens only={i} /> : null}</BareScreen.Provider>;
}
