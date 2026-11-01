// Gated plan brochures. A visitor leaves their name and email, we email a
// signed link, and opening it proves the address is real: only then is the
// lead saved and the brochure unlocked (a signed cookie on that device).
// Nothing is stored before the email is confirmed, so links are stateless.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { leads, proposals } from "@/db/schema";
import { EARLY_CLIENTS, LAUNCH_SLOTS_PER_MONTH, REVISIONS } from "@/knowledge/brochures";
import { CURRENCIES, PRICING_CURRENCY, type Currency } from "@/knowledge/pricing";
import { GOALS, SERVICES, type ServicePathId } from "@/knowledge/catalog";
import type { Touch } from "@/lib/attribution";
import { audit } from "./audit";
import { scoreLead } from "./qualification";

export const BROCHURE_COOKIE = "amfire_brochure";
export const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const ACCESS_TTL_MS = 180 * 24 * 60 * 60 * 1000;

/** Which discovery goal a brochure lead is filed under in HQ. */
const GOAL: Record<ServicePathId, (typeof GOALS)[number]["id"]> = { build: "customer-portal", operate: "online-presence", automate: "reduce-manual-work" };

function secret() {
  const s = process.env.BROCHURE_SECRET ?? process.env.CRON_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("Brochure links need BROCHURE_SECRET (or CRON_SECRET).");
  return "amfire-local-brochure-secret";
}

function sign(kind: string, payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(`brochure:${kind}:${body}`).digest("base64url");
  return `${body}.${mac}`;
}

function unsign<T>(kind: string, token: string | undefined, schema: z.ZodType<T>): T | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(createHmac("sha256", secret()).update(`brochure:${kind}:${body}`).digest("base64url"));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(Buffer.from(body, "base64url").toString()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const BrochureRequestSchema = z.object({
  plan: z.enum(["build", "operate", "automate"]),
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  email: z.email("Please enter a valid email address.").trim().toLowerCase().max(200),
  company: z.string().trim().max(160).optional(),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$|^\+\d{8,15}$/, "Please enter a valid mobile number."))
    .optional(),
  currency: z.enum(CURRENCIES).default(PRICING_CURRENCY),
});
export type BrochureRequest = z.infer<typeof BrochureRequestSchema>;

const LinkPayload = BrochureRequestSchema.extend({ exp: z.number() });
const AccessPayload = z.object({ leadId: z.string(), name: z.string(), plans: z.array(z.string()), exp: z.number() });
export type BrochureAccess = z.infer<typeof AccessPayload>;

/** The link we email. Opening it (and pressing the button) confirms the address. */
export function createBrochureLink(req: BrochureRequest): string {
  return sign("link", { ...req, exp: Date.now() + LINK_TTL_MS });
}

export function readBrochureLink(token: string | undefined) {
  const data = unsign("link", token, LinkPayload);
  return data && data.exp > Date.now() ? data : null;
}

export function createAccessCookie(access: Omit<BrochureAccess, "exp">): string {
  return sign("access", { ...access, exp: Date.now() + ACCESS_TTL_MS });
}

export function readAccessCookie(value: string | undefined): BrochureAccess | null {
  const data = unsign("access", value, AccessPayload);
  return data && data.exp > Date.now() ? data : null;
}

/**
 * Saves the confirmed visitor as a lead — or finds the one we already have for
 * that email — and records which brochure they opened.
 */
export async function confirmBrochureLead(db: DB, req: BrochureRequest, attribution: Touch | null) {
  const plan = SERVICES[req.plan].name;
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(leads).where(eq(leads.email, req.email)).orderBy(sql`${leads.createdAt} desc`).limit(1);
    if (existing) {
      await audit(tx, { action: "brochure.opened", subjectType: "lead", subjectId: existing.id, data: { plan: req.plan } });
      return existing;
    }
    const problem = `Confirmed their email and opened the ${plan} brochure.`;
    const q = scoreLead({ goal: GOAL[req.plan], urgency: "exploring", teamSize: null, problem, email: req.email });
    const [row] = await tx
      .insert(leads)
      .values({
        publicRef: randomBytes(12).toString("base64url"),
        name: req.name,
        email: req.email,
        phone: req.phone ?? null,
        company: req.company || "Not given yet",
        goal: GOAL[req.plan],
        businessType: "Something else",
        urgency: "exploring",
        problem,
        currency: req.currency,
        consentAt: new Date(),
        source: attribution?.source ?? "unknown",
        sourceNote: `${plan} brochure`,
        utmSource: attribution?.utmSource ?? null,
        utmMedium: attribution?.utmMedium ?? null,
        utmCampaign: attribution?.utmCampaign ?? null,
        utmContent: attribution?.utmContent ?? null,
        utmTerm: attribution?.utmTerm ?? null,
        referrer: attribution?.referrer ?? null,
        landingPath: attribution?.landingPath ?? null,
        qualificationScore: q.score,
        qualificationNotes: q.reasons.join("\n"),
        nextAction: req.phone ? `Read the ${plan} brochure — WhatsApp them to book the free demo` : `Read the ${plan} brochure — email them to book the free demo`,
      })
      .returning();
    await audit(tx, { action: "lead.created", subjectType: "lead", subjectId: row.id, data: { score: q.score, band: q.band, source: row.source, brochure: req.plan } });
    return row;
  });
}

/** How far a reader got, so HQ can tell a skim from a read to the end. */
export const BROCHURE_STEPS = ["cover", "compare", "cart", "full", "price", "shelves", "work", "method", "mall"] as const;

export async function recordBrochureStep(db: DB, leadId: string, plan: string, step: (typeof BROCHURE_STEPS)[number]) {
  await audit(db, { action: "brochure.step", subjectType: "lead", subjectId: leadId, data: { plan, step } });
}

/** The reader picked what else they want built in the super-mall: a warm lead. */
export async function recordBrochureWish(db: DB, leadId: string, plan: string, wishes: string[], note: string | undefined) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) return;
  const wanted = [...wishes, ...(note ? [note] : [])].join(", ");
  await db
    .update(leads)
    .set({
      problem: `${lead.problem}\n\nFrom the ${SERVICES[plan as ServicePathId]?.name ?? plan} brochure, they also want: ${wanted}`.slice(0, 4000),
      qualificationScore: Math.min(100, lead.qualificationScore + 15),
      nextAction: `Warm: asked for ${wanted.slice(0, 120)} in the brochure — call today to book the free demo`,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  await audit(db, { action: "brochure.wish", subjectType: "lead", subjectId: leadId, data: { plan, wishes, note: note ?? null } });
}

/** Start of the current month in India, where the monthly offers reset. */
function monthStartIST(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 5.5 * 60 * 60 * 1000);
}

/**
 * The month's real numbers behind the brochure's urgency: launch-price places
 * left (out of LAUNCH_SLOTS_PER_MONTH) and how many design revision rounds a
 * client signing today gets. Counted from proposals accepted this month.
 */
export async function monthlyOffer(db: DB) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(proposals)
    .where(and(eq(proposals.status, "accepted"), gte(proposals.decidedAt, monthStartIST())));
  const signed = row?.n ?? 0;
  return {
    slotsLeft: Math.max(0, LAUNCH_SLOTS_PER_MONTH - signed),
    revisions: signed < EARLY_CLIENTS ? REVISIONS.early : REVISIONS.later,
    earlyLeft: Math.max(0, EARLY_CLIENTS - signed),
  };
}

export type MonthlyOffer = Awaited<ReturnType<typeof monthlyOffer>>;

export function brochureCurrency(value: unknown): Currency {
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : PRICING_CURRENCY;
}
