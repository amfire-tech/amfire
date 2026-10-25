// The AI team. Seven roles watch one area each and share what they find
// through the Company Brain:
//   signals   — short facts any agent can read ("invoice overdue", "client quiet")
//   memories  — the dossier of facts about each lead and client
//   approvals — the owner's decision inbox, each with a ready-to-send draft
//
// Rules:
// - Agents observe with transparent rules, so they always work. Gemini, when
//   configured and within budget, only rewrites drafts in the owner's voice and
//   writes the brief's summary. It never sets prices, dates or statuses.
// - Agents never contact anyone. Everything outward goes through an approval.
// - Drafting internal records (a retainer invoice that is due) is allowed.

import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import {
  agentRuns,
  agentSettings,
  approvals,
  briefs,
  changeRequests,
  draftEdits,
  interactions,
  invoices,
  leads,
  memberships,
  memories,
  milestoneFeedback,
  milestones,
  organizations,
  payments,
  projects,
  projectUpdates,
  proposals,
  recommendations,
  signals,
  subscriptions,
  supportRequests,
  users,
  type ApprovalData,
  type BriefBody,
  type Lead,
} from "@/db/schema";
import { site } from "@/config/site";
import { formatMoney, STARTING_PRICE, isCurrency, PRICING_CURRENCY } from "@/knowledge/pricing";
import { sourceLabel } from "@/lib/attribution";
import { healthScore } from "../crm";
import { draftDueRetainerInvoices, isOverdue, mrr } from "../money";
import { projectProgress } from "../projects";
import { canUseAi, DATA_RULE, generateJson, type LlmUsage } from "./llm";

export const TEAM = [
  {
    role: "chief_of_staff",
    name: "Chief of Staff",
    job: "Reads what every other agent found, merges messages to the same person into one, and writes your daily brief.",
  },
  { role: "sales", name: "Sales", job: "Watches new leads, follow-up dates and proposals waiting for a decision. Drafts follow-ups." },
  { role: "deal_desk", name: "Deal Desk", job: "Spots qualified leads without a proposal, stale drafts and change requests that need a price." },
  { role: "delivery", name: "Delivery", job: "Watches milestones: overdue, blocked or waiting on the client. Drafts nudges and the weekly client update." },
  { role: "client_success", name: "Client Success", job: "Scores each client's health, notices quiet clients and suggests the monthly plan after a project ends." },
  { role: "finance", name: "Finance", job: "Drafts invoices for monthly plans, asks you to send drafts, and drafts reminders for overdue payments." },
  { role: "growth", name: "Growth", job: "Reports which channels bring leads and drafts LinkedIn posts from finished work." },
] as const;

export type Role = (typeof TEAM)[number]["role"];

const DAY = 24 * 60 * 60 * 1000;

// --- What agents see -----------------------------------------------------------------

export async function loadWorld(db: DB, now = new Date()) {
  const since = new Date(now.getTime() - 60 * DAY);
  const [
    ls,
    props,
    recs,
    orgs,
    ps,
    ms,
    invs,
    pays,
    subs,
    ints,
    reqs,
    crs,
    fb,
    ups,
    facts,
    owner,
  ] = await Promise.all([
    db.select().from(leads),
    db.select().from(proposals).orderBy(desc(proposals.createdAt)),
    db.select().from(recommendations).orderBy(desc(recommendations.createdAt)),
    db.select().from(organizations).where(eq(organizations.kind, "client")),
    db.select().from(projects),
    db.select().from(milestones),
    db.select().from(invoices),
    db.select().from(payments).where(gte(payments.receivedAt, since)),
    db.select().from(subscriptions),
    db.select().from(interactions).where(gte(interactions.occurredAt, since)).orderBy(desc(interactions.occurredAt)),
    db.select().from(supportRequests).where(eq(supportRequests.status, "open")),
    db.select().from(changeRequests),
    db.select().from(milestoneFeedback),
    db.select().from(projectUpdates).orderBy(desc(projectUpdates.createdAt)),
    db.select().from(memories).where(isNull(memories.supersededBy)),
    db
      .select({ name: users.name })
      .from(users)
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .where(eq(memberships.role, "owner"))
      .limit(1),
  ]);
  return {
    now,
    leads: ls,
    proposals: props,
    recommendations: recs,
    orgs,
    projects: ps,
    milestones: ms,
    invoices: invs,
    payments: pays,
    subscriptions: subs,
    interactions: ints,
    openRequests: reqs,
    changeRequests: crs,
    feedback: fb,
    updates: ups,
    facts,
    ownerFirstName: (owner[0]?.name ?? "AMFIRE").split(" ")[0],
  };
}

export type World = Awaited<ReturnType<typeof loadWorld>>;

export type SignalDraft = {
  kind: string;
  severity: "info" | "warn" | "critical";
  subjectType: string;
  subjectId: string;
  orgId?: string | null;
  leadId?: string | null;
  summary: string;
  data?: Record<string, unknown>;
};

export type ApprovalDraft = {
  kind: string;
  subjectType: string;
  subjectId: string;
  orgId?: string | null;
  leadId?: string | null;
  title: string;
  reason: string;
  channel: "whatsapp" | "email" | "hub" | "linkedin" | "internal";
  recipientName?: string | null;
  recipient?: string | null;
  draft: string;
  fingerprint: string;
  data?: ApprovalData;
};

export type AgentOutput = { signals: SignalDraft[]; approvals: ApprovalDraft[] };

// --- Helpers ---------------------------------------------------------------------------

const days = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY);
const first = (name: string) => name.trim().split(/\s+/)[0] || name;
const shorten = (text: string, max = 90) => {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
};

/** Year and ISO week, e.g. "2026-W43", so a suggestion is made at most once a week. */
export function weekKey(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / DAY + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** The person to message about a client: the lead it came from. */
function contactFor(w: World, orgId: string) {
  return w.leads.find((l) => l.clientOrgId === orgId) ?? null;
}

/** WhatsApp if there's a phone number, else email, else nothing to send. */
function channelFor(lead: Pick<Lead, "phone" | "email"> | null): { channel: "whatsapp" | "email"; recipient: string } | null {
  if (lead?.phone) return { channel: "whatsapp", recipient: lead.phone };
  if (lead?.email) return { channel: "email", recipient: lead.email };
  return null;
}

function lastTouch(w: World, lead: Lead) {
  const times = [
    lead.createdAt,
    ...w.interactions.filter((i) => i.leadId === lead.id || (lead.clientOrgId && i.orgId === lead.clientOrgId)).map((i) => i.occurredAt),
  ];
  return new Date(Math.max(...times.map((t) => +t)));
}

const hub = (path = "") => `${site.url}/hub${path}`;

/** "— Navanish, AMFIRE", or just "— AMFIRE" while the owner's name is the default. */
function signatureFor(ownerFirstName: string) {
  return ownerFirstName.toUpperCase() === "AMFIRE" ? "\n\n— AMFIRE" : `\n\n— ${ownerFirstName}, AMFIRE`;
}

// --- The agents -------------------------------------------------------------------------

export function sales(w: World): AgentOutput {
  const out: AgentOutput = { signals: [], approvals: [] };
  const sign = signatureFor(w.ownerFirstName);

  for (const lead of w.leads) {
    const open = ["new", "qualified", "proposal_sent"].includes(lead.status);
    if (!open) continue;
    const to = channelFor(lead);

    if (lead.status === "new" && !lead.reviewedAt && days(lead.createdAt, w.now) >= 1) {
      out.signals.push({
        kind: "lead_waiting",
        severity: "warn",
        subjectType: "lead",
        subjectId: lead.id,
        leadId: lead.id,
        summary: `${lead.company} (${sourceLabel(lead.source)}) has waited ${days(lead.createdAt, w.now)} day(s) for a reply.`,
      });
      if (to) {
        out.approvals.push({
          kind: "follow_up",
          subjectType: "lead",
          subjectId: lead.id,
          leadId: lead.id,
          title: `Book the free demo with ${lead.company}`,
          reason: `New ${sourceLabel(lead.source)} lead from ${days(lead.createdAt, w.now)} day(s) ago, not contacted yet. Fast replies win more deals.`,
          channel: to.channel,
          recipientName: lead.name,
          recipient: to.recipient,
          draft: `Hi ${first(lead.name)}, thanks for getting in touch with AMFIRE about ${shorten(lead.problem, 70).toLowerCase()}. Could we do a free 30-minute call this week to understand it better? Which day and time suits you?${sign}`,
          fingerprint: `book_demo:${lead.id}`,
          data: { point: "book a short call about what you need" },
        });
      }
    }

    if (lead.nextFollowUpAt && lead.nextFollowUpAt <= w.now && to) {
      const proposal = w.proposals.find((p) => p.leadId === lead.id);
      out.approvals.push({
        kind: "follow_up",
        subjectType: "lead",
        subjectId: lead.id,
        leadId: lead.id,
        title: `Follow up with ${lead.company}`,
        reason: `You set a follow-up for ${lead.nextFollowUpAt.toLocaleDateString("en-IN")}.`,
        channel: to.channel,
        recipientName: lead.name,
        recipient: to.recipient,
        draft:
          lead.status === "proposal_sent" && proposal
            ? `Hi ${first(lead.name)}, following up on the proposal I sent. Is there anything you'd like me to explain or change? It's in your Client Hub: ${hub(`/proposals/${proposal.id}`)}${sign}`
            : `Hi ${first(lead.name)}, following up from our last conversation. Is now a good time to take the next step on ${lead.company}'s plan? Happy to jump on a quick call.${sign}`,
        fingerprint: `follow_up:${lead.id}:${lead.nextFollowUpAt.toISOString().slice(0, 10)}`,
        data: { point: "check in on our last conversation" },
      });
    }

    const quiet = days(lastTouch(w, lead), w.now);
    if (lead.status !== "new" && quiet >= 14) {
      out.signals.push({
        kind: "deal_going_cold",
        severity: "warn",
        subjectType: "lead",
        subjectId: lead.id,
        leadId: lead.id,
        orgId: lead.clientOrgId,
        summary: `No contact with ${lead.company} for ${quiet} days.`,
      });
    }
  }

  for (const p of w.proposals.filter((p) => p.status === "sent" && p.sentAt && days(p.sentAt, w.now) >= 4)) {
    const lead = w.leads.find((l) => l.id === p.leadId);
    if (!lead) continue;
    out.signals.push({
      kind: "proposal_waiting",
      severity: "warn",
      subjectType: "proposal",
      subjectId: p.id,
      leadId: lead.id,
      orgId: p.clientOrgId,
      summary: `${lead.company} hasn't decided on “${p.title}” after ${days(p.sentAt!, w.now)} days.`,
    });
    const to = channelFor(lead);
    if (to && !(lead.nextFollowUpAt && lead.nextFollowUpAt <= w.now)) {
      out.approvals.push({
        kind: "follow_up",
        subjectType: "proposal",
        subjectId: p.id,
        leadId: lead.id,
        orgId: p.clientOrgId,
        title: `Nudge ${lead.company} about their proposal`,
        reason: `The proposal was sent ${days(p.sentAt!, w.now)} days ago with no decision yet.`,
        channel: to.channel,
        recipientName: lead.name,
        recipient: to.recipient,
        draft: `Hi ${first(lead.name)}, just checking whether you've had a chance to look at the proposal I sent. It's in your Client Hub: ${hub(`/proposals/${p.id}`)}. Happy to walk you through it on a short call, or adjust anything.${sign}`,
        fingerprint: `proposal_nudge:${p.id}:${weekKey(w.now)}`,
        data: { point: "look at the proposal in your Client Hub" },
      });
    }
  }
  return out;
}

export function dealDesk(w: World): AgentOutput {
  const out: AgentOutput = { signals: [], approvals: [] };
  for (const lead of w.leads.filter((l) => l.status === "qualified")) {
    const hasProposal = w.proposals.some((p) => p.leadId === lead.id);
    const rec = w.recommendations.find((r) => r.leadId === lead.id && r.status !== "rejected");
    if (!hasProposal && rec && lead.reviewedAt && days(lead.reviewedAt, w.now) >= 2) {
      out.signals.push({
        kind: "proposal_not_drafted",
        severity: "warn",
        subjectType: "lead",
        subjectId: lead.id,
        leadId: lead.id,
        summary: `${lead.company} was qualified ${days(lead.reviewedAt, w.now)} days ago but has no proposal yet.`,
        data: { href: `/hq/leads/${lead.id}` },
      });
    }
  }
  for (const p of w.proposals.filter((p) => p.status === "draft" && days(p.updatedAt, w.now) >= 2)) {
    out.signals.push({
      kind: "stale_draft",
      severity: "info",
      subjectType: "proposal",
      subjectId: p.id,
      leadId: p.leadId,
      summary: `Proposal draft “${p.title}” hasn't been touched for ${days(p.updatedAt, w.now)} days.`,
      data: { href: `/hq/proposals/${p.id}` },
    });
  }
  for (const c of w.changeRequests.filter((c) => c.status === "submitted")) {
    out.signals.push({
      kind: "change_needs_estimate",
      severity: "warn",
      subjectType: "change_request",
      subjectId: c.id,
      orgId: c.orgId,
      summary: `A client asked for a change and is waiting for a price: “${shorten(c.description, 80)}”`,
      data: { href: `/hq/projects/${c.projectId}` },
    });
  }
  return out;
}

export function delivery(w: World): AgentOutput {
  const out: AgentOutput = { signals: [], approvals: [] };
  const sign = signatureFor(w.ownerFirstName);
  for (const project of w.projects.filter((p) => p.status === "active")) {
    const ms = w.milestones.filter((m) => m.projectId === project.id).sort((a, b) => a.position - b.position);
    const contact = contactFor(w, project.orgId);

    for (const m of ms) {
      if (m.dueDate && m.dueDate < w.now && ["not_started", "in_progress", "blocked"].includes(m.status)) {
        out.signals.push({
          kind: "milestone_overdue",
          severity: days(m.dueDate, w.now) > 7 ? "critical" : "warn",
          subjectType: "milestone",
          subjectId: m.id,
          orgId: project.orgId,
          summary: `${project.name}: “${m.title}” is ${days(m.dueDate, w.now)} day(s) past its date.`,
          data: { href: `/hq/projects/${project.id}` },
        });
      }
      if (m.status === "blocked") {
        out.signals.push({
          kind: "milestone_blocked",
          severity: "warn",
          subjectType: "milestone",
          subjectId: m.id,
          orgId: project.orgId,
          summary: `${project.name}: “${m.title}” is blocked — ${m.blockerNote ?? "no reason given"}.`,
          data: { href: `/hq/projects/${project.id}` },
        });
      }
      if (m.status === "awaiting_approval" && m.readyAt && days(m.readyAt, w.now) >= 3) {
        out.signals.push({
          kind: "waiting_on_client",
          severity: "warn",
          subjectType: "milestone",
          subjectId: m.id,
          orgId: project.orgId,
          summary: `${project.name}: “${m.title}” has waited ${days(m.readyAt, w.now)} days for the client's approval.`,
        });
        const to = channelFor(contact);
        if (to && contact) {
          out.approvals.push({
            kind: "client_nudge",
            subjectType: "milestone",
            subjectId: m.id,
            orgId: project.orgId,
            leadId: contact.id,
            title: `Ask ${contact.company} to review “${m.title}”`,
            reason: `Ready for their approval ${days(m.readyAt, w.now)} days ago. The next milestone (and its invoice) waits on it.`,
            channel: to.channel,
            recipientName: contact.name,
            recipient: to.recipient,
            draft: `Hi ${first(contact.name)}, “${m.title}” is ready for your review in the Client Hub: ${hub(`/projects/${project.id}`)}. Once you approve it we'll move on to the next step.${sign}`,
            fingerprint: `approval_nudge:${m.id}:${weekKey(w.now)}`,
            data: { point: `review and approve “${m.title}” in the Client Hub`, projectId: project.id },
          });
        }
      }
    }

    // A weekly update keeps clients calm; draft one if a week has passed without.
    const lastUpdate = w.updates.find((u) => u.projectId === project.id);
    if (days(lastUpdate?.createdAt ?? project.startedAt, w.now) >= 6) {
      const progress = projectProgress(ms);
      const doneThisWeek = ms.filter((m) => m.completedAt && days(m.completedAt, w.now) < 7);
      const next = ms.filter((m) => m.status !== "done" && m.id !== progress.current?.id)[0];
      const lines = [
        doneThisWeek.length ? `Completed this week: ${doneThisWeek.map((m) => m.title).join(", ")}.` : `Progress: ${progress.done} of ${progress.total} milestones approved.`,
        progress.current ? `Now working on: ${progress.current.title}${progress.current.dueDate ? ` (planned for ${progress.current.dueDate.toLocaleDateString("en-IN")})` : ""}.` : null,
        next ? `Next: ${next.title}.` : null,
        progress.awaitingApproval.length ? `Waiting for you: please review ${progress.awaitingApproval.map((m) => `“${m.title}”`).join(", ")} in the Hub.` : null,
        progress.blocked.length ? `Blocked: ${progress.blocked.map((m) => `${m.title} — ${m.blockerNote}`).join("; ")}.` : null,
      ].filter(Boolean);
      out.approvals.push({
        kind: "weekly_update",
        subjectType: "project",
        subjectId: project.id,
        orgId: project.orgId,
        title: `Weekly update for ${project.name}`,
        reason: lastUpdate ? `Last update was ${days(lastUpdate.createdAt, w.now)} days ago.` : "No update posted yet.",
        channel: "hub",
        recipientName: contact?.name ?? null,
        draft: lines.join("\n"),
        fingerprint: `weekly:${project.id}:${weekKey(w.now)}`,
        data: { projectId: project.id },
      });
    }
  }
  return out;
}

export function clientSuccess(w: World): AgentOutput {
  const out: AgentOutput = { signals: [], approvals: [] };
  const sign = signatureFor(w.ownerFirstName);
  for (const org of w.orgs) {
    const ps = w.projects.filter((p) => p.orgId === org.id);
    const subs = w.subscriptions.filter((s) => s.orgId === org.id);
    const active = ps.some((p) => p.status === "active") || subs.some((s) => s.status === "active");
    if (ps.length === 0 && subs.length === 0) continue;
    const contact = contactFor(w, org.id);
    const contacts = [
      ...w.interactions.filter((i) => i.orgId === org.id || (contact && i.leadId === contact.id)).map((i) => i.occurredAt),
      ...w.updates.filter((u) => u.orgId === org.id).map((u) => u.createdAt),
    ];
    const last = contacts.length ? new Date(Math.max(...contacts.map((d) => +d))) : null;
    const ms = w.milestones.filter((m) => m.orgId === org.id);
    const health = healthScore(
      {
        invoices: w.invoices.filter((i) => i.orgId === org.id),
        milestones: ms,
        openRequestAges: w.openRequests.filter((r) => r.orgId === org.id).map((r) => days(r.createdAt, w.now)),
        lastContactDays: last ? days(last, w.now) : null,
        awaitingApprovalDays: ms.filter((m) => m.status === "awaiting_approval" && m.readyAt).map((m) => days(m.readyAt!, w.now)),
        ratings: w.feedback.filter((f) => f.orgId === org.id).map((f) => f.rating),
        hasActiveWork: active,
      },
      w.now,
    );
    if (health.band !== "healthy") {
      out.signals.push({
        kind: "client_health",
        severity: health.band === "at risk" ? "critical" : "warn",
        subjectType: "organization",
        subjectId: org.id,
        orgId: org.id,
        summary: `${org.name} is ${health.band} (${health.score}): ${health.reasons.join("; ")}.`,
        data: { href: `/hq/clients/${org.id}`, score: health.score },
      });
    }

    const to = channelFor(contact);
    if (active && contact && to && (!last || days(last, w.now) >= 21)) {
      out.approvals.push({
        kind: "check_in",
        subjectType: "organization",
        subjectId: org.id,
        orgId: org.id,
        leadId: contact.id,
        title: `Check in with ${org.name}`,
        reason: last ? `No conversation for ${days(last, w.now)} days.` : "No conversation logged yet.",
        channel: to.channel,
        recipientName: contact.name,
        recipient: to.recipient,
        draft: `Hi ${first(contact.name)}, checking in from AMFIRE. How is everything working for your team so far? Anything you'd like us to change or add?${sign}`,
        fingerprint: `check_in:${org.id}:${weekKey(w.now)}`,
        data: { point: "tell us how everything is working for your team" },
      });
    }

    const finished = ps.find((p) => p.status === "completed");
    const hasPlan = subs.some((s) => s.status === "active");
    if (finished && !hasPlan && contact && to) {
      const currency = isCurrency(finished.currency) ? finished.currency : PRICING_CURRENCY;
      out.approvals.push({
        kind: "upsell",
        subjectType: "organization",
        subjectId: org.id,
        orgId: org.id,
        leadId: contact.id,
        title: `Offer ${org.name} a monthly plan`,
        reason: `${finished.name} is complete and they have no monthly plan, so nobody looks after it now.`,
        channel: to.channel,
        recipientName: contact.name,
        recipient: to.recipient,
        draft: `Hi ${first(contact.name)}, now that your new system is live, would it help if we looked after it every month? Updates, backups, fixes and small improvements, with one person to call. Our Operate plan starts at ${formatMoney(STARTING_PRICE.operate[currency], currency)} a month.${sign}`,
        fingerprint: `upsell:${org.id}:${finished.id}`,
      });
    }
  }
  return out;
}

export function finance(w: World): AgentOutput {
  const out: AgentOutput = { signals: [], approvals: [] };
  const sign = signatureFor(w.ownerFirstName);
  const orgName = (id: string) => w.orgs.find((o) => o.id === id)?.name ?? "a client";
  for (const inv of w.invoices) {
    if (inv.status === "draft") {
      out.approvals.push({
        kind: "send_invoice",
        subjectType: "invoice",
        subjectId: inv.id,
        orgId: inv.orgId,
        title: `Send invoice ${inv.number} to ${orgName(inv.orgId)}`,
        reason: `${inv.title}: ${formatMoney(inv.total, inv.currency)} including GST. Approving sends it to their Client Hub, due in 7 days.`,
        channel: "internal",
        draft: `${inv.number} · ${inv.title} · ${formatMoney(inv.total, inv.currency)}`,
        fingerprint: `send_invoice:${inv.id}`,
        data: { invoiceId: inv.id, href: `/hq/money/invoices/${inv.id}` },
      });
    }
    if (isOverdue(inv, w.now)) {
      const late = days(inv.dueAt!, w.now);
      out.signals.push({
        kind: "payment_overdue",
        severity: late > 14 ? "critical" : "warn",
        subjectType: "invoice",
        subjectId: inv.id,
        orgId: inv.orgId,
        summary: `${orgName(inv.orgId)} owes ${formatMoney(inv.total, inv.currency)} on ${inv.number}, ${late} day(s) late.`,
        data: { href: `/hq/money/invoices/${inv.id}` },
      });
      const contact = contactFor(w, inv.orgId);
      const to = channelFor(contact);
      if (contact && to) {
        out.approvals.push({
          kind: "payment_reminder",
          subjectType: "invoice",
          subjectId: inv.id,
          orgId: inv.orgId,
          leadId: contact.id,
          title: `Remind ${orgName(inv.orgId)} about ${inv.number}`,
          reason: `${formatMoney(inv.total, inv.currency)} was due ${late} day(s) ago.`,
          channel: to.channel,
          recipientName: contact.name,
          recipient: to.recipient,
          draft: `Hi ${first(contact.name)}, a gentle reminder that invoice ${inv.number} for ${formatMoney(inv.total, inv.currency)} was due on ${inv.dueAt!.toLocaleDateString("en-IN")}. You can see it and pay by UPI here: ${hub(`/invoices/${inv.id}`)}. If it's already paid, please share the reference and I'll update it.${sign}`,
          fingerprint: `pay_reminder:${inv.id}:${Math.floor(late / 7)}`,
          data: { point: `settle invoice ${inv.number} (${formatMoney(inv.total, inv.currency)})`, invoiceId: inv.id },
        });
      }
    } else if (inv.status === "sent" && inv.dueAt && inv.dueAt.getTime() - w.now.getTime() < 2 * DAY) {
      out.signals.push({
        kind: "payment_due_soon",
        severity: "info",
        subjectType: "invoice",
        subjectId: inv.id,
        orgId: inv.orgId,
        summary: `${inv.number} (${formatMoney(inv.total, inv.currency)}) from ${orgName(inv.orgId)} is due ${inv.dueAt.toLocaleDateString("en-IN")}.`,
      });
    }
  }
  return out;
}

export function growth(w: World): AgentOutput {
  const out: AgentOutput = { signals: [], approvals: [] };
  const recent = w.leads.filter((l) => days(l.createdAt, w.now) < 30);
  if (recent.length) {
    const bySource = new Map<string, { total: number; won: number }>();
    for (const l of recent) {
      const s = bySource.get(l.source) ?? { total: 0, won: 0 };
      s.total += 1;
      if (l.status === "won") s.won += 1;
      bySource.set(l.source, s);
    }
    const ranked = [...bySource.entries()].sort((a, b) => b[1].total - a[1].total);
    out.signals.push({
      kind: "lead_sources",
      severity: "info",
      subjectType: "company",
      subjectId: "00000000-0000-0000-0000-000000000000",
      summary: `Last 30 days: ${recent.length} lead(s) — ${ranked.map(([s, v]) => `${sourceLabel(s)} ${v.total}${v.won ? ` (${v.won} won)` : ""}`).join(", ")}.`,
    });
  }

  // One post per project a week, about its latest finished milestone.
  const latestDone = new Map<string, (typeof w.milestones)[number]>();
  for (const m of w.milestones) {
    if (m.status !== "done" || !m.completedAt || days(m.completedAt, w.now) >= 7) continue;
    const prev = latestDone.get(m.projectId);
    if (!prev || m.completedAt > prev.completedAt! || (+m.completedAt === +prev.completedAt! && m.position > prev.position)) latestDone.set(m.projectId, m);
  }
  for (const m of latestDone.values()) {
    const project = w.projects.find((p) => p.id === m.projectId);
    const lead = project ? contactFor(w, project.orgId) : null;
    const rating = w.feedback.find((f) => f.milestoneId === m.id)?.rating;
    if (!project || (rating != null && rating < 4)) continue;
    const kind = lead?.businessType && lead.businessType !== "Something else" ? lead.businessType.toLowerCase() : "growing";
    out.approvals.push({
      kind: "linkedin_post",
      subjectType: "milestone",
      subjectId: m.id,
      orgId: project.orgId,
      title: `LinkedIn post: “${m.title}” delivered`,
      reason: "Finished work is the best proof. The draft doesn't name the client; ask them before you do.",
      channel: "linkedin",
      draft: `We just delivered “${m.title}” for a ${kind} business in India.\n\n${m.description ? `${shorten(m.description, 240)}\n\n` : ""}Small, focused software that removes daily friction is often worth more than a big system nobody uses.\n\nIf your team spends hours on work a computer could do, book a free 30-minute demo: ${site.url}/start?utm_source=linkedin&utm_medium=social&utm_campaign=delivery_post`,
      fingerprint: `post:${project.id}:${weekKey(w.now)}`,
    });
  }
  return out;
}

const AGENTS: Record<Exclude<Role, "chief_of_staff">, (w: World) => AgentOutput> = {
  sales,
  deal_desk: dealDesk,
  delivery,
  client_success: clientSuccess,
  finance,
  growth,
};

// --- Chief of Staff: merging and the brief ---------------------------------------------------

const MESSAGE_CHANNELS = ["whatsapp", "email"];

/**
 * Several agents may want to message the same person. Instead of three
 * messages, the Chief of Staff makes one that covers every point.
 */
export function mergeMessages(pending: (ApprovalDraft & { id: string; role: string })[], ownerFirstName: string) {
  const groups = new Map<string, typeof pending>();
  for (const a of pending) {
    if (!MESSAGE_CHANNELS.includes(a.channel) || !a.recipient || !a.data?.point) continue;
    const key = a.recipient.replace(/\s/g, "").toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  const merges: { members: typeof pending; draft: ApprovalDraft }[] = [];
  for (const members of groups.values()) {
    if (members.length < 2 || new Set(members.map((m) => m.role)).size < 2) continue;
    const lead = members[0];
    const points = members.map((m) => m.data!.point!);
    merges.push({
      members,
      draft: {
        kind: "combined_message",
        subjectType: lead.subjectType,
        subjectId: lead.subjectId,
        orgId: lead.orgId,
        leadId: lead.leadId,
        title: `One message to ${lead.recipientName ?? "this client"} instead of ${members.length}`,
        reason: `${members.map((m) => m.role.replace(/_/g, " ")).join(", ")} each wanted to contact them: ${members.map((m) => m.title.toLowerCase()).join("; ")}.`,
        channel: lead.channel,
        recipientName: lead.recipientName,
        recipient: lead.recipient,
        draft: `Hi ${first(lead.recipientName ?? "there")}, a quick note from AMFIRE with a few things together:\n${points.map((p) => `• Could you ${p}?`).join("\n")}\n\nIf it's easier, we can cover all of it on a 10-minute call this week.${signatureFor(ownerFirstName)}`,
        fingerprint: `combined:${members
          .map((m) => m.id)
          .sort()
          .join(",")}`,
      },
    });
  }
  return merges;
}

export function composeBrief(w: World, sigs: SignalDraft[], pending: { title: string; kind: string }[], activity: string[]): Omit<BriefBody, "narrative"> & { headline: string } {
  const dayAgo = new Date(w.now.getTime() - DAY);
  const collected = w.payments
    .filter((p) => p.receivedAt >= dayAgo)
    .reduce<Record<string, number>>((acc, p) => {
      const cur = w.invoices.find((i) => i.id === p.invoiceId)?.currency ?? "INR";
      acc[cur] = (acc[cur] ?? 0) + p.amount;
      return acc;
    }, {});
  const overdue = w.invoices.filter((i) => isOverdue(i, w.now));
  const overdueTotal = overdue.reduce<Record<string, number>>((acc, i) => ((acc[i.currency] = (acc[i.currency] ?? 0) + i.total), acc), {});
  const money = (r: Record<string, number>) => Object.entries(r).map(([c, v]) => formatMoney(v, c)).join(" + ") || formatMoney(0);
  const newLeads = w.leads.filter((l) => l.createdAt >= dayAgo);
  const pick = (kinds: string[]) => sigs.filter((s) => kinds.includes(s.kind));

  const sections: BriefBody["sections"] = [
    {
      title: "Money",
      lines: [
        { text: `Collected in the last 24 hours: ${money(collected)}.` },
        { text: `Monthly recurring: ${money(mrr(w.subscriptions))}.` },
        overdue.length ? { text: `Overdue: ${money(overdueTotal)} across ${overdue.length} invoice(s).`, href: "/hq/money" } : { text: "Nothing overdue." },
      ],
    },
    {
      title: "Pipeline",
      lines: [
        newLeads.length
          ? { text: `New leads: ${newLeads.map((l) => `${l.company} (${sourceLabel(l.source)})`).join(", ")}.`, href: "/hq/leads" }
          : { text: "No new leads in the last 24 hours." },
        ...pick(["proposal_waiting", "deal_going_cold", "proposal_not_drafted"]).slice(0, 4).map((s) => ({ text: s.summary, href: s.leadId ? `/hq/leads/${s.leadId}` : undefined })),
      ],
    },
    {
      title: "Delivery and clients",
      lines: pick(["milestone_overdue", "milestone_blocked", "waiting_on_client", "client_health", "change_needs_estimate"])
        .sort((a, b) => (a.severity === "critical" ? -1 : 0) - (b.severity === "critical" ? -1 : 0))
        .slice(0, 6)
        .map((s) => ({ text: s.summary, href: typeof s.data?.href === "string" ? s.data.href : undefined })),
    },
  ];
  if (sections[2].lines.length === 0) sections[2].lines.push({ text: "All projects are on track." });

  const headline = [
    pending.length ? `${pending.length} decision${pending.length === 1 ? "" : "s"} waiting` : null,
    overdue.length ? `${money(overdueTotal)} overdue` : null,
    newLeads.length ? `${newLeads.length} new lead${newLeads.length === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return { headline: headline || "All quiet — nothing needs you today.", sections, teamActivity: activity };
}

const Narrative = z.object({ narrative: z.string().max(600) });

async function writeNarrative(db: DB, brief: ReturnType<typeof composeBrief>): Promise<{ text: string; usage: LlmUsage } | null> {
  if (!(await canUseAi(db, "chief_of_staff"))) return null;
  const { output, usage } = await generateJson(
    Narrative,
    { type: "object", properties: { narrative: { type: "string" } }, required: ["narrative"] },
    `You are the Chief of Staff of AMFIRE, a one-person technology company in India. Write a 2–3 sentence summary of today's brief for the owner: what matters most and what to do first. Plain, warm, direct. Use only facts in the data; no new numbers. ${DATA_RULE}`,
    brief,
  );
  return { text: output.narrative, usage };
}

// --- Voice: Gemini rewrites drafts the way the owner writes -----------------------------------

const Rewrites = z.object({ drafts: z.array(z.object({ i: z.number().int(), text: z.string().min(1).max(2000) })) });

async function rewriteInOwnersVoice(db: DB, role: string, drafts: ApprovalDraft[], w: World) {
  const messages = drafts.map((d, i) => ({ d, i })).filter(({ d }) => MESSAGE_CHANNELS.includes(d.channel) || d.channel === "linkedin");
  if (messages.length === 0 || !(await canUseAi(db, role))) return null;
  const edits = await db.select().from(draftEdits).orderBy(desc(draftEdits.createdAt)).limit(6);
  const factsFor = (d: ApprovalDraft) =>
    w.facts.filter((f) => (d.leadId && f.subjectType === "lead" && f.subjectId === d.leadId) || (d.orgId && f.subjectType === "organization" && f.subjectId === d.orgId)).map((f) => f.fact);
  const { output, usage } = await generateJson(
    Rewrites,
    {
      type: "object",
      properties: { drafts: { type: "array", items: { type: "object", properties: { i: { type: "integer" }, text: { type: "string" } }, required: ["i", "text"] } } },
      required: ["drafts"],
    },
    `You rewrite short business messages for ${w.ownerFirstName}, who runs AMFIRE, a technology partner for Indian businesses. Keep each message's purpose, links, amounts and dates exactly. Use the facts about the recipient (language, tone, who decides) when they help. Match the owner's style shown in "owner_edits" (original → how the owner changed it). WhatsApp messages: short, friendly, no subject line. Never add promises, prices, discounts or dates that aren't in the draft. ${DATA_RULE}`,
    {
      owner_edits: edits.map((e) => ({ original: e.original, edited: e.edited })),
      drafts: messages.map(({ d, i }) => ({ i, channel: d.channel, recipient: d.recipientName, purpose: d.title, facts: factsFor(d), draft: d.draft })),
    },
  );
  for (const r of output.drafts) if (drafts[r.i]) drafts[r.i] = { ...drafts[r.i], draft: r.text };
  return usage;
}

// --- Running the team -------------------------------------------------------------------------

export async function teamSettings(db: DB) {
  const rows = await db.select().from(agentSettings);
  return TEAM.map((t) => ({ ...t, enabled: rows.find((r) => r.role === t.role)?.enabled ?? true, dailyBudgetMicroUsd: rows.find((r) => r.role === t.role)?.dailyBudgetMicroUsd ?? 200_000 }));
}

/**
 * One full pass of the team: each agent observes and drafts, the Chief of
 * Staff merges and writes the brief. Safe to run any number of times —
 * suggestions are deduplicated by fingerprint.
 */
export async function runTeam(db: DB, opts: { triggeredBy?: string | null; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const settings = await teamSettings(db);
  const enabled = (role: Role) => settings.find((s) => s.role === role)?.enabled ?? true;

  const [teamRun] = await db
    .insert(agentRuns)
    .values({
      role: "chief_of_staff",
      engine: "rules",
      subjectType: "company",
      subjectId: "00000000-0000-0000-0000-000000000000",
      input: { trigger: opts.triggeredBy ? "manual" : "schedule" },
      triggeredBy: opts.triggeredBy ?? null,
    })
    .returning();

  try {
    // Finance may draft invoices for monthly plans that are due — an internal record, so it acts.
    const retainerDrafts = enabled("finance") ? await draftDueRetainerInvoices(db, now) : [];
    const w = await loadWorld(db, now);
    const allSignals: SignalDraft[] = [];
    const activity: string[] = [];
    if (retainerDrafts.length) activity.push(`Finance drafted ${retainerDrafts.length} monthly plan invoice(s).`);

    for (const [role, agent] of Object.entries(AGENTS) as [Exclude<Role, "chief_of_staff">, (w: World) => AgentOutput][]) {
      if (!enabled(role)) continue;
      const [run] = await db
        .insert(agentRuns)
        .values({ role, engine: "rules", subjectType: "company", subjectId: teamRun.id, input: { teamRunId: teamRun.id }, triggeredBy: opts.triggeredBy ?? null })
        .returning();
      try {
        const output = agent(w);
        // Only new suggestions are rewritten; ones already in the inbox keep their text.
        const existing = output.approvals.length
          ? await db.select({ fingerprint: approvals.fingerprint }).from(approvals).where(inArray(approvals.fingerprint, output.approvals.map((a) => a.fingerprint)))
          : [];
        const fresh = output.approvals.filter((a) => !existing.some((e) => e.fingerprint === a.fingerprint));
        let usage: LlmUsage | null = null;
        try {
          usage = await rewriteInOwnersVoice(db, role, fresh, w);
        } catch {
          // Templates are fine; the run records that AI wasn't used.
        }
        if (output.signals.length) {
          await db.insert(signals).values(
            output.signals.map((s) => ({
              teamRunId: teamRun.id,
              role,
              kind: s.kind,
              severity: s.severity,
              subjectType: s.subjectType,
              subjectId: s.subjectId,
              orgId: s.orgId ?? null,
              leadId: s.leadId ?? null,
              summary: s.summary,
              data: s.data ?? null,
            })),
          );
        }
        if (fresh.length) {
          await db
            .insert(approvals)
            .values(fresh.map((a) => ({ ...a, role, orgId: a.orgId ?? null, leadId: a.leadId ?? null, data: a.data ?? {}, teamRunId: teamRun.id })))
            .onConflictDoNothing({ target: approvals.fingerprint });
        }
        allSignals.push(...output.signals);
        const team = TEAM.find((t) => t.role === role)!;
        const kinds = [fresh.length ? `drafted ${fresh.length} suggestion(s)` : null, output.signals.length ? `flagged ${output.signals.length} item(s)` : null].filter(Boolean);
        if (kinds.length) activity.push(`${team.name} ${kinds.join(" and ")}.`);
        await db
          .update(agentRuns)
          .set({
            status: "succeeded",
            engine: usage ? "gemini" : "rules",
            model: usage?.model ?? null,
            inputTokens: usage?.inputTokens ?? null,
            outputTokens: usage?.outputTokens ?? null,
            costMicroUsd: usage?.costMicroUsd ?? null,
            output: { signals: output.signals.length, approvals: fresh.length },
            finishedAt: new Date(),
          })
          .where(eq(agentRuns.id, run.id));
      } catch (err) {
        await db
          .update(agentRuns)
          .set({ status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
          .where(eq(agentRuns.id, run.id));
      }
    }

    // Chief of Staff: one message per person.
    const pendingRows = await db.select().from(approvals).where(eq(approvals.status, "pending"));
    const merges = mergeMessages(
      pendingRows.map((a) => ({ ...a, channel: a.channel as ApprovalDraft["channel"], data: a.data })),
      w.ownerFirstName,
    );
    for (const m of merges) {
      const [combined] = await db
        .insert(approvals)
        .values({ ...m.draft, role: "chief_of_staff", orgId: m.draft.orgId ?? null, leadId: m.draft.leadId ?? null, data: {}, teamRunId: teamRun.id })
        .onConflictDoNothing({ target: approvals.fingerprint })
        .returning();
      if (combined) {
        await db
          .update(approvals)
          .set({ status: "merged", mergedInto: combined.id })
          .where(inArray(approvals.id, m.members.map((x) => x.id)));
      }
    }
    if (merges.length) activity.push(`Chief of Staff combined ${merges.reduce((s, m) => s + m.members.length, 0)} messages into ${merges.length}.`);

    const pending = await db.select({ title: approvals.title, kind: approvals.kind }).from(approvals).where(eq(approvals.status, "pending"));
    const brief = composeBrief(w, allSignals, pending, activity);
    let narrative: Awaited<ReturnType<typeof writeNarrative>> = null;
    try {
      narrative = await writeNarrative(db, brief);
    } catch {
      narrative = null;
    }
    const [saved] = await db
      .insert(briefs)
      .values({ teamRunId: teamRun.id, headline: brief.headline, body: { sections: brief.sections, teamActivity: brief.teamActivity, narrative: narrative?.text } })
      .returning();
    await db
      .update(agentRuns)
      .set({
        status: "succeeded",
        engine: narrative ? "gemini" : "rules",
        model: narrative?.usage.model ?? null,
        inputTokens: narrative?.usage.inputTokens ?? null,
        outputTokens: narrative?.usage.outputTokens ?? null,
        costMicroUsd: narrative?.usage.costMicroUsd ?? null,
        output: { briefId: saved.id, signals: allSignals.length, pending: pending.length, merged: merges.length },
        finishedAt: new Date(),
      })
      .where(eq(agentRuns.id, teamRun.id));
    return { brief: saved, signals: allSignals.length, pending: pending.length };
  } catch (err) {
    await db
      .update(agentRuns)
      .set({ status: "failed", error: err instanceof Error ? err.message : String(err), finishedAt: new Date() })
      .where(eq(agentRuns.id, teamRun.id));
    throw err;
  }
}

/** Latest brief and the signals from the same run. */
export async function latestBrief(db: DB) {
  const [brief] = await db.select().from(briefs).orderBy(desc(briefs.createdAt)).limit(1);
  if (!brief) return null;
  const sigs = await db.select().from(signals).where(eq(signals.teamRunId, brief.teamRunId));
  return { brief, signals: sigs };
}

/** The signals each agent posted in the latest run, for the AI team page. */
export async function latestSignals(db: DB) {
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.role, "chief_of_staff"), eq(agentRuns.subjectType, "company"), eq(agentRuns.status, "succeeded")))
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);
  if (!run) return { run: null, signals: [] };
  return { run, signals: await db.select().from(signals).where(eq(signals.teamRunId, run.id)) };
}
