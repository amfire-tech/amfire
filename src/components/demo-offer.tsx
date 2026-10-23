"use client";

// The free-demo offer: flat ₹5,000 ($50) off any plan for everyone who books a
// free demo (DEMO_OFFER in src/knowledge/pricing.ts). The bar sits above every
// public page and points visitors to the booking form; its message follows
// them through booking to the promo code on the thank-you page.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { Money } from "./currency";
import { cx } from "./ui";

const OFFER = <Money amounts={DEMO_OFFER.amount} />;

export function GiftIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className={cx("size-4", className)} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="7" width="15" height="4" rx="1" />
      <path d="M4 11v6h12v-6M10 7v10M10 7S9 3 6.5 3.5C4.6 3.9 5.4 7 7.5 7M10 7s1-4 3.5-3.5c1.9.4 1.1 3.5-1 3.5" />
    </svg>
  );
}

/** `path` overrides the current page, for showing the bar outside the site (the demo reel). */
export function OfferBar({ path }: { path?: string }) {
  const current = usePathname();
  const pathname = path ?? current;
  const booking = pathname === "/start";
  const booked = pathname.startsWith("/start/thanks");

  return (
    <div className="relative z-50 bg-ink text-white">
      <div className="mx-auto flex min-h-10 max-w-6xl items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[13px] sm:px-6 sm:text-sm">
        <span className="bg-brand grid size-6 shrink-0 place-items-center rounded-full text-ink">
          <GiftIcon className="size-3.5" />
        </span>
        {booked ? (
          <p>
            <strong className="text-flame">{OFFER} off unlocked.</strong> Your promo code is below.
          </p>
        ) : booking ? (
          <p>
            You&apos;re one step from <strong className="text-flame">flat {OFFER} off</strong> any plan.
            <span className="hidden sm:inline"> Finish booking and your promo code appears instantly.</span>
          </p>
        ) : (
          <>
            <p>
              Book a free demo, get <strong className="text-flame">flat {OFFER} off</strong> any plan.
              <span className="hidden md:inline text-white/70"> Your promo code appears the moment you book.</span>
            </p>
            <Link
              href="/start"
              className="bg-brand inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-ink hover:brightness-105 sm:text-[13px]"
            >
              <span>Claim {OFFER} off →</span>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

/** A promo code with a copy button. */
export function PromoCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 p-1.5 pl-4 ring-1 ring-white/15">
      <code className="flex-1 font-mono text-lg font-semibold tracking-[0.12em] sm:text-xl">{code}</code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard
            ?.writeText(code)
            .then(() => setCopied(true))
            .catch(() => {});
        }}
        className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-white/90"
      >
        {copied ? "Copied" : "Copy code"}
      </button>
    </div>
  );
}
