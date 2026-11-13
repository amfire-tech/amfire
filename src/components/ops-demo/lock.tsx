"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { contact } from "@/config/site";
import { NAV, type ViewId } from "./data";

// The public demo shows the command centre and the order tracker. Every other module
// is locked. Tapping "Say hi" only opens WhatsApp, because a page can't know whether the
// message was actually sent; the founder replies with the unlock link (/demo?unlock=…,
// checked on the server), and that link unlocks this browser for good. A personal link
// from HQ (/demo?p=…) is never locked.

export const FREE_VIEWS = new Set<ViewId>(["home", "trace"]);
// v2: browsers unlocked by a tap under the old rule are locked again.
const KEY = "amfire_demo_unlocked_v2";
const TOTAL = NAV.reduce((n, g) => n + g.items.length, 0);

export function useUnlocked() {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    try {
      // Reading browser storage has to wait until the page is in the browser.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(KEY) === "1") setUnlocked(true);
    } catch {}
  }, []);
  const unlock = () => {
    setUnlocked(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  return { unlocked, unlock };
}

export function LockIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <rect x="3" y="7" width="10" height="7" rx="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

const label = (v: ViewId) => NAV.flatMap((g) => g.items).find((i) => i.id === v)?.label ?? "This module";

/** A locked module: the real screen blurred behind, and the way to unlock it in front. */
export function LockedView({ view, preview, onSayHi }: { view: ViewId; preview: ReactNode; onSayHi: () => void }) {
  return (
    <div className="relative min-h-[560px]">
      <div aria-hidden className="pointer-events-none max-h-[640px] overflow-hidden opacity-50 blur-[5px] select-none">
        {preview}
      </div>
      <div className="absolute inset-0 flex items-start justify-center bg-gradient-to-b from-[#0e0e10]/40 via-[#0e0e10]/70 to-[#0e0e10] px-1 pt-10 sm:pt-16">
        <UnlockCard locked={label(view)} onSayHi={onSayHi} />
      </div>
    </div>
  );
}

/** Modules a visitor hasn't seen yet, to name what's waiting behind the lock. */
const WAITING = ["Sales", "Production", "Finance", "Quality"];

/**
 * The unlock card, kept to one tap. Nothing is typed here; the WhatsApp message ends with
 * "Name:" and "Company:" lines for them to fill in. Tapping opens WhatsApp and nothing
 * more: the demo opens when the founder replies with the unlock link.
 */
export function UnlockCard({ locked, onSayHi }: { locked: string; onSayHi: () => void }) {
  const open = 2;
  const [sent, setSent] = useState(false);
  function sayHi() {
    // Plain text only: WhatsApp's link garbles some emoji on WhatsApp Web.
    const text = `Hi Navanish, I tried the amfire demo and I'd like the full dashboard.\n\nName: \nCompany: `;
    const url = contact.whatsapp(text);
    const win = window.open(url, "_blank", "noopener");
    if (!win) window.location.href = url;
    setSent(true);
    onSayHi();
  }

  if (sent) {
    return (
      <div className="w-full max-w-[360px] rounded-2xl border border-white/[0.09] bg-[#141417]/95 p-5 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)] backdrop-blur-sm sm:p-6">
        <div className="relative mx-auto size-14">
          <Image src="/team/navanish-square.jpg" alt="Navanish Pandey, founder of amfire" width={112} height={112} className="size-14 rounded-full object-cover grayscale" />
          <span aria-hidden className="absolute right-0 bottom-0 size-3.5 rounded-full border-[2.5px] border-[#141417] bg-[#3ccf8e]" />
        </div>
        <h3 className="mt-4 text-[1.25rem] leading-tight font-medium tracking-[-0.02em]">Send it, and your link is on its way.</h3>
        <p className="mt-1.5 text-[14px] leading-snug text-[#b9b9b4]">Add your name and company, press send in WhatsApp, and Navanish replies with your link to the full demo.</p>
        <button type="button" onClick={sayHi} className="mt-4 text-[13px] font-medium text-[#3ccf8e] underline-offset-4 hover:underline">
          WhatsApp didn&rsquo;t open? Try again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[360px] rounded-2xl border border-white/[0.09] bg-[#141417]/95 p-5 text-center shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)] backdrop-blur-sm sm:p-6">
      {/* A person, not a brand: the founder who answers. */}
      <div className="relative mx-auto size-14">
        <Image src="/team/navanish-square.jpg" alt="Navanish Pandey, founder of amfire" width={112} height={112} className="size-14 rounded-full object-cover grayscale" />
        <span aria-hidden className="absolute right-0 bottom-0 size-3.5 rounded-full border-[2.5px] border-[#141417] bg-[#3ccf8e]" />
      </div>

      <h3 className="mt-4 text-[1.35rem] leading-tight font-medium tracking-[-0.02em]">Say hi. See everything.</h3>
      <p className="mt-1.5 text-[14px] leading-snug text-[#b9b9b4]">
        {locked} and {TOTAL - open - 1} more modules. Say hi on WhatsApp and Navanish sends your link to the full demo.
      </p>

      {/* Endowed progress: they've started, the rest is one tap away. */}
      <div className="mt-4 text-left">
        <div className="flex justify-between text-[11.5px] text-[#8b8b92]">
          <span>
            You&rsquo;ve opened {open} of {TOTAL}
          </span>
          <span>{WAITING.filter((w) => w !== locked).slice(0, 3).join(" · ")} …</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-[#3ccf8e]" style={{ width: `${(open / TOTAL) * 100}%` }} />
        </div>
      </div>

      <button
        type="button"
        onClick={sayHi}
        className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#3ccf8e] px-4 py-3 text-[15px] font-medium text-[#0b0b0c] shadow-[0_10px_30px_-10px_rgba(60,207,142,0.6)] transition-transform hover:-translate-y-px hover:bg-[#5bdca1] active:translate-y-0"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3Z" />
        </svg>
        Say hi on WhatsApp
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          →
        </span>
      </button>
      <p className="mt-2.5 text-[12px] text-[#8b8b92]">One message · Navanish replies personally</p>
    </div>
  );
}

