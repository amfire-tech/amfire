// Clients signed in person, their Hub logins, and deleting leads and clients,
// against a real (in-memory) PostgreSQL.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import { openPglite, type DB } from "@/db";
import { invoices, leads, memberships, milestones, organizations, projects, proposals, subscriptions, users } from "@/db/schema";
import { AccessDenied, loadActor, type Actor } from "@/server/access";
import { bootstrap, DEFAULT_OWNER_EMAIL } from "@/server/bootstrap";
import { addClientLogin, addSignedClient, deleteClient, deleteLead, leadDeletionImpact, listClientLogins, resetClientLogin } from "@/server/clients";
import { addManualLead } from "@/server/leads";
import { clientApproveMilestone, getClientHome, setMilestoneDates, updateMilestone } from "@/server/projects";
import { dayStart } from "@/server/proposals";

let db: DB;
let owner: Actor;

async function actorFor(email: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email));
  return loadActor(db, u);
}

const signed = (company: string, email: string) => ({
  company,
  name: "Ravi Kulkarni",
  email,
  phone: "9876543210",
  source: "event" as const,
  path: "build" as const,
  title: "Order and dispatch system",
  summary: "Replace the dispatch spreadsheet with one system the plant and office share.",
  scope: ["Order entry", "Dispatch board"],
  milestones: [
    { title: "Order entry live", description: "", weeks: 2, amount: 50_000_00 },
    { title: "Dispatch board live", description: "", weeks: 3, amount: 70_000_00 },
  ],
  currency: "INR" as const,
  monthlyAmount: 15_000_00,
});

before(async () => {
  db = await openPglite();
  await bootstrap(db);
  owner = await actorFor(DEFAULT_OWNER_EMAIL);
});

describe("a client signed in person", () => {
  test("becomes a client account, won lead, accepted proposal, project, plan and login", async () => {
    const { orgId, leadId, projectId, login } = await addSignedClient(db, owner, signed("Shree Forgings", "ravi@forgings.test"));
    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    assert.equal(lead.status, "won");
    assert.equal(lead.clientOrgId, orgId);
    const [p] = await db.select().from(proposals).where(eq(proposals.leadId, leadId));
    assert.equal(p.status, "accepted");
    const ms = await db.select().from(milestones).where(eq(milestones.projectId, projectId));
    assert.equal(ms.length, 2);
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId));
    assert.equal(sub.amount, 15_000_00);

    // No Supabase in tests: no password, and the message says to use an email link.
    assert.equal(login.password, null);
    assert.match(login.message, /Email link/);
    assert.match(login.whatsapp!, /^https:\/\/wa\.me\/919876543210/);

    const client = await actorFor("ravi@forgings.test");
    assert.deepEqual(client.clientOrgIds, [orgId]);
    const home = await getClientHome(db, client);
    assert.equal(home.projects.length, 1);
    assert.equal(home.proposals[0].status, "accepted");
  });

  test("keeps the dates agreed for each stage, and they can be moved later", async () => {
    const { projectId, orgId } = await addSignedClient(db, owner, {
      ...signed("Harshal Test Travels", "h@travels.test"),
      monthlyAmount: null,
      milestones: [
        { title: "Website live", description: "", weeks: 1, amount: 9_999_00, startsOn: "2026-11-25", endsOn: "2026-11-28" },
        { title: "WhatsApp agent", description: "", weeks: 3, amount: 0, startsOn: "2026-11-29", endsOn: "2026-12-13" },
      ],
    });
    const ms = await db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(milestones.position);
    assert.deepEqual(
      ms.map((m) => [m.startDate?.toISOString(), m.dueDate?.toISOString()]),
      [
        [dayStart("2026-11-25").toISOString(), dayStart("2026-11-28").toISOString()],
        [dayStart("2026-11-29").toISOString(), dayStart("2026-12-13").toISOString()],
      ],
    );
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    assert.equal(project.startedAt.toISOString(), dayStart("2026-11-25").toISOString(), "the project starts when the first stage does");
    assert.equal(project.orgId, orgId);

    const moved = await setMilestoneDates(db, owner, ms[0].id, { startDate: "2026-11-26", dueDate: "2026-12-01" });
    assert.equal(moved.dueDate?.toISOString(), dayStart("2026-12-01").toISOString());
    await assert.rejects(setMilestoneDates(db, owner, ms[0].id, { startDate: "2026-12-05", dueDate: "2026-12-01" }), /before the start/);
    await assert.rejects(
      addSignedClient(db, owner, {
        ...signed("Backwards Ltd", "b@back.test"),
        milestones: [{ title: "Oops", description: "", weeks: 1, amount: 0, startsOn: "2026-12-10", endsOn: "2026-12-01" }],
      }),
      /ends before it starts/,
    );
  });

  test("only the owner can add one", async () => {
    const staffUser = (await db.insert(users).values({ email: "staff2@amfire.local", name: "Staff" }).returning())[0];
    const staff = { ...(await loadActor(db, staffUser)), internalRole: "staff" as const };
    await assert.rejects(addSignedClient(db, staff, signed("Nope Ltd", "x@nope.test")), AccessDenied);
  });

  test("the owner adds and resets logins", async () => {
    const { orgId } = await addSignedClient(db, owner, signed("Patil Castings", "anil@castings.test"));
    const added = await addClientLogin(db, owner, orgId, { name: "Meera", email: "meera@castings.test", role: "client_member" });
    assert.equal(added.email, "meera@castings.test");
    await assert.rejects(addClientLogin(db, owner, orgId, { name: "Meera", email: "meera@castings.test" }), /already have a login/);
    await assert.rejects(addClientLogin(db, owner, orgId, { name: "Me", email: DEFAULT_OWNER_EMAIL }), /amfire team/);
    const logins = await listClientLogins(db, owner, orgId);
    assert.deepEqual(logins.map((l) => l.email).sort(), ["anil@castings.test", "meera@castings.test"]);
    const reset = await resetClientLogin(db, owner, orgId, logins[0].userId);
    assert.equal(reset.email, logins[0].email);
  });
});

describe("deleting", () => {
  test("a plain lead goes on its own", async () => {
    const { lead } = await addManualLead(db, owner, {
      source: "whatsapp",
      name: "Test",
      company: "Test Co",
      problem: "Just a test entry to delete.",
    });
    assert.deepEqual(await leadDeletionImpact(db, lead), { deletesClient: false });
    await deleteLead(db, owner, lead.id);
    assert.equal((await db.select().from(leads).where(eq(leads.id, lead.id))).length, 0);
  });

  test("a won lead takes its client account, projects and invoices with it", async () => {
    const { orgId, leadId, projectId } = await addSignedClient(db, owner, signed("Delete Me Pvt Ltd", "del@me.test"));
    const [m] = await db.select().from(milestones).where(eq(milestones.projectId, projectId)).orderBy(milestones.position);
    await updateMilestone(db, owner, m.id, { status: "awaiting_approval" });
    await clientApproveMilestone(db, await actorFor("del@me.test"), m.id);
    assert.equal((await db.select().from(invoices).where(eq(invoices.orgId, orgId))).length, 1);

    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    const impact = await leadDeletionImpact(db, lead);
    assert.equal(impact.deletesClient, true);
    await deleteLead(db, owner, leadId);

    assert.equal((await db.select().from(organizations).where(eq(organizations.id, orgId))).length, 0);
    assert.equal((await db.select().from(projects).where(eq(projects.orgId, orgId))).length, 0);
    assert.equal((await db.select().from(memberships).where(eq(memberships.orgId, orgId))).length, 0);
    assert.deepEqual((await actorFor("del@me.test")).clientOrgIds, []);
  });

  test("deleting a client removes its leads too; staff can't delete", async () => {
    const { orgId, leadId } = await addSignedClient(db, owner, signed("Gone Industries", "gone@ind.test"));
    const staffUser = (await db.insert(users).values({ email: "staff3@amfire.local", name: "Staff" }).returning())[0];
    const staff = { ...(await loadActor(db, staffUser)), internalRole: "staff" as const };
    await assert.rejects(deleteClient(db, staff, orgId), AccessDenied);
    await assert.rejects(deleteLead(db, staff, leadId), AccessDenied);
    await deleteClient(db, owner, orgId);
    assert.equal((await db.select().from(leads).where(eq(leads.id, leadId))).length, 0);
    assert.equal((await db.select().from(organizations).where(eq(organizations.id, orgId))).length, 0);
  });
});
