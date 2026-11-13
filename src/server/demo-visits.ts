// Visits to the live operating-system demo. A prospect's personal link
// ({site}/demo?p={linkToken}) ties the visit to them: the first visit (or one
// after an hour's gap) raises the same call-now alert as a report link. Every
// visit then reports what they did (time on screen, modules opened, decisions
// approved), so a follow-up can start from what they looked at. Anonymous
// visits keep only coarse facts and never an IP address.

import { and, desc, eq, gte, isNotNull, isNull, sql, type SQL } from "drizzle-orm";
import type { DB } from "@/db";
import { demoVisits, prospects, type Prospect } from "@/db/schema";
import { site } from "@/config/site";
import { APPROVALS, DEFAULT_PERSONA, NAV, type Persona, type ViewId } from "@/components/ops-demo/data";
import { assertStaff, type Actor } from "./access";
import { isAutomatedAgent } from "./asset-links";
import { alertOpen, OPEN_ALERT_GAP } from "./open-alerts";

const TOKEN = /^[a-z0-9]{6,32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VISITOR = /^[a-z0-9]{8,40}$/i;
const ACTION = /^[a-z]{2,16}(:[A-Za-z0-9-]{1,24})?$/;

/** Every module of the demo, with the name HQ shows. */
export const DEMO_VIEWS: Record<string, string> = Object.fromEntries(NAV.flatMap((g) => g.items.map((i) => [i.id, i.label])));

/** A visit is "fresh" for updates this long after its last report; later reports are ignored. */
const UPDATE_WINDOW = 6 * 60 * 60 * 1000;
const MAX_SECONDS = 4 * 60 * 60;

/** The personal live demo link for a prospect. */
export const demoLinkFor = (p: Pick<Prospect, "linkToken">) => `${site.url}/demo?p=${p.linkToken}`;

/**
 * The code in the unlock link the founder sends back to anyone who says hi on WhatsApp.
 * Checked on the server only, never shipped to the browser. Set DEMO_UNLOCK_CODE to change
 * it (for example if the link spreads); the fallback keeps it working until then.
 */
export function demoUnlockCode() {
  const c = process.env.DEMO_UNLOCK_CODE?.trim();
  return c && /^[A-Za-z0-9-]{6,40}$/.test(c) ? c : "hp-full-7k2q";
}

export const demoUnlockLink = () => `${site.url}/demo?unlock=${demoUnlockCode()}`;

export const isDemoUnlockCode = (v: unknown) => typeof v === "string" && v === demoUnlockCode();

/** A business name without the "(Chakan)"-style notes HQ keeps in it. */
const displayName = (name: string) => name.replace(/\s*\(.*?\)\s*/g, " ").trim();

/** One line of display text: no control characters, single spaces, a hard length cap. */
function clean(v: string | null | undefined, max: number) {
  if (!v) return "";
  const s = v
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

const initialsOf = (s: string, fallback: string) => {
  const letters = s
    .split(/\s+/)
    .filter((w) => /^[A-Za-z0-9]/.test(w) && !/^(pvt|private|ltd|limited|llp|inc|co|and|&|the|of|india)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return letters || fallback;
};

/** "Something else" isn't a description worth showing. */
const SHOWN_INDUSTRY = (industry: string) => (industry && !/^something else$/i.test(industry) ? industry : "");

type PersonaSource = Pick<Prospect, "name" | "contactName" | "contactRole" | "industry" | "area" | "city">;

/**
 * Who their dashboard is for, from the prospect record: only these display fields,
 * cleaned and length-capped, ever reach the browser (never phone, notes or research).
 * Anything missing falls back to the demo company, so a half-filled record still reads well.
 */
export function personaFrom(p: PersonaSource): Persona {
  const company = clean(displayName(p.name), 40) || DEFAULT_PERSONA.company;
  const person = clean(p.contactName, 40);
  const role = clean(p.contactRole, 40);
  const place = clean(p.area, 30) || clean(p.city, 30) || null;
  const industry = clean(SHOWN_INDUSTRY(p.industry ?? ""), 48);
  return {
    personal: true,
    company,
    companyInitials: initialsOf(company, DEFAULT_PERSONA.companyInitials),
    line: industry || DEFAULT_PERSONA.line,
    facts: place ? `Operations in {city}` : "Your operations, run by agents",
    person: person || DEFAULT_PERSONA.person,
    first: person ? person.split(" ")[0] : DEFAULT_PERSONA.first,
    personInitials: person ? initialsOf(person, "") || person[0].toUpperCase() : DEFAULT_PERSONA.personInitials,
    role: role || (person ? "" : DEFAULT_PERSONA.role),
    place,
  };
}

/**
 * Who a personal link was made for: the "Prepared for" line, and their own persona when
 * the founder switched their demo to personal in HQ. Null for an unknown token.
 */
export async function getDemoInvite(db: DB, token: string | null | undefined) {
  if (!token || !TOKEN.test(token)) return null;
  const [p] = await db
    .select({ name: prospects.name, contactName: prospects.contactName, contactRole: prospects.contactRole, industry: prospects.industry, area: prospects.area, city: prospects.city, demoPersonal: prospects.demoPersonal })
    .from(prospects)
    .where(eq(prospects.linkToken, token));
  if (!p) return null;
  return { org: displayName(p.name), persona: p.demoPersonal ? personaFrom(p) : null };
}

/** Switches a prospect's live demo between the demo company and their own details. */
export async function setDemoPersonal(db: DB, actor: Actor | null, prospectId: string, on: boolean) {
  assertStaff(actor);
  if (!UUID.test(prospectId)) return false;
  const rows = await db.update(prospects).set({ demoPersonal: on, updatedAt: new Date() }).where(eq(prospects.id, prospectId)).returning({ id: prospects.id });
  return rows.length === 1;
}

export function deviceOf(userAgent: string | null | undefined): "phone" | "tablet" | "desktop" {
  const ua = userAgent ?? "";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "phone";
  return "desktop";
}

/** The referring site's host, or null for our own pages and anything unreadable. */
export function referrerHost(referrer: string | null | undefined) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    const own = new URL(site.url).hostname.replace(/^www\./, "");
    return host && host !== own && host !== "localhost" ? host.slice(0, 80) : null;
  } catch {
    return null;
  }
}

const short = (v: string | null | undefined, n = 80) => (v ? v.trim().slice(0, n) || null : null);

export type StartVisit = {
  token?: string | null;
  visitorId?: string | null;
  page: "demo" | "services";
  referrer?: string | null;
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null };
  geo?: { city?: string | null; region?: string | null; country?: string | null };
  userAgent?: string | null;
  viewerIsStaff?: boolean;
  now?: Date;
};

/**
 * Records the start of a visit. Returns null when it isn't counted: a signed-in
 * staff member (testing the link) or an automated link checker.
 */
export async function startDemoVisit(db: DB, s: StartVisit) {
  if (s.viewerIsStaff || isAutomatedAgent(s.userAgent)) return null;
  const now = s.now ?? new Date();
  const [before] = s.token && TOKEN.test(s.token) ? await db.select().from(prospects).where(eq(prospects.linkToken, s.token)) : [];

  const [visit] = await db
    .insert(demoVisits)
    .values({
      prospectId: before?.id ?? null,
      visitorId: s.visitorId && VISITOR.test(s.visitorId) ? s.visitorId : null,
      page: s.page === "services" ? "services" : "demo",
      startedAt: now,
      lastSeenAt: now,
      device: deviceOf(s.userAgent),
      city: short(s.geo?.city, 60),
      region: short(s.geo?.region, 20),
      country: short(s.geo?.country, 4),
      referrer: referrerHost(s.referrer),
      utmSource: short(s.utm?.source, 60),
      utmMedium: short(s.utm?.medium, 60),
      utmCampaign: short(s.utm?.campaign, 80),
    })
    .returning({ id: demoVisits.id });

  if (!before) return { id: visit.id, alerted: false };

  const [p] = await db
    .update(prospects)
    .set({ demoVisits: sql`${prospects.demoVisits} + 1`, demoFirstVisitAt: before.demoFirstVisitAt ?? now, demoLastVisitAt: now })
    .where(eq(prospects.id, before.id))
    .returning();
  const alert = !before.demoLastVisitAt || now.getTime() - before.demoLastVisitAt.getTime() > OPEN_ALERT_GAP;
  if (!alert) return { id: visit.id, alerted: false };
  const label = p.demoVisits === 1 ? "Opened the live demo for the first time" : `Opened the live demo again (visit ${p.demoVisits})`;
  await alertOpen(db, p, label, now, "live demo");
  return { id: visit.id, alerted: true };
}

/** Keeps the first time each item appeared, in order, up to a cap. */
function merge(existing: string[], next: unknown, allowed: (v: string) => boolean, cap: number) {
  const out = [...existing];
  if (Array.isArray(next)) {
    for (const v of next) {
      if (typeof v !== "string" || !allowed(v) || out.includes(v)) continue;
      out.push(v);
      if (out.length >= cap) break;
    }
  }
  return out;
}

/**
 * Adds what happened since the last report. Time only grows, and never beyond the
 * time since the visit began; unknown modules and malformed actions are dropped.
 */
export async function updateDemoVisit(db: DB, id: string, u: { activeSeconds?: unknown; views?: unknown; actions?: unknown }, opts: { now?: Date } = {}) {
  if (!UUID.test(id)) return false;
  const now = opts.now ?? new Date();
  const [v] = await db.select().from(demoVisits).where(eq(demoVisits.id, id));
  if (!v || now.getTime() - v.lastSeenAt.getTime() > UPDATE_WINDOW) return false;
  const elapsed = Math.floor((now.getTime() - v.startedAt.getTime()) / 1000) + 5;
  const reported = typeof u.activeSeconds === "number" && Number.isFinite(u.activeSeconds) ? Math.floor(u.activeSeconds) : 0;
  const activeSeconds = Math.max(v.activeSeconds, Math.min(reported, elapsed, MAX_SECONDS));
  await db
    .update(demoVisits)
    .set({
      activeSeconds,
      views: merge(v.views, u.views, (x) => x in DEMO_VIEWS, 30),
      actions: merge(v.actions, u.actions, (x) => ACTION.test(x), 60),
      lastSeenAt: now,
    })
    .where(eq(demoVisits.id, id));
  return true;
}

// ---------------------------------------------------------------- For HQ

const APPROVAL_TITLES: Record<string, string> = Object.fromEntries(APPROVALS.map((a) => [a.id, a.title]));

/** "approve:price" → "Approved: Price for Apex Motors…", in words for HQ. */
export function describeAction(a: string) {
  const [kind, ref] = a.split(":");
  switch (kind) {
    case "approve":
      return `Approved a decision${APPROVAL_TITLES[ref] ? `: ${APPROVAL_TITLES[ref]}` : ""}`;
    case "order":
      return `Opened order ${ref}`;
    case "ticket":
      return `Opened ticket ${ref}`;
    case "deal":
      return `Opened deal ${ref}`;
    case "agent":
      return "Looked at an agent's step-by-step record";
    case "doc":
      return "Opened a document the agent read";
    case "fullscreen":
      return "Opened full screen";
    case "cta":
      return "Clicked Start a conversation";
    case "locked":
      return `Tried to open ${DEMO_VIEWS[ref] ?? ref} (locked)`;
    case "hi":
      return "Opened WhatsApp to say hi (check whether the message arrived)";
    case "unlock":
      return "Tapped Say hi on WhatsApp";
    case "unlocked":
      return "Opened the full demo with your unlock link";
    default:
      return a;
  }
}

export const viewLabel = (v: string) => DEMO_VIEWS[v as ViewId] ?? v;

export type VisitFilter = "all" | "prospects" | "anonymous";

export async function listDemoVisits(db: DB, actor: Actor | null, opts: { who?: VisitFilter; since?: Date; limit?: number } = {}) {
  assertStaff(actor);
  const where: (SQL | undefined)[] = [
    opts.since ? gte(demoVisits.startedAt, opts.since) : undefined,
    opts.who === "prospects" ? isNotNull(demoVisits.prospectId) : opts.who === "anonymous" ? isNull(demoVisits.prospectId) : undefined,
  ];
  return db
    .select({
      visit: demoVisits,
      prospect: { id: prospects.id, name: prospects.name, contactName: prospects.contactName, phone: prospects.phone, status: prospects.status, demoVisits: prospects.demoVisits },
    })
    .from(demoVisits)
    .leftJoin(prospects, eq(prospects.id, demoVisits.prospectId))
    .where(and(...where))
    .orderBy(desc(demoVisits.startedAt))
    .limit(Math.min(opts.limit ?? 100, 300));
}

export async function prospectDemoVisits(db: DB, actor: Actor | null, prospectId: string, limit = 10) {
  assertStaff(actor);
  return db.select().from(demoVisits).where(eq(demoVisits.prospectId, prospectId)).orderBy(desc(demoVisits.startedAt)).limit(limit);
}

/** Headline numbers for the Demo visits page. */
export async function demoVisitStats(db: DB, actor: Actor | null, opts: { days?: number; now?: Date } = {}) {
  assertStaff(actor);
  const since = new Date((opts.now ?? new Date()).getTime() - (opts.days ?? 7) * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({
      visits: sql<number>`count(*)::int`,
      known: sql<number>`count(${demoVisits.prospectId})::int`,
      prospects: sql<number>`count(distinct ${demoVisits.prospectId})::int`,
      engaged: sql<number>`count(*) filter (where ${demoVisits.activeSeconds} >= 60 or jsonb_array_length(${demoVisits.actions}) > 0)::int`,
      avgSeconds: sql<number>`coalesce(round(avg(${demoVisits.activeSeconds}))::int, 0)`,
    })
    .from(demoVisits)
    .where(gte(demoVisits.startedAt, since));
  return row;
}
