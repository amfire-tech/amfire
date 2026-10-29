import { and, eq } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { site } from "@/config/site";
import {
  leads,
  memberships,
  milestones,
  organizations,
  projectUpdates,
  projects,
  proposalFiles,
  proposals,
  recommendations,
  subscriptions,
  users,
  type Proposal,
} from "@/db/schema";
import { SERVICES } from "@/knowledge/catalog";
import {
  DEMO_OFFER,
  defaultTerms,
  isCurrency,
  milestoneTemplate,
  formatMoney,
  OPERATE_RETAINER,
  priceFloor,
  PRICING_CURRENCY,
  type Currency,
  type ProjectSize,
} from "@/knowledge/pricing";
import { assertClientOrg, assertOwner, assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { afterResponse, notifyClient, type PrivateLines } from "./client-notify";
import { emailConfigured } from "./notify";
import { demoOfferCode } from "./leads";

export class ProposalError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "NOT_EDITABLE" | "NO_CLIENT_EMAIL" | "INVALID",
  ) {
    super(message);
    this.name = "ProposalError";
  }
}

const OUT_OF_SCOPE = {
  build: ["Ongoing hosting and support after launch (available as an Operate plan)", "Content writing and photography"],
  automate: ["Changes to third-party systems beyond their available integrations", "Ongoing monitoring after the go-live period"],
  operate: ["New features or redesigns (available as a Build project)", "Third-party licence and hosting costs"],
} as const;

/** Milestones added up, before any discount. Pricing guidelines apply to this. */
export function proposalSubtotal(p: Pick<Proposal, "milestones">): number {
  return p.milestones.reduce((sum, m) => sum + m.amount, 0);
}

/** What the client pays: the milestones less any discount (such as the free-demo offer). */
export function proposalTotal(p: Pick<Proposal, "milestones" | "discount">): number {
  return Math.max(0, proposalSubtotal(p) - p.discount);
}

/** Proposals store their currency as text; anything unexpected falls back to the default. */
export function proposalCurrency(proposal: Pick<Proposal, "currency">): Currency {
  return isCurrency(proposal.currency) ? proposal.currency : PRICING_CURRENCY;
}

/**
 * Staff turn an agent recommendation into an editable draft priced by the
 * pricing rules, in the lead's currency unless staff choose another.
 */
export async function createProposalDraft(
  db: DB,
  actor: Actor | null,
  recommendationId: string,
  opts: { currency?: Currency } = {},
): Promise<Proposal> {
  assertStaff(actor);
  return db.transaction(async (tx) => {
    const [rec] = await tx.select().from(recommendations).where(eq(recommendations.id, recommendationId));
    if (!rec) throw new ProposalError("Recommendation not found", "NOT_FOUND");
    const [lead] = await tx.select().from(leads).where(eq(leads.id, rec.leadId));
    const size = rec.size as ProjectSize;
    const currency = opts.currency ?? (isCurrency(lead.currency) ? lead.currency : PRICING_CURRENCY);

    const [draft] = await tx
      .insert(proposals)
      .values({
        leadId: rec.leadId,
        recommendationId: rec.id,
        path: rec.path,
        title: `${SERVICES[rec.path].name} for ${lead.company}: ${rec.headline}`,
        summary: rec.summary,
        scope: rec.approach,
        outOfScope: [...OUT_OF_SCOPE[rec.path]],
        assumptions: rec.assumptions,
        milestones: milestoneTemplate(rec.path, size, currency),
        currency,
        // Everyone who books a free demo gets the free-demo offer.
        discount: DEMO_OFFER.amount[currency],
        discountNote: `Free-demo offer · ${demoOfferCode(lead.publicRef)}`,
        monthlyAmount: rec.path === "operate" ? OPERATE_RETAINER[size][currency] : null,
        terms: [defaultTerms(rec.path, size, currency), DEMO_OFFER.terms(currency)].join("\n"),
        createdBy: actor.userId,
      })
      .returning();

    if (rec.status === "proposed") {
      await tx
        .update(recommendations)
        .set({ status: "accepted", reviewedBy: actor.userId, reviewedAt: new Date() })
        .where(eq(recommendations.id, rec.id));
    }
    await tx
      .update(leads)
      .set({ nextAction: "Finish the proposal draft and approve it", updatedAt: new Date() })
      .where(eq(leads.id, rec.leadId));
    await audit(tx, { actorId: actor.userId, action: "proposal.drafted", subjectType: "proposal", subjectId: draft.id });
    return draft;
  });
}

const line = z.string().trim().min(1).max(500);
export const ProposalEdit = z.object({
  title: z.string().trim().min(3).max(200),
  summary: z.string().trim().min(10).max(4000),
  scope: z.array(line).min(1).max(20),
  outOfScope: z.array(line).max(20),
  assumptions: z.array(line).max(20),
  milestones: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(1000),
        weeks: z.number().int().min(1).max(104),
        amount: z.number().int().min(0).max(100_000_000_00),
      }),
    )
    .min(1, "Add at least one milestone.")
    .max(12),
  /** Taken off the milestones; 0 removes it. */
  discount: z.number().int().min(0).max(100_000_000_00).default(0),
  discountNote: z
    .string()
    .trim()
    .max(200)
    .nullish()
    .transform((v) => v || null),
  /** Operate only. Null falls back to the rate card. */
  monthlyAmount: z.number().int().min(0).max(100_000_000_00).nullish().transform((v) => v ?? null),
  /** Operate only. Null bills the first month once onboarding is done. */
  monthlyStartsOn: z.coerce.date().nullish().transform((v) => v ?? null),
  terms: z.string().trim().min(10).max(4000),
});
export type ProposalEdit = z.input<typeof ProposalEdit>;

export async function updateProposalDraft(db: DB, actor: Actor | null, proposalId: string, edit: ProposalEdit) {
  assertStaff(actor);
  const data = ProposalEdit.parse(edit);
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(proposals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(proposals.id, proposalId), eq(proposals.status, "draft")))
      .returning();
    if (!row) throw new ProposalError("Only drafts can be edited.", "NOT_EDITABLE");
    await audit(tx, { actorId: actor.userId, action: "proposal.edited", subjectType: "proposal", subjectId: proposalId });
    return row;
  });
}

/** Floor for this proposal's pricing, based on the size the recommendation assessed. */
export async function pricingFloorFor(db: DB, proposal: Proposal): Promise<number> {
  let size: ProjectSize = "small";
  if (proposal.recommendationId) {
    const [rec] = await db.select().from(recommendations).where(eq(recommendations.id, proposal.recommendationId));
    if (rec) size = rec.size as ProjectSize;
  }
  return priceFloor(proposal.path, size, proposalCurrency(proposal));
}

/**
 * Owner approval is the only way a proposal reaches a client. Approving also
 * sets up the client's organisation and Hub access from the lead's record.
 */
export async function approveAndSendProposal(
  db: DB,
  actor: Actor | null,
  proposalId: string,
  opts: { pricingOverrideNote?: string } = {},
) {
  assertOwner(actor);
  const [proposal] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
  if (!proposal) throw new ProposalError("Proposal not found", "NOT_FOUND");
  if (proposal.status !== "draft") throw new ProposalError("This proposal has already been sent.", "NOT_EDITABLE");
  ProposalEdit.parse(proposal);

  // The guideline is advice: the owner sets the price. Going below it is noted in the audit history.
  const floor = await pricingFloorFor(db, proposal);
  const belowGuideline = proposalSubtotal(proposal) < floor;
  const overrideNote = belowGuideline
    ? opts.pricingOverrideNote?.trim() || `Owner's price, below the ${formatMoney(floor, proposalCurrency(proposal))} guideline.`
    : null;

  const result = await db.transaction(async (tx) => {
    const [lead] = await tx.select().from(leads).where(eq(leads.id, proposal.leadId));
    // Leads added by hand from a conversation may not have an email yet.
    const email = lead.email;
    if (!email) throw new ProposalError("Add the client's email on the lead page before sending.", "NO_CLIENT_EMAIL");

    let orgId = lead.clientOrgId;
    if (!orgId) {
      const [org] = await tx.insert(organizations).values({ name: lead.company, kind: "client" }).returning();
      orgId = org.id;
      await audit(tx, { actorId: actor.userId, orgId, action: "org.created", subjectType: "organization", subjectId: orgId });
    }

    const [existingUser] = await tx.select().from(users).where(eq(users.email, email));
    const contact = existingUser ?? (await tx.insert(users).values({ email, name: lead.name }).returning())[0];
    // Until they choose their own password, every proposal email carries a fresh one-time password.
    const needsPassword = !contact.passwordSetAt;
    await tx
      .insert(memberships)
      .values({ userId: contact.id, orgId, role: "client_admin" })
      .onConflictDoNothing();

    const now = new Date();
    const [sent] = await tx
      .update(proposals)
      .set({
        status: "sent",
        clientOrgId: orgId,
        approvedBy: actor.userId,
        approvedAt: now,
        sentAt: now,
        pricingOverrideNote: overrideNote,
        updatedAt: now,
      })
      .where(and(eq(proposals.id, proposalId), eq(proposals.status, "draft")))
      .returning();
    if (!sent) throw new ProposalError("This proposal has already been sent.", "NOT_EDITABLE");

    await tx
      .update(leads)
      .set({ status: "proposal_sent", clientOrgId: orgId, nextAction: "Waiting for the client's decision", updatedAt: now })
      .where(eq(leads.id, lead.id));
    await audit(tx, {
      actorId: actor.userId,
      orgId,
      action: "proposal.approved_and_sent",
      subjectType: "proposal",
      subjectId: proposalId,
      data: { total: proposalTotal(sent), currency: sent.currency, pricingOverrideNote: overrideNote },
    });
    return { proposal: sent, clientEmail: contact.email, contactId: contact.id, needsPassword };
  });
  const p = result.proposal;
  await afterResponse(async () => {
    let privateFor: PrivateLines | undefined;
    // A password is only worth making if we can email it.
    if (result.needsPassword && emailConfigured()) {
      try {
        const { issueOneTimePassword } = await import("@/lib/supabase/admin");
        const password = await issueOneTimePassword(result.clientEmail);
        if (password) {
          await db.update(users).set({ mustChangePassword: true }).where(eq(users.id, result.contactId));
          privateFor = {
            email: result.clientEmail,
            lines: [signInSteps(result.clientEmail, password)],
            logged: signInSteps(result.clientEmail, "[one-time password, not stored]"),
          };
        }
      } catch (err) {
        // They can still sign in with an email link.
        console.error("[proposals] one-time password failed", err instanceof Error ? err.message : err);
      }
    }
    await notifyClient(
      db,
      p.clientOrgId!,
      {
        subject: `Your proposal from amfire: ${p.title}`,
        lines: [
          `Your proposal for ${p.title} is ready: the scope, milestones, price and timeline, all in one place.`,
          privateFor
            ? "You can read it, accept it or ask for changes in your Client Hub."
            : `You can read it, accept it or ask for changes in your Client Hub. To sign in, open the link below, enter this email address and choose "Email link": we'll email you a one-time sign-in link. If you've set a password, use that instead.`,
        ],
        path: `/hub/proposals/${p.id}`,
        action: "Read your proposal",
      },
      { privateFor },
    );
  });
  return { proposal: result.proposal, clientEmail: result.clientEmail };
}

/** How to sign in the first time, with the one-time password. */
export function signInSteps(email: string, password: string) {
  return [
    "How to sign in the first time:",
    `1. Open the link below (or go to ${site.url}/login).`,
    `2. Choose "Password" and enter your email: ${email}`,
    `3. Enter your one-time password: ${password}`,
    "4. Choose your own password. You'll be asked to do this once, then you'll use it from now on.",
    `Prefer no password? Choose "Email link" instead and we'll email you a one-time sign-in link.`,
  ].join("\n");
}

/** Drafts only: a sent proposal is withdrawn by revising it, so the client's record stays intact. */
export async function deleteProposalDraft(db: DB, actor: Actor | null, proposalId: string) {
  assertStaff(actor);
  return db.transaction(async (tx) => {
    const [gone] = await tx
      .delete(proposals)
      .where(and(eq(proposals.id, proposalId), eq(proposals.status, "draft")))
      .returning();
    if (!gone) throw new ProposalError("Only drafts can be deleted.", "NOT_EDITABLE");
    await audit(tx, { actorId: actor.userId, action: "proposal.deleted", subjectType: "proposal", subjectId: gone.id, data: { title: gone.title } });
    return gone;
  });
}

// --- The owner's own PDF ------------------------------------------------------

export const PROPOSAL_FILE_MAX_BYTES = 4 * 1024 * 1024;

/** Attaches (or replaces) the PDF on a draft. */
export async function attachProposalFile(db: DB, actor: Actor | null, proposalId: string, file: { name: string; bytes: Buffer }) {
  assertStaff(actor);
  if (file.bytes.length === 0) throw new ProposalError("Choose a PDF file.", "INVALID");
  if (file.bytes.length > PROPOSAL_FILE_MAX_BYTES) throw new ProposalError("The PDF must be 4 MB or smaller.", "INVALID");
  if (file.bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new ProposalError("That file isn't a PDF.", "INVALID");
  const name = file.name.replace(/[^\w .()-]/g, "_").slice(0, 120) || "proposal.pdf";
  return db.transaction(async (tx) => {
    const [p] = await tx.select({ status: proposals.status }).from(proposals).where(eq(proposals.id, proposalId));
    if (!p) throw new ProposalError("Proposal not found", "NOT_FOUND");
    if (p.status !== "draft") throw new ProposalError("The PDF can only be changed on a draft.", "NOT_EDITABLE");
    await tx.delete(proposalFiles).where(eq(proposalFiles.proposalId, proposalId));
    const [row] = await tx
      .insert(proposalFiles)
      .values({ proposalId, name, size: file.bytes.length, content: file.bytes, uploadedBy: actor.userId })
      .returning({ id: proposalFiles.id, name: proposalFiles.name, size: proposalFiles.size });
    await audit(tx, { actorId: actor.userId, action: "proposal.file_attached", subjectType: "proposal", subjectId: proposalId, data: { name, size: row.size } });
    return row;
  });
}

export async function removeProposalFile(db: DB, actor: Actor | null, proposalId: string) {
  assertStaff(actor);
  const [p] = await db.select({ status: proposals.status }).from(proposals).where(eq(proposals.id, proposalId));
  if (!p || p.status !== "draft") throw new ProposalError("The PDF can only be changed on a draft.", "NOT_EDITABLE");
  await db.delete(proposalFiles).where(eq(proposalFiles.proposalId, proposalId));
  await audit(db, { actorId: actor.userId, action: "proposal.file_removed", subjectType: "proposal", subjectId: proposalId });
}

/** Name and size only, for showing the attachment without loading it. */
export async function proposalFileInfo(db: DB, proposalId: string) {
  const [row] = await db
    .select({ name: proposalFiles.name, size: proposalFiles.size })
    .from(proposalFiles)
    .where(eq(proposalFiles.proposalId, proposalId));
  return row ?? null;
}

/**
 * The PDF through HQ (staff only) or through the Client Hub (only the client it
 * was sent to: staff get nothing there, so the two never mix).
 */
export async function getProposalFile(db: DB, actor: Actor | null, proposalId: string, via: "hq" | "hub") {
  if (!actor) return null;
  if (via === "hq" && !actor.internalRole) return null;
  if (via === "hub" && (actor.internalRole || !(await getClientProposal(db, actor, proposalId)))) return null;
  const [row] = await db.select().from(proposalFiles).where(eq(proposalFiles.proposalId, proposalId));
  return row ?? null;
}

/** The first bill on the chosen day: that date, or the same day of a later month if it has passed. */
export function firstBillOnOrAfter(startsOn: Date, now: Date): Date {
  const day = new Date(startsOn);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  while (day < today) day.setMonth(day.getMonth() + 1);
  return day;
}

/** Copy a sent/declined proposal into a new draft for revision. */
export async function reviseProposal(db: DB, actor: Actor | null, proposalId: string) {
  assertStaff(actor);
  const [p] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
  if (!p) throw new ProposalError("Proposal not found", "NOT_FOUND");
  return db.transaction(async (tx) => {
    if (p.status === "sent") {
      await tx.update(proposals).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(proposals.id, p.id));
    }
    const [draft] = await tx
      .insert(proposals)
      .values({
        leadId: p.leadId,
        recommendationId: p.recommendationId,
        clientOrgId: p.clientOrgId,
        path: p.path,
        title: p.title,
        summary: p.summary,
        scope: p.scope,
        outOfScope: p.outOfScope,
        assumptions: p.assumptions,
        milestones: p.milestones,
        currency: p.currency,
        discount: p.discount,
        discountNote: p.discountNote,
        monthlyAmount: p.monthlyAmount,
        monthlyStartsOn: p.monthlyStartsOn,
        terms: p.terms,
        createdBy: actor.userId,
      })
      .returning();
    const [file] = await tx.select().from(proposalFiles).where(eq(proposalFiles.proposalId, p.id));
    if (file) {
      await tx.insert(proposalFiles).values({ proposalId: draft.id, name: file.name, size: file.size, content: file.content, uploadedBy: file.uploadedBy });
    }
    await audit(tx, { actorId: actor.userId, action: "proposal.revised", subjectType: "proposal", subjectId: draft.id, data: { from: p.id } });
    return draft;
  });
}

// --- Client decisions -------------------------------------------------------

export async function getClientProposal(db: DB, actor: Actor | null, proposalId: string) {
  const [p] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
  // Drafts are internal. Return null rather than leaking existence.
  if (!p || !p.clientOrgId || p.status === "draft" || !actor?.clientOrgIds.includes(p.clientOrgId)) return null;
  return p;
}

export async function clientDecideProposal(
  db: DB,
  actor: Actor | null,
  proposalId: string,
  decision: { accept: true } | { accept: false; note: string },
) {
  const [p] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
  if (!p || !p.clientOrgId) throw new ProposalError("Proposal not found", "NOT_FOUND");
  assertClientOrg(actor, p.clientOrgId);
  const orgId = p.clientOrgId;

  return db.transaction(async (tx) => {
    const now = new Date();
    const [updated] = await tx
      .update(proposals)
      .set({
        status: decision.accept ? "accepted" : "declined",
        decidedBy: actor.userId,
        decidedAt: now,
        clientNote: decision.accept ? null : decision.note.trim(),
        updatedAt: now,
      })
      .where(and(eq(proposals.id, proposalId), eq(proposals.status, "sent")))
      .returning();
    if (!updated) throw new ProposalError("This proposal is no longer awaiting a decision.", "NOT_EDITABLE");

    if (!decision.accept) {
      await tx
        .update(leads)
        .set({ nextAction: "Client asked for changes — revise the proposal", updatedAt: now })
        .where(eq(leads.id, p.leadId));
      await audit(tx, { actorId: actor.userId, orgId, action: "proposal.changes_requested", subjectType: "proposal", subjectId: p.id });
      return { project: null };
    }

    // Accepted: the project and its milestones come straight from the agreed proposal.
    const [project] = await tx.insert(projects).values({ orgId, proposalId: p.id, name: p.title, currency: p.currency }).returning();
    let weeks = 0;
    await tx.insert(milestones).values(
      p.milestones.map((m, i) => {
        weeks += m.weeks;
        return {
          projectId: project.id,
          orgId,
          position: i,
          title: m.title,
          description: m.description,
          amount: m.amount,
          dueDate: new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000),
        };
      }),
    );
    await tx.insert(projectUpdates).values({
      projectId: project.id,
      orgId,
      authorId: actor.userId,
      body: "Proposal accepted. amfire will confirm the kick-off date and first tasks here.",
    });
    await tx
      .update(leads)
      .set({ status: "won", nextAction: "Kick off the project", updatedAt: now })
      .where(eq(leads.id, p.leadId));
    // Operate continues as a monthly plan once onboarding is done.
    if (p.path === "operate") {
      const [rec] = p.recommendationId ? await tx.select().from(recommendations).where(eq(recommendations.id, p.recommendationId)) : [];
      const size = (rec?.size ?? "small") as ProjectSize;
      const currency = isCurrency(p.currency) ? p.currency : PRICING_CURRENCY;
      await tx.insert(subscriptions).values({
        orgId,
        projectId: project.id,
        title: `${p.title} — monthly plan`,
        amount: p.monthlyAmount ?? OPERATE_RETAINER[size][currency],
        currency,
        startedAt: now,
        nextInvoiceAt: p.monthlyStartsOn
          ? firstBillOnOrAfter(p.monthlyStartsOn, now)
          : new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000),
      });
    }
    await audit(tx, { actorId: actor.userId, orgId, action: "proposal.accepted", subjectType: "proposal", subjectId: p.id, data: { projectId: project.id } });
    return { project };
  });
}
