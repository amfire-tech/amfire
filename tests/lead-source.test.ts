// Lead attribution: classifying visits, saving the source with discovery
// bookings, and leads added by hand in HQ.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { users } from "@/db/schema";
import { classify, readTouch, shouldReplaceTouch, touchFromVisit } from "@/lib/attribution";
import { AccessDenied, loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { listLeads } from "@/server/hq";
import { addManualLead, decideQualification, submitDiscovery, updateLeadContact } from "@/server/leads";
import { ProposalError, approveAndSendProposal, createProposalDraft } from "@/server/proposals";

const visit = (url: string, referrer: string | null = null) => touchFromVisit(new URL(url), referrer, "www.amfire.in");

describe("classifying visits", () => {
  test("the LinkedIn page button", () => {
    const t = visit("https://www.amfire.in/start?utm_source=linkedin&utm_medium=social&utm_campaign=page_button");
    assert.equal(t.source, "linkedin");
    assert.equal(t.utmCampaign, "page_button");
    assert.equal(t.landingPath, "/start");
  });

  test("referrers without tags", () => {
    assert.equal(visit("https://www.amfire.in/", "https://www.linkedin.com/").source, "linkedin");
    assert.equal(visit("https://www.amfire.in/", "android-app://com.linkedin.android/").source, "linkedin");
    assert.equal(visit("https://www.amfire.in/", "https://www.google.co.in/").source, "google");
    assert.equal(visit("https://www.amfire.in/", "https://l.instagram.com/").source, "instagram");
    assert.equal(visit("https://www.amfire.in/", "https://someblog.in/post").source, "other_site");
  });

  test("our own site and no referrer count as direct", () => {
    assert.equal(visit("https://www.amfire.in/work", "https://www.amfire.in/").source, "direct");
    assert.equal(visit("https://www.amfire.in/").source, "direct");
    // Ports are ignored, as in local development.
    assert.equal(touchFromVisit(new URL("http://localhost:3001/start"), "http://localhost:3001/", "localhost:3001").source, "direct");
  });

  test("only the referring host is kept", () => {
    assert.equal(visit("https://www.amfire.in/", "https://www.google.com/search?q=private").referrer, "google.com");
  });

  test("UTM tags win over the referrer, and email medium means email", () => {
    assert.equal(classify("linkedin", undefined, "google.com"), "linkedin");
    assert.equal(classify("diwali-offer", "email", undefined), "email");
    assert.equal(classify("partner-site", "referral", undefined), "referral");
    assert.equal(classify("something", undefined, undefined), "other");
  });

  test("a direct first visit is replaced by a later real source, nothing else is", () => {
    const direct = visit("https://www.amfire.in/");
    const linkedin = visit("https://www.amfire.in/?utm_source=linkedin");
    const google = visit("https://www.amfire.in/", "https://www.google.com/");
    assert.equal(shouldReplaceTouch(null, direct), true);
    assert.equal(shouldReplaceTouch(direct, linkedin), true);
    assert.equal(shouldReplaceTouch(linkedin, google), false);
    assert.equal(shouldReplaceTouch(linkedin, direct), false);
  });

  test("a malformed cookie is ignored", () => {
    assert.equal(readTouch("not json"), null);
    assert.equal(readTouch(JSON.stringify({ source: "nope" })), null);
    assert.equal(readTouch(JSON.stringify({ source: "linkedin", utmCampaign: "x" }))?.utmCampaign, "x");
  });
});

describe("leads with a source", () => {
  let db: DB;
  let owner: Actor;
  let client: Actor;

  before(async () => {
    db = await openPglite();
    await bootstrap(db);
    const [u] = await db.select().from(users).where(eq(users.email, DEFAULT_OWNER_EMAIL));
    owner = await loadActor(db, u);
    const [c] = await db.insert(users).values({ email: "someone@client.test", name: "Someone" }).returning();
    client = await loadActor(db, c);
  });

  const answers = {
    goal: "reduce-manual-work",
    businessType: "Manufacturing",
    urgency: "month",
    problem: "We re-type every dealer order from WhatsApp into Tally by hand.",
    name: "Asha",
    email: "asha@parts.test",
    company: "Parts Co",
    consent: true,
  } as const;

  test("a discovery booking saves where the visitor came from", async () => {
    const touch = visit("https://www.amfire.in/start?utm_source=linkedin&utm_medium=social&utm_campaign=page_button");
    const { lead } = await submitDiscovery(db, answers, { attribution: touch });
    assert.equal(lead.source, "linkedin");
    assert.equal(lead.utmCampaign, "page_button");
    assert.equal(lead.landingPath, "/start");
  });

  test("a booking without the cookie is unknown, not direct", async () => {
    const { lead } = await submitDiscovery(db, { ...answers, email: "b@parts.test" });
    assert.equal(lead.source, "unknown");
  });

  test("staff add a lead from a LinkedIn DM, without an email", async () => {
    const { lead, recommendation } = await addManualLead(db, owner, {
      source: "linkedin",
      sourceNote: "DM after the Oct 21 post",
      name: "Ravi",
      company: "Ravi Textiles",
      email: "",
      phone: "",
      problem: "Wants a simple app for his salesmen to take orders at shops.",
    });
    assert.equal(lead.source, "linkedin");
    assert.equal(lead.email, null);
    assert.equal(lead.consentAt, null);
    assert.equal(lead.status, "new");
    assert.ok(recommendation, "the rules engine still recommends a starting point");
  });

  test("clients can't add leads, and bad input is rejected", async () => {
    await assert.rejects(
      addManualLead(db, client, { source: "linkedin", name: "X", company: "Y", email: "", phone: "", problem: "Needs a website soon." }),
      AccessDenied,
    );
    await assert.rejects(
      addManualLead(db, owner, { source: "linkedin", name: "X", company: "Y", email: "not-an-email", phone: "", problem: "Needs a website soon." }),
    );
  });

  test("a proposal can't be sent until the lead has an email", async () => {
    const { lead, recommendation } = await addManualLead(db, owner, {
      source: "referral",
      name: "Meera",
      company: "Meera Clinics",
      email: "",
      phone: "9876543210",
      problem: "Patients keep calling to ask for their lab reports; wants them on WhatsApp.",
    });
    await decideQualification(db, owner, lead.id, "qualified");
    const draft = await createProposalDraft(db, owner, recommendation!.id);
    await assert.rejects(approveAndSendProposal(db, owner, draft.id), (err: unknown) => err instanceof ProposalError && err.code === "NO_CLIENT_EMAIL");

    await updateLeadContact(db, owner, lead.id, { email: "meera@clinics.test", phone: "" });
    const { proposal } = await approveAndSendProposal(db, owner, draft.id);
    assert.equal(proposal.status, "sent");
  });

  test("HQ counts leads by source and filters by it", async () => {
    const all = await listLeads(db, owner);
    const linkedin = all.bySource.find((r) => r.source === "linkedin");
    assert.equal(linkedin?.total, 2);
    const filtered = await listLeads(db, owner, { source: "linkedin" });
    assert.equal(filtered.leads.length, 2);
    assert.ok(filtered.leads.every((l) => l.source === "linkedin"));
  });
});
