// Lead attribution: where a visitor came from. The proxy records the first
// meaningful visit in a cookie (UTM tags, or the referring site), and the
// discovery form saves it with the lead — so HQ can tell a LinkedIn lead from
// a Google one. Only the referring host and landing path are kept, never full
// URLs or query strings.

import * as z from "zod";

export const ATTRIBUTION_COOKIE = "first_touch";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export const LEAD_SOURCES = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "google", label: "Google" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "youtube", label: "YouTube" },
  { id: "x", label: "X (Twitter)" },
  { id: "email", label: "Email" },
  { id: "referral", label: "Referral" },
  { id: "call", label: "Phone call" },
  { id: "event", label: "Event or meeting" },
  { id: "other_site", label: "Another website" },
  { id: "direct", label: "Direct visit" },
  { id: "other", label: "Other" },
  { id: "unknown", label: "Unknown" },
] as const;

export type LeadSourceId = (typeof LEAD_SOURCES)[number]["id"];

/** Sources staff can pick when adding a lead by hand. */
export const MANUAL_SOURCES = ["linkedin", "whatsapp", "referral", "call", "email", "instagram", "facebook", "event", "other"] as const;

export function sourceLabel(id: string) {
  return LEAD_SOURCES.find((s) => s.id === id)?.label ?? id;
}

const field = z.string().trim().max(150).optional().catch(undefined);

export const Touch = z.object({
  source: z.enum(LEAD_SOURCES.map((s) => s.id) as [LeadSourceId, ...LeadSourceId[]]),
  utmSource: field,
  utmMedium: field,
  utmCampaign: field,
  utmContent: field,
  utmTerm: field,
  referrer: field,
  landingPath: field,
});
export type Touch = z.infer<typeof Touch>;

/** Reads the attribution cookie; anything malformed counts as no cookie. */
export function readTouch(value: string | undefined): Touch | null {
  if (!value) return null;
  try {
    const parsed = Touch.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// Matched against utm_source, then against the referring host. Android apps
// send referrers like "android-app://com.linkedin.android".
const PATTERNS: [LeadSourceId, RegExp][] = [
  ["linkedin", /linkedin|lnkd\.in/i],
  ["whatsapp", /whatsapp|^wa$|wa\.me/i],
  ["instagram", /instagram|^ig$/i],
  ["facebook", /facebook|^fb$|fb\.com|^meta$|com\.facebook/i],
  ["youtube", /youtube|youtu\.be|^yt$/i],
  ["x", /twitter|^x$|^x\.com$|^t\.co$/i],
  ["email", /e-?mail|newsletter|mail\.google|outlook|com\.google\.android\.gm/i],
  ["google", /google|adwords|gads|googlequicksearchbox/i],
];

function hostOf(referrer: string): string | null {
  try {
    const url = new URL(referrer);
    return (url.hostname || url.host).replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Works out a visit's source from its URL and Referer header. Referrers from
 * our own site count as direct.
 */
export function touchFromVisit(url: URL, referrer: string | null, ownHost: string): Touch {
  const q = (k: string) => url.searchParams.get(k)?.trim().slice(0, 150) || undefined;
  const utm = {
    utmSource: q("utm_source"),
    utmMedium: q("utm_medium"),
    utmCampaign: q("utm_campaign"),
    utmContent: q("utm_content"),
    utmTerm: q("utm_term"),
  };
  const host = referrer ? hostOf(referrer) : null;
  const own = ownHost.replace(/:\d+$/, "").replace(/^www\./, "").toLowerCase();
  const external = host && host !== own ? host : undefined;
  return {
    source: classify(utm.utmSource, utm.utmMedium, external),
    ...utm,
    referrer: external?.slice(0, 150),
    landingPath: url.pathname.slice(0, 150),
  };
}

export function classify(utmSource: string | undefined, utmMedium: string | undefined, referrerHost: string | undefined): LeadSourceId {
  if (utmSource) {
    if (/e-?mail|newsletter/i.test(utmMedium ?? "")) return "email";
    const match = PATTERNS.find(([, re]) => re.test(utmSource));
    if (match) return match[0];
    if (/referral/i.test(utmMedium ?? "")) return "referral";
    return "other";
  }
  if (referrerHost) return PATTERNS.find(([, re]) => re.test(referrerHost))?.[0] ?? "other_site";
  return "direct";
}

/** The first visit is kept, unless it was direct and a later visit has a real source. */
export function shouldReplaceTouch(existing: Touch | null, next: Touch) {
  return !existing || (existing.source === "direct" && next.source !== "direct");
}
