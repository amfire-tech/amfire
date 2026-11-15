"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { contact, site } from "@/config/site";
import { cx } from "./ui";

// What turns a look into a conversation: the visit is reported to HQ (time in each module,
// where they stopped, what they clicked), a "Say hi" button with the founder's face is always
// one tap away, after 2.5 minutes a short note invites them to shape it together, and on a
// phone they're told it's at its best on a laptop. Visits from signed-in staff aren't counted.

const VISITOR_KEY = "amfire_demo_vid";
const NUDGE_AFTER = 150; // seconds of active viewing

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

function post(body: Record<string, unknown>, keepalive = false) {
  return fetch("/api/demo-visit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), keepalive })
    .then((r) => (r.ok ? (r.json() as Promise<{ id?: string | null }>) : null))
    .catch(() => null);
}

/** Reports this visit to the demo: modules seen, seconds in each, where they are now, and actions. */
export function useVisit(view: string, enabled: boolean) {
  const st = useRef({ id: null as string | null, off: false, views: [] as string[], actions: new Set<string>(), dwell: {} as Record<string, number>, active: 0, view, sent: "" });
  const [active, setActive] = useState(0);

  const flush = useCallback((keepalive = false) => {
    const t = st.current;
    if (!t.id) return;
    const body = {
      op: "update",
      id: t.id,
      activeSeconds: t.active,
      views: t.views,
      actions: [...t.actions, ...Object.entries(t.dwell).map(([v, s]) => `dwell:ov-${v}-${s}`), `at:ov-${t.view}`],
    };
    const sig = JSON.stringify(body);
    if (sig === t.sent) return;
    t.sent = sig;
    void post(body, keepalive);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const t = st.current;
    const q = new URLSearchParams(window.location.search);
    const token = q.get("p");
    void post({ op: "start", page: "ovdemo", token: token && /^[a-z0-9]{6,32}$/.test(token) ? token : null, visitorId: visitorId(), referrer: document.referrer || null, utm: { source: q.get("utm_source"), medium: q.get("utm_medium"), campaign: q.get("utm_campaign") } }).then((r) => {
      if (r?.id) t.id = r.id;
      else t.off = true;
    });
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      t.active += 1;
      t.dwell[t.view] = (t.dwell[t.view] ?? 0) + 1;
      setActive(t.active);
    }, 1000);
    const report = window.setInterval(() => flush(), 10_000);
    const onHide = () => document.visibilityState === "hidden" && flush(true);
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
  }, [enabled, flush]);

  useEffect(() => {
    const t = st.current;
    t.view = view;
    const key = `ov:${view}`;
    if (!t.views.includes(key)) t.views.push(key);
  }, [view]);

  const note = useCallback(
    (action: string) => {
      st.current.actions.add(action);
      flush(true);
    },
    [flush],
  );
  return { active, note };
}

const first = site.outreachSender.split(" ")[0];
const waText = `Hi ${first}, I'm looking at the Ops One demo you built for OpticVyu.`;

function Face({ size = 44 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/team/navanish-square.jpg" alt={site.outreachSender} width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />
  );
}

function WaGlyph({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.1.7.5-.1 1.5-.6 1.7-1.2s.2-1.1.2-1.2-.2-.2-.4-.3z" />
    </svg>
  );
}

/** The always-there "Say hi" button, the 2.5-minute note, and the phone notice. */
export function Engage({ active, note }: { active: number; note: (a: string) => void }) {
  const [nudge, setNudge] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("ov_nudged") === "1";
    } catch {}
    if (seen || active < NUDGE_AFTER) return;
    try {
      sessionStorage.setItem("ov_nudged", "1");
    } catch {}
    const t = window.setTimeout(() => {
      setNudge(true);
      note("nudge");
    }, 0);
    return () => window.clearTimeout(t);
  }, [active, note]);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("ov_mobile_ok") === "1";
    } catch {}
    if (dismissed || window.innerWidth >= 900 || !window.matchMedia("(pointer: coarse)").matches) return;
    const t = window.setTimeout(() => {
      setMobile(true);
      note("mobile");
    }, 600);
    return () => window.clearTimeout(t);
  }, [note]);

  const hi = () => note("hi");
  return (
    <>
      <a href={contact.whatsapp(waText)} target="_blank" rel="noopener noreferrer" onClick={hi} className="group fixed right-4 bottom-4 z-[45] flex items-center gap-2.5 rounded-full bg-white py-1.5 pr-4 pl-1.5 shadow-[0_12px_32px_-12px_rgba(17,17,19,0.45),0_0_0_1px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5">
        <span className="relative">
          <Face size={38} />
          <span className="absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-full bg-[#25d366] text-white ring-2 ring-white">
            <WaGlyph className="size-[11px]" />
          </span>
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-semibold text-[#111113]">Say hi on WhatsApp</span>
          <span className="block text-[11px] text-[#6b6f76]">{first}, amfire · replies in minutes</span>
        </span>
      </a>

      {nudge && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#111113]/30 p-4 backdrop-blur-[2px] sm:items-center" onClick={() => setNudge(false)}>
          <div onClick={(e) => e.stopPropagation()} className="ov-in w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3">
              <Face size={48} />
              <div>
                <p className="text-[15px] font-semibold">{site.outreachSender}</p>
                <p className="text-[12.5px] text-[#6b6f76]">Founder, amfire</p>
              </div>
            </div>
            <p className="mt-4 text-[19px] leading-snug font-semibold tracking-[-0.02em]">We built this from the outside. You know where it really hurts.</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#4a4e55]">This is a first version, shaped by what we could see. Say hi, and we&rsquo;ll walk you through it and build it around how OpticVyu actually works.</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <a href={contact.whatsapp(waText)} target="_blank" rel="noopener noreferrer" onClick={() => { hi(); setNudge(false); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#1fb857]">
                <WaGlyph /> Say hi on WhatsApp
              </a>
              <button type="button" onClick={() => setNudge(false)} className="rounded-xl px-4 py-3 text-[14px] font-medium text-[#4a4e55] hover:bg-[#f2f2ef]">
                Keep exploring
              </button>
            </div>
          </div>
        </div>
      )}

      {mobile && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#111113]/40 p-3 backdrop-blur-[2px]">
          <div className="ov-in w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-[#f0eefd] text-[#5b47e0]">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M8 20h8M12 16v4" />
              </svg>
            </div>
            <p className="text-center text-[18px] font-semibold tracking-[-0.02em]">Best on a laptop</p>
            <p className="mt-1.5 text-center text-[14px] leading-snug text-[#4a4e55]">This is your whole company on one screen. It works on a phone, but it&rsquo;s at its best on a laptop or desktop.</p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={() => { void navigator.clipboard?.writeText(window.location.href); note("copylink"); setMobile(false); }} className={cx("rounded-xl bg-[#111113] px-4 py-3 text-[14px] font-semibold text-white")}>
                Copy the link for my laptop
              </button>
              <button type="button" onClick={() => { try { sessionStorage.setItem("ov_mobile_ok", "1"); } catch {} setMobile(false); }} className="rounded-xl px-4 py-3 text-[14px] font-medium text-[#4a4e55] hover:bg-[#f2f2ef]">
                Continue on my phone
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
