// End-to-end test of the first build milestone, against a real (in-memory)
// PostgreSQL database:
// visitor → discovery → qualified lead → recommendation → human-reviewed
// proposal → project creation → client progress page.
// Also checks the permission and isolation rules along the way.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import type * as z from "zod";
import { openPglite, type DB } from "@/db";
import { agentRuns, memberships, organizations, users } from "@/db/schema";
import { AccessDenied, loadActor, type Actor } from "@/server/access";
import { runSolutionArchitect } from "@/server/agents/solution-architect";
import { consumeLoginToken, createLoginToken, findSessionUser } from "@/server/auth";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { DEMO_OFFER, priceBand, priceFloor, type ProjectSize } from "@/knowledge/pricing";
import { decideQualification, demoOfferCode, getLeadDetail, submitDiscovery, type DiscoverySchema } from "@/server/leads";
import {
  approveAndSendProposal,
  clientDecideProposal,
  createProposalDraft,
  getClientProposal,
  ProposalError,
  proposalSubtotal,
  proposalTotal,
  updateProposalDraft,
} from "@/server/proposals";
import {
  clientApproveMilestone,
  createSupportRequest,
  getClientHome,
  getClientProject,
  updateMilestone,
} from "@/server/projects";

let db: DB;
let owner: Actor;
let staff: Actor;

async function actorFor(email: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email));
  return loadActor(db, u);
}

const answers = (overrides: Partial<z.input<typeof DiscoverySchema>> = {}): z.input<typeof DiscoverySchema> => ({
  goal: "reduce-manual-work",
  businessType: "Manufacturing",
  phone: "98765 43210",
  callTime: "morning",
  urgency: "month",
  teamSize: "11-50",
  problem: "Our team re-types every customer order from email into our stock spreadsheet and the accounting system.",
  currentTools: "Outlook, Excel, Xero",
  name: "Sam Rivera",
  email: "sam@acme-parts.test",
  company: "Acme Parts",
  consent: true,
  ...overrides,
});

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  owner = await actorFor(DEFAULT_OWNER_EMAIL);
  // A staff member who may draft but not approve commercial commitments.
  const [internal] = await db.select().from(organizations).where(eq(organizations.kind, "internal"));
  const [s] = await db.insert(users).values({ email: "staff@amfire.local", name: "Staff" }).returning();
  await db.insert(memberships).values({ userId: s.id, orgId: internal.id, role: "staff" });
  staff = await loadActor(db, s);
});

describe("first milestone path", () => {
  let leadId: string;
  let proposalId: string;
  let projectId: string;
  let client: Actor;

  test("bootstrap creates the owner", () => {
    assert.equal(owner.internalRole, "owner");
    assert.equal(staff.internalRole, "staff");
  });

  test("visitor completes discovery → lead with score and a proposed recommendation", async () => {
    const { lead, recommendation } = await submitDiscovery(db, answers());
    leadId = lead.id;
    assert.equal(lead.status, "new");
    assert.ok(lead.qualificationScore > 0);
    assert.equal(lead.nextAction, "Call to schedule the free demo, then qualify");
    assert.equal(lead.phone, "9876543210");
    assert.equal(lead.callTime, "morning");
    assert.ok(recommendation);
    assert.equal(recommendation.path, "automate");
    assert.equal(recommendation.status, "proposed");
    assert.ok(recommendation.assumptions.length > 0);
  });

  test("only staff can see lead records", async () => {
    await assert.rejects(getLeadDetail(db, null, leadId), AccessDenied);
    const detail = await getLeadDetail(db, staff, leadId);
    assert.equal(detail?.runs[0].status, "succeeded");
    assert.equal(detail?.runs[0].engine, "rules");
  });

  test("staff qualify the lead and draft a proposal priced by the rules", async () => {
    await decideQualification(db, staff, leadId, "qualified");
    const detail = await getLeadDetail(db, staff, leadId);
    const draft = await createProposalDraft(db, staff, detail!.recommendations[0].id);
    proposalId = draft.id;
    assert.equal(draft.status, "draft");
    assert.ok(draft.milestones.length >= 2);
    assert.ok(draft.milestones.every((m) => m.amount > 0));
    // Everyone who booked a free demo gets the free-demo offer, with their booking's code.
    const lead = detail!.lead;
    assert.equal(draft.currency, "INR");
    assert.equal(draft.discount, DEMO_OFFER.amount.INR);
    assert.equal(draft.discountNote, `Free-demo offer · ${demoOfferCode(lead.publicRef)}`);
    assert.equal(proposalTotal(draft), proposalSubtotal(draft) - DEMO_OFFER.amount.INR);
    assert.ok(draft.terms.includes(DEMO_OFFER.terms("INR")));
  });

  test("a visitor who chose US dollars gets a proposal priced in dollars; staff can override", async () => {
    const { lead } = await submitDiscovery(db, answers({ email: "jo@harbour-goods.test", company: "Harbour Goods", currency: "USD" }));
    assert.equal(lead.currency, "USD");
    await decideQualification(db, staff, lead.id, "qualified");
    const detail = await getLeadDetail(db, staff, lead.id);
    const rec = detail!.recommendations[0];

    const usd = await createProposalDraft(db, staff, rec.id);
    assert.equal(usd.currency, "USD");
    assert.equal(usd.discount, DEMO_OFFER.amount.USD);
    assert.ok(usd.terms.includes(DEMO_OFFER.terms("USD")));
    assert.ok(proposalSubtotal(usd) >= priceFloor(rec.path, rec.size as ProjectSize, "USD"));
    assert.ok(proposalSubtotal(usd) <= priceBand(rec.path, rec.size as ProjectSize, "USD").high);

    const inr = await createProposalDraft(db, staff, rec.id, { currency: "INR" });
    assert.equal(inr.currency, "INR");
    assert.equal(inr.discount, DEMO_OFFER.amount.INR);
  });

  test("clients cannot see drafts; staff cannot approve; owner must justify below-guideline pricing", async () => {
    await assert.rejects(approveAndSendProposal(db, staff, proposalId), AccessDenied);

    const detail = await getLeadDetail(db, staff, leadId);
    const draft = detail!.proposals[0];
    await updateProposalDraft(db, staff, proposalId, {
      ...draft,
      milestones: draft.milestones.map((m) => ({ ...m, amount: 100 })),
    });
    await assert.rejects(
      approveAndSendProposal(db, owner, proposalId),
      (err: unknown) => err instanceof ProposalError && err.code === "PRICING_BELOW_GUIDELINE",
    );
    // Restore guideline pricing.
    await updateProposalDraft(db, staff, proposalId, draft);
  });

  test("owner approves and sends → client organisation and Hub access are created", async () => {
    const { proposal, clientEmail } = await approveAndSendProposal(db, owner, proposalId);
    assert.equal(proposal.status, "sent");
    assert.equal(clientEmail, "sam@acme-parts.test");
    client = await actorFor("sam@acme-parts.test");
    assert.equal(client.internalRole, null);
    assert.equal(client.clientOrgIds.length, 1);
    assert.ok(await getClientProposal(db, client, proposalId));
    await assert.rejects(updateProposalDraft(db, staff, proposalId, proposal), ProposalError);
  });

  test("another client organisation cannot see or act on it", async () => {
    const other = await submitDiscovery(db, answers({ email: "jo@other.test", company: "Other Co", name: "Jo" }));
    await decideQualification(db, staff, other.lead.id, "qualified");
    const d = await createProposalDraft(db, staff, other.recommendation!.id);
    await approveAndSendProposal(db, owner, d.id);
    const otherClient = await actorFor("jo@other.test");

    assert.equal(await getClientProposal(db, otherClient, proposalId), null);
    await assert.rejects(clientDecideProposal(db, otherClient, proposalId, { accept: true }), AccessDenied);
    const home = await getClientHome(db, otherClient);
    assert.ok(home.proposals.every((p) => p.id !== proposalId));
  });

  test("client accepts → project and milestones created from the agreed proposal", async () => {
    const { project } = await clientDecideProposal(db, client, proposalId, { accept: true });
    assert.ok(project);
    assert.equal(project.currency, "INR");
    projectId = project.id;
    const view = await getClientProject(db, client, projectId);
    assert.ok(view);
    assert.equal(view.progress.percent, 0);
    assert.equal(view.progress.total, view.milestones.length);
    await assert.rejects(clientDecideProposal(db, client, proposalId, { accept: true }), ProposalError);
  });

  test("progress only moves with real milestone records and client approval", async () => {
    const view = await getClientProject(db, client, projectId);
    const first = view!.milestones[0];

    // Blockers must be explained to the client.
    await assert.rejects(updateMilestone(db, staff, first.id, { status: "blocked" }));
    await updateMilestone(db, staff, first.id, { status: "blocked", blockerNote: "Waiting for read access to Xero." });
    let v = await getClientProject(db, client, projectId);
    assert.equal(v!.progress.blocked[0].blockerNote, "Waiting for read access to Xero.");

    // Clients can only approve what is awaiting approval.
    await assert.rejects(clientApproveMilestone(db, client, first.id));
    await updateMilestone(db, staff, first.id, { status: "awaiting_approval" });

    const outsider = await actorFor("jo@other.test");
    await assert.rejects(clientApproveMilestone(db, outsider, first.id), AccessDenied);
    assert.equal(await getClientProject(db, outsider, projectId), null);

    await clientApproveMilestone(db, client, first.id);
    v = await getClientProject(db, client, projectId);
    assert.equal(v!.progress.done, 1);
    assert.ok(v!.progress.percent > 0);
    await assert.rejects(updateMilestone(db, staff, first.id, { status: "in_progress" }));
  });

  test("clients can always reach a person, only within their own organisation", async () => {
    const outsider = await actorFor("jo@other.test");
    await assert.rejects(
      createSupportRequest(db, outsider, client.clientOrgIds[0], projectId, { subject: "Hello", body: "Let me in" }),
      AccessDenied,
    );
    await assert.rejects(
      createSupportRequest(db, outsider, outsider.clientOrgIds[0], projectId, { subject: "Hello", body: "Cross-org project" }),
      AccessDenied,
    );
    const r = await createSupportRequest(db, client, client.clientOrgIds[0], projectId, {
      subject: "Question about invoices",
      body: "Can we add our second warehouse?",
    });
    assert.equal(r.status, "open");
  });
});

describe("sign-in", () => {
  test("unknown emails get no token; tokens are single use", async () => {
    assert.equal(await createLoginToken(db, "nobody@example.test"), null);
    const token = await createLoginToken(db, ` ${DEFAULT_OWNER_EMAIL.toUpperCase()} `);
    assert.ok(token);
    const session = await consumeLoginToken(db, token);
    assert.ok(session);
    assert.equal((await findSessionUser(db, session.sessionToken))?.email, DEFAULT_OWNER_EMAIL);
    assert.equal(await consumeLoginToken(db, token), null);
    assert.equal(await findSessionUser(db, "forged"), null);
  });
});

describe("agent failures are recorded and recoverable", () => {
  test("a failed Gemini run is logged and falls back to the rules engine", async () => {
    const prev = { key: process.env.GEMINI_API_KEY, url: process.env.GEMINI_BASE_URL };
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_BASE_URL = "http://127.0.0.1:9"; // nothing listens here
    try {
      const { lead } = await submitDiscovery(db, answers({ email: "fail@agent.test", goal: "not-sure" }));
      const rec = await runSolutionArchitect(db, lead, { engine: "gemini" });
      assert.equal(rec.status, "proposed");
      const runs = await db.select().from(agentRuns).where(eq(agentRuns.subjectId, lead.id));
      assert.ok(runs.some((r) => r.engine === "gemini" && r.status === "failed" && r.error));
      assert.ok(runs.some((r) => r.engine === "rules" && r.status === "succeeded"));
    } finally {
      process.env.GEMINI_API_KEY = prev.key;
      process.env.GEMINI_BASE_URL = prev.url;
      if (prev.key === undefined) delete process.env.GEMINI_API_KEY;
      if (prev.url === undefined) delete process.env.GEMINI_BASE_URL;
    }
  });
});
