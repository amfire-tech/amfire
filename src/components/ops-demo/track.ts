"use client";

import { useCallback, useEffect, useRef } from "react";

// Reports a visit to the live demo to /api/demo-visit, so HQ can see who tried it
// and what they did. Time counts only while the tab is visible. Reports are small,
// batched every 10 seconds, and the last one is sent with keepalive when the tab is
// hidden or closed. The server ignores staff and link checkers.

export type TrackConfig = {
  page: "demo" | "services";
  /** A prospect's personal link token (/demo?p=…), when there is one. */
  token?: string | null;
  /** Start straight away (the /demo page) or on the first click (the Services page). */
  startOnLoad: boolean;
};

const VISITOR_KEY = "amfire_demo_vid";

function visitorId() {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v || !/^[a-z0-9]{8,40}$/.test(v)) {
      v = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

function send(body: Record<string, unknown>, keepalive = false) {
  return fetch("/api/demo-visit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive })
    .then((r) => (r.ok ? (r.json() as Promise<{ id?: string | null }>) : null))
    .catch(() => null);
}

export function useDemoTracking(config: TrackConfig | undefined) {
  const s = useRef({ started: false, off: false, id: null as string | null, views: [] as string[], actions: [] as string[], active: 0, sent: "" });
  const cfg = useRef(config);

  const flush = useCallback((keepalive = false) => {
    const t = s.current;
    if (!t.id) return;
    const body = { op: "update", id: t.id, activeSeconds: t.active, views: t.views, actions: t.actions };
    const sig = JSON.stringify(body);
    if (sig === t.sent) return;
    t.sent = sig;
    void send(body, keepalive);
  }, []);

  const start = useCallback(() => {
    const t = s.current;
    const c = cfg.current;
    if (!c || t.started || t.off) return;
    t.started = true;
    const q = new URLSearchParams(window.location.search);
    void send({
      op: "start",
      page: c.page,
      token: c.token ?? null,
      visitorId: visitorId(),
      referrer: document.referrer || null,
      utm: { source: q.get("utm_source"), medium: q.get("utm_medium"), campaign: q.get("utm_campaign") },
    }).then((r) => {
      if (r?.id) {
        t.id = r.id;
        flush();
      } else {
        t.off = true; // not counted (staff, link checker) or unavailable
      }
    });
  }, [flush]);

  /** Note a module opened ("view") or something done ("action", e.g. "approve:price"). */
  const note = useCallback(
    (kind: "view" | "action", value: string) => {
      const t = s.current;
      if (!cfg.current || t.off) return;
      const list = kind === "view" ? t.views : t.actions;
      if (!list.includes(value)) list.push(value);
      if (!t.started) start();
    },
    [start],
  );

  useEffect(() => {
    if (!cfg.current) return;
    const t = s.current;
    if (!t.views.includes("home")) t.views.push("home");
    if (cfg.current.startOnLoad) start();

    const tick = window.setInterval(() => {
      if (t.started && document.visibilityState === "visible") t.active += 1;
    }, 1000);
    const report = window.setInterval(() => flush(), 10_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };
    const onLeave = () => flush(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(report);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
      flush(true);
    };
  }, [start, flush]);

  return { note, flush };
}
