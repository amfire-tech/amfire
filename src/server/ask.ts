// Ask HQ: plain-language questions about the business, answered from the
// records with links to them. Common questions are answered by rules; with
// Gemini configured, anything else is answered from the same snapshot.

import * as z from "zod";
import type { DB } from "@/db";
import { agentRuns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatMoney } from "@/knowledge/pricing";
import { sourceLabel } from "@/lib/attribution";
import { assertStaff, type Actor } from "./access";
import { canUseAi, DATA_RULE, generateJson } from "./agents/llm";
import { getPipeline, listClients } from "./crm";
import { getGrowth } from "./growth";
import { getMoneyOverview } from "./money";

export type AskAnswer = { answer: string; links: { label: string; href: string }[]; engine: "rules" | "gemini" };

const money = (r: Record<string, number>) => Object.entries(r).map(([c, v]) => formatMoney(v, c)).join(" + ") || formatMoney(0);

export const ASK_EXAMPLES = [
  "How much did we collect this month?",
  "Who owes us money?",
  "Is LinkedIn bringing leads?",
  "Which clients are at risk?",
  "What's in the pipeline?",
  "What is our MRR?",
];

const Answer = z.object({ answer: z.string().min(1).max(1500) });

export async function askHq(db: DB, actor: Actor | null, question: string): Promise<AskAnswer> {
  assertStaff(actor);
  const q = z.string().trim().min(3, "Type a question.").max(500).parse(question);
  const [m, pipeline, clients, growth] = await Promise.all([getMoneyOverview(db, actor), getPipeline(db, actor), listClients(db, actor), getGrowth(db, actor)]);

  const rules: [RegExp, () => AskAnswer][] = [
    [
      /\b(owe|overdue|unpaid|outstanding|receivable|pending payment)/i,
      () => {
        const unpaid = m.invoices.filter((r) => r.invoice.status === "sent");
        return {
          answer: unpaid.length
            ? `${money(m.outstanding)} is outstanding across ${unpaid.length} invoice(s)${m.overdue.length ? `, ${m.overdue.length} of them overdue` : ""}: ${unpaid
                .slice(0, 6)
                .map((r) => `${r.orgName} ${formatMoney(r.invoice.total, r.invoice.currency)} (${r.invoice.number})`)
                .join(", ")}.`
            : "Nobody owes you money right now.",
          links: unpaid.slice(0, 6).map((r) => ({ label: r.invoice.number, href: `/hq/money/invoices/${r.invoice.id}` })),
          engine: "rules",
        };
      },
    ],
    [
      /\b(mrr|recurring|retainer|monthly plan|subscription)/i,
      () => ({
        answer: `Monthly recurring revenue is ${money(m.mrr)} from ${m.subscriptions.filter((s) => s.subscription.status === "active").length} active plan(s).`,
        links: [{ label: "Money", href: "/hq/money" }],
        engine: "rules",
      }),
    ],
    [
      /\b(collect|revenue|earn|income|made|sales|cash|money)\b/i,
      () => ({
        answer: `Collected this month: ${money(m.collectedThisMonth)}. Last six months: ${m.months.map((x) => `${x.label} ${money(x.collected)}`).join(", ")}.`,
        links: [{ label: "Money", href: "/hq/money" }],
        engine: "rules",
      }),
    ],
    [
      /\b(linkedin|google|instagram|whatsapp|referral|source|channel|where.*leads|leads.*from)/i,
      () => {
        const named = growth.channels.find((c) => q.toLowerCase().includes(c.source)) ?? null;
        return {
          answer: growth.channels.length
            ? `${named ? `${sourceLabel(named.source)}: ${named.leads30} lead(s) in 30 days, ${named.leads90} in 90 days, ${named.won} won, ${money(named.revenue)} collected. ` : ""}All channels (90 days): ${growth.channels
                .map((c) => `${sourceLabel(c.source)} ${c.leads90}${c.won ? ` (${c.won} won)` : ""}`)
                .join(", ")}.`
            : "No leads in the last 90 days yet.",
          links: [{ label: "Growth", href: "/hq/growth" }],
          engine: "rules",
        };
      },
    ],
    [
      /\b(risk|unhappy|health|churn|worried)/i,
      () => {
        const risky = clients.filter((c) => c.health.band !== "healthy").sort((a, b) => a.health.score - b.health.score);
        return {
          answer: risky.length
            ? risky
                .slice(0, 5)
                .map((c) => `${c.org.name} is ${c.health.band} (${c.health.score}): ${c.health.reasons.join("; ")}`)
                .join(". ") + "."
            : "Every client looks healthy.",
          links: risky.slice(0, 5).map((c) => ({ label: c.org.name, href: `/hq/clients/${c.org.id}` })),
          engine: "rules",
        };
      },
    ],
    [
      /\b(pipeline|deal|forecast|win rate|proposal|close)/i,
      () => ({
        answer: `Open pipeline: ${money(pipeline.openValue)} (weighted ${money(pipeline.weightedValue)}). ${pipeline.stages
          .map((s) => `${s.deals.length} ${s.stage.replace("_", " ")}`)
          .join(", ")}. Win rate: ${pipeline.winRate == null ? "not enough closed deals yet" : `${pipeline.winRate}%`}. ${pipeline.followUpsDue.length} follow-up(s) due.`,
        links: [{ label: "Pipeline", href: "/hq/pipeline" }],
        engine: "rules",
      }),
    ],
  ];

  for (const [re, fn] of rules) if (re.test(q)) return fn();

  if (await canUseAi(db, "chief_of_staff")) {
    const [run] = await db
      .insert(agentRuns)
      .values({ role: "chief_of_staff", engine: "gemini", subjectType: "question", subjectId: actor.userId, input: { question: q }, triggeredBy: actor.userId })
      .returning();
    try {
      const { output, usage } = await generateJson(
        Answer,
        { type: "object", properties: { answer: { type: "string" } }, required: ["answer"] },
        `You answer the owner of AMFIRE's questions about their business, using only the snapshot in <data>. Be brief and specific, with numbers. If the snapshot doesn't contain the answer, say so. ${DATA_RULE}`,
        {
          question: q,
          money: { mrr: money(m.mrr), collected_this_month: money(m.collectedThisMonth), outstanding: money(m.outstanding), overdue_invoices: m.overdue.length, months: m.months.map((x) => ({ month: x.label, collected: money(x.collected) })) },
          pipeline: { open: money(pipeline.openValue), weighted: money(pipeline.weightedValue), win_rate: pipeline.winRate, stages: pipeline.stages.map((s) => ({ stage: s.stage, deals: s.deals.map((d) => d.lead.company) })) },
          clients: clients.map((c) => ({ name: c.org.name, health: c.health.score, reasons: c.health.reasons, paid: money(c.revenue), outstanding: money(c.outstanding) })),
          channels: growth.channels.map((c) => ({ source: sourceLabel(c.source), leads_30d: c.leads30, leads_90d: c.leads90, won: c.won })),
        },
      );
      await db
        .update(agentRuns)
        .set({ status: "succeeded", output, model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costMicroUsd: usage.costMicroUsd, finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
      return { answer: output.answer, links: [], engine: "gemini" };
    } catch (err) {
      await db
        .update(agentRuns)
        .set({ status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
    }
  }

  return {
    answer: `I can answer questions about money, who owes you, monthly plans, lead sources, client health and the pipeline. Try: “${ASK_EXAMPLES[0]}”. With a Gemini key set, I can answer anything else from the same records.`,
    links: [],
    engine: "rules",
  };
}
