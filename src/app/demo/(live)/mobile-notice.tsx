"use client";

import { useEffect, useState } from "react";

// The demo is an operating system built for a laptop screen. On a phone, say so once
// (per visit) and offer the link to open later; they can still carry on.

const KEY = "amfire_demo_mobile_notice";

export function MobileNotice() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {}
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/60 p-3 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="mobile-notice-title" onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-2xl border border-white/[0.09] bg-[#141417] p-5 text-[#ededea] shadow-2xl"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/[0.07]">
          <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="12" rx="1.5" />
            <path d="M1.5 19.5h21" />
          </svg>
        </span>
        <h2 id="mobile-notice-title" className="mt-3 text-[1.1rem] font-medium tracking-[-0.01em]">
          Best on a laptop
        </h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[#b9b9b4]">
          This is a full operating system for a company, with every department on one screen. It works on your phone, but it&rsquo;s at its best on a laptop or desktop.
        </p>
        <div className="mt-4 grid gap-2">
          <button type="button" onClick={close} className="rounded-full bg-[#f2f1ec] px-4 py-2.5 text-[14px] font-medium text-[#0b0b0c]">
            Continue on my phone
          </button>
          <button type="button" onClick={copy} className="rounded-full px-4 py-2.5 text-[14px] font-medium text-[#ededea] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]">
            {copied ? "Link copied. Open it on your laptop" : "Copy the link for my laptop"}
          </button>
        </div>
      </div>
    </div>
  );
}
