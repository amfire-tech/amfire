// Clients the owner signs in person, their Client Hub logins, and removing
// leads or clients (test records, mistakes). The owner only: these create or
// erase commercial records.

import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { site } from "@/config/site";
import {
  approvals,
  auditEvents,
  changeRequests,
  checklistItems,
  interactions,
  invoices,
  leads,
  memberships,
  memories,
  milestoneFeedback,
  milestones,
  organizations,
  payments,
  projectUpdates,
  projects,
  proposalFiles,
  proposals,
  signals,
  subscriptions,
  supportMessages,
  supportRequests,
  tasks,
  timeEntries,
  users,
} from "@/db/schema";
import { BUSINESS_TYPES } from "@/knowledge/catalog";
import { MANUAL_SOURCES } from "@/lib/attribution";
import { assertOwner, assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { whatsappLink } from "./brain";
import { afterResponse, notifyClient, type PrivateLines } from "./client-notify";
import { CrmError } from "./crm";
import { ManualLeadSchema } from "./leads";
import { emailConfigured } from "./notify";
import { GOAL_FOR_PATH } from "./projects";
import { firstBillOnOrAfter, PROPOSAL_FILE_MAX_BYTES, ProposalEdit, signInSteps, startProjectFromProposal } from "./proposals";

type Tx = Pick<DB, "select" | "insert" | "update" | "delete">;

/** Login details for the owner to pass on (WhatsApp, in person). Shown once, never stored. */
export type LoginShare = {
  name: string;
  email: string;
  /** Null when they already chose their own password, or password sign-in isn't set up here. */
  password: string | null;
  /** True when they had already chosen their own password, which was left alone. */
  hasOwnPassword: boolean;
  /** Ready to paste into WhatsApp or a message. */
  message: string;
  whatsapp: string | null;
  emailed: boolean;
};

// --- Signed in person ------------------------------------------------------------

const line = z.string().trim().min(1).max(500);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const SignedClientInput = z.object({
  company: z.string().trim().min(1, "Add the client's organisation name.").max(160),
  name: z.string().trim().min(1, "Add the contact person's name.").max(120),
  email: z.email("Enter the email they'll sign in with.").trim().toLowerCase().max(200),
  phone: ManualLeadSchema.shape.phone,
  source: z.enum(MANUAL_SOURCES, { error: "Choose where this client came from." }),
  sourceNote: optionalText(300),
  businessType: z.enum(BUSINESS_TYPES).default("Something else"),
  state: optionalText(80),
  path: z.enum(["build", "operate", "automate"]),
  title: z.string().trim().min(3, "Give the agreement a title.").max(200),
  summary: z.string().trim().min(10, "Add a short summary of what you agreed (10 characters or more).").max(4000),
  scope: z.array(line).max(20).default([]),
  milestones: ProposalEdit.shape.milestones,
  currency: z.enum(["INR", "USD"]).default("INR"),
  /** Minor units; null for no monthly plan. */
  monthlyAmount: z.number().int().min(1).max(100_000_000_00).nullish().transform((v) => v ?? null),
  monthlyStartsOn: z.coerce.date().nullish().transform((v) => v ?? null),
  terms: optionalText(4000),
  /** Also email the sign-in details (otherwise the owner shares them). */
  emailLogin: z.boolean().default(false),
});
export type SignedClientInput = z.input<typeof SignedClientInput>;

/**
 * A client the owner met and signed in person: no proposal email, no
 * accept button. Creates the client account, their won lead (so agents and
 * reports see where they came from), the agreed proposal marked accepted, the
 * project with its milestones, any monthly plan, and a Client Hub login.
 */
export async function addSignedClient(
  db: DB,
  actor: Actor | null,
  input: SignedClientInput,
  file?: { name: string; bytes: Buffer } | null,
) {
  assertOwner(actor);
  const d = SignedClientInput.parse(input);
  if (file && file.bytes.length) {
    if (file.bytes.length > PROPOSAL_FILE_MAX_BYTES) throw new CrmError("The PDF must be 4 MB or smaller.");
    if (file.bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new CrmError("That file isn't a PDF.");
  }
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: d.company, kind: "client", state: d.state })
      .returning();
    await audit(tx, { actorId: actor.userId, orgId: org.id, action: "org.created", subjectType: "organization", subjectId: org.id });

    const [existing] = await tx.select().from(users).where(eq(users.email, d.email));
    const contact = existing ?? (await tx.insert(users).values({ email: d.email, name: d.name }).returning())[0];
    await tx.insert(memberships).values({ userId: contact.id, orgId: org.id, role: "client_admin" }).onConflictDoNothing();

    const [lead] = await tx
      .insert(leads)
      .values({
        publicRef: randomBytes(12).toString("base64url"),
        status: "won",
        name: d.name,
        email: d.email,
        phone: d.phone ?? null,
        company: d.company,
        goal: GOAL_FOR_PATH[d.path],
        businessType: d.businessType,
        urgency: "month",
        problem: d.summary,
        currency: d.currency,
        source: d.source,
        sourceNote: d.sourceNote,
        qualificationNotes: "Met and signed in person; added straight to clients.",
        reviewedAt: now,
        nextAction: "Kick off the project",
        clientOrgId: org.id,
      })
      .returning();

    const terms = d.terms ?? `Agreed and signed in person on ${now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`;
    const [proposal] = await tx
      .insert(proposals)
      .values({
        leadId: lead.id,
        clientOrgId: org.id,
        status: "accepted",
        path: d.path,
        title: d.title,
        summary: d.summary,
        scope: d.scope.length ? d.scope : [d.title],
        outOfScope: [],
        assumptions: [],
        milestones: d.milestones,
        currency: d.currency,
        monthlyAmount: d.monthlyAmount,
        monthlyStartsOn: d.monthlyAmount ? d.monthlyStartsOn : null,
        terms,
        approvedBy: actor.userId,
        approvedAt: now,
        sentAt: now,
        decidedBy: contact.id,
        decidedAt: now,
        createdBy: actor.userId,
      })
      .returning();
    if (file && file.bytes.length) {
      const name = file.name.replace(/[^\w .()-]/g, "_").slice(0, 120) || "agreement.pdf";
      await tx.insert(proposalFiles).values({ proposalId: proposal.id, name, size: file.bytes.length, content: file.bytes, uploadedBy: actor.userId });
    }

    const { project, weeks } = await startProjectFromProposal(tx, proposal, org.id, {
      authorId: actor.userId,
      now,
      update: "Agreement signed. Welcome to your Client Hub: progress, approvals and invoices for this project all appear here.",
    });
    if (d.monthlyAmount) {
      await tx.insert(subscriptions).values({
        orgId: org.id,
        projectId: project.id,
        title: `${d.title} — monthly plan`,
        amount: d.monthlyAmount,
        currency: d.currency,
        startedAt: now,
        nextInvoiceAt: d.monthlyStartsOn ? firstBillOnOrAfter(d.monthlyStartsOn, now) : new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000),
      });
    }
    await audit(tx, {
      actorId: actor.userId,
      orgId: org.id,
      action: "client.signed_in_person",
      subjectType: "proposal",
      subjectId: proposal.id,
      data: { projectId: project.id, leadId: lead.id },
    });
    return { orgId: org.id, leadId: lead.id, projectId: project.id, contact };
  });

  const login = await shareLogin(db, result.contact, d.phone ?? null);
  if (d.emailLogin) login.emailed = await emailLogin(db, result.orgId, login, `/hub/projects/${result.projectId}`);
  return { orgId: result.orgId, leadId: result.leadId, projectId: result.projectId, login };
}

// --- Client Hub logins -------------------------------------------------------------

export async function listClientLogins(db: DB, actor: Actor | null, orgId: string) {
  assertStaff(actor);
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: memberships.role,
      mustChangePassword: users.mustChangePassword,
      passwordSetAt: users.passwordSetAt,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.orgId, orgId), inArray(memberships.role, ["client_admin", "client_member"])))
    .orderBy(memberships.createdAt);
}

export const ClientLoginInput = z.object({
  name: z.string().trim().min(1, "Add their name.").max(120),
  email: z.email("Enter a valid email address.").trim().toLowerCase().max(200),
  role: z.enum(["client_admin", "client_member"]).default("client_admin"),
});

/** The owner gives someone at a client a Client Hub login, with a one-time password to pass on. */
export async function addClientLogin(db: DB, actor: Actor | null, orgId: string, input: z.input<typeof ClientLoginInput>) {
  assertOwner(actor);
  const data = ClientLoginInput.parse(input);
  const user = await db.transaction(async (tx) => {
    await clientOrg(tx, orgId);
    const [existing] = await tx.select().from(users).where(eq(users.email, data.email));
    if (existing) {
      const [inside] = await tx
        .select({ role: memberships.role })
        .from(memberships)
        .innerJoin(organizations, eq(organizations.id, memberships.orgId))
        .where(and(eq(memberships.userId, existing.id), eq(organizations.kind, "internal")));
      if (inside) throw new CrmError("That email belongs to the amfire team. Use the client's own email.");
    }
    const u = existing ?? (await tx.insert(users).values({ email: data.email, name: data.name }).returning())[0];
    const [already] = await tx.select().from(memberships).where(and(eq(memberships.userId, u.id), eq(memberships.orgId, orgId)));
    if (already) throw new CrmError("They already have a login for this client. Give them a new one-time password instead.");
    await tx.insert(memberships).values({ userId: u.id, orgId, role: data.role });
    await audit(tx, { actorId: actor.userId, orgId, action: "client.login_added", subjectType: "user", subjectId: u.id, data: { role: data.role } });
    return u;
  });
  return shareLogin(db, user, await phoneFor(db, orgId, user.email));
}

/** A fresh one-time password for someone at a client, replacing any password they had. */
export async function resetClientLogin(db: DB, actor: Actor | null, orgId: string, userId: string) {
  assertOwner(actor);
  const [row] = await db
    .select({ user: users })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId), inArray(memberships.role, ["client_admin", "client_member"])));
  if (!row) throw new CrmError("That login isn't on this client's account.");
  await audit(db, { actorId: actor.userId, orgId, action: "client.login_reset", subjectType: "user", subjectId: userId });
  return shareLogin(db, row.user, await phoneFor(db, orgId, row.user.email), { replace: true });
}

async function shareLogin(
  db: DB,
  user: { id: string; name: string; email: string; passwordSetAt: Date | null },
  phone: string | null,
  opts: { replace?: boolean } = {},
): Promise<LoginShare> {
  const hasOwnPassword = !!user.passwordSetAt && !opts.replace;
  const password = hasOwnPassword ? null : await oneTimePassword(db, user);
  const first = user.name.split(" ")[0] || "there";
  const message = [
    `Hi ${first}, your amfire Client Hub is ready. You can follow your project's progress, approvals and invoices there.`,
    password
      ? signInSteps(user.email, password)
      : hasOwnPassword
        ? `Sign in at ${site.url}/login with ${user.email} and the password you chose.`
        : `Sign in at ${site.url}/login: enter ${user.email} and choose "Email link", and we'll email you a one-time sign-in link.`,
  ].join("\n\n");
  return {
    name: user.name,
    email: user.email,
    password,
    hasOwnPassword,
    message,
    whatsapp: phone ? whatsappLink(phone, message) : null,
    emailed: false,
  };
}

/** Sets a one-time password on their sign-in account. Null where Supabase isn't set up (local development, tests). */
async function oneTimePassword(db: DB, user: { id: string; email: string }): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) return null;
  const { issueOneTimePassword } = await import("@/lib/supabase/admin");
  const password = await issueOneTimePassword(user.email);
  if (password) await db.update(users).set({ mustChangePassword: true }).where(eq(users.id, user.id));
  return password;
}

async function emailLogin(db: DB, orgId: string, login: LoginShare, path: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  const privateFor: PrivateLines | undefined = login.password
    ? {
        email: login.email,
        lines: [signInSteps(login.email, login.password)],
        logged: signInSteps(login.email, "[one-time password, not stored]"),
      }
    : undefined;
  await afterResponse(() =>
    notifyClient(
      db,
      orgId,
      {
        subject: "Your amfire Client Hub is ready",
        lines: ["Your Client Hub is ready: the agreed scope, milestones, progress and invoices for your project, all in one place."],
        path,
        action: "Open your Client Hub",
      },
      { privateFor },
    ),
  );
  return true;
}

async function phoneFor(db: DB, orgId: string, email: string) {
  const [lead] = await db
    .select({ phone: leads.phone })
    .from(leads)
    .where(and(eq(leads.clientOrgId, orgId), eq(leads.email, email)))
    .limit(1);
  return lead?.phone ?? null;
}

async function clientOrg(tx: Tx, orgId: string) {
  const [org] = await tx.select().from(organizations).where(and(eq(organizations.id, orgId), eq(organizations.kind, "client")));
  if (!org) throw new CrmError("Client not found.");
  return org;
}

// --- Deleting ------------------------------------------------------------------------

/** What deleting a lead takes with it, for the confirmation. */
export async function leadDeletionImpact(db: DB, lead: { id: string; clientOrgId: string | null }) {
  if (!lead.clientOrgId) return { deletesClient: false as const };
  const all = await db.select({ id: leads.id }).from(leads).where(eq(leads.clientOrgId, lead.clientOrgId));
  if (all.length > 1) return { deletesClient: false as const };
  const [org] = await db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, lead.clientOrgId));
  return { deletesClient: true as const, clientName: org?.name ?? "", ...(await clientDeletionImpact(db, lead.clientOrgId)) };
}

export async function clientDeletionImpact(db: DB, orgId: string) {
  const [ps, invs, logins] = await Promise.all([
    db.select({ id: projects.id }).from(projects).where(eq(projects.orgId, orgId)),
    db.select({ status: invoices.status }).from(invoices).where(eq(invoices.orgId, orgId)),
    db.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.orgId, orgId)),
  ]);
  return { projects: ps.length, invoices: invs.length, paidInvoices: invs.filter((i) => i.status === "paid").length, logins: logins.length };
}

/**
 * Deletes a lead with its recommendations, proposals, conversations and facts.
 * A lead that became a client takes that client account with it, unless the
 * account has other leads, in which case its projects are kept.
 */
export async function deleteLead(db: DB, actor: Actor | null, leadId: string) {
  assertOwner(actor);
  return db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) throw new CrmError("Lead not found.");
    let deletedClient = false;
    if (lead.clientOrgId) {
      const siblings = await tx.select({ id: leads.id }).from(leads).where(eq(leads.clientOrgId, lead.clientOrgId));
      if (siblings.length === 1) {
        await eraseClient(tx, lead.clientOrgId);
        deletedClient = true;
      } else {
        // The account stays with its other leads: keep its projects, just unlink them from this lead's proposals.
        const own = await tx.select({ id: proposals.id }).from(proposals).where(eq(proposals.leadId, leadId));
        if (own.length) await tx.update(projects).set({ proposalId: null }).where(inArray(projects.proposalId, own.map((p) => p.id)));
      }
    }
    await eraseLead(tx, leadId);
    await audit(tx, {
      actorId: actor.userId,
      action: "lead.deleted",
      subjectType: "lead",
      subjectId: leadId,
      data: { company: lead.company, name: lead.name, status: lead.status, deletedClient },
    });
    return { deletedClient };
  });
}

/** Deletes a client account and everything in it: projects, invoices, plans, requests, logins and its leads. */
export async function deleteClient(db: DB, actor: Actor | null, orgId: string) {
  assertOwner(actor);
  return db.transaction(async (tx) => {
    const org = await clientOrg(tx, orgId);
    const ls = await tx.select({ id: leads.id }).from(leads).where(eq(leads.clientOrgId, orgId));
    await eraseClient(tx, orgId);
    for (const l of ls) await eraseLead(tx, l.id);
    await audit(tx, { actorId: actor.userId, action: "client.deleted", subjectType: "organization", subjectId: orgId, data: { name: org.name, leads: ls.length } });
    return org;
  });
}

async function eraseLead(tx: Tx, leadId: string) {
  await tx.delete(memories).where(and(eq(memories.subjectType, "lead"), eq(memories.subjectId, leadId)));
  // Recommendations, proposals (and their PDFs), conversations, signals and suggestions go with it.
  await tx.delete(leads).where(eq(leads.id, leadId));
}

/** Everything under a client organisation, children first. Leads are left to the caller. */
async function eraseClient(tx: Tx, orgId: string) {
  await tx.delete(payments).where(eq(payments.orgId, orgId));
  await tx.delete(invoices).where(eq(invoices.orgId, orgId));
  await tx.delete(subscriptions).where(eq(subscriptions.orgId, orgId));
  await tx.delete(supportMessages).where(eq(supportMessages.orgId, orgId));
  await tx.delete(supportRequests).where(eq(supportRequests.orgId, orgId));
  await tx.delete(milestoneFeedback).where(eq(milestoneFeedback.orgId, orgId));
  await tx.delete(changeRequests).where(eq(changeRequests.orgId, orgId));
  await tx.delete(checklistItems).where(eq(checklistItems.orgId, orgId));
  await tx.delete(timeEntries).where(eq(timeEntries.orgId, orgId));
  await tx.delete(tasks).where(eq(tasks.orgId, orgId));
  await tx.delete(projectUpdates).where(eq(projectUpdates.orgId, orgId));
  await tx.delete(milestones).where(eq(milestones.orgId, orgId));
  await tx.delete(projects).where(eq(projects.orgId, orgId));
  await tx.delete(interactions).where(eq(interactions.orgId, orgId));
  await tx.delete(signals).where(eq(signals.orgId, orgId));
  await tx.delete(approvals).where(eq(approvals.orgId, orgId));
  await tx.delete(memories).where(and(eq(memories.subjectType, "organization"), eq(memories.subjectId, orgId)));
  await tx.delete(proposals).where(eq(proposals.clientOrgId, orgId));
  await tx.update(leads).set({ clientOrgId: null }).where(eq(leads.clientOrgId, orgId));
  // The history stays, detached from the account.
  await tx.update(auditEvents).set({ orgId: null }).where(eq(auditEvents.orgId, orgId));
  // Memberships go with the organisation; the people's user records stay (they may be elsewhere too).
  await tx.delete(organizations).where(eq(organizations.id, orgId));
}
