"use client";

import { useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { REEL, Reel } from "@/components/reel/reel";

declare global {
  interface Window {
    __reel?: { duration: number; fps: number; ready: boolean; seek: (t: number) => Promise<void> };
  }
}

/**
 * Shows the reel scaled to the window. scripts/render-reel.ts drives it
 * through `window.__reel.seek`; `?play` plays it live and `?t=12` holds a frame.
 */
export function ReelStage({ start, play }: { start: number; play: boolean }) {
  const [t, setT] = useState(start);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => setScale(Math.min(innerWidth / REEL.width, innerHeight / REEL.height));
    const id = requestAnimationFrame(fit);
    addEventListener("resize", fit);
    window.__reel = {
      duration: REEL.duration,
      fps: REEL.fps,
      ready: false,
      // Renders synchronously; the screenshot that follows paints the frame.
      seek: async (s) => {
        flushSync(() => setT(s));
      },
    };
    return () => {
      cancelAnimationFrame(id);
      removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    if (!play) return;
    let id = 0;
    const t0 = performance.now() - start * 1000;
    const tick = (now: number) => {
      setT(((now - t0) / 1000) % REEL.duration);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [play, start]);

  const onReady = useCallback(() => {
    if (window.__reel) window.__reel.ready = true;
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      <div style={{ width: REEL.width, height: REEL.height, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        <Reel t={t} onReady={onReady} />
      </div>
    </div>
  );
}
