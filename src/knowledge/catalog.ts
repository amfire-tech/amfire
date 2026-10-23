// Approved service descriptions and discovery options.
// Plain language first: describe the business owner's problem and outcome,
// not the technology. Safe to import from client components.

export type ServicePathId = "build" | "operate" | "automate";

export const SERVICES: Record<
  ServicePathId,
  { name: string; tagline: string; promise: string; description: string; examples: string[]; firstStep: string }
> = {
  build: {
    name: "Build",
    tagline: "Software made for your problem",
    promise: "Any tool, app or software your business needs — built around your problem.",
    description:
      "Tell us what's slowing you down. We design and build the software that fixes it — dealer apps, billing tools, booking systems, dashboards, websites — shaped around how you already work.",
    examples: [
      "A dealer app with live stock, prices and order tracking",
      "A booking and report system for clinics and labs",
      "An internal tool that replaces a fragile Excel file",
    ],
    firstStep: "A free session where we sit with you, find the real problem and agree what to build first.",
  },
  operate: {
    name: "Operate",
    tagline: "Your tech team, without hiring one",
    promise: "We become your technology partner and run everything online — so you can focus on your business.",
    description:
      "Website, hosting, business email, software upkeep, social media, SEO, digital marketing, lead generation and follow-up, online sales and revenue tracking — managed by one partner for a fixed monthly fee, instead of hiring and managing an IT team.",
    examples: [
      "Website, Google listing, Instagram and ads run for a family showroom",
      "Software and servers maintained after the original developer left",
      "An online store kept fast and secure through the Diwali sale",
    ],
    firstStep: "A free review of your current website, software and online presence, with a clear monthly plan.",
  },
  automate: {
    name: "Automate",
    tagline: "Hours of manual work, done automatically",
    promise: "Tell us the work that eats your team's day. We automate it — built around your process.",
    description:
      "Re-typing orders, chasing payments, preparing reports, matching GST data — we automate the repetitive steps using the tools you already have, while your people stay in control of decisions.",
    examples: [
      "WhatsApp orders posted straight into Tally",
      "Payment reminders with UPI links that run themselves",
      "GST reconciliation without the month-end scramble",
    ],
    firstStep: "A free walkthrough of the process with the people who do it, to find the steps worth automating.",
  },
};

export const GOALS = [
  { id: "reduce-manual-work", label: "Reduce manual work", hint: "Data entry, copy and paste, spreadsheets, follow-ups", path: "automate" },
  { id: "connect-systems", label: "Connect tools that don't talk to each other", hint: "Information is re-typed between systems", path: "automate" },
  { id: "customer-portal", label: "Get a software, app or tool made", hint: "For customers, dealers or your own team", path: "build" },
  { id: "new-product", label: "Turn an idea into a working product", hint: "From idea to a first version people can use", path: "build" },
  { id: "modernise", label: "Replace or modernise an old system", hint: "It works, but it's holding you back", path: "build" },
  { id: "online-presence", label: "Manage our website, social media and online marketing", hint: "Website, Google listing, SEO, ads, Instagram, leads", path: "operate" },
  { id: "keep-running", label: "Look after our software and IT", hint: "Hosting, email, fixes, security, backups", path: "operate" },
  { id: "not-sure", label: "Not sure — help me find the problem", hint: "We'll sit with you and work it out, free", path: null },
] as const satisfies ReadonlyArray<{ id: string; label: string; hint: string; path: ServicePathId | null }>;

export const BUSINESS_TYPES = [
  "Manufacturing",
  "Wholesale & distribution",
  "Retail, showroom or shop",
  "E-commerce or D2C brand",
  "Professional services (CA, legal, consulting)",
  "Healthcare, clinic or lab",
  "Education or coaching",
  "Logistics & transport",
  "Real estate & construction",
  "Hospitality, food & events",
  "Software & technology",
  "Something else",
] as const;

export const URGENCY = [
  { id: "exploring", label: "Just exploring" },
  { id: "quarter", label: "In the next few months" },
  { id: "month", label: "This month" },
  { id: "urgent", label: "Urgent — something is broken or at risk" },
] as const;

export const TEAM_SIZES = [
  { id: "1-10", label: "1–10 people" },
  { id: "11-50", label: "11–50 people" },
  { id: "51-200", label: "51–200 people" },
  { id: "200+", label: "More than 200" },
] as const;

export const CALL_TIMES = [
  { id: "morning", label: "Morning (10 AM – 1 PM)" },
  { id: "afternoon", label: "Afternoon (2 – 5 PM)" },
  { id: "evening", label: "Evening (5 – 8 PM)" },
  { id: "any", label: "Any time" },
] as const;

export type GoalId = (typeof GOALS)[number]["id"];
export type UrgencyId = (typeof URGENCY)[number]["id"];
export type TeamSizeId = (typeof TEAM_SIZES)[number]["id"];

export function labelFor<T extends { id: string; label: string }>(list: readonly T[], id: string | null | undefined) {
  return list.find((item) => item.id === id)?.label ?? id ?? "—";
}

// --- The free demo -----------------------------------------------------------------

export const FREE_DEMO = {
  cta: "Book a free demo",
  title: "Book a free demo",
  summary:
    "A 30-minute call where we understand your business, show you what's possible and suggest where to start. Free, with no obligation.",
  points: [
    "We listen first — your business, your problem, your budget",
    "We show working examples relevant to you",
    "You get an honest recommendation, even if it's “you don't need us yet”",
  ],
};

// --- Service pages: one owner's story per service ---------------------------------

export type ServiceStory = {
  owner: string;
  where: string;
  problem: string;
  quote: string;
  tried: string;
  amfire: string;
  result: string;
  exampleSlug: string;
};

export type ServiceDetail = {
  headline: string;
  audience: string;
  persona: string;
  story: ServiceStory;
  signs: string[];
  offerTitle: string;
  offer: string;
  deliverablesTitle: string;
  deliverables: { title: string; body: string }[];
  steps: { title: string; body: string }[];
  model: string;
  faqs: { q: string; a: string }[];
  goal: string; // discovery goal to pre-select
};

export const SERVICE_DETAILS: Record<ServicePathId, ServiceDetail> = {
  build: {
    headline: "Have a problem? We'll build the software that solves it.",
    audience: "For owners who need a tool made for their business",
    persona:
      "Every business has a problem that no ready-made app solves properly. Maybe it's dealers calling all day, a register nobody can find, or an Excel sheet only one person understands. Tell us the problem — we'll design and build the software around it.",
    story: {
      owner: "An auto-parts manufacturer",
      where: "Ludhiana",
      problem: "40+ dealers phone every day asking about stock, prices and where their order is.",
      quote: "“Half my office spends the day answering ‘stock hai?’ and ‘order kahan pahuncha?’”",
      tried: "Tried a WhatsApp group and an off-the-shelf app — neither handled dealer-wise prices and credit limits.",
      amfire:
        "AMFIRE sat with the sales team, listed the questions dealers ask, and built a simple dealer app: live stock, each dealer's own prices, credit limit, and order tracking — connected to Tally.",
      result: "Dealers check for themselves any time of day. The phone rings for real business.",
      exampleSlug: "dealer-ordering-app",
    },
    signs: [
      "A critical process runs on an Excel file only one person understands",
      "Customers or dealers phone you for information they could look up themselves",
      "You have an idea for a product and need a first version people can use",
      "You pay for three apps that each do half the job",
    ],
    offerTitle: "Not sure what exactly the problem is? Let's find it together — free.",
    offer:
      "Sit with us for a free session. We'll walk through how your business runs, find where time and money leak, and suggest what to build first. If you don't need new software, we'll tell you.",
    deliverablesTitle: "What we can build for you",
    deliverables: [
      { title: "Business software", body: "Billing, inventory, job-work, CRM or any module your business needs." },
      { title: "Apps for customers & dealers", body: "Ordering, tracking, bookings and payments — in Hindi or English." },
      { title: "Websites & online stores", body: "Fast, mobile-first sites that bring enquiries and sales." },
      { title: "Tools that replace Excel", body: "Simple internal tools your whole team can use safely." },
      { title: "Dashboards & reports", body: "See sales, stock, dues and performance on one screen." },
      { title: "Connections to your tools", body: "Tally, Zoho, Razorpay, WhatsApp, Shiprocket and more." },
    ],
    steps: [
      { title: "Free problem-finding session", body: "We understand your business and agree the real problem." },
      { title: "See it before it's built", body: "Clickable designs you approve before development starts." },
      { title: "Built in small releases", body: "Working software every few weeks, shown in your Client Hub." },
      { title: "Launch and support", body: "We train your team, hand over everything and stay available." },
    ],
    model: "Fixed price, agreed up front, paid milestone by milestone after you approve the work.",
    faqs: [
      { q: "What if I'm not sure what I need?", a: "That's normal. Book a free session — we'll find the problem with you and suggest a solution before you spend anything." },
      { q: "Do I own the software?", a: "Yes. The code, designs and data belong to you, and we hand over documentation with every release." },
      { q: "Will it work on basic Android phones?", a: "We design for the devices your users actually have, including low-cost Android phones and patchy connections." },
      { q: "Can it be in Hindi or other Indian languages?", a: "Yes — we can build in multiple languages from the start." },
      { q: "What happens after launch?", a: "You can manage it yourselves, or we can look after it on an Operate plan." },
    ],
    goal: "customer-portal",
  },
  operate: {
    headline: "Your complete tech team — without hiring one.",
    audience: "For owners who want everything online handled for them",
    persona:
      "Website, hosting, email, software, social media, SEO, ads, leads, online sales — it all needs someone who knows technology. Hiring a team is expensive and hard to manage. AMFIRE becomes your technology partner and handles all of it, A to Z, for one monthly fee — from bringing in leads and following them up to showing you where your sales and revenue stand — so you can focus on running your business.",
    story: {
      owner: "A family-run furniture showroom",
      where: "Nagpur",
      problem: "An outdated website, a Google listing with old timings, and Instagram posts once a month.",
      quote: "“My nephew made the website years ago. Now nobody looks after it, and customers can't find us online.”",
      tried: "Looked at hiring a web developer and a digital marketer — close to ₹70,000 a month in salaries alone.",
      amfire:
        "AMFIRE took over everything online: refreshed and maintained the website, fixed the Google Business Profile, posts on Instagram every week, runs local SEO and ads, and sends every enquiry to the showroom's WhatsApp.",
      result: "The owner gets one monthly report and one number to call — and spends their time on the showroom floor.",
      exampleSlug: "online-presence-for-showroom",
    },
    signs: [
      "Your website is outdated or nobody looks after it",
      "Social media, Google listing and ads happen only when someone finds time",
      "Enquiries come in, but nobody follows them up on time",
      "You depend on one developer or a relative for anything technical",
      "Hiring an IT or marketing team feels too expensive or hard to manage",
    ],
    offerTitle: "Let's look at what you have today — free.",
    offer:
      "We'll review your website, software, Google listing and social media for free, show you what's working and what isn't, and propose a monthly plan that covers exactly what you need.",
    deliverablesTitle: "Everything we manage for you",
    deliverables: [
      { title: "Website & hosting", body: "Updates, speed, security, uptime and fixes." },
      { title: "Domain & business email", body: "Professional email, renewals and access managed." },
      { title: "Software & apps", body: "Maintenance, bug fixes and improvements to what you run." },
      { title: "Social media", body: "Regular posts and replies on Instagram, Facebook and LinkedIn." },
      { title: "Digital marketing & lead generation", body: "Google and Meta campaigns that bring in enquiries, tracked against real leads." },
      { title: "Lead follow-up", body: "Every enquiry in one place and followed up on time, so no lead goes cold." },
      { title: "Sales & revenue tracking", body: "Enquiries, sales and revenue in one simple view, so you always know where you stand." },
      { title: "SEO & Google Business Profile", body: "Be found when customers search nearby." },
      { title: "Online sales", body: "WhatsApp catalogue, marketplaces, payment links and enquiries." },
      { title: "Backups & security", body: "Tested backups, updates and protection for your data." },
      { title: "Your technology advisor", body: "We keep you updated on what's new — from AI agents to new tools — and what it means for you." },
    ],
    steps: [
      { title: "Free review", body: "We look at your website, software and online presence." },
      { title: "One clear plan", body: "A monthly plan for exactly what you need — nothing extra." },
      { title: "We take over", body: "Access, accounts and systems set up properly and documented." },
      { title: "Monthly report", body: "What we did, what changed and what we recommend next." },
    ],
    model: "One fixed monthly fee for everything in your plan. No long lock-in — cancel with 30 days' notice.",
    faqs: [
      { q: "Do I still need an in-house IT person?", a: "For most small and mid-sized businesses, no. We handle the technology and online work; you keep one point of contact." },
      { q: "What does the starting plan include?", a: "Our starting plan covers website and hosting care, email, backups and basic online presence. Social media, SEO, ads, lead follow-up and sales tracking are added as you need them." },
      { q: "Can you take over a website or software someone else built?", a: "Yes. We start with a free review so we understand it before we change anything." },
      { q: "Will you keep us updated on new technology like AI?", a: "Yes. Every month we tell you what's new and whether it's worth using for your business — in plain language." },
      { q: "Can our data stay in India?", a: "Yes. We can host and back up in Indian cloud regions such as Mumbai where required." },
    ],
    goal: "online-presence",
  },
  automate: {
    headline: "Tell us what your team does again and again. We'll automate it.",
    audience: "For businesses where too much work is done by hand",
    persona:
      "Orders re-typed from WhatsApp into Tally. Payments chased every morning. Reports made in Excel every week. If people spend hours on the same steps, we can automate them — built specially for your process, with your people still in control.",
    story: {
      owner: "A fabric wholesaler",
      where: "Surat",
      problem: "Three people spend their whole day re-typing WhatsApp orders into Tally and raising e-invoices.",
      quote: "“Every wrong design number means a wrong parcel and an unhappy customer.”",
      tried: "Hired one more person for order entry — the work grew, and so did the mistakes.",
      amfire:
        "AMFIRE mapped the order process step by step and automated it: orders are read from WhatsApp, checked against stock and credit, confirmed by staff with one tap, posted to Tally with the e-invoice, and confirmed to the customer.",
      result: "Staff confirm orders instead of re-typing them, and orders go out the same day.",
      exampleSlug: "whatsapp-orders-into-tally",
    },
    signs: [
      "The same information is typed into two or three places",
      "People spend hours a week chasing payments or documents",
      "Reports and GST work mean late nights in Excel",
      "Mistakes from manual entry cost you money or customers",
    ],
    offerTitle: "Show us one task. We'll show you how it can run itself — free.",
    offer:
      "In a free session we walk through one process with the people who do it, measure where time goes and show you what can be automated — before you commit to anything.",
    deliverablesTitle: "What we automate",
    deliverables: [
      { title: "Order entry", body: "WhatsApp, email or portal orders into Tally or your ERP." },
      { title: "Payments & collections", body: "Reminders with UPI links and automatic payment matching." },
      { title: "Accounting & GST", body: "Entries, reconciliation and e-invoices with fewer errors." },
      { title: "Reports", body: "Daily and weekly reports that build and send themselves." },
      { title: "Documents & follow-ups", body: "Collect documents, send reminders, track who's pending." },
      { title: "AI assistants", body: "Read messages and documents — with a person approving what matters." },
    ],
    steps: [
      { title: "Free walkthrough", body: "We watch the process and measure where time goes." },
      { title: "Automate one step", body: "Start with the most time-consuming step and prove it works." },
      { title: "Run side by side", body: "The automation runs alongside your old way until you trust it." },
      { title: "Expand", body: "Add the next process once the first one is saving time." },
    ],
    model: "Fixed price per automation, agreed up front. Optional monthly care to monitor and improve it.",
    faqs: [
      { q: "Do we have to change the tools we use?", a: "Usually not. We connect the tools you already have — Tally, WhatsApp, Excel, Zoho and others." },
      { q: "Is AI making decisions for us?", a: "No. AI helps read and prepare information; approvals, prices and filings stay with your people." },
      { q: "What if the automation gets something wrong?", a: "Every step is logged, unusual cases go to a person, and we run alongside your old process before switching over." },
      { q: "How quickly can we start?", a: "Simple automations can go live in a couple of weeks after the free walkthrough." },
    ],
    goal: "reduce-manual-work",
  },
};

// --- Operate: cost of an in-house team (typical monthly salaries) -------------
// Rupee visitors compare with hiring in India; dollar visitors with hiring in the US.

export const HIRING = {
  salary: {
    INR: { region: "India", fresher: 25_000, experienced: 42_500, fresherLabel: "Fresher · ~₹25k", experiencedLabel: "Experienced · ₹40–45k" },
    USD: { region: "the US", fresher: 4_000, experienced: 7_000, fresherLabel: "Junior · ~$4k", experiencedLabel: "Experienced · $6–8k" },
  },
  roles: [
    { id: "developer", label: "Web / software developer" },
    { id: "marketer", label: "Digital marketer (ads, SEO)" },
    { id: "social", label: "Social media & content" },
    { id: "it", label: "IT support (email, hosting, security)" },
  ],
} as const;

export const INDUSTRIES = [
  { name: "Manufacturing", examples: ["dealer-ordering-app", "taking-over-a-legacy-erp"], problems: ["Dealer and distributor ordering", "Production and dispatch tracking", "Legacy ERP upkeep"] },
  { name: "Wholesale & distribution", examples: ["collections-for-fmcg-distributor", "whatsapp-orders-into-tally"], problems: ["WhatsApp orders into Tally", "Collections and payment matching", "Salesman beat planning"] },
  { name: "Retail & showrooms", examples: ["online-presence-for-showroom"], problems: ["Website, Google listing and social media", "Local SEO and ads", "Enquiries on WhatsApp"] },
  { name: "Textile & apparel", examples: ["whatsapp-orders-into-tally", "taking-over-a-legacy-erp"], problems: ["Design-wise orders and stock", "E-invoice and e-way bills", "Job-work tracking"] },
  { name: "D2C & e-commerce", examples: ["d2c-brand-festive-sale"], problems: ["Sale-season uptime", "Order tracking and returns", "Marketplace and Shiprocket sync"] },
  { name: "Healthcare", examples: ["diagnostic-chain-booking-and-reports", "hospital-systems-support"], problems: ["Bookings and reports", "Hospital system support", "Patient consent and data protection"] },
  { name: "Education", examples: ["coaching-institute-fees-and-parents"], problems: ["Fees and instalments", "Attendance and parent updates", "Admissions pipeline"] },
  { name: "CA & professional services", examples: ["gst-reconciliation-for-ca-firm"], problems: ["GST reconciliation", "Client document collection", "Compliance calendars"] },
] as const;

export const TOOLS = [
  "TallyPrime",
  "WhatsApp Business",
  "GST e-invoice",
  "Razorpay",
  "UPI",
  "Zoho",
  "Shopify",
  "Shiprocket",
  "Google Business Profile",
  "Instagram",
  "Google Ads",
  "Excel",
];
