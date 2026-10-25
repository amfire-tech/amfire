import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { agentRuns, leads, proposals, recommendations, type Lead } from "@/db/schema";
import { BUSINESS_TYPES, CALL_TIMES, GOALS, TEAM_SIZES, URGENCY } from "@/knowledge/catalog";
import { CURRENCIES, PRICING_CURRENCY } from "@/knowledge/pricing";
import { MANUAL_SOURCES, sourceLabel, type Touch } from "@/lib/attribution";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { aiConfigured, runSolutionArchitect } from "./agents/solution-architect";
import { scoreLead } from "./qualification";

/**
 * The free-demo promo code for a booking. Derived from the booking's private
 * reference, so it's unique per booking and never needs storing.
 */
export function demoOfferCode(publicRef: string) {
  return `DEMO5K-${createHash("sha256").update(publicRef).digest("hex").slice(0, 6).toUpperCase()}`;
}

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((i) => i.id) as [T[number]["id"], ...T[number]["id"][]];

export const DiscoverySchema = z.object({
  goal: z.enum(ids(GOALS)),
  businessType: z.enum(BUSINESS_TYPES),
  urgency: z.enum(ids(URGENCY)),
  teamSize: z.enum(ids(TEAM_SIZES)).optional(),
  problem: z.string().trim().min(20, "Tell us a little more — a sentence or two is enough.").max(4000),
  currentTools: z.string().trim().max(500).optional(),
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  email: z.email("Please enter a valid email address.").trim().toLowerCase().max(200),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+?91)?[6-9]\d{9}$|^\+\d{8,15}$/, "Please enter a valid mobile number."))
    .optional(),
  callTime: z.enum(ids(CALL_TIMES)).optional(),
  company: z.string().trim().min(1, "Please tell us your organisation's name.").max(160),
  consent: z.literal(true, { error: "We need your consent to store your answers." }),
  /** The currency the visitor chose on the site; proposals are drafted in it. */
  currency: z.enum(CURRENCIES).default(PRICING_CURRENCY),
});
export type DiscoveryAnswers = z.infer<typeof DiscoverySchema>;

/**
 * Public entry point: records a discovery submission, scores it and asks the
 * Solution Architect (rules engine — fast and deterministic) for a starting
 * recommendation. A person reviews everything before any proposal.
 */
export async function submitDiscovery(
  db: DB,
  input: z.input<typeof DiscoverySchema>,
  opts: { attribution?: Touch | null } = {},
) {
  // Validate here too, so every caller gets the same normalised data.
  const answers: DiscoveryAnswers = DiscoverySchema.parse(input);
  const q = scoreLead({
    goal: answers.goal,
    urgency: answers.urgency,
    teamSize: answers.teamSize ?? null,
    problem: answers.problem,
    email: answers.email,
  });

  const lead = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(leads)
      .values({
        publicRef: randomBytes(12).toString("base64url"),
        name: answers.name,
        email: answers.email,
        phone: answers.phone ?? null,
        callTime: answers.callTime ?? null,
        company: answers.company,
        goal: answers.goal,
        businessType: answers.businessType,
        urgency: answers.urgency,
        teamSize: answers.teamSize ?? null,
        problem: answers.problem,
        currentTools: answers.currentTools || null,
        currency: answers.currency,
        consentAt: new Date(),
        ...attributionColumns(opts.attribution),
        qualificationScore: q.score,
        qualificationNotes: q.reasons.join("\n"),
        nextAction: answers.phone ? "Call to schedule the free demo, then qualify" : "Review discovery answers and qualify",
      })
      .returning();
    await audit(tx, {
      action: "lead.created",
      subjectType: "lead",
      subjectId: row.id,
      data: { score: q.score, band: q.band, source: row.source },
    });
    return row;
  });

  return { lead, recommendation: await recommend(db, lead) };
}

function attributionColumns(touch: Touch | null | undefined) {
  if (!touch) return { source: "unknown" };
  return {
    source: touch.source,
    utmSource: touch.utmSource ?? null,
    utmMedium: touch.utmMedium ?? null,
    utmCampaign: touch.utmCampaign ?? null,
    utmContent: touch.utmContent ?? null,
    utmTerm: touch.utmTerm ?? null,
    referrer: touch.referrer ?? null,
    landingPath: touch.landingPath ?? null,
  };
}

/** A starting recommendation from the rules engine — fast and deterministic. */
async function recommend(db: DB, lead: Lead) {
  try {
    return await runSolutionArchitect(db, lead, { engine: "rules" });
  } catch {
    // The lead is already saved; HQ shows the failed run and can retry.
    return null;
  }
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || undefined)
    .optional();

/** A lead staff add by hand: a LinkedIn DM, a WhatsApp chat, a referral. */
export const ManualLeadSchema = z.object({
  source: z.enum(MANUAL_SOURCES, { error: "Choose where this lead came from." }),
  sourceNote: optionalText(300),
  name: z.string().trim().min(1, "Add the person's name.").max(120),
  company: z.string().trim().min(1, "Add their organisation's name.").max(160),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address, or leave it empty.").trim().toLowerCase().max(200)])
    .transform((v) => v || undefined)
    .optional(),
  phone: z.union([z.literal("").transform(() => undefined), DiscoverySchema.shape.phone]),
  problem: z.string().trim().min(10, "Add what they need, or paste the conversation.").max(8000),
  goal: z.enum(ids(GOALS)).default("not-sure"),
  businessType: z.enum(BUSINESS_TYPES).default("Something else"),
  urgency: z.enum(ids(URGENCY)).default("exploring"),
});
export type ManualLead = z.infer<typeof ManualLeadSchema>;

export async function addManualLead(db: DB, actor: Actor | null, input: z.input<typeof ManualLeadSchema>) {
  assertStaff(actor);
  const data = ManualLeadSchema.parse(input);
  const q = scoreLead({ goal: data.goal, urgency: data.urgency, problem: data.problem, email: data.email ?? "" });

  const lead = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(leads)
      .values({
        publicRef: randomBytes(12).toString("base64url"),
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        company: data.company,
        goal: data.goal,
        businessType: data.businessType,
        urgency: data.urgency,
        problem: data.problem,
        currency: PRICING_CURRENCY,
        source: data.source,
        sourceNote: data.sourceNote ?? null,
        qualificationScore: q.score,
        qualificationNotes: q.reasons.join("\n"),
        nextAction: `Reply on ${sourceLabel(data.source)} to book the free demo, then qualify`,
      })
      .returning();
    await audit(tx, {
      actorId: actor.userId,
      action: "lead.created",
      subjectType: "lead",
      subjectId: row.id,
      data: { score: q.score, band: q.band, source: row.source, manual: true },
    });
    return row;
  });

  return { lead, recommendation: await recommend(db, lead) };
}

export const LeadContactSchema = z
  .object({
    email: ManualLeadSchema.shape.email,
    phone: ManualLeadSchema.shape.phone,
  })
  .refine((d) => d.email || d.phone, { message: "Add an email or a phone number.", path: ["email"] });

/** Fills in contact details a hand-added lead was missing. Never clears one. */
export async function updateLeadContact(db: DB, actor: Actor | null, leadId: string, input: z.input<typeof LeadContactSchema>) {
  assertStaff(actor);
  const data = LeadContactSchema.parse(input);
  const changes = {
    ...(data.email && { email: data.email }),
    ...(data.phone && { phone: data.phone }),
  };
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .update(leads)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(leads.id, leadId))
      .returning();
    if (!lead) throw new Error("Lead not found");
    await audit(tx, { actorId: actor.userId, action: "lead.contact_updated", subjectType: "lead", subjectId: leadId, data: { fields: Object.keys(changes) } });
    return lead;
  });
}

/** What the visitor sees after submitting — minimal and non-sensitive. */
export async function getPublicDiscoveryResult(db: DB, publicRef: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.publicRef, publicRef));
  if (!lead) return null;
  const [rec] = await db
    .select()
    .from(recommendations)
    .where(eq(recommendations.leadId, lead.id))
    .orderBy(desc(recommendations.createdAt))
    .limit(1);
  return {
    firstName: lead.name.split(" ")[0],
    company: lead.company,
    offerCode: demoOfferCode(lead.publicRef),
    recommendation: rec
      ? { path: rec.path, headline: rec.headline, summary: rec.summary, approach: rec.approach, assumptions: rec.assumptions, openQuestions: rec.openQuestions }
      : null,
  };
}

// --- HQ ---------------------------------------------------------------------

export async function getLeadDetail(db: DB, actor: Actor | null, leadId: string) {
  assertStaff(actor);
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) return null;
  const [recs, runs, props] = await Promise.all([
    db.select().from(recommendations).where(eq(recommendations.leadId, leadId)).orderBy(desc(recommendations.createdAt)),
    db
      .select()
      .from(agentRuns)
      .where(and(eq(agentRuns.subjectType, "lead"), eq(agentRuns.subjectId, leadId)))
      .orderBy(desc(agentRuns.startedAt)),
    db.select().from(proposals).where(eq(proposals.leadId, leadId)).orderBy(desc(proposals.createdAt)),
  ]);
  return { lead, recommendations: recs, runs, proposals: props };
}

export async function decideQualification(
  db: DB,
  actor: Actor | null,
  leadId: string,
  decision: "qualified" | "disqualified",
  note?: string,
): Promise<Lead> {
  assertStaff(actor);
  return db.transaction(async (tx) => {
    const [lead] = await tx
      .update(leads)
      .set({
        status: decision,
        reviewedAt: new Date(),
        nextAction: decision === "qualified" ? "Review the recommendation and draft a proposal" : null,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId))
      .returning();
    if (!lead) throw new Error("Lead not found");
    await audit(tx, { actorId: actor.userId, action: `lead.${decision}`, subjectType: "lead", subjectId: leadId, data: { note } });
    return lead;
  });
}

export async function rerunRecommendation(db: DB, actor: Actor | null, leadId: string) {
  assertStaff(actor);
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");
  return runSolutionArchitect(db, lead, {
    engine: aiConfigured() ? "gemini" : "rules",
    triggeredBy: actor.userId,
  });
}

export async function setRecommendationStatus(
  db: DB,
  actor: Actor | null,
  recommendationId: string,
  status: "accepted" | "rejected",
) {
  assertStaff(actor);
  await db.transaction(async (tx) => {
    const [rec] = await tx
      .update(recommendations)
      .set({ status, reviewedBy: actor.userId, reviewedAt: new Date() })
      .where(eq(recommendations.id, recommendationId))
      .returning();
    if (!rec) throw new Error("Recommendation not found");
    await audit(tx, {
      actorId: actor.userId,
      action: `recommendation.${status}`,
      subjectType: "lead",
      subjectId: rec.leadId,
      data: { recommendationId },
    });
  });
}
