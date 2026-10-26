// The proof engine: a personal demo page for a prospect (/demo/{slug}) where
// their "AI salesperson" answers like it would on WhatsApp, from their own
// catalogue and prices, with a short audit of what they're losing today.
// Claude researches the knowledge from public sources through the connector;
// the page's answers come from Gemini at runtime (the website can't run on the
// owner's Claude plan), with a plain fallback when AI isn't available.
// Opening a demo puts the prospect at the top of the call queue and emails the owner.

import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { agentRuns, demos, prospects, touches, type Demo } from "@/db/schema";
import { site } from "@/config/site";
import { canUseAi, DATA_RULE, generateJson } from "./agents/llm";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { briefEmail, emailConfigured, sendEmail } from "./notify";
import { OutreachError } from "./outreach";

const HOUR = 60 * 60 * 1000;

export const AuditItem = z.object({
  title: z.string().trim().min(1).max(120),
  finding: z.string().trim().min(1).max(600),
  impact: z.string().trim().min(1).max(400),
  fix: z.string().trim().min(1).max(400),
});

export const DemoInput = z.object({
  prospectId: z.uuid(),
  knowledge: z.string().trim().min(40, "Give the demo something to answer from: products, prices, hours, location, FAQs.").max(20_000),
  greeting: z.string().trim().min(1).max(500).optional(),
  sampleQuestions: z.array(z.string().trim().min(1).max(120)).max(5).optional(),
  audit: z.array(AuditItem).max(5).optional(),
});

export function demoUrl(demo: Pick<Demo, "slug">) {
  return `${site.url}/demo/${demo.slug}`;
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32) || "demo";

/** Creates the prospect's demo, or updates it keeping the same link. */
export async function upsertDemo(db: DB, actor: Actor | null, input: z.input<typeof DemoInput>) {
  assertStaff(actor);
  const data = DemoInput.parse(input);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, data.prospectId));
  if (!p) throw new OutreachError("Prospect not found.");
  const values = {
    businessName: p.name.replace(/\s*\(.*?\)\s*/g, " ").trim(),
    greeting: data.greeting ?? `Namaste! 🙏 Welcome to ${p.name.replace(/\s*\(.*?\)\s*/g, " ").trim()}. How can I help you today?`,
    knowledge: data.knowledge,
    sampleQuestions: data.sampleQuestions ?? [],
    audit: data.audit ?? [],
  };
  const [existing] = await db.select().from(demos).where(eq(demos.prospectId, p.id));
  const [demo] = existing
    ? await db
        .update(demos)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(demos.id, existing.id))
        .returning()
    : await db
        .insert(demos)
        .values({ ...values, prospectId: p.id, slug: `${slugify(p.name)}-${randomBytes(3).toString("hex")}` })
        .returning();
  if (!existing) await audit(db, { actorId: actor.userId, action: "demo.created", subjectType: "prospect", subjectId: p.id, data: { slug: demo.slug } });
  return { demo, url: demoUrl(demo) };
}

export async function getDemoForProspect(db: DB, prospectId: string) {
  const [demo] = await db.select().from(demos).where(eq(demos.prospectId, prospectId));
  return demo ?? null;
}

/** What the public page may show: nothing from the owner's private research or notes. */
export async function getPublicDemo(db: DB, slug: string) {
  if (!/^[a-z0-9-]{3,48}$/.test(slug)) return null;
  const [demo] = await db.select().from(demos).where(eq(demos.slug, slug));
  if (!demo) return null;
  return { slug: demo.slug, businessName: demo.businessName, greeting: demo.greeting, sampleQuestions: demo.sampleQuestions, audit: demo.audit };
}

/**
 * Counts a real view of the demo (the page reports it from the browser, so
 * WhatsApp's link preview doesn't count) and, on the first view or after an
 * hour's gap, alerts the owner: a note on the prospect, the prospect moved to
 * the top of the call queue, and an email when email is set up.
 */
export async function recordDemoView(db: DB, slug: string, opts: { viewerIsStaff?: boolean; now?: Date } = {}) {
  if (opts.viewerIsStaff || !/^[a-z0-9-]{3,48}$/.test(slug)) return { counted: false, alerted: false };
  const now = opts.now ?? new Date();
  const [before] = await db.select().from(demos).where(eq(demos.slug, slug));
  if (!before) return { counted: false, alerted: false };
  const [demo] = await db
    .update(demos)
    .set({ views: sql`${demos.views} + 1`, firstViewedAt: before.firstViewedAt ?? now, lastViewedAt: now })
    .where(eq(demos.id, before.id))
    .returning();
  const alert = !before.lastViewedAt || now.getTime() - before.lastViewedAt.getTime() > HOUR;
  if (!alert) return { counted: true, alerted: false };

  const [p] = await db.select().from(prospects).where(eq(prospects.id, demo.prospectId));
  if (!p) return { counted: true, alerted: false };
  const label = demo.views === 1 ? "Opened their demo for the first time" : `Opened their demo again (view ${demo.views})`;
  await db.insert(touches).values({ prospectId: p.id, channel: "note", outcome: "noted", note: `${label}. Call now while it's fresh.`, loggedBy: "system", occurredAt: now });
  if (!p.doNotContact && ["to_contact", "trying", "talking", "meeting"].includes(p.status)) {
    await db.update(prospects).set({ nextFollowUpAt: now, updatedAt: now }).where(eq(prospects.id, p.id));
  }
  const to = briefEmail();
  if (to && emailConfigured()) {
    try {
      await sendEmail({
        to,
        subject: `${p.name} just opened their demo: call now`,
        text: `${p.name}${p.contactName ? ` (${p.contactName})` : ""} ${label.toLowerCase()} at ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}.\n\n${p.phone ? `Call: ${p.phone}\n` : ""}Prospect: ${site.url}/hq/outreach/${p.id}\n\nPeople who call within 10 minutes of an open win far more often.`,
      });
    } catch (err) {
      console.error("demo alert email failed", err);
    }
  }
  return { counted: true, alerted: true };
}

const DemoAnswer = z.object({ answer: z.string().min(1).max(1200), canAnswer: z.boolean() });

export const DemoTurns = z
  .array(z.object({ q: z.string().max(500), a: z.string().max(1200) }))
  .max(8)
  .default([]);

function demoSystem(businessName: string) {
  return [
    `You are the WhatsApp AI salesperson for ${businessName}, shown in a demo AMFIRE built for the business owner.`,
    "Reply like a friendly, quick WhatsApp assistant for this business: short (1–4 lines), warm, specific.",
    "Answer ONLY from the business knowledge provided. Never invent prices, stock, discounts, timings or policies.",
    "When the knowledge doesn't cover something, say a team member will confirm shortly, and ask for the customer's name and a good time to call. Set canAnswer to false.",
    "When it helps the sale, suggest the next step: visit, booking, call, or sharing photos or requirements.",
    "Reply in the language and script the customer used (English, Hindi, Hinglish or Marathi).",
    DATA_RULE,
  ].join("\n");
}

/** Plain answer when AI isn't available: the knowledge lines that share the most words with the question. */
export function fallbackAnswer(knowledge: string, question: string, businessName: string) {
  const words = new Set(question.toLowerCase().match(/[a-zऀ-ॿ]{3,}/g) ?? []);
  const best = knowledge
    .split(/\n+/)
    .map((line) => ({ line: line.trim(), hits: (line.toLowerCase().match(/[a-zऀ-ॿ]{3,}/g) ?? []).filter((w) => words.has(w)).length }))
    .filter((l) => l.line && l.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 2);
  if (best.length) return { answer: best.map((b) => b.line).join("\n"), canAnswer: true };
  return { answer: `Thank you for your message! Someone from ${businessName} will reply shortly. May I have your name and a good time to call you?`, canAnswer: false };
}

/** The demo's AI salesperson answering a visitor's question. */
export async function askDemo(db: DB, slug: string, question: string, history: z.input<typeof DemoTurns> = []) {
  const q = z.string().trim().min(1, "Type a message.").max(500).parse(question);
  const turns = DemoTurns.parse(history);
  if (!/^[a-z0-9-]{3,48}$/.test(slug)) throw new OutreachError("Demo not found.");
  const [demo] = await db.select().from(demos).where(eq(demos.slug, slug));
  if (!demo) throw new OutreachError("Demo not found.");
  await db
    .update(demos)
    .set({ chats: sql`${demos.chats} + 1` })
    .where(eq(demos.id, demo.id));

  if (await canUseAi(db, "demo")) {
    const [run] = await db
      .insert(agentRuns)
      .values({ role: "demo", engine: "gemini", subjectType: "prospect", subjectId: demo.prospectId, input: { question: q } })
      .returning();
    try {
      const { output, usage } = await generateJson(
        DemoAnswer,
        { type: "object", properties: { answer: { type: "string" }, canAnswer: { type: "boolean" } }, required: ["answer", "canAnswer"] },
        demoSystem(demo.businessName),
        { business: demo.businessName, knowledge: demo.knowledge, earlier_in_this_chat: turns, customer_message: q },
      );
      await db
        .update(agentRuns)
        .set({ status: "succeeded", output, model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costMicroUsd: usage.costMicroUsd, finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
      return output;
    } catch (err) {
      await db
        .update(agentRuns)
        .set({ status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
    }
  }
  return fallbackAnswer(demo.knowledge, q, demo.businessName);
}
