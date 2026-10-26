// The CA partner programme: each partner firm gets its own tracked link
// (/go/{slug}, channel "referral"), so every client it sends is credited to it,
// and the partner's 10% share of what those clients pay in their first year
// is worked out from real payments.

import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { DB } from "@/db";
import { contentPosts, invoices, leads, payments, prospects } from "@/db/schema";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";
import { trackedLink } from "./growth";
import { OutreachError } from "./outreach";

/** Partners earn this share of what referred clients pay in their first year. */
export const PARTNER_SHARE = 0.1;
const YEAR = 365 * 24 * 60 * 60 * 1000;

/** Gives a CA firm its referral link (once) and marks it a partner. */
export async function createPartnerLink(db: DB, actor: Actor | null, prospectId: string) {
  assertStaff(actor);
  const [p] = await db.select().from(prospects).where(eq(prospects.id, prospectId));
  if (!p) throw new OutreachError("Prospect not found.");
  if (p.referralPostId) {
    const [post] = await db.select().from(contentPosts).where(eq(contentPosts.id, p.referralPostId));
    if (post) return { post, url: trackedLink(post) };
  }
  const base = p.name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  const [post] = await db
    .insert(contentPosts)
    .values({ title: `Partner: ${p.name}`, channel: "referral", slug: `${base || "partner"}-${randomBytes(2).toString("hex")}`, targetPath: "/start", publishedAt: new Date(), createdBy: actor.userId })
    .returning();
  await db
    .update(prospects)
    .set({ referralPostId: post.id, status: p.status === "lead" ? p.status : "partner", nextFollowUpAt: null, updatedAt: new Date() })
    .where(eq(prospects.id, p.id));
  await audit(db, { actorId: actor.userId, action: "partner.link_created", subjectType: "prospect", subjectId: p.id, data: { slug: post.slug } });
  return { post, url: trackedLink(post) };
}

/** Each partner's link, clicks, referred leads, money collected from them in their first year, and the share owed. */
export async function getPartners(db: DB, actor: Actor | null) {
  assertStaff(actor);
  const rows = await db
    .select({ prospect: prospects, post: contentPosts })
    .from(prospects)
    .innerJoin(contentPosts, eq(contentPosts.id, prospects.referralPostId));
  if (rows.length === 0) return [];
  const referred = await db
    .select()
    .from(leads)
    .where(
      inArray(
        leads.utmContent,
        rows.map((r) => r.post.slug),
      ),
    );
  const orgIds = referred.map((l) => l.clientOrgId).filter((id): id is string => !!id);
  const paid = orgIds.length
    ? await db
        .select({ orgId: invoices.orgId, currency: invoices.currency, amount: payments.amount, receivedAt: payments.receivedAt })
        .from(payments)
        .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
        .where(inArray(invoices.orgId, orgIds))
    : [];
  return rows.map(({ prospect, post }) => {
    const theirs = referred.filter((l) => l.utmContent === post.slug);
    const collected: Record<string, number> = {};
    for (const l of theirs) {
      if (!l.clientOrgId) continue;
      for (const pay of paid.filter((x) => x.orgId === l.clientOrgId && x.receivedAt.getTime() - l.createdAt.getTime() <= YEAR)) {
        collected[pay.currency] = (collected[pay.currency] ?? 0) + pay.amount;
      }
    }
    const share = Object.fromEntries(Object.entries(collected).map(([cur, v]) => [cur, Math.round(v * PARTNER_SHARE)]));
    return {
      prospect: { id: prospect.id, name: prospect.name, contactName: prospect.contactName, phone: prospect.phone },
      link: trackedLink(post),
      clicks: post.clicks,
      leads: theirs.length,
      won: theirs.filter((l) => l.status === "won").length,
      collected,
      share,
    };
  });
}
