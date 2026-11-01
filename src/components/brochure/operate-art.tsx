"use client";

import { motion } from "motion/react";
import type { ComponentType } from "react";
import { cx } from "../ui";
import { Icon } from "./icons";

// Small animated scenes for the six Operate services, drawn on the dark card
// header. Each one plays once, the first time it scrolls into view.

const once = { once: true, amount: 0.4 } as const;

const TILES = ["linear-gradient(135deg,#ff453a,#ff8747)", "#2b2b2b", "linear-gradient(135deg,#ff8747,#ffd2b8)", "#ff453a", "#3a3a3a", "linear-gradient(135deg,#ffffff,#ffd9c7)"];

function PostsArt() {
  return (
    <div className="relative h-full">
      <div className="mx-auto h-full w-[7.5rem] rounded-[1.4rem] bg-white/10 p-1.5 ring-1 ring-white/20">
        <div className="grid h-full grid-cols-3 content-start gap-1 overflow-hidden rounded-[1rem] bg-ink p-1.5">
          {Array.from({ length: 18 }, (_, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={once}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="aspect-square rounded-[3px]"
              style={{ background: TILES[(i * 5) % TILES.length] }}
            />
          ))}
        </div>
      </div>
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={once}
        transition={{ delay: 1.2 }}
        className="bg-brand absolute top-3 right-[calc(50%-7.5rem)] rounded-full px-2.5 py-1 text-[10px] font-bold text-ink"
      >
        1 every day
      </motion.span>
    </div>
  );
}

const POSTERS = [
  {
    label: "Offer",
    rot: -22,
    bg: "linear-gradient(160deg,#ff453a,#ff8747)",
    fg: "#080808",
  },
  { label: "Flyer", rot: -11, bg: "#ffffff", fg: "#080808" },
  {
    label: "Banner",
    rot: 0,
    bg: "linear-gradient(160deg,#1f1f1f,#3a3a3a)",
    fg: "#ff8747",
  },
  {
    label: "Festival",
    rot: 11,
    bg: "linear-gradient(160deg,#ff8747,#ffd2b8)",
    fg: "#080808",
  },
  { label: "Menu", rot: 22, bg: "#ff453a", fg: "#ffffff" },
];

function DesignsArt() {
  return (
    <div className="relative h-full w-full">
      {POSTERS.map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ rotate: 0, y: 24, opacity: 0 }}
          whileInView={{ rotate: p.rot, y: 0, opacity: 1 }}
          viewport={once}
          transition={{ delay: 0.15 + i * 0.09, type: "spring", bounce: 0.35 }}
          style={{ background: p.bg, color: p.fg, transformOrigin: "50% 100%" }}
          className="absolute bottom-0 left-1/2 -ml-11 flex h-32 w-22 flex-col rounded-lg p-2 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.8)] ring-1 ring-black/10"
        >
          <span className="h-1.5 w-10 rounded-full bg-current opacity-60" />
          <span className="mt-1 h-1.5 w-6 rounded-full bg-current opacity-40" />
          <span className="mt-auto text-[11px] font-bold tracking-wide uppercase">{p.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function FeaturesArt() {
  return (
    <div className="w-full max-w-[15rem] overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/15">
      <div className="flex gap-1 border-b border-white/10 px-3 py-2">
        {["#ff453a", "#ff8747", "#3a3a3a"].map((c) => (
          <span key={c} className="size-2 rounded-full" style={{ background: c }} />
        ))}
        <span className="ml-2 h-2 flex-1 rounded-full bg-white/10" />
      </div>
      <ul className="space-y-1.5 p-3 text-[11px]">
        {["Online booking", "Enquiry form", "Sales dashboard"].map((f, i) => (
          <motion.li
            key={f}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={once}
            transition={{ delay: 0.2 + i * 0.35 }}
            className="flex items-center justify-between rounded-md bg-white/5 px-2 py-1.5"
          >
            <span>{f}</span>
            <span className="rounded-full bg-[#22c55e] px-1.5 py-0.5 text-[9px] font-semibold text-ink">Shipped</span>
          </motion.li>
        ))}
        <motion.li
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={once}
          transition={{ delay: 1.4 }}
          className="rounded-md border border-dashed border-white/25 px-2 py-1.5 text-white/60"
        >
          + Your next idea
        </motion.li>
      </ul>
    </div>
  );
}

const TOOLS = ["WhatsApp", "AI", "UPI", "Tally", "Google", "Zoho"];

function ToolsArt() {
  const nodes = TOOLS.map((t, i) => {
    const a = (i / TOOLS.length) * Math.PI * 2 - Math.PI / 2;
    return { t, x: 110 + Math.cos(a) * 84, y: 74 + Math.sin(a) * 56 };
  });
  return (
    <div className="relative aspect-[220/148] h-full max-w-full">
      <svg viewBox="0 0 220 148" className="absolute inset-0 size-full" aria-hidden>
        {nodes.map((n, i) => (
          <motion.path
            key={n.t}
            d={`M110 74 L${n.x.toFixed(1)} ${n.y.toFixed(1)}`}
            stroke="#ff8747"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.7 }}
            viewport={once}
            transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
          />
        ))}
      </svg>
      <span className="bg-brand absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[10px] font-bold text-ink shadow-[0_0_24px_rgba(255,69,58,0.6)]">
        You
      </span>
      {nodes.map((n, i) => (
        <motion.span
          key={n.t}
          initial={{ opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={once}
          transition={{ delay: 0.5 + i * 0.12 }}
          style={{
            left: `${(n.x / 220) * 100}%`,
            top: `${(n.y / 148) * 100}%`,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-ink"
        >
          {n.t}
        </motion.span>
      ))}
    </div>
  );
}

const STATUS = [
  ["Website", "Online"],
  ["Backup", "Today, 2:00 AM"],
  ["Security", "Up to date"],
  ["Speed", "Fast"],
];

function CareArt() {
  return (
    <ul className="w-full max-w-[15rem] space-y-1.5 text-[11px]">
      {STATUS.map(([label, value], i) => (
        <motion.li
          key={label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={once}
          transition={{ delay: 0.15 + i * 0.15 }}
          className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10"
        >
          <span className="relative grid size-2 place-items-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
            <span className="relative size-2 rounded-full bg-[#22c55e]" />
          </span>
          <span className="font-medium">{label}</span>
          <span className="ml-auto text-white/60">{value}</span>
        </motion.li>
      ))}
    </ul>
  );
}

function EnquiriesArt() {
  const bubble = (delay: number) => ({
    initial: { opacity: 0, y: 10 },
    whileInView: { opacity: 1, y: 0 },
    viewport: once,
    transition: { delay },
  });
  return (
    <div className="w-full max-w-[15rem] space-y-1.5 text-[11px]">
      <motion.p {...bubble(0.2)} className="flex w-fit max-w-[85%] items-center gap-1.5 rounded-2xl rounded-bl-sm bg-white/10 px-3 py-1.5">
        <Icon name="whatsapp" className="size-3.5 shrink-0 text-[#22c55e]" />
        Hi, is this still available?
      </motion.p>
      <motion.p {...bubble(0.7)} className="bg-brand ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm px-3 py-1.5 text-ink">
        Yes! Sharing the details now ✓✓
      </motion.p>
      <motion.p {...bubble(1.1)} className="flex items-center gap-2 rounded-md bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
        <Icon name="mail" className="size-3.5 shrink-0 text-flame" />
        <span className="truncate">New enquiry · website</span>
        <span className="ml-auto rounded-full bg-[#22c55e] px-1.5 py-0.5 text-[9px] font-semibold text-ink">Replied</span>
      </motion.p>
    </div>
  );
}

const ART: Record<string, ComponentType> = {
  posts: PostsArt,
  designs: DesignsArt,
  features: FeaturesArt,
  tools: ToolsArt,
  care: CareArt,
  enquiries: EnquiriesArt,
};

/** The scene for one service card, by service id. */
export function ServiceArt({ id, className }: { id: string; className?: string }) {
  const Art = ART[id];
  return (
    <div aria-hidden className={cx("relative flex h-44 items-center justify-center overflow-hidden bg-ink p-4 text-white", className)}>
      <div className="bg-brand absolute -right-10 -bottom-14 size-40 rounded-full opacity-20 blur-3xl" />
      {Art && <Art />}
    </div>
  );
}
