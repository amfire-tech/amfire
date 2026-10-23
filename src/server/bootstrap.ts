import { eq } from "drizzle-orm";
import type { DB } from "@/db";
import { memberships, organizations, users } from "@/db/schema";

export const DEFAULT_OWNER_EMAIL = "owner@amfire.local";

/**
 * Ensures the internal AMFIRE organisation and its owner exist.
 * The owner's email comes from OWNER_EMAIL (defaults to a local test address).
 */
export async function bootstrap(db: DB) {
  const existing = await db.select().from(organizations).where(eq(organizations.kind, "internal")).limit(1);
  if (existing.length > 0) return existing[0];

  const email = (process.env.OWNER_EMAIL ?? DEFAULT_OWNER_EMAIL).trim().toLowerCase();
  const name = process.env.OWNER_NAME ?? "AMFIRE Owner";

  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({ name: "AMFIRE", kind: "internal" }).returning();
    const [found] = await tx.select().from(users).where(eq(users.email, email));
    const owner = found ?? (await tx.insert(users).values({ email, name }).returning())[0];
    await tx.insert(memberships).values({ userId: owner.id, orgId: org.id, role: "owner" });
    return org;
  });
}
