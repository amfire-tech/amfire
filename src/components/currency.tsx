"use client";

// Public prices are shown in rupees or US dollars. Every price is rendered in
// both currencies and CSS shows the visitor's choice (data-currency on <html>,
// set before first paint — see the root layout), so pages stay static and
// never flash the wrong price. First-time visitors outside India (by time zone)
// start in US dollars. The choice is kept in a cookie so the booking
// form can record it on the lead, and proposals are drafted in it.

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { CURRENCIES, CURRENCY_COOKIE, formatMoney, type Currency, type Priced } from "@/knowledge/pricing";
import { cx } from "./ui";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-currency"] });
  return () => observer.disconnect();
}

const read = (): Currency => (document.documentElement.dataset.currency === "USD" ? "USD" : "INR");

/**
 * The visitor's chosen currency, for interactive components that compute
 * prices. Renders rupees on the server and switches after hydration.
 */
export function useCurrency(): Currency {
  return useSyncExternalStore(subscribe, read, () => "INR" as Currency);
}

function choose(currency: Currency) {
  document.documentElement.dataset.currency = currency;
  document.cookie = `${CURRENCY_COOKIE}=${currency}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/** Shows its children only while `currency` is the visitor's chosen currency. */
export function ForCurrency({ currency, children }: { currency: Currency; children: ReactNode }) {
  return <span data-currency-only={currency}>{children}</span>;
}

/** An amount in whichever currency the visitor has chosen. */
export function Money({ amounts }: { amounts: Priced }) {
  return (
    <>
      {CURRENCIES.map((c) => (
        <ForCurrency key={c} currency={c}>
          {formatMoney(amounts[c], c)}
        </ForCurrency>
      ))}
    </>
  );
}

const LABELS: Record<Currency, { symbol: string; name: string }> = {
  INR: { symbol: "₹", name: "Indian rupees" },
  USD: { symbol: "$", name: "US dollars" },
};

/** Switches public prices between INR and USD; remembered on this device. */
export function CurrencyToggle({ className }: { className?: string }) {
  const current = useCurrency();
  return (
    <div
      role="radiogroup"
      aria-label="Show prices in"
      className={cx("inline-grid shrink-0 grid-cols-2 gap-0.5 rounded-full bg-subtle p-1 whitespace-nowrap ring-1 ring-line", className)}
    >
      {CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={current === c}
          aria-label={LABELS[c].name}
          title={`Show prices in ${LABELS[c].name}`}
          onClick={() => choose(c)}
          className={cx(
            "rounded-full px-4 py-1.5 text-sm font-medium transition",
            current === c ? "bg-fg text-page" : "text-fg/70 hover:text-fg",
          )}
        >
          {LABELS[c].symbol} {c}
        </button>
      ))}
    </div>
  );
}
