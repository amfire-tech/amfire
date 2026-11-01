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
  | "school"
  | "image"
  | "mail"
  | "clock"
  | "wrench"
  | "globe"
  | "video"
  | "flow"
  | "lock";

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
  /** Who fills the other cart. */
  rivalLabel: string;
  /** What they put in the cart for the same money. */
  rival: { got: string[]; missing: string[] };
  cart: CartItem[];
  /** Added after "Adding more should cost more, right?" */
  bonus: CartItem[];
  /** What the starting price covers, so the cart is never read as unlimited. */
  scopeNote: string;
  shelves: Shelf[];
  shelvesNote: string;
  /** The named method; its letters spell this word. */
  methodName: string;
  method: { letter: string; title: string; body: string; pay?: string }[];
  promises: { icon: BrochureIcon; title: string }[];
  /** The super-mall finale: things people ask us to add. */
  mall: { icon: BrochureIcon; title: string }[];
  /** A pointer to another plan, shown after the shelves. */
  callout?: { title: string; body: string; href: string; cta: string };
};

/** Operate clients on at least this many months get new builds and automations included. */
export const OPERATE_BUILD_MIN_MONTHS = 3;

const OPERATE_CALLOUT = {
  title: "Or have it included in a monthly plan",
  body: `On a ${OPERATE_BUILD_MIN_MONTHS}-month Operate plan, new builds and automations come with your monthly fee — along with your website, social media, designs and more.`,
  href: "/brochure/operate",
  cta: "See the Operate brochure →",
};

/** Launch pricing is open to this many new clients each month. */
export const LAUNCH_SLOTS_PER_MONTH = 10;
/** The first clients each month get the larger number of design revision rounds. */
export const EARLY_CLIENTS = 2;
export const REVISIONS = { early: 5, later: 3 } as const;
export const FEEDBACK_DAYS = 30;
export const WARRANTY_DAYS = 90;

export const BROCHURES: Record<Exclude<BrochurePlan, "operate">, Brochure> = {
  build: {
    path: "build",
    hook: "Let's see what it really buys.",
    rivalLabel: "A typical agency",
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
    shelvesNote: "Everything above stays in the cart. These are typical starting points — your Build Brief fixes the exact price.",
    methodName: "BUILD",
    callout: OPERATE_CALLOUT,
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
  automate: {
    path: "automate",
    hook: "Let's see what it really buys.",
    rivalLabel: "A typical freelancer",
    rival: {
      got: ["A script for one step"],
      missing: ["Understanding your process", "Your people approving", "Logs and error alerts", "A side-by-side trial", "Fixes when your tools change"],
    },
    cart: [
      { id: "walkthrough", icon: "search", title: "Process walkthrough", body: "We sit with the people who do the work, step by step.", value: priced(5, 100) },
      { id: "timemap", icon: "clock", title: "Where the hours go", body: "Your process mapped, with the time each step costs.", value: priced(4, 80) },
      { id: "plan", icon: "doc", title: "Automation plan", body: "What we'll automate, in plain words, with one fixed price.", value: priced(4, 80) },
      { id: "automation", icon: "flow", title: "Your automation, built", body: "Made for your process — not a generic tool.", value: priced(20, 350) },
      { id: "tools", icon: "link", title: "Works with your tools", body: "Tally, WhatsApp, Excel, Zoho, email — nothing new to learn.", value: priced(6, 100) },
      { id: "approval", icon: "check", title: "Your people approve what matters", body: "Prices, payments and filings stay in human hands.", value: priced(3, 60) },
      { id: "logs", icon: "table", title: "Every step logged", body: "See exactly what ran, when and why.", value: priced(3, 50) },
      { id: "exceptions", icon: "bell", title: "Odd cases sent to a person", body: "Anything unusual waits for a human instead of guessing.", value: priced(3, 50) },
      { id: "sidebyside", icon: "redo", title: "Runs side by side first", body: "Your old way keeps going until you trust the new one.", value: priced(4, 80) },
      { id: "testing", icon: "shield", title: "Tested with your real data", body: "Last month's orders and invoices, run through before go-live.", value: priced(3, 60) },
      { id: "training", icon: "teach", title: "Training + video guide", body: "Your team learns it in one sitting.", value: priced(3, 60) },
      { id: "report", icon: "chart", title: "Time-saved report", body: "Hours saved, in numbers, after the first month.", value: priced(2, 40) },
      { id: "ownership", icon: "key", title: "In your name", body: "Code, accounts and access belong to you.", value: priced(3, 60) },
    ],
    bonus: [
      { id: "alerts", icon: "whatsapp", title: "WhatsApp alert when it needs you", body: "A message the moment something needs a person.", value: priced(3, 50) },
      { id: "tweaks", icon: "chat", title: "30 days of tweaks after go-live", body: "Use it for a month. Tell us what to adjust.", value: priced(5, 100) },
      { id: "warranty", icon: "bug", title: "90-day fix warranty", body: "If it breaks after that, we fix it, free.", value: priced(6, 120) },
    ],
    scopeNote: "The starting price covers one automation of one process step — about two weeks of work. Bigger processes move to the next shelf.",
    shelves: [
      {
        price: priced(25, 249),
        title: "Bigger cart",
        items: [
          { icon: "flow", title: "Two connected steps" },
          { icon: "spark", title: "AI reads messages and documents" },
          { icon: "chart", title: "Reports that send themselves" },
          { icon: "card", title: "Payment reminders with UPI links" },
        ],
      },
      {
        price: priced(35, 349),
        title: "Full trolley",
        items: [
          { icon: "box", title: "A whole process, end to end" },
          { icon: "link", title: "Three or more tools connected" },
          { icon: "receipt", title: "GST and e-invoice steps" },
          { icon: "hub", title: "A live dashboard" },
        ],
      },
    ],
    shelvesNote: "Everything above stays in the cart. These are typical starting points — your automation plan fixes the exact price.",
    methodName: "FLOW",
    method: [
      { letter: "F", title: "Find where time goes", body: "A free walkthrough with the people who do the work.", pay: "Free" },
      { letter: "L", title: "Lay out the plan", body: "The steps to automate and one fixed price.", pay: "20% after you approve" },
      { letter: "O", title: "One step, built and tested", body: "With your real data and your approvals.", pay: "55% after you approve" },
      { letter: "W", title: "Works beside your old way", body: "Then you switch over and we watch it run.", pay: "25% after you approve" },
    ],
    promises: [
      { icon: "receipt", title: "One fixed price per automation" },
      { icon: "check", title: "Pay only after you approve" },
      { icon: "users", title: "Your people approve what matters" },
      { icon: "redo", title: "Runs side by side before you switch" },
      { icon: "table", title: "Every step logged" },
      { icon: "bug", title: "90-day fix warranty" },
      { icon: "rocket", title: "Included free with an Operate plan" },
    ],
    mall: [
      { icon: "whatsapp", title: "WhatsApp orders into Tally" },
      { icon: "card", title: "Payment reminders" },
      { icon: "receipt", title: "GST reconciliation" },
      { icon: "truck", title: "E-invoices and e-way bills" },
      { icon: "chart", title: "Daily reports" },
      { icon: "doc", title: "Document collection" },
      { icon: "users", title: "Lead follow-up" },
      { icon: "box", title: "Stock alerts" },
      { icon: "calendar", title: "Attendance and payroll" },
      { icon: "spark", title: "AI that reads invoices" },
    ],
    callout: OPERATE_CALLOUT,
  },
};

/** The shopping-cart brochure for Build or Automate; Operate has its own (see OPERATE). */
export function brochureFor(path: string): Brochure | null {
  return (BROCHURES as Record<string, Brochure | undefined>)[path] ?? null;
}

export function sumValues(items: CartItem[]): Priced {
  return items.reduce<Priced>((t, i) => ({ INR: t.INR + i.value.INR, USD: t.USD + i.value.USD }), { INR: 0, USD: 0 });
}

/** Plans that have a brochure. Build and Automate use the shopping-cart story; Operate has its own. */
export const BROCHURE_PLANS = ["build", "operate", "automate"] as const;
export type BrochurePlan = (typeof BROCHURE_PLANS)[number];

export function isBrochurePlan(path: string): path is BrochurePlan {
  return (BROCHURE_PLANS as readonly string[]).includes(path);
}

// ── Operate ─────────────────────────────────────────────────────────────────
// A monthly plan, so its brochure shows a month of work instead of a cart:
// the six things delivered every month, a calendar that plays one month, what
// hiring that team would cost, and the free builds that come with 3 months.

export type OperateService = {
  id: string;
  icon: BrochureIcon;
  /** The big figure on the card ("30", "10", "New"). */
  stat: string;
  statLabel: string;
  title: string;
  line: string;
  includes: string[];
  note?: string;
};

export type OperateRole = { id: string; icon: BrochureIcon; title: string; does: string; cost: Priced };

/** true / false draw a tick or a cross; a string is shown as written. */
export type OperateCell = boolean | string;

/** What lands on one day of the example month. */
export type MonthEvent = { kind: "post" | "design" | "feature" | "tool" | "care" | "call" | "report"; label: string };

export const OPERATE_POSTS = 30;
export const OPERATE_DESIGNS = 10;

const DESIGN_DAYS: Record<number, string> = {
  2: "Offer poster",
  5: "Shop banner",
  8: "Flyer",
  11: "Festival creative",
  14: "Brochure page",
  16: "WhatsApp creative",
  19: "Price list",
  22: "Event banner",
  25: "Standee design",
  28: "Menu card",
};
const CARE_DAYS = [6, 13, 20, 27];

/** One example month, day 1 to 30. Posts go out daily; everything else on its own rhythm. */
export const OPERATE_MONTH: MonthEvent[][] = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const events: MonthEvent[] = [];
  if (day === 1) events.push({ kind: "call", label: "Planning call: this month's posts, designs and features" });
  events.push({ kind: "post", label: `Post ${day} of ${OPERATE_POSTS} goes live` });
  if (DESIGN_DAYS[day]) events.push({ kind: "design", label: DESIGN_DAYS[day] });
  if (day === 10) events.push({ kind: "feature", label: "New feature live: online booking on your website" });
  if (day === 17) events.push({ kind: "tool", label: "AI assistant connected to your WhatsApp" });
  if (day === 24) events.push({ kind: "feature", label: "New feature live: enquiry dashboard" });
  if (CARE_DAYS.includes(day)) events.push({ kind: "care", label: "Updates, security and backup check" });
  if (day === 30) events.push({ kind: "report", label: "Monthly report: what we did and what's next" });
  return events;
});

export const OPERATE = {
  hook: "Your whole digital team.",
  promise: "Posts every day. Designs every week. Your website and app always improving. Every enquiry answered.",
  services: [
    {
      id: "posts",
      icon: "image",
      stat: String(OPERATE_POSTS),
      statLabel: "posts every month",
      title: "Social media, posted daily",
      line: "A fresh post every single day on Instagram, Facebook and LinkedIn.",
      includes: ["Designed in your brand style", "Captions and hashtags written for you", "A content calendar you approve", "Festivals, offers and launches covered"],
      note: "Reels and videos? Let's talk — we quote them separately.",
    },
    {
      id: "designs",
      icon: "design",
      stat: String(OPERATE_DESIGNS),
      statLabel: "posters & banners every month",
      title: "Marketing designs, ready to use",
      line: "Every graphic your business needs, print-ready and digital.",
      includes: ["Posters, banners and flyers", "Offer and festival creatives", "Brochures, menus and price lists", "WhatsApp, standee and print files"],
    },
    {
      id: "features",
      icon: "code",
      stat: "New",
      statLabel: "features every month",
      title: "New features in your website & app",
      line: "Tell us what you need — we build it into the system you already have.",
      includes: ["New pages, forms and sections", "Booking, payment and enquiry flows", "Dashboards and reports", "Improvements to what's already there"],
      note: "Need something new? Ask any time — we discuss it with you and add it.",
    },
    {
      id: "tools",
      icon: "spark",
      stat: "AI",
      statLabel: "and the latest tools",
      title: "AI and new tools, plugged in",
      line: "When a new tool can help your business, we connect it to your system.",
      includes: ["AI assistants on WhatsApp and your website", "AI that reads documents and drafts replies", "Payments, Tally, Zoho and Google connected", "We test new tools first, then advise you"],
    },
    {
      id: "care",
      icon: "shield",
      stat: "24/7",
      statLabel: "watched and kept current",
      title: "Always up to date",
      line: "Your website, web app and software stay fast, safe and current.",
      includes: ["Software and security updates", "Speed and uptime checks", "Daily backups, tested", "Hosting, domain and email renewals"],
    },
    {
      id: "enquiries",
      icon: "whatsapp",
      stat: "Every",
      statLabel: "lead answered",
      title: "Email and WhatsApp, handled",
      line: "Every lead and enquiry answered and followed up — none left waiting.",
      includes: ["Enquiries answered in business hours", "Every lead logged in one place", "Follow-ups until they decide", "Hot leads passed to you straight away"],
    },
  ] satisfies OperateService[],
  /** Smaller things that are also in the plan. */
  alsoIncluded: [
    { icon: "pin", title: "Google listing kept fresh" },
    { icon: "search", title: "Local SEO" },
    { icon: "chart", title: "Leads and sales on one screen" },
    { icon: "doc", title: "Monthly report and call" },
    { icon: "phone", title: "One number to call" },
  ] satisfies { icon: BrochureIcon; title: string }[],
  // Typical Pune salaries in 2026 (INR) and typical freelance rates (USD), per month.
  roles: [
    { id: "social", icon: "image", title: "Social media manager", does: "30 posts a month", cost: priced(25, 1200) },
    { id: "designer", icon: "design", title: "Graphic designer", does: "10 posters & banners", cost: priced(22, 1000) },
    { id: "developer", icon: "code", title: "Web & app developer", does: "Features, updates, fixes", cost: priced(45, 2500) },
    { id: "ai", icon: "spark", title: "AI & automation expert", does: "New tools plugged in", cost: priced(40, 2000) },
    { id: "enquiries", icon: "whatsapp", title: "Enquiry executive", does: "Email & WhatsApp leads", cost: priced(18, 800) },
  ] satisfies OperateRole[],
  compareColumns: ["amfire", "A typical agency", "A freelancer"],
  compare: [
    { label: "Social media posts", cells: [`${OPERATE_POSTS} a month`, "12–15 a month", "Charged extra"] },
    { label: "Posters & banners", cells: [`${OPERATE_DESIGNS} a month`, "2–4 a month", "Per design"] },
    { label: "New features in your website & app", cells: [true, false, "Per job"] },
    { label: "AI and new tools integrated", cells: [true, false, false] },
    { label: "Updates, security and backups", cells: [true, false, false] },
    { label: "Email & WhatsApp enquiries handled", cells: [true, false, false] },
    { label: "New builds included on 3 months", cells: [true, false, false] },
  ] satisfies { label: string; cells: [OperateCell, OperateCell, OperateCell] }[],
  /** Things we build for free on a 3-month plan; also the "what first?" picker. */
  builds: [
    { icon: "store", title: "Online store" },
    { icon: "calendar", title: "Booking system" },
    { icon: "spark", title: "WhatsApp AI assistant" },
    { icon: "phone", title: "Customer app" },
    { icon: "box", title: "Inventory and stock" },
    { icon: "receipt", title: "Billing and GST invoices" },
    { icon: "flow", title: "Automate a daily task" },
    { icon: "school", title: "School or coaching portal" },
    { icon: "globe", title: "New website" },
  ] satisfies { icon: BrochureIcon; title: string }[],
  buildsNote: "One build at a time, sized to your plan. Very large projects get their own fixed price.",
  month: [
    { when: "Day 1", title: "Plan the month", body: "A call to agree the posts, designs and features." },
    { when: "Every day", title: "Post and reply", body: "A post goes live, every enquiry gets answered." },
    { when: "All month", title: "Design and build", body: "Posters delivered, features shipped, tools added." },
    { when: "Day 30", title: "Report and next plan", body: "What we did, what changed, what's next." },
  ],
  promises: [
    { icon: "receipt", title: "One fixed monthly fee" },
    { icon: "calendar", title: "Cancel with 30 days' notice" },
    { icon: "key", title: "Accounts stay in your name" },
    { icon: "clock", title: "A reply within one working day" },
    { icon: "doc", title: "A report every month" },
    { icon: "rocket", title: `Builds free on a ${OPERATE_BUILD_MIN_MONTHS}-month plan` },
  ] satisfies { icon: BrochureIcon; title: string }[],
};

export function sumCosts(items: { cost: Priced }[]): Priced {
  return items.reduce<Priced>((t, i) => ({ INR: t.INR + i.cost.INR, USD: t.USD + i.cost.USD }), { INR: 0, USD: 0 });
}
