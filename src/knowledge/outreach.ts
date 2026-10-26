// The outreach playbook: what can happen on a call or message, the objections
// we hear and how to answer them, and the main hook. Claude reviews the
// outcomes every night and proposes changes here as a "playbook" note.

export const TOUCH_CHANNELS = ["call", "whatsapp", "email", "linkedin", "visit", "note"] as const;
export type TouchChannel = (typeof TOUCH_CHANNELS)[number];

export const CHANNEL_LABELS: Record<TouchChannel, string> = {
  call: "Call",
  whatsapp: "WhatsApp",
  email: "Email",
  linkedin: "LinkedIn",
  visit: "Visit",
  note: "Note",
};

/**
 * Every outcome a touch can have. `reached` means a real person picked up or
 * replied; `talked` means it was a conversation, not a brush-off.
 */
export const OUTCOMES = [
  { id: "no_answer", label: "No answer", channels: ["call"], reached: false, talked: false },
  { id: "busy", label: "Busy / cut the call", channels: ["call"], reached: false, talked: false },
  { id: "wrong_number", label: "Wrong number", channels: ["call", "whatsapp"], reached: false, talked: false },
  { id: "gatekeeper", label: "Reached staff, not the owner", channels: ["call", "visit"], reached: true, talked: false },
  { id: "not_interested", label: "Not interested", channels: ["call", "whatsapp", "email", "linkedin", "visit"], reached: true, talked: true },
  { id: "do_not_contact", label: "Asked not to be contacted", channels: ["call", "whatsapp", "email", "linkedin", "visit"], reached: true, talked: false },
  { id: "call_back", label: "Call back later", channels: ["call", "whatsapp", "visit"], reached: true, talked: true },
  { id: "interested", label: "Interested", channels: ["call", "whatsapp", "email", "linkedin", "visit"], reached: true, talked: true },
  { id: "demo_sent", label: "Demo / details sent", channels: ["call", "whatsapp", "email", "linkedin"], reached: true, talked: true },
  { id: "meeting_booked", label: "Meeting booked", channels: ["call", "whatsapp", "email", "linkedin", "visit"], reached: true, talked: true },
  { id: "sent", label: "Message sent", channels: ["whatsapp", "email", "linkedin"], reached: false, talked: false },
  { id: "replied", label: "They replied", channels: ["whatsapp", "email", "linkedin"], reached: true, talked: true },
  { id: "met", label: "Met in person", channels: ["visit"], reached: true, talked: true },
  { id: "noted", label: "Note", channels: ["note"], reached: false, talked: false },
] as const;
export type OutcomeId = (typeof OUTCOMES)[number]["id"];
export const OUTCOME_IDS = OUTCOMES.map((o) => o.id) as [OutcomeId, ...OutcomeId[]];

export function outcomeFor(id: string) {
  return OUTCOMES.find((o) => o.id === id);
}

export function outcomeLabel(id: string) {
  return outcomeFor(id)?.label ?? id;
}

/** The objections we track, each with the reply that has worked best so far. */
export const OBJECTIONS = [
  {
    id: "send_details",
    label: "\"Send details on WhatsApp\"",
    reply: "Of course. I'll send the demo I made for your business, it takes 30 seconds to try. When can I call you to hear what you think, tomorrow 11 or 5?",
  },
  {
    id: "already_have",
    label: "Already have someone / an agency",
    reply: "Good, then you know the value. Is your WhatsApp replying to customers at 11 pm today? The demo shows what that looks like. Worth comparing.",
  },
  {
    id: "too_expensive",
    label: "Too expensive / no budget",
    reply: "How many enquiries come on WhatsApp in a month, and how many become orders? If it saves even two lost customers a month, it pays for itself. And the first setup is on us.",
  },
  {
    id: "not_decision_maker",
    label: "Not the decision maker",
    reply: "Who looks after customer enquiries and WhatsApp? Could you share their number, or tell them AMFIRE made a demo for your business?",
  },
  {
    id: "busy",
    label: "Busy right now",
    reply: "No problem. I'll send the demo on WhatsApp now, and call you back. Is 6 pm or tomorrow morning better?",
  },
  {
    id: "dont_need",
    label: "Don't need it / happy as we are",
    reply: "Fair enough. Most owners say that until they see how many messages go unanswered after shop hours. Can I send the free demo anyway? No follow-up if you don't like it.",
  },
  {
    id: "no_trust_ai",
    label: "Don't trust AI with customers",
    reply: "Right instinct. It only answers from your own catalogue and prices, and you can take over any chat. You see every reply.",
  },
  {
    id: "other",
    label: "Something else",
    reply: "Write down exactly what they said. Claude groups these every night and suggests a reply.",
  },
] as const;
export type ObjectionId = (typeof OBJECTIONS)[number]["id"];
export const OBJECTION_IDS = OBJECTIONS.map((o) => o.id) as [ObjectionId, ...ObjectionId[]];

export function objectionLabel(id: string) {
  return OBJECTIONS.find((o) => o.id === id)?.label.replaceAll('"', "") ?? id;
}

export const PROSPECT_KINDS = [
  { id: "business", label: "Business" },
  { id: "ca_firm", label: "CA firm (partner)" },
  { id: "network", label: "Someone I know" },
] as const;
export type ProspectKind = (typeof PROSPECT_KINDS)[number]["id"];
export const PROSPECT_KIND_IDS = PROSPECT_KINDS.map((k) => k.id) as [ProspectKind, ...ProspectKind[]];

export const PROSPECT_STATUSES = [
  { id: "to_contact", label: "To contact" },
  { id: "trying", label: "Trying" },
  { id: "talking", label: "Talking" },
  { id: "meeting", label: "Meeting" },
  { id: "lead", label: "Became a lead" },
  { id: "partner", label: "Partner" },
  { id: "not_now", label: "Not now" },
  { id: "dropped", label: "Dropped" },
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number]["id"];

export function prospectStatusLabel(id: string) {
  return PROSPECT_STATUSES.find((s) => s.id === id)?.label ?? id;
}

/** Daily targets: the "Rule of 100". A touch is any call, message or visit. */
export const DAILY_TARGETS = { touches: 100, conversations: 20, meetings: 2 };

/** A day counts towards the streak when it has at least this many touches. */
export const STREAK_MIN_TOUCHES = 20;

/** Unanswered calls in a row before a prospect is parked as "not now". */
export const MAX_MISSED_CALLS = 5;

// --- The hook: Meta's free WhatsApp Business AI -------------------------------
//
// Meta rolled out a free AI agent inside the WhatsApp Business app in India in
// July 2026. Most businesses haven't switched it on, or set it up badly (it
// answers only from their catalogue). The call asks permission to send a demo;
// the demo does the selling.

export const HOOK = {
  name: "WhatsApp AI salesperson",
  offer: "Your AI salesperson on WhatsApp in 48 hours: setup free for founding clients on the Operate plan.",
  callScript: [
    "Namaste {contact}, I'm {owner} from AMFIRE, Pune. Two minutes?",
    "In July Meta launched a free AI salesperson inside WhatsApp Business. Have you switched it on yet?",
    "(If no / what is it:) It replies to customers 24×7 from your own catalogue, books appointments and collects enquiries, even at night.",
    "I've already made a demo for {business}. Can I send it to you on WhatsApp? Try it for 30 seconds.",
    "(Close:) When can I call you back to hear what you think, tomorrow 11 or 5?",
  ],
  whatsapp:
    "Namaste {contact}, {owner} from AMFIRE here, as we just discussed. Meta has launched a free AI salesperson inside WhatsApp Business. It answers your customers 24×7 from your own products and prices. I've made a demo for {business}: {demo}\n\nTry it, and tell me what you think. I'll call you tomorrow.",
  coldWhatsapp:
    "Namaste {contact}, I'm {owner} from AMFIRE, Pune. Meta has launched a free AI salesperson inside WhatsApp Business that replies to customers 24×7 from your own catalogue. Most businesses haven't switched it on yet. I made a quick demo for {business}, may I send it?",
} as const;

/** CA firms are partners, not buyers: their clients are the businesses we want. */
export const PARTNER_HOOK = {
  name: "CA partner programme",
  callScript: [
    "Namaste {contact}, I'm {owner} from AMFIRE, Pune. We set up software and AI for small businesses. Two minutes?",
    "Many of your clients still re-type WhatsApp orders and send bills by hand, which also makes their books messy for you.",
    "Meta has just launched a free WhatsApp AI for businesses. I'd like to run a free 45-minute session for your clients on using it properly. Your firm hosts, we teach.",
    "For anyone who becomes a client, we share 10% of the first year with your firm, and their data comes to you cleaner.",
    "(Close:) Can I come by for 15 minutes this week, Wednesday or Thursday?",
  ],
  whatsapp:
    "Namaste {contact}, {owner} from AMFIRE here, as discussed. We help your clients set up Meta's new free WhatsApp AI and automate orders, bills and follow-ups. Happy to run a free session for your clients, hosted by your firm, with a referral share for anyone who signs up. When can I come by for 15 minutes?",
  coldWhatsapp:
    "Namaste {contact}, I'm {owner} from AMFIRE, Pune. We help small businesses set up Meta's new free WhatsApp AI and automate orders, bills and follow-ups, which also means cleaner books for their CA. Could I run a free session for your clients? Happy to share referral fees.",
} as const;

/** Someone the owner already knows: no pitch, just news and a request for help. */
export const NETWORK_HOOK = {
  name: "Someone you know",
  callScript: [
    "Hi {contact}! Quick news: I've started my own company, AMFIRE.",
    "We set up the new free WhatsApp AI from Meta for businesses, and automate the boring work: orders, bills, follow-ups.",
    "I'm taking on five founding clients at a special price. How do you handle customer enquiries on WhatsApp today?",
    "(Either way:) Who's one business owner you know who'd want this? An introduction would mean a lot.",
  ],
  whatsapp:
    "Hi {contact}, great talking! As promised: AMFIRE sets up Meta's new free WhatsApp AI salesperson and automates orders, bills and follow-ups. I'm taking 5 founding clients at a special price. If you know a business owner who'd like a free demo, I'd be grateful for an intro.",
  coldWhatsapp:
    "Hi {contact}! Some news: I've started my own company, AMFIRE. We set up Meta's new free WhatsApp AI and automate orders, bills and follow-ups for businesses. I'm taking 5 founding clients at a special price. Could I take 15 minutes to show you? And who's one business owner you'd suggest I talk to?",
} as const;

/** The script for a prospect's kind. */
export function hookFor(kind: string) {
  return kind === "ca_firm" ? PARTNER_HOOK : kind === "network" ? NETWORK_HOOK : HOOK;
}

/** "27 Oct, 11:00 am" in India time, whatever the server's time zone. */
export function formatIst(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/** Fills {placeholders}; unknown values become a sensible blank. */
export function fillTemplate(template: string, values: Record<string, string | null | undefined>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key]?.trim() || (key === "contact" ? "ji" : key === "demo" ? "(demo link)" : ""));
}
