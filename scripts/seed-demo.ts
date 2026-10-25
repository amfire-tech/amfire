// Fills the LOCAL development database with demo leads, clients, invoices and
// conversations, then runs the AI team once, so every HQ and Client Hub screen
// has something to show. Refuses to run against a real database.
//
//   Stop `npm run dev` first (the local database allows one process), then:
//   npm run seed:demo

import path from "node:path";
import { eq } from "drizzle-orm";
import { databaseUrl, openPglite } from "../src/db";
import {
  contentPosts,
  interactions,
  invoices,
  leads,
  memories,
  milestones,
  projectUpdates,
  proposals,
  subscriptions,
  timeEntries,
  users,
} from "../src/db/schema";
import { touchFromVisit } from "../src/lib/attribution";
import { loadActor, type Actor } from "../src/server/access";
import { runTeam } from "../src/server/agents/team";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "../src/server/bootstrap";
import { leaveFeedback } from "../src/server/hub";
import { addManualLead, decideQualification, submitDiscovery } from "../src/server/leads";
import { recordPayment, sendInvoice } from "../src/server/money";
import { clientApproveMilestone, updateMilestone } from "../src/server/projects";
import { approveAndSendProposal, clientDecideProposal, createProposalDraft } from "../src/server/proposals";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

async function main() {
  if (databaseUrl() || process.env.VERCEL) throw new Error("seed:demo only runs against the local development database.");
  const db = await openPglite(process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite"));
  await bootstrap(db);
  const [existing] = await db.select().from(leads).where(eq(leads.company, "Sharma Auto Parts"));
  if (existing) {
    console.log("Demo data is already there. Delete .data/pglite to start over.");
    return;
  }
  const [ownerUser] = await db.select().from(users).where(eq(users.email, process.env.OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL));
  const owner = await loadActor(db, ownerUser);
  const actor = async (email: string) => loadActor(db, (await db.select().from(users).where(eq(users.email, email)))[0]);

  /** A booked lead taken all the way to an accepted proposal. */
  async function client(opts: {
    company: string;
    name: string;
    email: string;
    phone: string;
    goal: "reduce-manual-work" | "keep-running" | "customer-portal";
    problem: string;
    source: string;
    daysAgo: number;
  }) {
    const medium = opts.source === "referral" ? "referral" : "social";
    const touch = touchFromVisit(new URL(`https://www.amfire.in/start?utm_source=${opts.source}&utm_medium=${medium}`), null, "www.amfire.in");
    const { lead, recommendation } = await submitDiscovery(
      db,
      {
        goal: opts.goal,
        businessType: "Manufacturing",
        urgency: "month",
        teamSize: "11-50",
        problem: opts.problem,
        name: opts.name,
        email: opts.email,
        phone: opts.phone,
        company: opts.company,
        consent: true,
      },
      { attribution: opts.source === "direct" ? null : touch },
    );
    await decideQualification(db, owner, lead.id, "qualified");
    const draft = await createProposalDraft(db, owner, recommendation!.id);
    await approveAndSendProposal(db, owner, draft.id);
    const c = await actor(opts.email);
    const { project } = await clientDecideProposal(db, c, draft.id, { accept: true });
    const started = ago(opts.daysAgo);
    await db.update(leads).set({ createdAt: started }).where(eq(leads.id, lead.id));
    await db.update(proposals).set({ sentAt: started, decidedAt: started }).where(eq(proposals.leadId, lead.id));
    await db.update(projectUpdates).set({ createdAt: started }).where(eq(projectUpdates.projectId, project!.id));
    const ms = await db.select().from(milestones).where(eq(milestones.projectId, project!.id)).orderBy(milestones.position);
    return { lead, client: c, project: project!, orgId: c.clientOrgIds[0], ms };
  }

  async function approveMilestone(c: Actor, id: string) {
    await updateMilestone(db, owner, id, { status: "awaiting_approval" });
    await clientApproveMilestone(db, c, id);
  }

  async function invoiceFor(milestoneId: string) {
    return (await db.select().from(invoices).where(eq(invoices.milestoneId, milestoneId)))[0];
  }

  // 1. Sharma Auto Parts: overdue invoice, work waiting for approval, quiet for three weeks.
  const sharma = await client({
    company: "Sharma Auto Parts",
    name: "Amit Sharma",
    email: "amit@sharma-auto.example",
    phone: "9876500001",
    goal: "reduce-manual-work",
    problem: "Dealers call all day asking whether parts are in stock and where their order is. We re-type orders from WhatsApp into Tally.",
    source: "linkedin",
    daysAgo: 45,
  });
  await approveMilestone(sharma.client, sharma.ms[0].id);
  const sharmaInv = await invoiceFor(sharma.ms[0].id);
  await sendInvoice(db, owner, sharmaInv.id, ago(18));
  await db.update(milestones).set({ completedAt: ago(18) }).where(eq(milestones.id, sharma.ms[0].id));
  await updateMilestone(db, owner, sharma.ms[1].id, { status: "awaiting_approval" });
  await db.update(milestones).set({ readyAt: ago(6) }).where(eq(milestones.id, sharma.ms[1].id));
  await db.update(projectUpdates).set({ createdAt: ago(24) }).where(eq(projectUpdates.projectId, sharma.project.id));
  await db.insert(interactions).values({ leadId: sharma.lead.id, orgId: sharma.orgId, kind: "call", direction: "out", summary: "Kick-off call. Amit wants dealers to check stock themselves.", occurredAt: ago(30), authorId: owner.userId });
  await db.insert(memories).values([
    { subjectType: "organization", subjectId: sharma.orgId, fact: "Amit's son Rohit decides on anything technical.", source: "owner", createdBy: owner.userId },
    { subjectType: "organization", subjectId: sharma.orgId, fact: "Prefers WhatsApp in Hinglish, after 7pm.", source: "owner", createdBy: owner.userId },
  ]);
  await db.insert(timeEntries).values([
    { projectId: sharma.project.id, orgId: sharma.orgId, userId: owner.userId, minutes: 14 * 60, note: "Order portal build", workedOn: ago(25) },
    { projectId: sharma.project.id, orgId: sharma.orgId, userId: owner.userId, minutes: 6 * 60, note: "Tally sync", workedOn: ago(10) },
  ]);

  // 2. Mehta Foods: a happy monthly-plan client.
  const mehta = await client({
    company: "Mehta Foods",
    name: "Riya Mehta",
    email: "riya@mehta-foods.example",
    phone: "9876500002",
    goal: "keep-running",
    problem: "Our website and Google listing are out of date and nobody follows up on enquiries from Instagram.",
    source: "google",
    daysAgo: 70,
  });
  for (const m of mehta.ms) await approveMilestone(mehta.client, m.id);
  for (const m of mehta.ms) {
    const inv = await invoiceFor(m.id);
    await sendInvoice(db, owner, inv.id, ago(40));
    await recordPayment(db, owner, inv.id, { amount: inv.total / 100, method: "upi", reference: `UTR-${inv.number}` }, { now: ago(35) });
    await leaveFeedback(db, mehta.client, m.id, { rating: 5, comment: "Very responsive." }).catch(() => {});
  }
  await db.update(subscriptions).set({ startedAt: ago(40), nextInvoiceAt: ago(1) }).where(eq(subscriptions.orgId, mehta.orgId));
  await db.insert(interactions).values({ leadId: mehta.lead.id, orgId: mehta.orgId, kind: "whatsapp", direction: "in", summary: "Riya: the new menu page looks great!", occurredAt: ago(3) });

  // 3. Verma Logistics: project finished this week, paid, no monthly plan yet.
  const verma = await client({
    company: "Verma Logistics",
    name: "Sunil Verma",
    email: "sunil@verma-logistics.example",
    phone: "9876500003",
    goal: "customer-portal",
    problem: "Customers phone us to ask where their shipment is. We want a page where they can track it themselves.",
    source: "referral",
    daysAgo: 60,
  });
  for (const m of verma.ms) await approveMilestone(verma.client, m.id);
  for (const m of verma.ms) {
    const inv = await invoiceFor(m.id);
    await sendInvoice(db, owner, inv.id, ago(20));
    await recordPayment(db, owner, inv.id, { amount: inv.total / 100, method: "bank_transfer", reference: `NEFT-${inv.number}` }, { now: ago(12) });
  }
  await db.update(milestones).set({ completedAt: ago(2) }).where(eq(milestones.id, verma.ms[verma.ms.length - 1].id));
  await db.insert(interactions).values({ leadId: verma.lead.id, orgId: verma.orgId, kind: "meeting", direction: "out", summary: "Launch call — tracking page live for all customers.", occurredAt: ago(2), authorId: owner.userId });

  // 4. Open deals.
  const post = (
    await db
      .insert(contentPosts)
      .values({ title: "How a parts dealer stopped answering 'stock hai?' calls", slug: "stock-hai-calls-a1b2", clicks: 37, publishedAt: ago(12), createdBy: owner.userId })
      .returning()
  )[0];
  const kapoor = await submitDiscovery(
    db,
    {
      goal: "reduce-manual-work",
      businessType: "Wholesale & distribution",
      urgency: "urgent",
      teamSize: "11-50",
      problem: "Salesmen write orders on paper and we type them in at night. Mistakes every week.",
      name: "Vikram Kapoor",
      email: "vikram@kapoor-pharma.example",
      phone: "9876500004",
      company: "Kapoor Pharma Distributors",
      consent: true,
    },
    { attribution: touchFromVisit(new URL(`https://www.amfire.in/start?utm_source=linkedin&utm_medium=social&utm_campaign=post&utm_content=${post.slug}`), null, "www.amfire.in") },
  );
  await db.update(leads).set({ createdAt: ago(0.2) }).where(eq(leads.id, kapoor.lead.id));

  const gupta = await addManualLead(db, owner, {
    source: "linkedin",
    sourceNote: "DM after the 'stock hai?' post",
    name: "Neha Gupta",
    company: "Gupta Textiles",
    email: "",
    phone: "9876500005",
    problem: "Hi! Saw your post. We have 12 salesmen taking orders on paper at shops. Can you build something simple on the phone?",
    urgency: "month",
  });
  await db.update(leads).set({ createdAt: ago(2) }).where(eq(leads.id, gupta.lead.id));

  const bansal = await submitDiscovery(db, {
    goal: "connect-systems",
    businessType: "Retail, showroom or shop",
    urgency: "quarter",
    teamSize: "1-10",
    problem: "Our billing software, Tally and the online store don't talk to each other. Stock numbers are always wrong.",
    name: "Pooja Bansal",
    email: "pooja@bansal-hardware.example",
    phone: "9876500006",
    company: "Bansal Hardware",
    consent: true,
  }, { attribution: touchFromVisit(new URL("https://www.amfire.in/"), "https://www.google.com/", "www.amfire.in") });
  await decideQualification(db, owner, bansal.lead.id, "qualified");
  const bansalDraft = await createProposalDraft(db, owner, bansal.recommendation!.id);
  await approveAndSendProposal(db, owner, bansalDraft.id);
  await db.update(proposals).set({ sentAt: ago(6) }).where(eq(proposals.id, bansalDraft.id));
  await db.update(leads).set({ createdAt: ago(12) }).where(eq(leads.id, bansal.lead.id));

  const rao = await addManualLead(db, owner, {
    source: "referral",
    sourceNote: "Referred by Riya Mehta",
    name: "Dr. Kiran Rao",
    company: "Rao Diagnostics",
    email: "kiran@rao-diagnostics.example",
    phone: "9876500007",
    problem: "Patients call all day for their lab reports. Want reports sent on WhatsApp automatically.",
    goal: "reduce-manual-work",
    businessType: "Healthcare, clinic or lab",
    urgency: "month",
  });
  await decideQualification(db, owner, rao.lead.id, "qualified");
  await db.update(leads).set({ nextFollowUpAt: ago(0.1), dealValue: 60_000_00, createdAt: ago(8) }).where(eq(leads.id, rao.lead.id));
  await db.insert(interactions).values({ leadId: rao.lead.id, kind: "call", direction: "out", summary: "Demo call. Interested; asked to follow up after she talks to her partner.", occurredAt: ago(5), authorId: owner.userId });

  const team = await runTeam(db, { triggeredBy: owner.userId });
  console.log(`Demo data added. The AI team found ${team.signals} item(s) and left ${team.pending} decision(s) in the inbox.`);
  console.log("Client Hub logins (local sign-in link): amit@sharma-auto.example, riya@mehta-foods.example, sunil@verma-logistics.example");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
