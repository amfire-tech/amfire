// Passwordless sign-in with one-time links and server-side sessions.
// Tokens are random, single-use and stored only as SHA-256 hashes.
// This module is deliberately small so it can be swapped for a managed
// authentication provider without touching the rest of the app.

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { DB } from "@/db";
import { loginTokens, sessions, users } from "@/db/schema";
import { audit } from "./audit";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Creates a one-time sign-in token if the email belongs to a known user.
 * Returns null otherwise — callers must not reveal which case occurred.
 */
export async function createLoginToken(db: DB, email: string): Promise<string | null> {
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  if (!user) return null;
  const token = newToken();
  await db.insert(loginTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
  });
  return token;
}

/** Exchanges a valid, unused login token for a new session token. */
export async function consumeLoginToken(db: DB, token: string): Promise<{ sessionToken: string; userId: string } | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(loginTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(loginTokens.tokenHash, hashToken(token)),
          isNull(loginTokens.usedAt),
          gt(loginTokens.expiresAt, new Date()),
        ),
      )
      .returning();
    if (!row) return null;

    const sessionToken = newToken();
    await tx.insert(sessions).values({
      userId: row.userId,
      tokenHash: hashToken(sessionToken),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });
    await audit(tx, { actorId: row.userId, action: "auth.signed_in", subjectType: "user", subjectId: row.userId });
    return { sessionToken, userId: row.userId };
  });
}

export async function findSessionUser(db: DB, sessionToken: string) {
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(sessionToken)), gt(sessions.expiresAt, new Date())));
  return row ?? null;
}

export async function deleteSession(db: DB, sessionToken: string) {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(sessionToken)));
}
