// The signal engine's catalogue: who we sell to (segments), what makes a lead
// warm (signal types, each with where to find it and how fast it goes stale),
// what makes one a good fit (fit rules), when to contact them (timing) and how
// (plays: a sequence of touches across channels, each tied to the reason).
//
// The weights here are only the starting beliefs. Every night the engine
// re-learns them from what actually happened (src/server/engine.ts), so a
// signal that gets replies rises and one that doesn't sinks.

import type { TouchChannel } from "./outreach";

// --- Segments -------------------------------------------------------------------

export const SEGMENTS = [
  {
    id: "school",
    label: "Schools",
    noun: "schools",
    brand: "Skillship",
    offer: "The Skillship lab programme for Classes 3–8: curriculum, a trained trainer and the lab, run for the school.",
    decisionRoles: ["Principal", "Director / Trustee", "Admissions head", "Computer or ATL coordinator"],
  },
  {
    id: "ca_firm",
    label: "CA firms",
    noun: "CA firms",
    brand: "amfire",
    offer: "The amfire FIRM Method: Find new clients, Install & run systems, Reduce risk, Modernise with AI.",
    decisionRoles: ["Managing partner", "Partner", "Practice manager"],
  },
  {
    id: "business",
    label: "Businesses",
    noun: "businesses",
    brand: "amfire",
    offer: "The WhatsApp AI salesperson, set up and run by amfire on the Operate plan.",
    decisionRoles: ["Owner", "Manager"],
  },
] as const;
export type SegmentId = (typeof SEGMENTS)[number]["id"];
export const SEGMENT_IDS = SEGMENTS.map((s) => s.id) as [SegmentId, ...SegmentId[]];

/** A prospect's kind decides its segment; people the owner knows are sold the business offer. */
export function segmentOf(kind: string): SegmentId {
  return kind === "school" || kind === "ca_firm" ? kind : "business";
}

export function segmentFor(id: string) {
  return SEGMENTS.find((s) => s.id === id) ?? SEGMENTS[2];
}

// --- Signal types ---------------------------------------------------------------
//
// prior:     starting belief that a prospect with this signal has a real
//            conversation with us (0–1). Learned from outcomes afterwards.
// halfLife:  days until the signal counts half as much. null = doesn't fade.
// expires:   a fixed date after which it no longer applies (a deadline).
// angle:     why it matters to them, which becomes the reason we contact them.
// where:     where Claude finds it, and how to date and verify it.

export type SignalType = {
  id: string;
  label: string;
  segments: readonly SegmentId[] | "all";
  prior: number;
  halfLifeDays: number | null;
  expires?: string;
  angle: string;
  where: string;
};

export const SIGNAL_TYPES: readonly SignalType[] = [
  // Every segment
  {
    id: "engaged_with_us",
    label: "Engaged with something of ours",
    segments: "all",
    prior: 0.75,
    halfLifeDays: 21,
    angle: "They already looked at what we sent or attended our session, so the conversation is a follow-up, not a cold call.",
    where: "Our own data: opened their report or demo, replied, attended a briefing, registered for a challenge, clicked a tracked link.",
  },
  {
    id: "referral_intro",
    label: "Introduced by someone they trust",
    segments: "all",
    prior: 0.65,
    halfLifeDays: 60,
    angle: "Someone they trust told them to talk to us.",
    where: "The owner's network, existing clients, Skillship's schools, a CA who introduces a peer. Record who introduced them.",
  },

  // Schools
  {
    id: "cbse_ct_ai_curriculum",
    label: "CBSE CT & AI curriculum, Classes 3–8 (2026-27)",
    segments: ["school"],
    prior: 0.22,
    halfLifeDays: null,
    expires: "2027-03-31",
    angle:
      "CBSE Circular 15/2026 brings Computational Thinking & AI into Classes 3–8 this session, and teacher training on it is this year's theme. Most schools have neither trained teachers nor a lab.",
    where:
      "Applies to every CBSE school with Classes 3–8 (check the school's classes on SARAS or its website). Use the circular as the source: cbseacademic.nic.in/web_material/Circulars/2026/15_Circular_2026.pdf.",
  },
  {
    id: "hiring_stem_teacher",
    label: "Hiring a robotics / STEM / computer / AI teacher",
    segments: ["school"],
    prior: 0.45,
    halfLifeDays: 30,
    angle: "They are paying to build this themselves. Skillship includes a trained trainer, curriculum and lab, so they don't have to hire and train one.",
    where: "Naukri, Indeed, LinkedIn Jobs, WorkIndia and the school's own careers page. Use the posting date; skip ads with no date.",
  },
  {
    id: "new_principal",
    label: "New principal or director",
    segments: ["school"],
    prior: 0.35,
    halfLifeDays: 120,
    angle: "A new leader wants a visible win in the first year.",
    where: "LinkedIn job changes, the school's website or news posts, local news. Date = when they joined.",
  },
  {
    id: "admission_ads",
    label: "Running admission ads",
    segments: ["school"],
    prior: 0.35,
    halfLifeDays: 21,
    angle: "They're spending to win admissions for next year and need a story parents remember. A visible lab is one.",
    where: "Meta Ad Library (facebook.com/ads/library, search the school name, country India) and Google Ads Transparency Center. Date = ad start date.",
  },
  {
    id: "new_campus",
    label: "New school, branch or affiliation upgrade",
    segments: ["school"],
    prior: 0.4,
    halfLifeDays: 180,
    angle: "They're setting up labs and curriculum now, so it's the cheapest moment to choose a partner.",
    where: "CBSE SARAS lists of schools approved for new affiliation or upgrade, 'admissions open' posts for a new campus, local news.",
  },
  {
    id: "competitor_lab_nearby",
    label: "Schools nearby advertise labs",
    segments: ["school"],
    prior: 0.28,
    halfLifeDays: 180,
    angle: "Parents compare schools on the same road; the ones nearby now advertise a robotics or AI lab.",
    where: "Websites and Instagram of schools within 3 km. Name the schools and the lab in the detail.",
  },
  {
    id: "parent_review_gap",
    label: "Parents ask for practical learning",
    segments: ["school"],
    prior: 0.25,
    halfLifeDays: 120,
    angle: "Their own parents say in reviews that learning is too bookish or there are too few activities.",
    where: "Google Maps reviews of the school. Quote a few words and the month.",
  },
  {
    id: "stem_activity",
    label: "Posts about science fairs or STEM events",
    segments: ["school"],
    prior: 0.22,
    halfLifeDays: 60,
    angle: "They already care about hands-on learning and show it off to parents.",
    where: "The school's Instagram, Facebook and website news.",
  },

  // CA firms
  {
    id: "peer_review_phase4",
    label: "Peer review Phase IV deadline (31 Dec 2026)",
    segments: ["ca_firm"],
    prior: 0.42,
    halfLifeDays: null,
    expires: "2027-03-31",
    angle:
      "From 31 Dec 2026 a firm with 3+ partners doing attestation work needs a Peer Review Certificate before accepting any statutory audit. That needs documented quality systems, which the FIRM Method installs.",
    where: "Firms with 3+ partners that do audits (website, ICAI firm details, LinkedIn). Source: the ICAI Peer Review Board notice of 31 Dec 2025. Confirm partner count.",
  },
  {
    id: "hiring_staff",
    label: "Hiring article assistants or accountants",
    segments: ["ca_firm"],
    prior: 0.38,
    halfLifeDays: 30,
    angle: "They're short of capacity. Systems that take the routine work off the team are cheaper than another hire.",
    where: "Naukri, Indeed, LinkedIn, WorkIndia, ICAI's article placement portal. Use the posting date.",
  },
  {
    id: "new_partner_or_llp",
    label: "New partner, LLP or office",
    segments: ["ca_firm"],
    prior: 0.36,
    halfLifeDays: 120,
    angle: "The firm is growing and its processes haven't caught up yet.",
    where: "LinkedIn posts, MCA LLP registrations (\"& Associates LLP\"), a new branch on Google Maps.",
  },
  {
    id: "new_code_website",
    label: "Website not using the new Code of Ethics",
    segments: ["ca_firm"],
    prior: 0.18,
    halfLifeDays: 180,
    angle: "The ICAI Code in force from 1 April 2026 allows more on websites (push technology for non-exclusive services). Their site hasn't changed.",
    where: "Their website: last update, services listed, no knowledge content. Or no website at all.",
  },
  {
    id: "aqmm_applicable",
    label: "AQMM now applies to them",
    segments: ["ca_firm"],
    prior: 0.3,
    halfLifeDays: null,
    expires: "2027-03-31",
    angle: "The audit quality maturity model now applies to firms auditing group entities of listed companies, banks or insurers, and needs documented processes.",
    where: "Firms auditing group companies of listed entities, banks or insurers (website client lists, LinkedIn).",
  },

  // Businesses (the WhatsApp AI offer)
  {
    id: "hiring_manual_role",
    label: "Hiring a telecaller, receptionist or data entry",
    segments: ["business"],
    prior: 0.35,
    halfLifeDays: 30,
    angle: "They're paying a salary for replies and data entry that a WhatsApp AI and automation handle.",
    where: "Naukri, Indeed, WorkIndia, LinkedIn. Use the posting date.",
  },
  {
    id: "review_pain",
    label: "Reviews about slow replies",
    segments: ["business"],
    prior: 0.3,
    halfLifeDays: 90,
    angle: "Their customers say in public that nobody replies or calls back.",
    where: "Google Maps, IndiaMART and Justdial reviews. Quote and date them.",
  },
  {
    id: "paid_leads_leak",
    label: "Paying for leads and leaking them",
    segments: ["business"],
    prior: 0.32,
    halfLifeDays: 60,
    angle: "They pay for IndiaMART or Justdial leads, and a slow reply hands them to a competitor.",
    where: "IndiaMART response rate, paid listing badges, ads running.",
  },
  {
    id: "legacy_note",
    label: "Reason written on the desk",
    segments: "all",
    prior: 0.2,
    halfLifeDays: 45,
    angle: "The reason researched when they were added.",
    where: "The prospect's free-text 'why now'. Added automatically for prospects researched before the engine.",
  },
];

export function signalType(id: string) {
  return SIGNAL_TYPES.find((t) => t.id === id);
}

export function signalTypesFor(segment: SegmentId) {
  return SIGNAL_TYPES.filter((t) => t.segments === "all" || t.segments.includes(segment));
}

export const SIGNAL_TYPE_IDS = SIGNAL_TYPES.map((t) => t.id) as [string, ...string[]];

// --- Fit ------------------------------------------------------------------------
//
// Facts we record about a prospect (prospects.facts) and how much each one
// matters. An unknown fact scores its `unknown` value, so a lead isn't
// punished for research we haven't done, but isn't rewarded for it either.

export type FactValue = string | number | boolean;
type FitRule = { fact: string; label: string; weight: number; unknown: number; score: (v: FactValue) => number; hint: string };

const band = (v: FactValue, steps: [number, number][], below: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return below;
  for (const [min, score] of steps) if (n >= min) return score;
  return below;
};

export const FIT_RULES: Record<SegmentId, FitRule[]> = {
  school: [
    { fact: "board", label: "Board", weight: 0.2, unknown: 0.5, hint: "CBSE, ICSE, IB, Cambridge or State", score: (v) => ({ cbse: 1, icse: 0.8, ib: 0.8, cambridge: 0.8, igcse: 0.8, state: 0.5 })[String(v).toLowerCase()] ?? 0.5 },
    { fact: "students", label: "Students", weight: 0.2, unknown: 0.5, hint: "total enrolment", score: (v) => band(v, [[800, 1], [400, 0.8], [200, 0.5]], 0.2) },
    { fact: "annualFee", label: "Annual fee (₹)", weight: 0.25, unknown: 0.5, hint: "typical annual tuition for Class 5", score: (v) => band(v, [[80_000, 1], [40_000, 0.8], [20_000, 0.4]], 0.15) },
    { fact: "management", label: "Management", weight: 0.15, unknown: 0.6, hint: "private, aided or government", score: (v) => ({ private: 1, aided: 0.4, government: 0.1 })[String(v).toLowerCase()] ?? 0.6 },
    { fact: "hasClasses3to8", label: "Has Classes 3–8", weight: 0.1, unknown: 0.6, hint: "true or false", score: (v) => (v === true || v === "true" ? 1 : 0.3) },
    { fact: "lab", label: "Existing lab", weight: 0.1, unknown: 0.7, hint: "none, own or competitor", score: (v) => ({ none: 1, competitor: 0.6, own: 0.4 })[String(v).toLowerCase()] ?? 0.7 },
  ],
  ca_firm: [
    { fact: "partners", label: "Partners", weight: 0.35, unknown: 0.5, hint: "number of partners", score: (v) => { const n = Number(v); return !Number.isFinite(n) ? 0.5 : n > 10 ? 0.6 : n >= 3 ? 1 : n === 2 ? 0.7 : 0.35; } },
    { fact: "staff", label: "Staff", weight: 0.25, unknown: 0.5, hint: "team size including articles", score: (v) => { const n = Number(v); return !Number.isFinite(n) ? 0.5 : n > 60 ? 0.6 : n >= 10 ? 1 : n >= 5 ? 0.7 : 0.4; } },
    { fact: "attestation", label: "Does statutory audits", weight: 0.2, unknown: 0.6, hint: "true or false", score: (v) => (v === true || v === "true" ? 1 : 0.6) },
    { fact: "businessClients", label: "Business clients", weight: 0.2, unknown: 0.6, hint: "most, some or few", score: (v) => ({ most: 1, some: 0.7, few: 0.4 })[String(v).toLowerCase()] ?? 0.6 },
  ],
  business: [
    { fact: "employees", label: "Employees", weight: 0.4, unknown: 0.5, hint: "team size", score: (v) => band(v, [[50, 0.8], [10, 1], [4, 0.7]], 0.4) },
    { fact: "enquiriesPerDay", label: "Enquiries a day", weight: 0.4, unknown: 0.5, hint: "WhatsApp and phone enquiries", score: (v) => band(v, [[20, 1], [8, 0.8], [3, 0.5]], 0.25) },
    { fact: "googleReviews", label: "Google reviews", weight: 0.2, unknown: 0.5, hint: "count of reviews", score: (v) => band(v, [[200, 1], [50, 0.8], [10, 0.5]], 0.3) },
  ],
};

// --- Timing ---------------------------------------------------------------------
//
// How good a time of year it is to reach this segment (1 = best). Windows are
// month-day ranges that repeat every year; blackouts are dated.

type Window = { from: string; to: string; factor: number; label: string };

export const TIMING: Record<SegmentId, Window[]> = {
  school: [
    { from: "11-01", to: "01-31", factor: 1, label: "Admissions and next-year budgets" },
    { from: "02-01", to: "03-31", factor: 0.6, label: "Exams and year end" },
    { from: "05-01", to: "06-10", factor: 0.5, label: "Summer vacation" },
  ],
  ca_firm: [
    { from: "07-15", to: "07-31", factor: 0.4, label: "Return filing rush" },
    { from: "09-01", to: "10-31", factor: 0.35, label: "Tax audit season" },
    { from: "12-20", to: "12-31", factor: 0.5, label: "Annual GST return deadline" },
    { from: "03-15", to: "03-31", factor: 0.6, label: "Year end" },
  ],
  business: [],
};

export const BLACKOUTS: { from: string; to: string; factor: number; label: string }[] = [{ from: "2026-11-06", to: "2026-11-12", factor: 0.5, label: "Diwali week" }];

// --- Reachability ---------------------------------------------------------------

export const CONTACT_ROLES = [
  { id: "decision_maker", label: "Decision maker" },
  { id: "budget_owner", label: "Controls the budget" },
  { id: "champion", label: "Champion inside" },
  { id: "influencer", label: "Influencer" },
  { id: "gatekeeper", label: "Gatekeeper / office" },
] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number]["id"];
export const CONTACT_ROLE_IDS = CONTACT_ROLES.map((r) => r.id) as [ContactRole, ...ContactRole[]];

// --- Plays ----------------------------------------------------------------------
//
// A play is the sequence of touches for one prospect, every one carrying the
// reason. Two variants of a step are A/B tested and the engine picks the one
// that gets more replies. Placeholders: {contact} {org} {owner} {brand} {reason}
// {asset} {area}.

export type PlayStep = { day: number; channel: Exclude<TouchChannel, "note">; goal: string; variants: { id: string; text: string }[] };
export type Play = { id: string; segment: SegmentId; name: string; asset: string; steps: PlayStep[] };

export const PLAYS: Play[] = [
  {
    id: "school_readiness",
    segment: "school",
    name: "CT & AI readiness report",
    asset: "A one-page CT & AI readiness report for the school, compared with schools nearby",
    steps: [
      {
        day: 0,
        channel: "email",
        goal: "Send the readiness report to the principal",
        variants: [
          {
            id: "report",
            text: "Dear {contact},\n\n{reason}\n\nWe prepared a one-page CT & AI readiness note for {org}: what the new framework asks of Classes 3–8 and how schools near {area} are preparing. {asset}\n\nIf it's useful, I'd be glad to walk you through it in 15 minutes.\n\nWarm regards,\n{owner}\n{brand}, Pune",
          },
          {
            id: "question",
            text: "Dear {contact},\n\nA quick question: how is {org} planning the new CBSE CT & AI curriculum for Classes 3–8 this session?\n\n{reason}\n\nWe made a short readiness note for {org}, attached here: {asset}\n\nHappy to share what other Pune schools are doing, in 15 minutes.\n\n{owner}\n{brand}, Pune",
          },
        ],
      },
      { day: 1, channel: "visit", goal: "Hand-deliver the printed report at reception, addressed to the principal by name", variants: [{ id: "drop", text: "Printed report in an envelope addressed to {contact}, with a handwritten note and your number." }] },
      { day: 2, channel: "linkedin", goal: "Connect with the principal or director", variants: [{ id: "connect", text: "Namaste {contact}, I sent {org} a short note on the new CT & AI curriculum for Classes 3–8. Would be glad to connect." }] },
      {
        day: 3,
        channel: "call",
        goal: "Check the report reached them and ask for 15 minutes",
        variants: [{ id: "followup", text: "Namaste {contact}, {owner} from {brand}. I dropped off a readiness note for {org} on the new CT & AI curriculum. Did it reach you? Could I take 15 minutes this week to show what schools nearby are doing?" }],
      },
      { day: 6, channel: "whatsapp", goal: "Share one insight they don't have yet", variants: [{ id: "insight", text: "Namaste {contact}, {owner} from {brand}. One thing from the note that most principals found useful: {reason} Could we meet for 15 minutes, Thursday or Friday?" }] },
      { day: 9, channel: "visit", goal: "A 15-minute meeting: walk through the report and propose a Demo Day", variants: [{ id: "meeting", text: "Bring the printed report, the Demo Day outline and the parent survey QR." }] },
      { day: 14, channel: "email", goal: "A polite close that keeps the door open", variants: [{ id: "close", text: "Dear {contact},\n\nI won't follow up again after this. If preparing Classes 3–8 for the CT & AI curriculum comes up later this session, I'm one message away.\n\nWith best wishes to {org},\n{owner}\n{brand}" }] },
    ],
  },
  {
    id: "ca_peer_review",
    segment: "ca_firm",
    name: "Peer review readiness check",
    asset: "A one-page Peer Review Readiness Check for the firm",
    steps: [
      {
        day: 0,
        channel: "email",
        goal: "Send the readiness check to the managing partner",
        variants: [
          {
            id: "check",
            text: "Dear {contact},\n\n{reason}\n\nWe put together a one-page readiness check for {org}: the systems a peer reviewer looks for, and where most Pune firms are thin. {asset}\n\nWorth 15 minutes this week?\n\nRegards,\n{owner}\n{brand}, Pune",
          },
          {
            id: "question",
            text: "Dear {contact},\n\nIs {org} ready for peer review Phase IV from 31 December?\n\n{reason}\n\nHere is a one-page readiness check we prepared for your firm: {asset}\n\nHappy to walk through it in 15 minutes.\n\n{owner}\n{brand}, Pune",
          },
        ],
      },
      { day: 1, channel: "linkedin", goal: "Connect with each partner", variants: [{ id: "connect", text: "Namaste {contact}, I shared a short peer review readiness check with {org}. Would be glad to connect." }] },
      { day: 3, channel: "call", goal: "Check it reached them and ask for a 15-minute visit", variants: [{ id: "followup", text: "Namaste {contact}, {owner} from {brand}. I sent {org} a one-page peer review readiness check. Did it reach you? Could I come by for 15 minutes, Wednesday or Thursday?" }] },
      { day: 5, channel: "whatsapp", goal: "One insight about the new Code of Ethics", variants: [{ id: "insight", text: "Namaste {contact}, {owner} from {brand}. Something most partners haven't noticed: the ICAI Code in force since 1 April 2026 now allows firms to do more on their websites for services like accounting and consulting. Happy to show what that looks like for {org} in 15 minutes." }] },
      { day: 8, channel: "visit", goal: "A 15-minute visit with the printed check", variants: [{ id: "meeting", text: "Bring the printed readiness check and the FIRM Method outline. No price until the end." }] },
      { day: 14, channel: "email", goal: "A polite close", variants: [{ id: "close", text: "Dear {contact},\n\nI won't follow up again. If peer review or the new Code comes up for {org} later, I'm one message away.\n\nRegards,\n{owner}\n{brand}" }] },
    ],
  },
  {
    id: "business_demo",
    segment: "business",
    name: "WhatsApp AI demo",
    asset: "Their own demo page",
    steps: [
      {
        day: 0,
        channel: "whatsapp",
        goal: "Ask permission to send their demo",
        variants: [
          { id: "permission", text: "Namaste {contact}, I'm {owner} from {brand}, Pune. {reason} I made a quick demo for {org}, may I send it?" },
          { id: "demo_first", text: "Namaste {contact}, {owner} from {brand}, Pune. {reason} Here's a demo I made for {org}, try it for 30 seconds: {asset}" },
        ],
      },
      { day: 1, channel: "call", goal: "Did the demo reach them? Book a call back", variants: [{ id: "followup", text: "Namaste {contact}, {owner} from {brand}. I sent a demo for {org} on WhatsApp. Did you get a chance to try it?" }] },
      { day: 3, channel: "whatsapp", goal: "Send the demo if not yet, and one insight", variants: [{ id: "insight", text: "Namaste {contact}, here's the demo for {org}: {asset}. {reason}" }] },
      { day: 6, channel: "visit", goal: "Walk in and show the demo on your phone", variants: [{ id: "visit", text: "Show the demo answering a real customer question, then ask for 15 minutes." }] },
      { day: 12, channel: "whatsapp", goal: "A polite close", variants: [{ id: "close", text: "Namaste {contact}, I won't message again. If you want {org}'s WhatsApp answering at night, I'm one message away. {owner}" }] },
    ],
  },
];

export function playFor(id: string | null | undefined) {
  return PLAYS.find((p) => p.id === id);
}

export function defaultPlay(segment: SegmentId) {
  return PLAYS.find((p) => p.segment === segment)!;
}

// --- Feedback -------------------------------------------------------------------
//
// What the owner (or Claude, from a call transcript) tells the engine about a
// lead or a reason. Each one counts as evidence in the next learning run.

export const FEEDBACK_KINDS = [
  { id: "reason_relevant", label: "The reason landed", effect: 1 },
  { id: "great_lead", label: "Great lead", effect: 1 },
  { id: "reason_wrong", label: "The reason didn't matter to them", effect: -1 },
  { id: "signal_stale", label: "Signal was out of date", effect: -1 },
  { id: "bad_fit", label: "Not a fit", effect: -1 },
  { id: "wrong_contact", label: "Wrong person", effect: 0 },
] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]["id"];
export const FEEDBACK_KIND_IDS = FEEDBACK_KINDS.map((f) => f.id) as [FeedbackKind, ...FeedbackKind[]];

/** A lead at or above this score is warm enough to start a play. */
export const WARM_SCORE = 60;

// --- Places ---------------------------------------------------------------------
//
// Approximate centres of Pune localities, so "within 5 km of Baner" works for
// prospects that have only an area name. Exact coordinates (from the Google
// Maps link) always win. Other cities work with coordinates or pin codes.

export const AREA_CENTRES: Record<string, [number, number]> = {
  shivajinagar: [18.5308, 73.8475],
  deccan: [18.5167, 73.8414],
  peth: [18.514, 73.853],
  swargate: [18.501, 73.863],
  camp: [18.515, 73.878],
  "koregaon park": [18.5362, 73.894],
  yerawada: [18.553, 73.886],
  "viman nagar": [18.5679, 73.9143],
  kharadi: [18.551, 73.944],
  wagholi: [18.58, 73.98],
  hadapsar: [18.5089, 73.926],
  magarpatta: [18.515, 73.93],
  kondhwa: [18.467, 73.889],
  undri: [18.455, 73.905],
  katraj: [18.453, 73.865],
  bibwewadi: [18.47, 73.86],
  "market yard": [18.488, 73.865],
  "sahakar nagar": [18.487, 73.85],
  "sinhgad road": [18.48, 73.825],
  ambegaon: [18.45, 73.845],
  kothrud: [18.5074, 73.8077],
  "karve nagar": [18.49, 73.82],
  warje: [18.4844, 73.8],
  bavdhan: [18.5135, 73.781],
  pashan: [18.538, 73.792],
  aundh: [18.558, 73.8075],
  baner: [18.559, 73.7868],
  balewadi: [18.577, 73.779],
  wakad: [18.599, 73.764],
  hinjewadi: [18.5913, 73.7389],
  "pimple saudagar": [18.599, 73.798],
  "pimple nilakh": [18.575, 73.793],
  pimpri: [18.6298, 73.7997],
  chinchwad: [18.635, 73.79],
  nigdi: [18.651, 73.77],
  akurdi: [18.648, 73.768],
  ravet: [18.646, 73.74],
  bhosari: [18.628, 73.847],
  moshi: [18.67, 73.85],
  chakan: [18.76, 73.86],
  vishrantwadi: [18.573, 73.878],
  dhanori: [18.59, 73.9],
  lohegaon: [18.599, 73.925],
};

/** The centre of a locality named anywhere in `area` ("Baner (106 K Square…)" → Baner). */
export function areaCentre(area: string | null | undefined): [number, number] | null {
  if (!area) return null;
  const a = area.toLowerCase();
  // Longest names first, so "pimple saudagar" wins over "pimpri"-like prefixes.
  const names = Object.keys(AREA_CENTRES).sort((x, y) => y.length - x.length);
  const hit = names.find((n) => a.includes(n));
  return hit ? AREA_CENTRES[hit] : null;
}
