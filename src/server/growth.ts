// Growth: which channels and posts bring leads and money. Each LinkedIn post
// gets its own tracked link, so a booking can be traced back to the post.

import { randomBytes } from "node:crypto";
import { desc, eq, gte, sql } from "drizzle-orm";
import * as z from "zod";
import type { DB } from "@/db";
import { contentPosts, invoices, leads, payments, type ContentPost } from "@/db/schema";
import { site } from "@/config/site";
import { assertStaff, type Actor } from "./access";
import { audit } from "./audit";

export const PostInput = z.object({
  title: z.string().trim().min(3, "Give the post a short name.").max(200),
  postUrl: z.union([z.literal("").transform(() => undefined), z.url("Paste the post's link, or leave it empty.")]).optional(),
  targetPath: z
    .string()
    .trim()
    .regex(/^\/[a-z0-9/_-]*$/i, "Use a page on the site, like /start.")
    .default("/start"),
});

export async function createPost(db: DB, actor: Actor | null, input: z.input<typeof PostInput>) {
  assertStaff(actor);
  const data = PostInput.parse(input);
  const slug = `${data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)}-${randomBytes(2).toString("hex")}`;
  const [post] = await db
    .insert(contentPosts)
    .values({ title: data.title, postUrl: data.postUrl ?? null, targetPath: data.targetPath, slug, publishedAt: new Date(), createdBy: actor.userId })
    .returning();
  await audit(db, { actorId: actor.userId, action: "post.created", subjectType: "post", subjectId: post.id });
  return post;
}

export function trackedLink(post: Pick<ContentPost, "slug">) {
  return `${site.url}/go/${post.slug}`;
}

/** Where /go/{slug} sends a visitor, counting the click. Null for unknown slugs. */
export async function followTrackedLink(db: DB, slug: string) {
  const [post] = await db
    .update(contentPosts)
    .set({ clicks: sql`${contentPosts.clicks} + 1` })
    .where(eq(contentPosts.slug, slug))
    .returning();
  if (!post) return null;
  // A partner's link (channel "referral") is credited as a referral, a post's as social.
  const referral = post.channel === "referral";
  const params = new URLSearchParams({ utm_source: post.channel, utm_medium: referral ? "referral" : "social", utm_campaign: referral ? "partner" : "post", utm_content: post.slug });
  return `${post.targetPath}?${params.toString()}`;
}

export async function getGrowth(db: DB, actor: Actor | null, now = new Date()) {
  assertStaff(actor);
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const [ls, posts, paid] = await Promise.all([
    db.select().from(leads).where(gte(leads.createdAt, since)),
    db.select().from(contentPosts).orderBy(desc(contentPosts.createdAt)),
    // Money collected from each lead's client organisation, to rank channels by revenue.
    db
      .select({ orgId: invoices.orgId, currency: invoices.currency, amount: payments.amount })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId)),
  ]);
  const thirty = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const channels = new Map<string, { leads30: number; leads90: number; won: number; revenue: Record<string, number> }>();
  for (const l of ls) {
    const c = channels.get(l.source) ?? { leads30: 0, leads90: 0, won: 0, revenue: {} };
    c.leads90 += 1;
    if (l.createdAt >= thirty) c.leads30 += 1;
    if (l.status === "won") c.won += 1;
    if (l.clientOrgId) {
      for (const p of paid.filter((x) => x.orgId === l.clientOrgId)) c.revenue[p.currency] = (c.revenue[p.currency] ?? 0) + p.amount;
    }
    channels.set(l.source, c);
  }
  const postStats = posts.map((post) => {
    const fromPost = ls.filter((l) => l.utmContent === post.slug);
    return { post, leads: fromPost.length, won: fromPost.filter((l) => l.status === "won").length };
  });
  return {
    channels: [...channels.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.leads90 - a.leads90),
    posts: postStats,
    totalLeads30: ls.filter((l) => l.createdAt >= thirty).length,
  };
}
