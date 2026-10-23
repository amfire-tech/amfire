// Pricing rules. Prices are always computed here — never by an AI model.
// Amounts are in minor units: paise for INR (₹1 = 100 paise), cents for USD.
//
// Indian clients are priced in rupees and foreign clients in US dollars; the
// two rate cards below are set separately, not converted at an exchange rate.
// Public starting prices are AMFIRE's published rates. The size bands are
// guidelines for drafting proposals — adjust them to your real rate card.

import type { ServicePathId } from "./catalog";

export type ProjectSize = "small" | "medium" | "large";

export const CURRENCIES = ["INR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export type Priced = Record<Currency, number>;

export function isCurrency(value: unknown): value is Currency {
  return (CURRENCIES as readonly unknown[]).includes(value);
}

/** Currency for anyone who hasn't chosen one. */
export const PRICING_CURRENCY: Currency = isCurrency(process.env.PRICING_CURRENCY) ? process.env.PRICING_CURRENCY : "INR";

/** Cookie holding the visitor's chosen currency (set by the currency switch). */
export const CURRENCY_COOKIE = "currency";

const K = 1_000_00; // one thousand rupees, in paise
const D = 100; // one US dollar, in cents

/** Published "starts from" prices shown on the website. Operate is per month. */
export const STARTING_PRICE: Record<ServicePathId, Priced> = {
  build: { INR: 15 * K, USD: 149 * D },
  operate: { INR: 20 * K, USD: 199 * D },
  automate: { INR: 15 * K, USD: 149 * D },
};

/**
 * Free-demo offer: a flat amount off any plan for everyone who books a free
 * demo (₹5,000, or $50 for clients paying in dollars). Each booking gets its
 * own promo code (src/server/leads.ts), and the discount is added to every
 * proposal drafted from a booking.
 */
export const DEMO_OFFER: { amount: Priced; terms: (currency: Currency) => string } = {
  amount: { INR: 5 * K, USD: 50 * D },
  terms: (currency) => `The ${formatMoney(DEMO_OFFER.amount[currency], currency)} free-demo offer is taken off your final milestone invoice.`,
};

type Band = { low: number; high: number; weeks: number };

const PRICE_BANDS: Record<ServicePathId, Record<ProjectSize, { weeks: number } & Record<Currency, [low: number, high: number]>>> = {
  build: {
    small: { weeks: 3, INR: [15 * K, 50 * K], USD: [149 * D, 500 * D] },
    medium: { weeks: 8, INR: [50 * K, 200 * K], USD: [500 * D, 2_000 * D] },
    large: { weeks: 14, INR: [200 * K, 800 * K], USD: [2_000 * D, 8_000 * D] },
  },
  automate: {
    small: { weeks: 2, INR: [15 * K, 40 * K], USD: [149 * D, 400 * D] },
    medium: { weeks: 5, INR: [40 * K, 150 * K], USD: [400 * D, 1_500 * D] },
    large: { weeks: 10, INR: [150 * K, 500 * K], USD: [1_500 * D, 5_000 * D] },
  },
  // Operate proposals cover onboarding plus the first month.
  operate: {
    small: { weeks: 2, INR: [20 * K, 30 * K], USD: [199 * D, 300 * D] },
    medium: { weeks: 3, INR: [30 * K, 60 * K], USD: [300 * D, 600 * D] },
    large: { weeks: 4, INR: [60 * K, 150 * K], USD: [600 * D, 1_500 * D] },
  },
};

/** Monthly Operate plan after onboarding. */
export const OPERATE_RETAINER: Record<ProjectSize, Priced> = {
  small: { INR: 20 * K, USD: 199 * D },
  medium: { INR: 30 * K, USD: 300 * D },
  large: { INR: 60 * K, USD: 600 * D },
};

/** Milestone prices are rounded to ₹1,000 or $10. */
const ROUNDING: Priced = { INR: 1 * K, USD: 10 * D };

const MILESTONE_TEMPLATES: Record<ServicePathId, { title: string; description: string; share: number; weekShare: number }[]> = {
  build: [
    { title: "Discovery and design", description: "Agree the problem, users, first release and clickable designs.", share: 0.15, weekShare: 0.2 },
    { title: "First working release", description: "Build the agreed first release in small, reviewable increments.", share: 0.55, weekShare: 0.6 },
    { title: "Launch and handover", description: "Go live, train your team and hand over documentation.", share: 0.3, weekShare: 0.2 },
  ],
  automate: [
    { title: "Map the current process", description: "Document each step, who does it and where time is lost.", share: 0.2, weekShare: 0.25 },
    { title: "Build and test the automation", description: "Automate the agreed steps with human approval where it matters.", share: 0.55, weekShare: 0.5 },
    { title: "Go live and monitor", description: "Run alongside the old process, then switch over and monitor.", share: 0.25, weekShare: 0.25 },
  ],
  operate: [
    { title: "Review and take over", description: "Review website, software, accounts and access; take over safely.", share: 0.4, weekShare: 0.5 },
    { title: "Set up and first month", description: "Fix urgent issues, set up backups and monitoring, start the monthly plan.", share: 0.6, weekShare: 0.5 },
  ],
};

export function priceBand(path: ServicePathId, size: ProjectSize, currency: Currency): Band {
  const band = PRICE_BANDS[path][size];
  const [low, high] = band[currency];
  return { low, high, weeks: band.weeks };
}

/** Lowest total the owner can approve without recording an override reason. */
export function priceFloor(path: ServicePathId, size: ProjectSize, currency: Currency): number {
  return priceBand(path, size, currency).low;
}

export function milestoneTemplate(path: ServicePathId, size: ProjectSize, currency: Currency) {
  const band = priceBand(path, size, currency);
  const unit = ROUNDING[currency];
  const midpoint = Math.round((band.low + band.high) / 2 / unit) * unit;
  const template = MILESTONE_TEMPLATES[path];
  let allocated = 0;
  return template.map((m, i) => {
    const amount = i === template.length - 1 ? midpoint - allocated : Math.round((midpoint * m.share) / unit) * unit;
    allocated += amount;
    return {
      title: m.title,
      description: m.description,
      weeks: Math.max(1, Math.round(band.weeks * m.weekShare)),
      amount,
    };
  });
}

export function defaultTerms(path: ServicePathId, size: ProjectSize, currency: Currency): string {
  const lines = [
    "Each milestone is invoiced when you approve it in the Client Hub.",
    "Changes to scope are agreed in writing as a change request before work starts.",
    "Either party may pause the project with 10 working days' notice; completed milestones remain payable.",
  ];
  if (path === "operate") {
    lines.push(
      `After onboarding, ongoing support continues at ${formatMoney(OPERATE_RETAINER[size][currency], currency)} per month, cancellable with 30 days' notice.`,
    );
  }
  return lines.join("\n");
}

export function formatMoney(minor: number, currency: string = PRICING_CURRENCY): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}

/** Compact Indian format for marketing copy, e.g. ₹1.5 L. */
export function formatLakh(minor: number): string {
  const rupees = minor / 100;
  if (rupees >= 1_00_000) return `₹${+(rupees / 1_00_000).toFixed(1)} L`;
  return `₹${Math.round(rupees / 1000)}k`;
}
