import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Fixed-window limiter stored in Postgres, so it holds across serverless
 * instances. IPs are hashed before storage.
 */
export async function rateLimit(name: string, limit: number, windowMs: number): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const key = `${name}:${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    const db = await getDb();
    const [row] = await db
      .insert(rateLimits)
      .values({ key, windowStart: now, count: 1 })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${rateLimits.windowStart} < ${windowStart} THEN 1 ELSE ${rateLimits.count} + 1 END`,
          windowStart: sql`CASE WHEN ${rateLimits.windowStart} < ${windowStart} THEN ${now} ELSE ${rateLimits.windowStart} END`,
        },
      })
      .returning({ count: rateLimits.count });
    return row.count <= limit;
  } catch (err) {
    // Never block a real visitor because the limiter itself failed.
    console.error("rate limit check failed", err);
    return true;
  }
}
