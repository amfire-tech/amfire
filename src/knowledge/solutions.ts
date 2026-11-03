// The AI solutions catalogue on /solutions: every system amfire builds, grouped by
// the part of the business it helps. Plain language first — the owner's problem
// and outcome, not the tools. `demo: true` only where a working demo exists today;
// keep it honest. Safe to import from client components.

import type { ServicePathId } from "./catalog";

export type Solution = {
  title: string;
  does: string;
  /** Which plan it is sold under. */
  path: ServicePathId;
  demo?: boolean;
};

export type Department = {
  id: string;
  name: string;
  problem: string;
  solutions: Solution[];
};

export const DEPARTMENTS: Department[] = [
  {
    id: "sales",
    name: "Sales and leads",
    problem: "Leads wait hours for a reply, and follow-ups depend on someone remembering.",
    solutions: [
      { title: "Speed-to-lead engine", does: "Every form, call or message answered in under a minute, qualified and booked into your calendar.", path: "automate" },
      { title: "AI outbound engine", does: "Finds the right prospects, writes a personal first message and books meetings.", path: "automate" },
      { title: "Quote and proposal generator", does: "Turns a call or a chat into a branded quote in minutes.", path: "automate" },
      { title: "CRM autopilot", does: "Your CRM updates itself — notes, next steps and pipeline reports, no data entry.", path: "automate" },
    ],
  },
  {
    id: "service",
    name: "Customer service",
    problem: "The same questions all day, and nobody answering at night.",
    solutions: [
      { title: "AI chat agent", does: "Answers on WhatsApp, your website and Instagram from your own catalogue and prices, and hands over to a person.", path: "automate", demo: true },
      { title: "AI voice receptionist", does: "Picks up every call, day or night, answers, books and texts you a summary.", path: "automate" },
      { title: "Support inbox triage", does: "Sorts emails and tickets, drafts the replies and escalates what matters.", path: "automate" },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    problem: "Content takes too long, reviews go unanswered, and AI search doesn't know you exist.",
    solutions: [
      { title: "Content engine", does: "One video or article becomes a month of posts, captions and a newsletter, scheduled.", path: "operate" },
      { title: "Reviews and reputation", does: "Asks happy customers for reviews, drafts replies and flags the bad ones.", path: "automate" },
      { title: "AI search visibility", does: "Tracks and improves how you show up in ChatGPT, Perplexity and Google's AI answers.", path: "operate" },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    problem: "Orders, documents and bookings re-typed from one place into another.",
    solutions: [
      { title: "Order automation", does: "Orders from WhatsApp or email checked against stock and credit, posted to Tally or your ERP, and confirmed.", path: "automate", demo: true },
      { title: "Document AI", does: "Invoices, purchase orders and forms read into clean data and pushed into your systems.", path: "automate" },
      { title: "Scheduling and dispatch", does: "Bookings, reminders, routing and no-show follow-ups that run themselves.", path: "automate" },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    problem: "Chasing payments and building reports by hand every month.",
    solutions: [
      { title: "Payment chaser", does: "Polite reminders with a payment link, escalating on their own, matched when paid.", path: "automate" },
      { title: "Bookkeeping feed", does: "Bank and invoice data sorted into entries, ready for your accountant.", path: "automate" },
      { title: "Daily money report", does: "Cash, receivables and sales in one message every morning.", path: "automate" },
    ],
  },
  {
    id: "team",
    name: "HR and your team",
    problem: "Hiring and training eat the time of your best people.",
    solutions: [
      { title: "Hiring screener", does: "Reads applications, sends a short test and books interviews with the best ones.", path: "automate" },
      { title: "Onboarding assistant", does: "Documents, training and access for every new joiner, step by step.", path: "automate" },
      { title: "Company brain", does: "An assistant your team asks instead of you — answers from your own SOPs, files and past chats.", path: "build" },
    ],
  },
  {
    id: "management",
    name: "Running the business",
    problem: "The numbers live in five tools, and meetings end without clear next steps.",
    solutions: [
      { title: "Owner's morning brief", does: "One message a day: sales, leads, problems and what needs your decision.", path: "automate" },
      { title: "Live dashboards", does: "Numbers from every tool on one screen, always up to date.", path: "build" },
      { title: "Meeting to action", does: "Calls and meetings turned into notes, tasks and follow-ups automatically.", path: "automate" },
    ],
  },
  {
    id: "custom",
    name: "Custom AI and software",
    problem: "What you need doesn't exist yet.",
    solutions: [
      { title: "Custom AI agent", does: "An agent that runs a multi-step process your way, with people approving what matters.", path: "build" },
      { title: "AI operating system", does: "Several connected systems and a company brain, so the routine work runs on its own.", path: "build" },
      { title: "Apps and platforms", does: "Customer apps, portals and full platforms — like the AI school platform we built for Skillship.", path: "build", demo: true },
    ],
  },
];

export const SOLUTION_COUNT = DEPARTMENTS.reduce((n, d) => n + d.solutions.length, 0);
