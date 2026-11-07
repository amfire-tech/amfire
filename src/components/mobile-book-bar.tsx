"use client";

// On phones the header's "Book free demo" button is hidden behind the menu, so
// once a visitor scrolls past the first screen a booking button stays at the
// bottom. It links to /start, which OneClickBooking turns into the calendar popup.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_OFFER } from "@/knowledge/pricing";
import { Money } from "./currency";

export function MobileBookBar() {
  const pathname = usePathname();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/start")) return null;
  return (
    <div
      aria-hidden={!shown}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/95 px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-300 sm:hidden ${
        shown ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <Link
        href="/start"
        tabIndex={shown ? undefined : -1}
        className="bg-brand shine flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-ink shadow-[0_10px_30px_-12px_rgba(255,69,58,0.8)]"
      >
        Book a free 30-min call · <Money amounts={DEMO_OFFER.amount} /> off
      </Link>
    </div>
  );
}
