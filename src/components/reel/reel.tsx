"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  CLIENT,
  HubHomeScreen,
  ProjectScreen,
  ProposalScreen,
  StartScreen,
  ThanksScreen,
  type BookState,
  type ProjectState,
  type ProposalState,
} from "./screens";

/**
 * The "How it works" product film: the real client journey on AMFIRE —
 * booking a free demo, discovery, the proposal, following the project,
 * approving milestones and delivery — told with one headline per step above
 * the site's own screens (./screens.tsx), shown full width and never cropped.
 * Motion is deliberately even: every camera move, page change and cursor
 * move takes the same time, with steady holds in between.
 *
 * Every frame is a pure function of `t` (seconds), so scripts/render-reel.ts
 * can step through it a frame at a time. CSS transitions and animations are
 * off inside the film: they run on the wall clock, not on `t`.
 */
export const REEL = { width: 1920, height: 1080, fps: 30, duration: 67 };

// Scene start times in seconds; the chapters in src/knowledge/journey.json follow these.
export const SCENE = { hook: 0, book: 4, discover: 15, proposal: 27, project: 40, delivered: 57, end: 61.5 };

// Uniform pacing.
const MOVE = 1.2; // camera moves
const PUSH = 0.9; // page changes
const POINT = 0.85; // cursor moves

// The product frame under the headline. Pages are laid out 1100px wide (a
// normal laptop browser) and shown at full width, so nothing is ever cropped.
const FR = { x: 160, y: 248, w: 1600, h: 790 };
const BAR = 46;
const PAGE_W = 1100;
const S0 = FR.w / PAGE_W;
const VIEW_H = (FR.h - BAR) / S0; // page pixels visible at 1×

// The site's light theme, pinned so the film renders the same whatever the viewer's theme.
const LIGHT = {
  "--page": "#ffffff",
  "--surface": "#ffffff",
  "--subtle": "#f4f4f4",
  "--fg": "#080808",
  "--muted": "#5a5a5a",
  "--line": "#e6e6e6",
  "--success": "#067647",
} as CSSProperties;

/* ---------- timing ---------- */

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const outQuint = (p: number) => 1 - (1 - p) ** 5;
const inOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

/** Goes 0 → 1 between `at` and `at + dur`, eased. */
function span(t: number, at: number, dur: number, ease = outQuint) {
  return ease(clamp((t - at) / dur));
}

/** 1 between `from` and `to`, fading in and out over `fade` seconds. */
function during(t: number, from: number, to: number, fade = 0.35) {
  return span(t, from, fade, inOut) * (1 - span(t, to, fade, inOut));
}

/** Interpolates keyframes `[time, ...values]`, easing in and out between each pair. */
function track(t: number, keys: number[][]) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  for (let i = 1; i < keys.length; i++) {
    const [a, b] = [keys[i - 1], keys[i]];
    if (t <= b[0]) {
      const p = inOut((t - a[0]) / (b[0] - a[0] || 1));
      return a.slice(1).map((v, j) => lerp(v, b[j + 1], p));
    }
  }
  return keys[keys.length - 1].slice(1);
}

/** Entrance: fades in while rising `dy` pixels. */
function rise(t: number, at: number, dy = 24, dur = 0.8): CSSProperties {
  const p = span(t, at, dur);
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
}

/** A button press: dips around time `c`. */
const press = (t: number, c: number) => Math.max(0, 1 - Math.abs(t - c) / 0.14);

/* ---------- anchors: where elements sit on each page, for the camera and cursor ---------- */

type Box = { x: number; y: number; w: number; h: number };

/** Layout position of `el` (ignoring transforms) relative to `root`, in page pixels. */
function pos(el: HTMLElement, root: HTMLElement): Box {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Positions of visible `[data-anchor]` elements, each relative to its own page. */
function measure(root: HTMLElement) {
  const out: Record<string, Box> = {};
  root.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
    const page = el.closest<HTMLElement>("[data-screen]");
    if (el.offsetParent && page) out[el.dataset.anchor!] = pos(el, page);
  });
  // The proposal document is the real component, so its sections are found by heading.
  const doc = root.querySelector<HTMLElement>('[data-anchor="proposal:doc"]');
  const page = doc?.closest<HTMLElement>("[data-screen]");
  if (doc && page) {
    const section = (text: string) => [...doc.querySelectorAll("h3")].find((h) => h.textContent?.replace("’", "'") === text)?.parentElement;
    const included = section("What's included");
    if (included?.parentElement) out["proposal:scope"] = pos(included.parentElement, page);
    const milestones = section("Milestones and price");
    if (milestones) out["proposal:milestones"] = pos(milestones, page);
  }
  return out;
}

const sameBoxes = (a: Record<string, Box>, b: Record<string, Box>) =>
  Object.keys(b).every((k) => a[k] && a[k].x === b[k].x && a[k].y === b[k].y && a[k].w === b[k].w && a[k].h === b[k].h);

/* ---------- copy ---------- */

const COPY: { eyebrow: string; line: string; from: number; to: number; note?: [string, number] }[] = [
  { eyebrow: "Book a free demo", line: "Tell us what your business needs.", from: SCENE.book, to: SCENE.discover },
  { eyebrow: "Discovery", line: "First, we understand your business.", from: SCENE.discover, to: SCENE.proposal },
  { eyebrow: "Your proposal", line: "A clear plan. Defined milestones. Transparent pricing.", from: SCENE.proposal, to: SCENE.project },
  {
    eyebrow: "Your project",
    line: "Track progress. Review milestones. Stay in control.",
    from: SCENE.project,
    to: SCENE.delivered,
    note: ["A few weeks later, every milestone is approved.", SCENE.project + 12.8],
  },
  { eyebrow: "Delivered", line: "From idea to delivery.", from: SCENE.delivered, to: SCENE.end },
];

/* ---------- the film ---------- */

export function Reel({ t, onReady }: { t: number; onReady?: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const [fonts, setFonts] = useState(false);
  // Last known position of every anchor; hidden form steps keep where they last were.
  const [anchors, setAnchors] = useState<Record<string, Box>>({});

  useEffect(() => {
    let live = true;
    void document.fonts.ready.then(() => live && setFonts(true));
    return () => {
      live = false;
    };
  }, []);

  // Layout changes with `t` (form steps, cards that expand), so re-measure each frame.
  // It settles in one extra render: anchors only change when layout does.
  useLayoutEffect(() => {
    if (!stage.current) return;
    const next = measure(stage.current);
    if (!sameBoxes(anchors, next)) setAnchors((a) => ({ ...a, ...next }));
  }, [t, fonts, anchors]);

  useEffect(() => {
    if (fonts && Object.keys(anchors).length) onReady?.();
  }, [fonts, anchors, onReady]);

  const { book: B, discover: D, proposal: P, project: J, delivered: V, end: E } = SCENE;
  const box = (name: string) => anchors[name] ?? { x: 0, y: 0, w: 0, h: 0 };

  /* --- camera: full-width pages, scrolled like a reader would --- */
  const top = [1, PAGE_W / 2, 0];
  /** Brings an element fully into view (centred, or from its top if it's taller than the view), at zoom `z`. */
  const show = (name: string, z = 1) => {
    const k = box(name);
    const vh = VIEW_H / z;
    return [z, k.x + k.w / 2, k.h > vh - 48 ? k.y - 24 + vh / 2 : k.y + k.h / 2];
  };

  /** A page's camera, kept inside the page. */
  const camera = (key: string, keys: number[][]) => {
    const [z, fx, fy] = track(t, keys);
    const vw = PAGE_W / z;
    const vh = VIEW_H / z;
    const pageH = box(`${key}:page`).h || vh;
    const x = vw >= PAGE_W ? PAGE_W / 2 : clamp(fx, vw / 2, PAGE_W - vw / 2);
    const y = clamp(fy, vh / 2, Math.max(vh / 2, pageH - vh / 2));
    return { z, x, y, top: y - vh / 2 };
  };

  const cams = {
    start: camera("start", [
      [B, ...top],
      [B + 1.6, ...top],
      [B + 1.6 + MOVE, ...show("start:goal")],
      [B + 5.0, ...show("start:goal")],
      [B + 5.0 + MOVE, ...show("start:step2")],
      [D, ...show("start:step2")],
      [D + MOVE, ...show("start:problem")],
      [D + 5.0, ...show("start:problem")],
      [D + 5.0 + MOVE, ...show("start:consent")],
    ]),
    thanks: camera("thanks", [
      [D + 9.6, ...top],
      [D + 9.6 + MOVE, ...show("thanks:offer")],
    ]),
    home: camera("home", [[P, ...top]]),
    proposal: camera("proposal", [
      [P + 4.2, ...top],
      [P + 4.2 + MOVE, ...show("proposal:scope")],
      [P + 6.8, ...show("proposal:scope")],
      [P + 6.8 + MOVE, ...show("proposal:milestones")],
    ]),
    project: camera("project", [
      [J + 1.4, ...top],
      [J + 1.4 + MOVE, ...show("project:milestones")],
      [J + 5.8, ...show("project:milestones")],
      [J + 5.8 + MOVE, ...show("project:updates")],
      [J + 8.9, ...show("project:updates")],
      [J + 8.9 + MOVE, ...top],
      [J + 10.4, ...top],
      [J + 10.4 + MOVE, ...show("project:approval")],
      [J + 12.4, ...show("project:approval")],
      [J + 12.4 + MOVE, ...top],
    ]),
    done: camera("done", [[V, ...top]]),
  };

  /* --- cursor (page pixels, drawn on whichever page it's over) --- */
  const at = (name: string, dx = 0, dy = 0) => {
    const k = box(name);
    return [k.x + k.w / 2 + dx, k.y + k.h / 2 + dy];
  };
  /** A cursor path: appears at `keys[0]`, then each stop is reached in one even move. */
  const path = (from: number, stops: number[][]) => stops.map((s, i) => [from + i * (POINT + 0.15), ...s]);
  const cursors: { key: string; on: number; keys: number[][]; clicks: number[] }[] = [
    {
      key: "start",
      on: during(t, B + 2.8, B + 4.8),
      keys: [...path(B + 2.8, [at("start:goal", 140, 80), at("start:goal", 40)]), [B + 4.8, ...at("start:goal", 40)]],
      clicks: [B + 3.9],
    },
    {
      key: "start",
      on: during(t, B + 6.4, B + 10.2),
      keys: [
        ...path(B + 6.4, [at("start:orgtype", 160, 60), at("start:orgtype", 60)]),
        [B + 8.3, ...at("start:team", 6, 2)],
        [B + 9.3, ...at("start:urgency", 6, 2)],
        [B + 10.2, ...at("start:urgency", 6, 2)],
      ],
      clicks: [B + 7.5, B + 8.5, B + 9.5],
    },
    {
      key: "start",
      on: during(t, D + 6.4, D + 8.6),
      keys: [...path(D + 6.4, [at("start:consent", 200, 70), at("start:consent", 2, 2)]), [D + 8.1, ...at("start:continue", 10, 4)]],
      clicks: [D + 7.5, D + 8.3],
    },
    {
      key: "home",
      on: during(t, P + 1.0, P + 2.6),
      keys: path(P + 1.0, [at("home:review", -220, 90), at("home:review", 10, 4)]),
      clicks: [P + 2.1],
    },
    {
      key: "proposal",
      on: during(t, P + 8.6, P + 11.2),
      keys: [...path(P + 8.6, [at("proposal:agree", 200, 110), at("proposal:agree", 2, 2)]), [P + 10.5, ...at("proposal:accept", 10, 4)]],
      clicks: [P + 9.8, P + 10.7],
    },
    {
      key: "project",
      on: during(t, J + 10.9, J + 12.2),
      keys: path(J + 10.9, [at("project:approve", 240, 90), at("project:approve", 10, 4)]),
      clicks: [J + 11.9],
    },
  ];

  /* --- page states --- */
  const typed = (text: string, from: number, cps: number) => text.slice(0, Math.max(0, Math.floor((t - from) * cps)));
  const blink = Math.floor(t * 2) % 2 === 0;
  const step = t >= D + 5.0 ? 3 : t >= D ? 2 : t >= B + 5.0 ? 1 : 0;
  const book: BookState = {
    step,
    goal: t >= B + 3.95,
    businessType: t >= B + 7.55,
    teamSize: t >= B + 8.55,
    urgency: t >= B + 9.55,
    problem: typed(CLIENT.problem, D + 1.5, 28),
    name: CLIENT.name,
    email: CLIENT.email,
    phone: CLIENT.phone,
    company: CLIENT.company,
    consent: t >= D + 7.55,
    focus: step === 2 ? "problem" : "",
    caret: step === 2 && (t < D + 4.8 || blink),
    submitting: t >= D + 8.35,
    press: press(t, D + 8.3),
  };

  const proposal: ProposalState = {
    agree: t >= P + 9.85,
    accepting: t >= P + 10.75,
    accepted: t >= P + 11.2,
    sticky: Math.max(0, cams.proposal.top - box("proposal:aside").y + 24),
    pressAgree: press(t, P + 9.8) * 0.4,
    pressAccept: press(t, P + 10.7),
  };

  const approved1 = t >= J + 12.2;
  const done2 = t >= J + 14.3;
  const done3 = t >= J + 15.7;
  const task = (doneAt: number, doingFrom?: number) => (t >= doneAt ? "done" : doingFrom !== undefined && t >= doingFrom ? "doing" : "todo");
  const project: ProjectState = {
    milestones: [
      {
        title: "Stock lookup for dealers",
        status: approved1 ? "done" : t >= J + 8.1 ? "awaiting_approval" : "in_progress",
        when: approved1 ? "Approved 14 Nov 2026" : "Planned for 16 Nov 2026",
        tasks: [
          { title: "Parts database set up", status: task(J + 3.0, 0) },
          { title: "Search by part number", status: task(J + 3.7, J + 3.0) },
          { title: "Dealer sign-in", status: task(J + 4.4, J + 3.7) },
          { title: "Tested with 3,200 parts", status: task(J + 5.1, J + 4.4) },
        ],
      },
      {
        title: "Order tracking",
        status: done2 ? "done" : approved1 ? "in_progress" : "not_started",
        when: done2 ? "Approved 5 Dec 2026" : "Planned for 7 Dec 2026",
        tasks: [
          { title: "Order status screen", status: task(J + 13.4, J + 12.9) },
          { title: "WhatsApp updates", status: task(J + 13.9, J + 13.4) },
        ],
      },
      {
        title: "Launch and training",
        status: done3 ? "done" : done2 ? "in_progress" : "not_started",
        when: done3 ? "Approved 12 Dec 2026" : "Planned for 14 Dec 2026",
        tasks: [
          { title: "Dealer onboarding", status: task(J + 14.9, J + 14.4) },
          { title: "Team training", status: task(J + 15.3, J + 14.9) },
        ],
      },
    ],
    done: Number(approved1) + Number(done2) + Number(done3),
    percent: (100 / 3) * (span(t, J + 12.4, 0.8, inOut) + span(t, J + 14.3, 0.8, inOut) + span(t, J + 15.7, 0.8, inOut)),
    current: done3 ? null : done2 ? "Launch and training" : approved1 ? "Order tracking" : "Stock lookup for dealers",
    approval: span(t, J + 10.1, 0.7, inOut) * (1 - span(t, J + 12.2, 0.6, inOut)),
    approving: t >= J + 11.95,
    pressApprove: press(t, J + 11.9),
    updates: [
      { when: "12 Nov, 5:40 pm", body: "Stock lookup is ready for your review. Try it with the demo link we sent on WhatsApp.", p: span(t, J + 8.1, 0.7, inOut) },
      { when: "10 Nov, 4:05 pm", body: "Search by part number is ready for testing.", p: span(t, J + 7.3, 0.7, inOut) },
      { when: "3 Nov, 11:20 am", body: "Parts database set up with 3,200 parts from your stock sheet.", p: 1 },
    ],
  };

  /* --- pages, each pushed in from the right over the one before --- */
  const pages: { key: keyof typeof cams; from: number; to: number; title: string; node: ReactNode }[] = [
    { key: "start", from: -1, to: D + 8.7, title: "Book a free demo · AMFIRE", node: <StartScreen s={book} /> },
    { key: "thanks", from: D + 8.7, to: P, title: "Thank you · AMFIRE", node: <ThanksScreen /> },
    { key: "home", from: P, to: P + 2.9, title: "Home · AMFIRE Client Hub", node: <HubHomeScreen press={press(t, P + 2.1)} /> },
    { key: "proposal", from: P + 2.9, to: J, title: "Proposal · AMFIRE Client Hub", node: <ProposalScreen s={proposal} /> },
    { key: "project", from: J, to: V, title: "Project · AMFIRE Client Hub", node: <ProjectScreen s={project} /> },
    { key: "done", from: V, to: 99, title: "Home · AMFIRE Client Hub", node: <HubHomeScreen delivered /> },
  ];
  const title = pages.filter((p) => t >= p.from).pop()!.title;

  const frameIn = span(t, 3.4, 1.0);
  const frameOut = span(t, E - 0.2, 0.8, inOut);

  return (
    <div ref={stage} className="reel-root relative overflow-hidden bg-[#f7f5f2] font-sans text-fg antialiased" style={{ ...LIGHT, width: REEL.width, height: REEL.height }}>
      {/* Frames are drawn from `t` alone: no wall-clock motion inside the film. */}
      <style>{`.reel-root *, .reel-root *::before, .reel-root *::after { transition: none !important; animation: none !important; }`}</style>

      {/* 1 · Hook */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center"
        style={{ opacity: 1 - span(t, 3.0, 0.8, inOut), transform: `translateY(${-40 * span(t, 3.0, 0.9, inOut)}px)` }}
      >
        <div style={{ transform: `scale(${lerp(1.04, 1, span(t, 0, 1.4))})` }}>
          <Image src="/brand/amfire-logo.png" alt="AMFIRE" width={1200} height={325} priority className="h-[80px] w-auto" />
        </div>
        <h1 className="mt-14 text-[92px] leading-[1.06] font-semibold tracking-[-0.035em]">
          <span className="block" style={rise(t, 0.3, 30, 0.9)}>
            Your next business solution
          </span>
          <span className="text-brand block" style={rise(t, 0.6, 30, 0.9)}>
            starts here.
          </span>
        </h1>
      </div>

      {/* Headline for each step */}
      {COPY.map((c) => {
        if (t < c.from - 0.1 || t > c.to + 0.8) return null;
        const out = span(t, c.to - 0.4, 0.6, inOut);
        return (
          <div key={c.eyebrow} className="absolute left-[160px] top-[62px] right-[160px]" style={{ opacity: 1 - out, transform: `translateY(${-20 * out}px)` }}>
            <div className="flex items-center justify-between gap-8">
              <p className="flex items-center gap-3 text-[18px] font-semibold tracking-[0.2em] text-muted uppercase" style={rise(t, c.from, 12)}>
                <span className="bg-brand h-1 w-9 rounded-full" />
                {c.eyebrow}
              </p>
              {c.note && (
                <p className="text-[22px] text-muted" style={{ opacity: during(t, c.note[1], c.to - 0.4) }}>
                  {c.note[0]}
                </p>
              )}
            </div>
            <h2 className="mt-4 text-[52px] leading-[1.1] font-semibold tracking-[-0.03em] whitespace-nowrap" style={rise(t, c.from + 0.15, 24)}>
              {c.line}
            </h2>
          </div>
        );
      })}

      {/* The product frame */}
      <div
        className="absolute overflow-hidden rounded-[24px] bg-white shadow-[0_40px_100px_-40px_rgba(8,8,8,0.35),0_0_0_1px_rgba(8,8,8,0.06)]"
        style={{
          left: FR.x,
          top: FR.y,
          width: FR.w,
          height: FR.h,
          opacity: frameIn * (1 - frameOut),
          transform: `translateY(${(1 - frameIn) * 70 + frameOut * 50}px)`,
        }}
      >
        <div className="relative flex items-center border-b border-black/[0.06] bg-[#fafafa] px-5" style={{ height: BAR }}>
          <span className="flex gap-2">
            <span className="size-3 rounded-full bg-[#ff5f57]" />
            <span className="size-3 rounded-full bg-[#febc2e]" />
            <span className="size-3 rounded-full bg-[#28c840]" />
          </span>
          <span className="absolute inset-x-0 text-center text-[15px] font-medium text-muted">{title}</span>
        </div>

        <div className="relative overflow-hidden" style={{ width: FR.w, height: FR.h - BAR }}>
          {pages.map((pg) => {
            const visible = t >= pg.from && t < pg.to + PUSH;
            const pIn = pg.from < 0 ? 1 : span(t, pg.from, PUSH, inOut);
            const pOut = span(t, pg.to, PUSH, inOut);
            const cam = cams[pg.key];
            return (
              <div
                key={pg.key}
                data-screen={pg.key}
                className="absolute inset-0 overflow-hidden bg-subtle"
                style={{ transform: `translateX(${(1 - pIn) * FR.w - pOut * FR.w * 0.3}px)`, opacity: 1 - pOut * 0.6, visibility: visible ? "visible" : "hidden" }}
              >
                <div
                  data-anchor={`${pg.key}:page`}
                  className="absolute top-0 left-0 origin-top-left"
                  style={{ width: PAGE_W, transform: `translate(${FR.w / 2}px, ${(FR.h - BAR) / 2}px) scale(${S0 * cam.z}) translate(${-cam.x}px, ${-cam.y}px)` }}
                >
                  {pg.node}
                  {cursors
                    .filter((c) => c.key === pg.key && c.on > 0)
                    .map((c) => {
                      const [x, y] = track(t, c.keys);
                      const pressing = Math.max(0, ...c.clicks.map((k) => press(t, k)));
                      const last = c.clicks.filter((k) => t >= k).pop() ?? -9;
                      const ripple = clamp((t - last) / 0.6);
                      return (
                        <div
                          key={c.keys[0][0]}
                          className="pointer-events-none absolute top-0 left-0"
                          style={{ opacity: c.on, transform: `translate(${x}px, ${y}px) scale(${1.1 / (S0 * cam.z)})` }}
                        >
                          <span
                            className="absolute -top-6 -left-6 size-12 rounded-full border-[2.5px] border-[#ff6a3d]"
                            style={{ opacity: (1 - ripple) * 0.9, transform: `scale(${lerp(0.3, 1.4, outQuint(ripple))})` }}
                          />
                          <svg width="24" height="28" viewBox="0 0 30 34" style={{ transform: `translate(-3px, -2px) scale(${1 - pressing * 0.16})`, transformOrigin: "3px 2px" }}>
                            <path d="M4 3 L4 27 L10.5 21 L14.8 31 L19 29.2 L14.8 19.6 L23.6 19.6 Z" fill="#080808" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" />
                          </svg>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7 · End card */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ opacity: span(t, E + 0.4, 0.8) }}>
        <div style={rise(t, E + 0.4, 16, 0.9)}>
          <Image src="/brand/amfire-logo.png" alt="AMFIRE" width={1200} height={325} className="h-[64px] w-auto" />
        </div>
        <h2 className="mt-14 text-[88px] leading-[1.1] font-semibold tracking-[-0.035em]">
          <span className="block" style={rise(t, E + 0.7, 30, 0.9)}>
            Build what&apos;s missing.
          </span>
          <span className="block" style={rise(t, E + 0.95, 30, 0.9)}>
            Run what matters.
          </span>
          <span className="text-brand block" style={rise(t, E + 1.2, 30, 0.9)}>
            Automate the rest.
          </span>
        </h2>
        <span className="bg-brand mt-16 rounded-full px-11 py-5 text-[30px] font-semibold text-ink shadow-[0_20px_50px_-20px_rgba(255,69,58,0.7)]" style={rise(t, E + 1.7, 18, 0.9)}>
          Book a free demo
        </span>
      </div>
    </div>
  );
}
