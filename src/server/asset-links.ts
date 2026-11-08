// Tracked report links. Each prospect's personal asset (a readiness report or
// check, often a Drive or PDF link) goes out as {site}/r/{linkToken}. That page
// reports the open from the browser and forwards to the asset, so WhatsApp's
// and Gmail's link previews don't count, and alerts the owner to call.

import { eq, sql } from "drizzle-orm";
import type { DB } from "@/db";
import { prospects, type Prospect } from "@/db/schema";
import { site } from "@/config/site";
import { alertOpen, OPEN_ALERT_GAP } from "./open-alerts";

const TOKEN = /^[a-z0-9]{6,32}$/;

/** Link checkers and previewers that may run a page's script; real people don't send these. */
const BOT_AGENT = /bot|crawl|spider|preview|scan|facebookexternalhit|whatsapp|slack|telegram|skype|discord|headless|lighthouse|python|curl|wget|go-http|java\/|node-fetch|axios/i;

export const isAutomatedAgent = (userAgent: string | null | undefined) => !userAgent || BOT_AGENT.test(userAgent);

/** Demo pages count their own views; wrapping them would alert twice. */
const ownDemo = (url: string) => url.startsWith(`${site.url}/demo/`);

/** The link to send for this prospect's asset: tracked when it's an outside link, null when there's no asset. */
export function trackedAssetUrl(p: Pick<Prospect, "assetUrl" | "linkToken">) {
  if (!p.assetUrl) return null;
  return ownDemo(p.assetUrl) ? p.assetUrl : `${site.url}/r/${p.linkToken}`;
}

/** Swaps the raw asset link for the tracked one wherever it appears in a message or email. */
export function withTrackedAsset<T>(value: T, p: Pick<Prospect, "assetUrl" | "linkToken">): T {
  const tracked = trackedAssetUrl(p);
  if (!p.assetUrl || !tracked || tracked === p.assetUrl) return value;
  const raw = p.assetUrl;
  const swap = (v: unknown): unknown =>
    typeof v === "string" ? v.split(raw).join(tracked) : Array.isArray(v) ? v.map(swap) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v;
  return swap(value) as T;
}

/** What the /r page needs: where to forward and whose it is. Null for an unknown token or no asset. */
export async function getAssetLink(db: DB, token: string) {
  if (!TOKEN.test(token)) return null;
  const [p] = await db.select({ name: prospects.name, assetUrl: prospects.assetUrl }).from(prospects).where(eq(prospects.linkToken, token));
  if (!p?.assetUrl || !/^https?:\/\//i.test(p.assetUrl)) return null;
  return { target: p.assetUrl, org: p.name.replace(/\s*\(.*?\)\s*/g, " ").trim() };
}

/**
 * Counts a real open of the link and, on the first open or after an hour's
 * gap, alerts the owner. Staff opening it (testing the link) and automated
 * agents aren't counted.
 */
export async function recordAssetOpen(db: DB, token: string, opts: { viewerIsStaff?: boolean; userAgent?: string | null; now?: Date } = {}) {
  if (opts.viewerIsStaff || isAutomatedAgent(opts.userAgent) || !TOKEN.test(token)) return { counted: false, alerted: false };
  const now = opts.now ?? new Date();
  const [before] = await db.select().from(prospects).where(eq(prospects.linkToken, token));
  if (!before?.assetUrl) return { counted: false, alerted: false };
  const [p] = await db
    .update(prospects)
    .set({ linkOpens: sql`${prospects.linkOpens} + 1`, linkFirstOpenedAt: before.linkFirstOpenedAt ?? now, linkLastOpenedAt: now })
    .where(eq(prospects.id, before.id))
    .returning();
  const alert = !before.linkLastOpenedAt || now.getTime() - before.linkLastOpenedAt.getTime() > OPEN_ALERT_GAP;
  if (!alert) return { counted: true, alerted: false };
  const what = p.kind === "ca_firm" ? "readiness check" : p.kind === "manufacturer" ? "plant study" : "report";
  const label = p.linkOpens === 1 ? `Opened their ${what} for the first time` : `Opened their ${what} again (open ${p.linkOpens})`;
  await alertOpen(db, p, label, now, what);
  return { counted: true, alerted: true };
}
