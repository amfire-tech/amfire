// Plan brochures: the gated, interactive "what you really get" pages behind
// "See everything you get" on each pricing card. Visitors unlock them by
// confirming their email, which records them as a lead.
//
// Market values are typical prices that agencies and freelancers in India
// charge separately for each item (2026); the USD column is the same for
// international agencies. They are claims to clients — keep them honest.
// Our own prices come from STARTING_PRICE and DEMO_OFFER in pricing.ts.

import type { ServicePathId } from "./catalog";
import type { Priced } from "./pricing";

const K = 1_000_00; // one thousand rupees, in paise
const D = 100; // one US dollar, in cents
const priced = (inrThousands: number, usd: number): Priced => ({ INR: inrThousands * K, USD: usd * D });

/** Names of the line icons drawn in src/components/brochure/icons.tsx. */
export type BrochureIcon =
  | "search"
  | "doc"
  | "design"
  | "redo"
  | "code"
  | "phone"
  | "language"
  | "hub"
  | "play"
  | "key"
  | "shield"
  | "check"
  | "rocket"
  | "table"
  | "teach"
  | "pin"
  | "whatsapp"
  | "chat"
  | "bug"
  | "card"
  | "users"
  | "chart"
  | "bell"
  | "link"
  | "spark"
  | "android"
  | "store"
  | "calendar"
  | "box"
  | "receipt"
  | "truck"
  | "school";

export type CartItem = {
  id: string;
  icon: BrochureIcon;
  title: string;
  /** One short line; the brochure is visual, not a wall of text. */
  body: string;
  value: Priced;
};

export type Shelf = {
  price: Priced;
  title: string;
  items: { icon: BrochureIcon; title: string }[];
};

export type Brochure = {
  path: ServicePathId;
  /** Shown on the cover and the gate. */
  hook: string;
  /** What a typical agency puts in the cart for the same money. */
  rival: { got: string[]; missing: string[] };
  cart: CartItem[];
  /** Added after "Adding more should cost more, right?" */
  bonus: CartItem[];
  /** What the starting price covers, so the cart is never read as unlimited. */
  scopeNote: string;
  shelves: Shelf[];
  method: { letter: string; title: string; body: string; pay?: string }[];
  promises: { icon: BrochureIcon; title: string }[];
  /** The super-mall finale: things people ask us to add. */
  mall: { icon: BrochureIcon; title: string }[];
};

/** Launch pricing is open to this many new clients each month. */
export const LAUNCH_SLOTS_PER_MONTH = 10;
/** The first clients each month get the larger number of design revision rounds. */
export const EARLY_CLIENTS = 2;
export const REVISIONS = { early: 5, later: 3 } as const;
export const FEEDBACK_DAYS = 30;
export const WARRANTY_DAYS = 90;

export const BROCHURES: Partial<Record<ServicePathId, Brochure>> = {
  build: {
    path: "build",
    hook: "Let's see what it really buys.",
    rival: {
      got: ["A template website", "One round of changes"],
      missing: [
        "Finding your real problem",
        "Designs before code",
        "Your code in your name",
        "Training for your team",
        "Fixes after launch",
      ],
    },
    cart: [
      { id: "session", icon: "search", title: "Problem-finding session", body: "We sit with you and find what's really slowing you down.", value: priced(5, 100) },
      { id: "brief", icon: "doc", title: "Your Build Brief", body: "What we'll build, in plain words, with one fixed price.", value: priced(5, 100) },
      { id: "designs", icon: "design", title: "Clickable designs", body: "Tap through every screen before a line of code.", value: priced(10, 200) },
      { id: "revisions", icon: "redo", title: "Design revision rounds", body: "Change it until it feels right.", value: priced(4, 80) },
      { id: "software", icon: "code", title: "Your software, built", body: "The first release your problem needs, made for you.", value: priced(25, 400) },
      { id: "mobile", icon: "phone", title: "Works on every phone", body: "Fast on low-cost Android and patchy networks.", value: priced(3, 50) },
      { id: "language", icon: "language", title: "Hindi and English", body: "Your team and customers use their own language.", value: priced(4, 60) },
      { id: "hub", icon: "hub", title: "Your Client Hub", body: "See progress, approve work, ask questions — one place.", value: priced(3, 50) },
      { id: "demos", icon: "play", title: "Weekly demo + test link", body: "Try the real thing every week, not slides.", value: priced(3, 50) },
      { id: "ownership", icon: "key", title: "Code in your name", body: "Code, designs and data sit in your account from day 1.", value: priced(5, 100) },
      { id: "security", icon: "shield", title: "Security and daily backups", body: "Logins, roles, HTTPS and automatic backups.", value: priced(4, 60) },
      { id: "testing", icon: "check", title: "Tested on real phones", body: "We test on the devices your people actually use.", value: priced(3, 50) },
      { id: "launch", icon: "rocket", title: "Hosting and go-live", body: "We set it up, put it live and watch launch day.", value: priced(3, 50) },
      { id: "data", icon: "table", title: "Your Excel data moved in", body: "Start with your records, not an empty screen.", value: priced(4, 60) },
      { id: "training", icon: "teach", title: "Training + user guide", body: "We train your team and leave a simple guide.", value: priced(4, 60) },
      { id: "google", icon: "pin", title: "Google listing set up", body: "Customers find you on Search and Maps.", value: priced(3, 50) },
    ],
    bonus: [
      { id: "alerts", icon: "whatsapp", title: "WhatsApp enquiry alerts", body: "Every new enquiry pings your phone.", value: priced(4, 60) },
      { id: "feedback", icon: "chat", title: "30 days of changes after launch", body: "Use it for a month. Tell us what to change.", value: priced(6, 100) },
      { id: "warranty", icon: "bug", title: "90-day bug-fix warranty", body: "Anything breaks after that? We fix it, free.", value: priced(9, 150) },
    ],
    scopeNote: "The starting price covers a small first release — about three weeks of work. Bigger needs move to the next shelf.",
    shelves: [
      {
        price: priced(25, 249),
        title: "Bigger cart",
        items: [
          { icon: "card", title: "Online payments" },
          { icon: "users", title: "Customer or dealer logins" },
          { icon: "chart", title: "Sales and stock dashboard" },
          { icon: "bell", title: "Automatic updates to customers" },
        ],
      },
      {
        price: priced(35, 349),
        title: "Full trolley",
        items: [
          { icon: "link", title: "Connect to Tally or Zoho" },
          { icon: "spark", title: "An AI assistant for customers" },
          { icon: "android", title: "Installable phone app" },
          { icon: "language", title: "A third language" },
        ],
      },
    ],
    method: [
      { letter: "B", title: "Business problem found", body: "A free session to find the real problem.", pay: "Free" },
      { letter: "U", title: "User designs you approve", body: "Clickable screens before any code.", pay: "15% after you approve" },
      { letter: "I", title: "In small releases", body: "Working software every week in your Hub.", pay: "55% after you approve" },
      { letter: "L", title: "Launch and train", body: "Live, your data in, your team trained.", pay: "30% after you approve" },
      { letter: "D", title: "Delivered and yours", body: "Code, data and docs handed over.", pay: "30 days of changes + 90-day warranty" },
    ],
    promises: [
      { icon: "receipt", title: "One fixed price" },
      { icon: "check", title: "Pay only after you approve" },
      { icon: "key", title: "Code and data are yours" },
      { icon: "redo", title: "3–5 design revision rounds" },
      { icon: "chat", title: "30 days of changes after launch" },
      { icon: "bug", title: "90-day bug-fix warranty" },
      { icon: "search", title: "Honest advice: if you don't need new software, we'll tell you" },
    ],
    mall: [
      { icon: "store", title: "Online store" },
      { icon: "calendar", title: "Booking system" },
      { icon: "box", title: "Inventory and stock" },
      { icon: "receipt", title: "Billing and GST invoices" },
      { icon: "truck", title: "Delivery tracking" },
      { icon: "users", title: "Dealer app" },
      { icon: "chart", title: "CRM and sales pipeline" },
      { icon: "school", title: "School or coaching portal" },
      { icon: "table", title: "Replace an Excel file" },
      { icon: "spark", title: "AI assistant" },
    ],
  },
};

export function brochureFor(path: string): Brochure | null {
  return (BROCHURES as Record<string, Brochure | undefined>)[path] ?? null;
}

export function sumValues(items: CartItem[]): Priced {
  return items.reduce<Priced>((t, i) => ({ INR: t.INR + i.value.INR, USD: t.USD + i.value.USD }), { INR: 0, USD: 0 });
}
