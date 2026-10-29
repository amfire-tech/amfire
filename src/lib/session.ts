import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { loadActor, type Actor } from "@/server/access";
import { deleteSession, findSessionUser, normalizeEmail, SESSION_TTL_MS } from "@/server/auth";
import { createSupabaseServer } from "./supabase/server";

// Two sign-in modes behind one interface:
// - Supabase Auth (magic-link email) when NEXT_PUBLIC_SUPABASE_* is set.
// - A local one-time-link fallback for development without Supabase.
// Either way, roles and organisation access come from our own database.

const DEV_COOKIE = "amfire_session";

/** The signed-in actor for this request, or null. Cached per request. */
export const getActor = cache(async (): Promise<Actor | null> => {
  // Read the request's cookies first: this marks the route as dynamic, so it
  // is never prerendered at build time.
  const jar = await cookies();
  const supabase = await createSupabaseServer();
  const db = await getDb();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) return null;
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
    return user ? loadActor(db, user) : null;
  }

  const token = jar.get(DEV_COOKIE)?.value;
  if (!token) return null;
  const user = await findSessionUser(db, token);
  return user ? loadActor(db, user) : null;
});

export async function requireActor(next = "/hub"): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/login?next=${encodeURIComponent(next)}`);
  // Signed in with the one-time password from an email: choose a password first.
  if (actor.mustChangePassword) redirect(`/account?next=${encodeURIComponent(next)}`);
  return actor;
}

/**
 * Where a Client Hub link goes when the signed-in account may not see it: the
 * session is signed out and the person signs in again, landing back on `next`.
 * Nothing about the page (or whether it exists) is shown to the wrong account.
 */
export function switchAccountUrl(next: string) {
  return `/auth/switch?next=${encodeURIComponent(next)}`;
}

/** The Client Hub is for client accounts only; anyone else (including AMFIRE staff) must sign in as the client. */
export async function requireClientActor(next: string): Promise<Actor> {
  const actor = await requireActor(next);
  if (actor.internalRole || actor.clientOrgIds.length === 0) redirect(switchAccountUrl(next));
  return actor;
}

export async function requireStaffActor(): Promise<Actor & { internalRole: "owner" | "staff" }> {
  const actor = await requireActor("/hq");
  if (!actor.internalRole) redirect("/hub");
  return actor as Actor & { internalRole: "owner" | "staff" };
}

/** Development fallback only. */
export async function setDevSessionCookie(token: string) {
  (await cookies()).set(DEV_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endSession() {
  const supabase = await createSupabaseServer();
  if (supabase) await supabase.auth.signOut();
  const jar = await cookies();
  const token = jar.get(DEV_COOKIE)?.value;
  if (token) await deleteSession(await getDb(), token);
  jar.delete(DEV_COOKIE);
}
