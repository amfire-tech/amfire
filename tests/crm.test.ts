// The CRM and the AI team, end to end against a real (in-memory) PostgreSQL:
// money from milestones and plans, the agents' suggestions, merging, approval
// effects, the client's own views and the rules that keep them isolated.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { approvals, draftEdits, interactions, invoices, leads, milestones, signals, subscriptions, users } from "@/db/schema";
import { AccessDenied, loadActor, type Actor } from "@/server/access";
import { runTeam, weekKey } from "@/server/agents/team";
import { askHq } from "@/server/ask";
import { approve, reject, whatsappLink } from "@/server/brain";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { getClientAccount, healthScore, logInteraction } from "@/server/crm";
import { askConcierge, createChangeRequest, decideChange, estimateChange, leaveFeedback } from "@/server/hub";
import { addManualLead, decideQualification, submitDiscovery } from "@/server/leads";
import {
  draftDueRetainerInvoices,
  getInvoiceForClient,
  getMoneyOverview,
  invoiceAmounts,
  MoneyError,
  recordPayment,
  sendInvoice,
} from "@/server/money";
import { clientApproveMilestone, updateMilestone } from "@/server/projects";
import { approveAndSendProposal, clientDecideProposal, createProposalDraft } from "@/server/proposals";

const DAY = 24 * 60 * 60 * 1000;

let db: DB;
let owner: Actor;

async function actorFor(email: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email));
  return loadActor(db, u);
}

/** A lead that has become a client with an accepted proposal and a project. */
async function wonClient(company: string, email: string, goal: "reduce-manual-work" | "keep-running" = "reduce-manual-work") {
  const { lead, recommendation } = await submitDiscovery(db, {
    goal,
    businessType: "Manufacturing",
    urgency: "month",
    teamSize: "11-50",
    problem: "We re-type every dealer order from WhatsApp into Tally and our stock sheet by hand.",
    name: `${company} Owner`,
    email,
    phone: "9876543210",
    company,
    consent: true,
  });
  await decideQualification(db, owner, lead.id, "qualified");
  const draft = await createProposalDraft(db, owner, recommendation!.id);
  await approveAndSendProposal(db, owner, draft.id);
  const client = await actorFor(email);
  const { project } = await clientDecideProposal(db, client, draft.id, { accept: true });
  return { lead, client, project: project!, orgId: client.clientOrgIds[0] };
}

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  owner = await actorFor(DEFAULT_OWNER_EMAIL);
});

describe("money", () => {
  let ctx: Awaited<ReturnType<typeof wonClient>>;
  let invoiceId: string;

  before(async () => {
    ctx = await wonClient("Acme Parts", "sam@acme.test");
  });

  test("GST is 18% on rupee invoices and nothing on dollar invoices", () => {
    assert.deepEqual(invoiceAmounts(100_000_00, "INR"), { subtotal: 100_000_00, taxRate: 1800, tax: 18_000_00, total: 118_000_00 });
    assert.equal(invoiceAmounts(1_000_00, "USD").tax, 0);
  });

  test("a client approving a milestone drafts its invoice, which they can't see yet", async () => {
    const [m] = await db.select().from(milestones).where(eq(milestones.projectId, ctx.project.id)).orderBy(milestones.position);
    await updateMilestone(db, owner, m.id, { status: "awaiting_approval" });
    await clientApproveMilestone(db, ctx.client, m.id);
    const [inv] = await db.select().from(invoices).where(eq(invoices.milestoneId, m.id));
    assert.equal(inv.status, "draft");
    assert.equal(inv.subtotal, m.amount);
    assert.match(inv.number, /^AMF-\d{4}-0001$/);
    invoiceId = inv.id;
    assert.equal(await getInvoiceForClient(db, ctx.client, inv.id), null);
  });

  test("only the owner sends; payments mark it paid; another client can't see it", async () => {
    const staffUser = (await db.insert(users).values({ email: "staff@amfire.local", name: "Staff" }).returning())[0];
    const staff = { ...(await loadActor(db, staffUser)), internalRole: "staff" as const };
    await assert.rejects(sendInvoice(db, staff, invoiceId), AccessDenied);
    await assert.rejects(recordPayment(db, owner, invoiceId, { amount: 10, method: "upi" }), MoneyError);

    const sent = await sendInvoice(db, owner, invoiceId);
    assert.equal(sent.status, "sent");
    assert.ok(sent.dueAt! > new Date());
    assert.ok(await getInvoiceForClient(db, ctx.client, invoiceId));

    const half = sent.total / 2 / 100;
    await recordPayment(db, owner, invoiceId, { amount: half, method: "upi", reference: "UTR1" });
    let [row] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    assert.equal(row.status, "sent");
    // The same reference twice (a repeated webhook) is ignored.
    const again = await recordPayment(db, null, invoiceId, { amount: half, method: "razorpay", reference: "UTR1" }, { system: true });
    assert.equal(again.duplicate, true);
    await recordPayment(db, owner, invoiceId, { amount: half, method: "bank_transfer", reference: "UTR2" });
    [row] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    assert.equal(row.status, "paid");

    const other = await wonClient("Other Co", "jo@other.test");
    assert.equal(await getInvoiceForClient(db, other.client, invoiceId), null);

    const overview = await getMoneyOverview(db, owner);
    assert.equal(overview.collectedThisMonth.INR, row.total);
  });

  test("an accepted Operate proposal starts a monthly plan, invoiced when due", async () => {
    const op = await wonClient("Shop Online", "ravi@shop.test", "keep-running");
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, op.orgId));
    assert.ok(sub, "plan created");
    assert.equal(sub.status, "active");
    const later = new Date(sub.nextInvoiceAt.getTime() + DAY);
    const drafted = await draftDueRetainerInvoices(db, later);
    assert.equal(drafted.filter((i) => i.subscriptionId === sub.id).length, 1);
    // Running again the same day doesn't draft it twice.
    assert.equal((await draftDueRetainerInvoices(db, later)).filter((i) => i.subscriptionId === sub.id).length, 0);
  });
});

describe("the AI team", () => {
  let ctx: Awaited<ReturnType<typeof wonClient>>;

  before(async () => {
    ctx = await wonClient("Sharma Auto", "amit@sharma.test");
  });

  test("a lead nobody has replied to gets a follow-up draft and a signal", async () => {
    const { lead } = await addManualLead(db, owner, {
      source: "linkedin",
      name: "Neha Gupta",
      company: "Gupta Textiles",
      email: "",
      phone: "98111 22333",
      problem: "Wants salesmen to take orders on a phone app instead of paper.",
    });
    await db.update(leads).set({ createdAt: new Date(Date.now() - 2 * DAY) }).where(eq(leads.id, lead.id));
    await runTeam(db, { triggeredBy: owner.userId });

    const [a] = await db.select().from(approvals).where(eq(approvals.fingerprint, `book_demo:${lead.id}`));
    assert.ok(a, "follow-up drafted");
    assert.equal(a.channel, "whatsapp");
    assert.match(a.draft, /Neha/);
    const sigs = await db.select().from(signals).where(eq(signals.leadId, lead.id));
    assert.ok(sigs.some((s) => s.kind === "lead_waiting"));

    // Running again doesn't duplicate it.
    await runTeam(db, { triggeredBy: owner.userId });
    const all = await db.select().from(approvals).where(eq(approvals.fingerprint, `book_demo:${lead.id}`));
    assert.equal(all.length, 1);
  });

  test("approving opens WhatsApp, logs the conversation and learns from the edit", async () => {
    const [a] = await db.select().from(approvals).where(eq(approvals.kind, "follow_up"));
    const edited = `${a.draft}\n(Hinglish ok)`;
    const result = await approve(db, owner, a.id, edited);
    assert.ok(result.link?.startsWith("https://wa.me/91"));
    const [done] = await db.select().from(approvals).where(eq(approvals.id, a.id));
    assert.equal(done.status, "approved");
    const logged = await db.select().from(interactions).where(eq(interactions.leadId, a.leadId!));
    assert.equal(logged[0].summary, edited);
    const edits = await db.select().from(draftEdits).where(eq(draftEdits.approvalId, a.id));
    assert.equal(edits.length, 1);
    await assert.rejects(approve(db, owner, a.id));
  });

  test("Finance asks to send drafts, and approving sends the invoice", async () => {
    const [m] = await db.select().from(milestones).where(eq(milestones.projectId, ctx.project.id)).orderBy(milestones.position);
    await updateMilestone(db, owner, m.id, { status: "awaiting_approval" });
    await clientApproveMilestone(db, ctx.client, m.id);
    await runTeam(db, { triggeredBy: owner.userId });
    const [inv] = await db.select().from(invoices).where(eq(invoices.milestoneId, m.id));
    const [a] = await db.select().from(approvals).where(eq(approvals.fingerprint, `send_invoice:${inv.id}`));
    assert.ok(a);
    await approve(db, owner, a.id);
    const [sent] = await db.select().from(invoices).where(eq(invoices.id, inv.id));
    assert.equal(sent.status, "sent");
  });

  test("three agents wanting to message one client become one message", async () => {
    // Overdue invoice (Finance), milestone waiting 5 days (Delivery), no contact for 3 weeks (Client Success).
    await db.update(invoices).set({ dueAt: new Date(Date.now() - 10 * DAY) }).where(eq(invoices.orgId, ctx.orgId));
    const ms = await db.select().from(milestones).where(eq(milestones.projectId, ctx.project.id)).orderBy(milestones.position);
    await updateMilestone(db, owner, ms[1].id, { status: "awaiting_approval" });
    await db.update(milestones).set({ readyAt: new Date(Date.now() - 5 * DAY) }).where(eq(milestones.id, ms[1].id));
    const now = new Date(Date.now() + 22 * DAY); // three weeks without a conversation
    await db.update(invoices).set({ dueAt: new Date(now.getTime() - 10 * DAY) }).where(eq(invoices.orgId, ctx.orgId));
    await db.update(milestones).set({ readyAt: new Date(now.getTime() - 5 * DAY) }).where(eq(milestones.id, ms[1].id));

    await runTeam(db, { triggeredBy: owner.userId, now });
    const rows = await db.select().from(approvals).where(eq(approvals.orgId, ctx.orgId));
    const combined = rows.find((r) => r.kind === "combined_message" && r.status === "pending");
    assert.ok(combined, "combined message drafted");
    const merged = rows.filter((r) => r.mergedInto === combined.id);
    assert.ok(merged.length >= 2);
    assert.ok(merged.every((r) => r.status === "merged"));
    assert.match(combined.draft, /settle invoice/);
    assert.match(combined.draft, /approve/);
    await reject(db, owner, combined.id);
  });

  test("the weekly update is drafted and posting it reaches the client's Hub", async () => {
    const [a] = await db.select().from(approvals).where(eq(approvals.kind, "weekly_update"));
    assert.ok(a);
    assert.match(a.fingerprint, new RegExp(`weekly:.*:\\d{4}-W\\d{2}`));
    const res = await approve(db, owner, a.id, `${a.draft}\nThanks for your patience!`);
    assert.match(res.note, /Hub/);
  });

  test("week keys follow ISO weeks", () => {
    assert.equal(weekKey(new Date(2026, 0, 1)), "2026-W01");
    assert.equal(weekKey(new Date(2026, 9, 25)), "2026-W43");
  });

  test("health score explains itself", () => {
    const h = healthScore({
      invoices: [{ status: "sent", dueAt: new Date(Date.now() - DAY) }],
      milestones: [{ status: "blocked" }],
      openRequestAges: [3],
      lastContactDays: 30,
      awaitingApprovalDays: [],
      ratings: [2],
      hasActiveWork: true,
    });
    assert.equal(h.score, 5);
    assert.equal(h.band, "at risk");
    assert.equal(h.reasons.length, 5);
  });

  test("WhatsApp links get the Indian country code", () => {
    assert.equal(whatsappLink("98765 43210", "hi"), "https://wa.me/919876543210?text=hi");
    assert.equal(whatsappLink("+1 415 555 0100", "hi"), "https://wa.me/14155550100?text=hi");
  });
});

describe("the client's side", () => {
  let ctx: Awaited<ReturnType<typeof wonClient>>;
  let stranger: Awaited<ReturnType<typeof wonClient>>;

  before(async () => {
    ctx = await wonClient("Mehta Foods", "riya@mehta.test");
    stranger = await wonClient("Stranger Ltd", "x@stranger.test");
  });

  test("the concierge answers from the client's own records, and only theirs", async () => {
    const a = await askConcierge(db, ctx.client, ctx.orgId, "When will it be ready?");
    assert.match(a.answer, /Mehta|%/);
    assert.equal(a.handedOff, false);
    await assert.rejects(askConcierge(db, stranger.client, ctx.orgId, "When will it be ready?"), AccessDenied);
    const unknown = await askConcierge(db, ctx.client, ctx.orgId, "Can you recommend a good accountant?");
    assert.equal(unknown.handedOff, true);
  });

  test("a change request is priced by staff and becomes a milestone when accepted", async () => {
    const cr = await createChangeRequest(db, ctx.client, ctx.project.id, { description: "Add a monthly sales report by salesperson." });
    await assert.rejects(createChangeRequest(db, stranger.client, ctx.project.id, { description: "Sneaky change request here." }), AccessDenied);
    await assert.rejects(estimateChange(db, ctx.client, cr.id, { amount: 1, weeks: 1 }), AccessDenied);
    await estimateChange(db, owner, cr.id, { amount: 12000, weeks: 2, note: "Includes PDF export" });
    await assert.rejects(decideChange(db, stranger.client, cr.id, true), AccessDenied);
    await decideChange(db, ctx.client, cr.id, true);
    const ms = await db.select().from(milestones).where(eq(milestones.projectId, ctx.project.id));
    const added = ms.find((m) => m.title.startsWith("Change:"));
    assert.equal(added?.amount, 12000_00);
  });

  test("feedback only after approval, once", async () => {
    const [m] = await db.select().from(milestones).where(eq(milestones.projectId, ctx.project.id)).orderBy(milestones.position);
    await assert.rejects(leaveFeedback(db, ctx.client, m.id, { rating: 5 }));
    await updateMilestone(db, owner, m.id, { status: "awaiting_approval" });
    await clientApproveMilestone(db, ctx.client, m.id);
    await leaveFeedback(db, ctx.client, m.id, { rating: 2, comment: "Slow replies" });
    await assert.rejects(leaveFeedback(db, ctx.client, m.id, { rating: 5 }));
    const account = await getClientAccount(db, owner, ctx.orgId);
    assert.ok(account!.health.reasons.some((r) => r.includes("rating")));
  });

  test("conversations and Ask HQ", async () => {
    await logInteraction(db, owner, { orgId: ctx.orgId }, { kind: "call", summary: "Discussed the report change" });
    await assert.rejects(logInteraction(db, ctx.client, { orgId: ctx.orgId }, { kind: "call", summary: "nope" }), AccessDenied);
    const a = await askHq(db, owner, "Who owes us money?");
    assert.equal(a.engine, "rules");
    const b = await askHq(db, owner, "Is LinkedIn bringing leads?");
    assert.match(b.answer, /LinkedIn/);
    await assert.rejects(askHq(db, ctx.client, "Who owes us money?"), AccessDenied);
  });
});
