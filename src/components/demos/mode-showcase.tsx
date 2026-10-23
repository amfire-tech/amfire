"use client";

import { useEffect, useState } from "react";
import { cx } from "@/components/ui";

// Hero visual: each service told as a tiny story — the owner's problem,
// then what AMFIRE does about it. Cycles gently; pauses on hover/focus and
// never auto-advances with reduced motion.

const MODES = [
  { id: "build", label: "Build", tagline: "Software made for your problem" },
  { id: "operate", label: "Operate", tagline: "Your tech team, without hiring" },
  { id: "automate", label: "Automate", tagline: "Manual work, done automatically" },
] as const;

export function ModeShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % MODES.length), 6000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div aria-hidden className="bg-brand absolute -inset-6 -z-10 animate-float rounded-[3rem] opacity-20 blur-3xl dark:opacity-25" />
      <div className="rounded-[1.75rem] bg-surface p-3 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.5)] ring-1 ring-line">
        <div role="tablist" aria-label="What AMFIRE does" className="grid grid-cols-3 gap-1 rounded-2xl bg-subtle p-1">
          {MODES.map((m, i) => (
            <button
              key={m.id}
              role="tab"
              id={`mode-tab-${m.id}`}
              aria-selected={active === i}
              aria-controls={`mode-panel-${m.id}`}
              onClick={() => setActive(i)}
              className={cx(
                "relative rounded-xl py-2 text-sm font-semibold transition",
                active === i ? "bg-surface text-fg shadow-sm ring-1 ring-line" : "text-muted hover:text-fg",
              )}
            >
              {m.label}
              {active === i && <span aria-hidden className="bg-brand absolute inset-x-6 -bottom-px h-0.5 rounded-full" />}
            </button>
          ))}
        </div>
        <div className="relative mt-3 h-[340px] overflow-hidden rounded-2xl bg-subtle ring-1 ring-line">
          {MODES.map((m, i) => (
            <div
              key={m.id}
              role="tabpanel"
              id={`mode-panel-${m.id}`}
              aria-labelledby={`mode-tab-${m.id}`}
              hidden={active !== i}
              className="absolute inset-0 flex animate-rise flex-col gap-3 p-4"
            >
              <p className="text-xs font-semibold tracking-widest text-muted uppercase">{m.tagline}</p>
              {m.id === "build" && <BuildStory />}
              {m.id === "operate" && <OperateStory />}
              {m.id === "automate" && <AutomateStory />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Problem({ who, children }: { who: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
      <p className="text-[11px] font-medium text-muted">The owner&apos;s problem · {who}</p>
      <p className="mt-1 text-sm leading-snug font-medium">{children}</p>
    </div>
  );
}

function Solution({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto rounded-xl bg-ink p-3 text-white">
      <p className="text-[11px] font-medium text-white/60">What AMFIRE does</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function BuildStory() {
  return (
    <>
      <Problem who="auto-parts maker, Ludhiana">“Dealers call all day asking ‘stock hai?’ and ‘order kahan pahuncha?’”</Problem>
      <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Order #SO-2291</span>
          <span className="text-muted">₹8,400</span>
        </div>
        <ol className="mt-2 flex items-center gap-1.5">
          {["Placed", "Approved", "Invoiced", "Dispatched", "Delivered"].map((s, i) => (
            <li key={s} className="flex-1">
              <span className={cx("block h-1.5 rounded-full", i < 4 ? "bg-brand" : "bg-line")} />
              <span className="mt-1 block truncate text-[10px] text-muted">{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <Solution>Builds a dealer app with live stock, prices and order tracking — dealers check for themselves.</Solution>
    </>
  );
}

function OperateStory() {
  const items = ["Website & hosting", "Business email", "Google listing & SEO", "Instagram & ads", "Backups & security", "Monthly report"];
  return (
    <>
      <Problem who="showroom owner, Nagpur">“Website is old, Google shows wrong timings, nobody posts on Instagram.”</Problem>
      <ul className="grid grid-cols-2 gap-1.5 rounded-xl bg-surface p-3 text-xs ring-1 ring-line">
        {items.map((i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span aria-hidden className="text-success">✓</span>
            {i}
          </li>
        ))}
      </ul>
      <Solution>Becomes the showroom&apos;s tech team — everything online handled, no hiring needed.</Solution>
    </>
  );
}

function AutomateStory() {
  return (
    <>
      <Problem who="fabric wholesaler, Surat">“Three people spend all day re-typing WhatsApp orders into Tally.”</Problem>
      <div className="flex items-center gap-2 text-xs">
        <span className="max-w-[60%] rounded-xl rounded-tl-sm bg-[#d9fdd3] px-3 py-2 text-[#111] dark:bg-[#005c4b] dark:text-[#e9edef]">
          Design 4521 – 40 thaan 🙏
        </span>
        <span aria-hidden className="text-muted">→</span>
        <span className="rounded-xl bg-surface px-3 py-2 ring-1 ring-line">Tally voucher ✓ e-invoice ✓</span>
      </div>
      <Solution>Orders flow from WhatsApp into Tally automatically — staff just approve.</Solution>
    </>
  );
}
