"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import journeyData from "@/knowledge/journey.json";
import { cx } from "./ui";

type Journey = { duration: number; version?: string; chapters: { title: string; sub: string; start: number }[] };
const journey = journeyData as Journey;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * The client journey reel (scripts/render-reel.ts) with clickable chapters.
 * The chapter list doubles as a text transcript of the video.
 *
 * It's shown as a plain playing card with no player controls: it loops
 * muted while in view and pauses when it leaves, and clicking the card
 * pauses or resumes it. The card tilts and settles as the page scrolls past.
 * Autoplay and the tilt are skipped for visitors who prefer reduced motion.
 */
export function JourneyVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const chapters = journey.chapters;
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });
  const rotateX = useTransform(progress, [0, 0.38, 0.62, 1], [24, 0, 0, -10]);
  const scale = useTransform(progress, [0, 0.38, 0.62, 1], [0.84, 1, 1, 0.92]);
  const y = useTransform(progress, [0, 0.38, 0.62, 1], [90, 0, 0, -50]);
  const glow = useTransform(progress, [0.15, 0.45, 0.7, 0.95], [0, 0.35, 0.35, 0]);

  useEffect(() => {
    const v = ref.current;
    if (!v || reduce) return;
    // Pauses made by the visitor stick; only our own pauses are resumed.
    let ours = false;
    let userPaused = false;
    const onPause = () => {
      if (!ours && !v.ended) userPaused = true;
      ours = false;
    };
    const onPlay = () => {
      userPaused = false;
    };
    v.addEventListener("pause", onPause);
    v.addEventListener("play", onPlay);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.35) {
          if (userPaused || !v.paused) return;
          if (v.ended) v.currentTime = 0;
          void v.play().catch(() => {});
        } else if (!entry.isIntersecting && !v.paused) {
          ours = true;
          v.pause();
        }
      },
      { threshold: [0, 0.35] },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.removeEventListener("pause", onPause);
      v.removeEventListener("play", onPlay);
    };
  }, [reduce]);

  function onTime() {
    const t = ref.current?.currentTime ?? 0;
    let idx = 0;
    chapters.forEach((c, i) => {
      if (t >= c.start) idx = i;
    });
    setCurrent(idx);
  }

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }

  function seek(i: number) {
    const v = ref.current;
    if (!v) return;
    v.currentTime = chapters[i].start + 0.05;
    setCurrent(i);
    void v.play().catch(() => {});
  }

  return (
    <div className="space-y-5">
      <div ref={stage} className="relative isolate mx-auto max-w-5xl [perspective:1400px]">
        <motion.div
          aria-hidden
          style={reduce ? { opacity: 0.25 } : { opacity: glow }}
          className="absolute inset-x-10 -inset-y-6 -z-10 rounded-full bg-[linear-gradient(90deg,#ff453a,#ff8747)] blur-3xl"
        />
        <motion.div
          style={reduce ? undefined : { rotateX, scale, y, transformOrigin: "50% 100%" }}
          className="overflow-hidden rounded-[1.5rem] bg-ink shadow-[0_40px_100px_-40px_rgba(0,0,0,0.55)] ring-1 ring-line will-change-transform"
        >
          <video
            ref={ref}
            className="block aspect-video w-full cursor-pointer"
            muted
            loop
            playsInline
            // Only the poster and size up front: the 12 MB film loads when it scrolls into view (mobile data).
            preload="metadata"
            poster={`/media/client-journey-poster.jpg?v=${journey.version ?? ""}`}
            disablePictureInPicture
            tabIndex={0}
            onClick={toggle}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                toggle();
              }
            }}
            onTimeUpdate={onTime}
            aria-label="Video walkthrough of the AMFIRE client journey, from booking a free demo to approving a milestone in the Client Hub. Press to pause or play."
          >
            <source src={`/media/client-journey.mp4?v=${journey.version ?? ""}`} type="video/mp4" />
            Your browser can&apos;t play this video. The steps are listed alongside.
          </video>
        </motion.div>
      </div>
      <ol aria-label="Video chapters" className="grid gap-1 rounded-[1.5rem] bg-surface p-2 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3">
        {chapters.map((c, i) => (
          <li key={c.title}>
            <button
              type="button"
              onClick={() => seek(i)}
              aria-current={current === i ? "step" : undefined}
              className={cx("flex h-full w-full gap-3 rounded-xl px-3 py-3 text-left transition sm:py-2.5", current === i ? "bg-subtle ring-1 ring-line" : "hover:bg-subtle")}
            >
              <span
                className={cx(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  current === i ? "bg-brand text-ink" : "bg-subtle text-muted ring-1 ring-line",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{c.title}</span>
                  <span className="shrink-0 text-[11px] text-muted tabular-nums">{fmt(c.start)}</span>
                </span>
                <span className="block text-xs text-muted">{c.sub}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
