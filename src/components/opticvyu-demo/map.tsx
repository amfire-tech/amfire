"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

// A light street map drawn from OpenStreetMap tiles (greyed so our marks stand out), with our own projection maths, so the
// demo needs no map library. Offices and sites get their GPS boundary drawn to scale in metres;
// engineers on the move glide along their route.

export type Pin = {
  id: string;
  lat: number;
  lon: number;
  kind: "office" | "site" | "engineer";
  label: string;
  sub?: string;
  color?: string;
  path?: [number, number][];
  ring?: number; // metres
  ringColor?: string;
};

const TILE = 256;
function project(lat: number, lon: number, z: number) {
  const s = TILE * 2 ** z;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [((lon + 180) / 360) * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s];
}
function metresPerPx(lat: number, z: number) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

export function TileMap({ center, zoom: z0, height = 420, pins, onPin, active, overlay }: { center: [number, number]; zoom: number; height?: number; pins: Pin[]; onPin?: (id: string) => void; active?: string | null; overlay?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [z, setZ] = useState(z0);
  const [t, setT] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Engineers on the move: a slow loop along their route.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const tick = (n: number) => {
      // The first frame's timestamp can be a hair earlier than `start`, so never go below 0.
      setT((Math.max(0, n - start) / 36000) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const h = height;
  const [cx0, cy0] = project(center[0], center[1], z);
  const left = cx0 - w / 2, top = cy0 - h / 2;
  const tiles: { x: number; y: number; px: number; py: number }[] = [];
  const max = 2 ** z;
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + w) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + h) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue;
      tiles.push({ x: ((tx % max) + max) % max, y: ty, px: tx * TILE - left, py: ty * TILE - top });
    }
  }
  const at = (lat: number, lon: number) => {
    const [x, y] = project(lat, lon, z);
    return [x - left, y - top];
  };
  const along = (p: [number, number][]) => {
    if (p.length < 2) return p[0];
    const seg = p.length - 1;
    const f = Math.min(Math.max(t, 0), 0.9999) * seg;
    const i = Math.max(0, Math.min(seg - 1, Math.floor(f)));
    const r = Math.max(0, Math.min(1, f - i));
    return [p[i][0] + (p[i + 1][0] - p[i][0]) * r, p[i][1] + (p[i + 1][1] - p[i][1]) * r] as [number, number];
  };

  return (
    <div ref={box} className="relative overflow-hidden rounded-lg bg-[#eef0ee]" style={{ height: h }}>
      {tiles.map((tl) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${z}-${tl.x}-${tl.y}-${tl.px}`}
          src={`https://tile.openstreetmap.org/${z}/${tl.x}/${tl.y}.png`}
          alt=""
          draggable={false}
          className="absolute max-w-none select-none"
          style={{ left: tl.px, top: tl.py, width: TILE, height: TILE, filter: "grayscale(1) brightness(1.06) contrast(0.88)", opacity: 0.9 }}
        />
      ))}
      <svg className="pointer-events-none absolute inset-0" width={w} height={h} aria-hidden>
        {pins.map((p) => {
          if (!p.ring) return null;
          const [x, y] = at(p.lat, p.lon);
          const r = p.ring / metresPerPx(p.lat, z);
          return <circle key={`r${p.id}`} cx={x} cy={y} r={r} fill={p.ringColor ?? "#5b47e0"} fillOpacity="0.1" stroke={p.ringColor ?? "#5b47e0"} strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="5 4" style={{ transition: "r .3s" }} />;
        })}
        {pins.map((p) =>
          p.path && p.path.length > 1 ? (
            <polyline key={`p${p.id}`} points={p.path.map((q) => at(q[0], q[1]).join(",")).join(" ")} fill="none" stroke={p.color ?? "#5b47e0"} strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="1 5" strokeLinecap="round" />
          ) : null,
        )}
      </svg>
      {pins.map((p) => {
        const pos = p.path && p.path.length > 1 ? along(p.path) : [p.lat, p.lon];
        const [x, y] = at(pos[0], pos[1]);
        if (x < -40 || y < -40 || x > w + 40 || y > h + 40) return null;
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPin?.(p.id)}
            className={cx("group absolute -translate-x-1/2 -translate-y-1/2", isActive ? "z-20" : p.kind === "engineer" ? "z-10" : "z-[5]")}
            style={{ left: x, top: y }}
            aria-label={`${p.label}${p.sub ? `, ${p.sub}` : ""}`}
          >
            {p.kind === "engineer" ? (
              <span className="relative grid size-7 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]" style={{ background: p.color ?? "#5b47e0" }}>
                {p.label.split(" ").map((s) => s[0]).join("")}
                {p.path && p.path.length > 1 && <span className="ov-pulse absolute -inset-1 rounded-full" />}
              </span>
            ) : p.kind === "office" ? (
              <span className="grid size-6 place-items-center rounded-md border-2 border-white bg-[#111113] text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
                <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
                  <path d="M2 14V5l6-3 6 3v9h-4v-4H6v4z" />
                </svg>
              </span>
            ) : (
              <span className="grid size-5 place-items-center rounded-full border-2 border-white shadow-[0_3px_8px_rgba(0,0,0,0.2)]" style={{ background: p.color ?? "#eb6834" }}>
                <span className="size-1.5 rounded-full bg-white" />
              </span>
            )}
            <span className={cx("pointer-events-none absolute top-full left-1/2 mt-1 -translate-x-1/2 rounded-md bg-white/95 px-1.5 py-0.5 text-left text-[11px] leading-tight font-medium whitespace-nowrap text-[#111113] shadow-sm ring-1 ring-black/5", isActive || p.kind === "office" ? "block" : "hidden group-hover:block")}>
              {p.label}
              {p.sub && <span className="block font-normal text-[#6b6f76]">{p.sub}</span>}
            </span>
          </button>
        );
      })}
      <div className="absolute top-2.5 right-2.5 z-20 flex flex-col overflow-hidden rounded-lg bg-white shadow ring-1 ring-black/5">
        <button type="button" onClick={() => setZ((v) => Math.min(17, v + 1))} className="grid size-7 place-items-center text-[15px] hover:bg-[#f4f4f1]" aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => setZ((v) => Math.max(4, v - 1))} className="grid size-7 place-items-center border-t border-[#eee] text-[15px] hover:bg-[#f4f4f1]" aria-label="Zoom out">
          −
        </button>
      </div>
      {overlay}
      <p className="absolute right-1.5 bottom-1 z-20 rounded bg-white/80 px-1 text-[9.5px] text-[#6b6f76]">© OpenStreetMap contributors</p>
    </div>
  );
}
