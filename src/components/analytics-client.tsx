"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Reports the clicks that matter for growth: WhatsApp, calls, email and
// "Book a free demo" links. Links are classified when clicked, so no component
// needs its own tracking.
function linkEvent(a: HTMLAnchorElement): [string, Record<string, string>] | null {
  const href = a.getAttribute("href") ?? "";
  // innerText skips hidden copies, such as the price in the currency not shown.
  const label = a.innerText.trim().replace(/\s+/g, " ").slice(0, 100);
  const page = window.location.pathname;
  if (href.startsWith("tel:")) return ["call_click", { page, label }];
  if (href.startsWith("mailto:")) return ["email_click", { page, label }];
  if (href.includes("wa.me/")) return ["whatsapp_click", { page, label }];
  if (/^\/start(\?|$)/.test(href)) return ["demo_cta_click", { page, label, destination: href }];
  return null;
}

export function LinkTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a");
      const event = a && linkEvent(a);
      if (event) track(...event);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}

/** Reports a booked demo once per booking, even if the thank-you page is reloaded. */
export function LeadConversion({ bookingRef, path }: { bookingRef: string; path?: string }) {
  useEffect(() => {
    const key = `lead-tracked:${bookingRef}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Storage blocked: report anyway; a rare duplicate beats a missed lead.
    }
    track("generate_lead", { service: path, currency: document.documentElement.dataset.currency });
  }, [bookingRef, path]);
  return null;
}
