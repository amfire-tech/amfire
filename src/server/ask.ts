// Ask HQ: plain-language questions about the business. Gemini answers every
// question from a snapshot of all the business records — leads, clients,
// projects, invoices, payments, conversations, the dossier — and cites the
// records it used, which become links. Without Gemini (no key, budget spent
// or an error) a small set of rules answers the most common questions.

import { desc, eq, gte, isNull } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  agentRuns,
  approvals,
  changeRequests,
  contentPosts,
  interactions,
  invoices,
  leads,
  memories,
  milestoneFeedback,
  milestones,
  payments,
  projects,
  proposals,
  subscriptions,
  timeEntries,
} from "@/db/schema";
import { formatMoney } from "@/knowledge/pricing";
import { sourceLabel } from "@/lib/attribution";
import { assertStaff, type Actor } from "./access";
import { canUseAi, DATA_RULE, generateJson } from "./agents/llm";
import { getPipeline, listClients } from "./crm";
import { getGrowth } from "./growth";
import { getMoneyOverview, isOverdue } from "./money";
import { proposalTotal } from "./proposals";

export type AskTurn = { q: string; a: string };
export type AskAnswer = { answer: string; links: { label: string; href: string }[]; engine: "rules" | "gemini"; note?: string };

export const AskHistory = z
  .array(z.object({ q: z.string().max(500), a: z.string().max(3000) }))
  .max(4)
  .catch([]);

const money = (r: Record<string, number>) => Object.entries(r).map(([c, v]) => formatMoney(v, c)).join(" + ") || formatMoney(0);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const clip = (s: string | null | undefined, n: number) => (s ? (s.length > n ? `${s.slice(0, n - 1)}…` : s) : null);

export const ASK_EXAMPLES = [
  "How much did we collect this month?",
  "Who owes us money and since when?",
  "Is LinkedIn bringing leads that turn into clients?",
  "Which client needs my attention most, and why?",
  "What should I do first today?",
  "What did we earn per hour on our last project?",
];

/**
 * Every business record the owner might ask about, with short references
 * (L3, C1, I7…) the model cites instead of database ids.
 */
async function businessSnapshot(db: DB, actor: Actor, now: Date) {
  const since = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
  const [ls, props, ps, ms, invs, pays, subs, ints, facts, crs, fb, posts, time, inbox, moneyView, pipeline, clients, growth] = await Promise.all([
    db.select().from(leads).orderBy(desc(leads.createdAt)).limit(300),
    db.select().from(proposals).orderBy(desc(proposals.createdAt)),
    db.select().from(projects).orderBy(desc(projects.startedAt)),
    db.select().from(milestones),
    db.select().from(invoices).orderBy(desc(invoices.createdAt)).limit(300),
    db.select().from(payments).orderBy(desc(payments.receivedAt)).limit(300),
    db.select().from(subscriptions),
    db.select().from(interactions).where(gte(interactions.occurredAt, since)).orderBy(desc(interactions.occurredAt)).limit(120),
    db.select().from(memories).where(isNull(memories.supersededBy)),
    db.select().from(changeRequests),
    db.select().from(milestoneFeedback),
    db.select().from(contentPosts),
    db.select().from(timeEntries),
    db.select({ title: approvals.title, role: approvals.role }).from(approvals).where(eq(approvals.status, "pending")),
    getMoneyOverview(db, actor, now),
    getPipeline(db, actor),
    listClients(db, actor, now),
    getGrowth(db, actor, now),
  ]);

  const refs = new Map<string, { label: string; href: string }>();
  const ref = (prefix: string, label: string, href: string) => {
    const key = `${prefix}${refs.size + 1}`;
    refs.set(key, { label, href });
    return key;
  };
  const clientRef = new Map(clients.map((c) => [c.org.id, ref("C", c.org.name, `/hq/clients/${c.org.id}`)]));
  const leadRef = new Map(ls.map((l) => [l.id, ref("L", l.company, `/hq/leads/${l.id}`)]));
  const projectRef = new Map(ps.map((p) => [p.id, ref("P", p.name, `/hq/projects/${p.id}`)]));
  const invoiceRef = new Map(invs.map((i) => [i.id, ref("I", i.number, `/hq/money/invoices/${i.id}`)]));

  const data = {
    today: day(now),
    currency_note: "Amounts are already formatted with their currency.",
    summary: {
      monthly_recurring_revenue: money(moneyView.mrr),
      collected_this_month: money(moneyView.collectedThisMonth),
      collected_by_month: moneyView.months.map((m) => ({ month: m.label, collected: money(m.collected) })),
      outstanding: money(moneyView.outstanding),
      overdue_invoices: moneyView.overdue.length,
      open_pipeline: money(pipeline.openValue),
      weighted_pipeline: money(pipeline.weightedValue),
      win_rate_percent: pipeline.winRate,
      follow_ups_due: pipeline.followUpsDue.length,
      decisions_waiting_in_inbox: inbox.map((a) => `${a.title} (${a.role.replace(/_/g, " ")})`),
    },
    channels_last_90_days: growth.channels.map((c) => ({ source: sourceLabel(c.source), leads_30d: c.leads30, leads_90d: c.leads90, won: c.won, collected: money(c.revenue) })),
    clients: clients.map((c) => ({
      ref: clientRef.get(c.org.id),
      name: c.org.name,
      health: `${c.health.score} (${c.health.band})`,
      health_reasons: c.health.reasons,
      paid_to_date: money(c.revenue),
      outstanding: money(c.outstanding),
      monthly_plan: money(c.mrr),
      active_projects: c.activeProjects,
      completed_projects: c.completedProjects,
      last_contact: day(c.lastContact),
    })),
    leads: ls.map((l) => {
      const p = props.find((x) => x.leadId === l.id);
      return {
        ref: leadRef.get(l.id),
        company: l.company,
        contact: l.name,
        status: l.status,
        source: sourceLabel(l.source),
        source_note: l.sourceNote,
        campaign: l.utmCampaign,
        received: day(l.createdAt),
        score: l.qualificationScore,
        deal_value: l.dealValue != null ? formatMoney(l.dealValue, l.currency) : p ? formatMoney(proposalTotal(p), p.currency) : null,
        next_follow_up: day(l.nextFollowUpAt),
        need: clip(l.problem, 220),
        proposal: p ? { title: p.title, status: p.status, total: formatMoney(proposalTotal(p), p.currency), sent: day(p.sentAt), decided: day(p.decidedAt) } : null,
        client: l.clientOrgId ? clientRef.get(l.clientOrgId) : null,
      };
    }),
    projects: ps.map((p) => {
      const pm = ms.filter((m) => m.projectId === p.id).sort((a, b) => a.position - b.position);
      const minutes = time.filter((t) => t.projectId === p.id).reduce((s, t) => s + t.minutes, 0);
      return {
        ref: projectRef.get(p.id),
        client: clientRef.get(p.orgId),
        name: p.name,
        status: p.status,
        started: day(p.startedAt),
        hours_logged: Math.round(minutes / 6) / 10,
        milestones: pm.map((m) => ({
          title: m.title,
          status: m.status,
          planned: day(m.dueDate),
          completed: day(m.completedAt),
          amount: formatMoney(m.amount, p.currency),
          blocker: m.blockerNote,
          ready_for_approval_since: day(m.readyAt),
        })),
      };
    }),
    invoices: invs.map((i) => ({
      ref: invoiceRef.get(i.id),
      number: i.number,
      client: clientRef.get(i.orgId),
      project: i.projectId ? projectRef.get(i.projectId) : null,
      title: i.title,
      total: formatMoney(i.total, i.currency),
      gst: i.tax ? formatMoney(i.tax, i.currency) : null,
      status: isOverdue(i, now) ? "overdue" : i.status,
      issued: day(i.issuedAt),
      due: day(i.dueAt),
      paid_on: day(i.paidAt),
      record_of_past_payment: i.isRecord || undefined,
    })),
    payments: pays.map((p) => ({ invoice: invoiceRef.get(p.invoiceId), amount: formatMoney(p.amount, invs.find((i) => i.id === p.invoiceId)?.currency ?? "INR"), method: p.method, date: day(p.receivedAt) })),
    monthly_plans: subs.map((s) => ({ client: clientRef.get(s.orgId), title: s.title, per_month: formatMoney(s.amount, s.currency), status: s.status, next_invoice: day(s.nextInvoiceAt) })),
    conversations: ints.map((i) => ({
      date: day(i.occurredAt),
      with: i.orgId ? clientRef.get(i.orgId) : i.leadId ? leadRef.get(i.leadId) : null,
      channel: i.kind,
      direction: i.direction,
      summary: clip(i.summary, 240),
    })),
    dossier: facts.map((f) => ({
      about: f.subjectType === "organization" ? clientRef.get(f.subjectId) : leadRef.get(f.subjectId),
      fact: f.fact,
      source: f.source,
    })),
    change_requests: crs.map((c) => ({ client: clientRef.get(c.orgId), project: projectRef.get(c.projectId), description: clip(c.description, 200), status: c.status, asked: day(c.createdAt) })),
    ratings: fb.map((f) => ({ client: clientRef.get(f.orgId), project: projectRef.get(f.projectId), rating: f.rating, comment: f.comment, date: day(f.createdAt) })),
    linkedin_posts: growth.posts.map((p) => ({ title: p.post.title, clicks: p.post.clicks, leads: p.leads, won: p.won, published: day(p.post.publishedAt) })),
    posts_total: posts.length,
  };
  return { data, refs };
}

const AiAnswer = z.object({
  answer: z.string().min(1).max(3000),
  refs: z.array(z.string()).max(12).catch([]),
});

const SYSTEM = `You are the analyst inside amfire HQ. amfire is a one-person technology company in India (Build, Operate, Automate services). The owner asks you questions about the business; answer from the records in <data>.

How to answer:
- Lead with the direct answer, then the few facts that support it. Use short lines or bullets, no headings. Under 180 words unless the question needs a list.
- Be exact: add amounts yourself carefully, say how many days something has waited (today is in the data), and name clients and invoice numbers.
- When asked what to do, give a clear, prioritised recommendation and why.
- If the records don't contain the answer, say what's missing instead of guessing. Never invent numbers, clients or dates.
- In "refs", list the refs (like C1, L4, P2, I3) of the records you relied on, most important first.
${DATA_RULE}`;

export async function askHq(db: DB, actor: Actor | null, question: string, history: AskTurn[] = [], now = new Date()): Promise<AskAnswer> {
  assertStaff(actor);
  const q = z.string().trim().min(3, "Type a question.").max(500).parse(question);

  if (await canUseAi(db, "ask_hq")) {
    const [run] = await db
      .insert(agentRuns)
      .values({ role: "ask_hq", engine: "gemini", subjectType: "question", subjectId: actor.userId, input: { question: q }, triggeredBy: actor.userId })
      .returning();
    try {
      const { data, refs } = await businessSnapshot(db, actor, now);
      const { output, usage } = await generateJson(
        AiAnswer,
        {
          type: "object",
          properties: { answer: { type: "string" }, refs: { type: "array", items: { type: "string" } } },
          required: ["answer", "refs"],
        },
        SYSTEM,
        { question: q, earlier_in_this_conversation: AskHistory.parse(history), records: data },
      );
      await db
        .update(agentRuns)
        .set({ status: "succeeded", output, model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, costMicroUsd: usage.costMicroUsd, finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
      const links = [...new Set(output.refs)].flatMap((r) => (refs.has(r) ? [refs.get(r)!] : [])).slice(0, 8);
      // References the model wrote inline (e.g. "(C2)") read better as plain text.
      const answer = output.answer.replace(/\s*\((?:[CLPI]\d+(?:,\s*)?)+\)/g, "").replace(/\b([CLPI])(\d+)\b/g, (m) => refs.get(m)?.label ?? m);
      return { answer, links, engine: "gemini" };
    } catch (err) {
      await db
        .update(agentRuns)
        .set({ status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
        .where(eq(agentRuns.id, run.id));
      const fallback = await answerWithRules(db, actor, q, now);
      return { ...fallback, note: "amfire AI didn't answer this time, so this comes from the built-in rules." };
    }
  }

  const fallback = await answerWithRules(db, actor, q, now);
  return { ...fallback, note: "amfire AI isn't available right now (or today's budget is used), so this comes from the built-in rules." };
}

/** The fallback: answers the most common questions without AI. */
async function answerWithRules(db: DB, actor: Actor, q: string, now: Date): Promise<AskAnswer> {
  const [m, pipeline, clients, growth] = await Promise.all([getMoneyOverview(db, actor, now), getPipeline(db, actor), listClients(db, actor, now), getGrowth(db, actor, now)]);
  const rules: [RegExp, () => Omit<AskAnswer, "engine">][] = [
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
        };
      },
    ],
    [
      /\b(mrr|recurring|retainer|monthly plan|subscription)/i,
      () => ({
        answer: `Monthly recurring revenue is ${money(m.mrr)} from ${m.subscriptions.filter((s) => s.subscription.status === "active").length} active plan(s).`,
        links: [{ label: "Money", href: "/hq/money" }],
      }),
    ],
    [
      /\b(collect|revenue|earn|income|made|sales|cash|money)\b/i,
      () => ({
        answer: `Collected this month: ${money(m.collectedThisMonth)}. Last six months: ${m.months.map((x) => `${x.label} ${money(x.collected)}`).join(", ")}.`,
        links: [{ label: "Money", href: "/hq/money" }],
      }),
    ],
    [
      /\b(linkedin|google|instagram|whatsapp|referral|source|channel|where.*leads|leads.*from)/i,
      () => ({
        answer: growth.channels.length
          ? `Leads by channel (90 days): ${growth.channels.map((c) => `${sourceLabel(c.source)} ${c.leads90}${c.won ? ` (${c.won} won)` : ""}`).join(", ")}.`
          : "No leads in the last 90 days yet.",
        links: [{ label: "Growth", href: "/hq/growth" }],
      }),
    ],
    [
      /\b(risk|unhappy|health|churn|worried|attention)/i,
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
        };
      },
    ],
    [
      /\b(pipeline|deal|forecast|win rate|proposal|close)/i,
      () => ({
        answer: `Open pipeline: ${money(pipeline.openValue)} (weighted ${money(pipeline.weightedValue)}). Win rate: ${pipeline.winRate == null ? "not enough closed deals yet" : `${pipeline.winRate}%`}. ${pipeline.followUpsDue.length} follow-up(s) due.`,
        links: [{ label: "Pipeline", href: "/hq/pipeline" }],
      }),
    ],
  ];
  for (const [re, fn] of rules) if (re.test(q)) return { ...fn(), engine: "rules" };
  return {
    answer: "Without amfire AI I can answer questions about money, who owes you, monthly plans, lead sources, client health and the pipeline.",
    links: [],
    engine: "rules",
  };
}
