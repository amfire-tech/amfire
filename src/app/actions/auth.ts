"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";
import { site } from "@/config/site";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { endSession, setDevSessionCookie } from "@/lib/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { audit } from "@/server/audit";
import { consumeLoginToken, createLoginToken, normalizeEmail } from "@/server/auth";

export type LoginState = { sent?: boolean; devLink?: string; error?: string } | undefined;

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/hub";
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : site.url;
}

export async function requestLoginLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: "Please enter a valid email address." };
  if (!(await rateLimit("login", 10, 15 * 60 * 1000))) return { error: "Too many attempts. Please wait a few minutes." };

  const email = normalizeEmail(parsed.data);
  const next = safeNext(formData.get("next"));
  const db = await getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  // Same response whether or not the account exists.
  if (!user) return { sent: true };

  const supabase = await createSupabaseServer();
  if (supabase) {
    // Links land on our confirm page, which needs a button press — email
    // scanners that pre-open links cannot use up the sign-in.
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${await origin()}/auth/verify?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      console.error("[auth] Supabase signInWithOtp failed", error.message);
      return { error: "We couldn't send the email just now. Please try again in a minute." };
    }
    return { sent: true };
  }

  // Development fallback: show the link on screen.
  const token = await createLoginToken(db, email);
  if (!token || process.env.NODE_ENV === "production") return { sent: true };
  return { sent: true, devLink: `/auth/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}` };
}

const OTP_TYPES = ["email", "magiclink", "signup", "invite"] as const;

/** Completes sign-in after the person presses "Continue" on the confirm page. */
export async function completeSignIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const tokenHash = String(formData.get("token_hash") ?? "");
  const supabase = await createSupabaseServer();

  if (supabase && tokenHash) {
    const typeRaw = String(formData.get("type") ?? "email");
    const type = (OTP_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as (typeof OTP_TYPES)[number]) : "email";
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error || !data.user?.email) redirect("/login?error=expired");
    const db = await getDb();
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(data.user.email)));
    if (user) await audit(db, { actorId: user.id, action: "auth.signed_in", subjectType: "user", subjectId: user.id });
    redirect(next);
  }

  const token = String(formData.get("token") ?? "");
  const result = token && !supabase ? await consumeLoginToken(await getDb(), token) : null;
  if (!result) redirect("/login?error=expired");
  await setDevSessionCookie(result.sessionToken);
  redirect(next);
}

export async function signOut() {
  await endSession();
  redirect("/");
}
