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
import { loadActor } from "@/server/access";
import { audit } from "@/server/audit";
import { consumeLoginToken, createLoginToken, normalizeEmail } from "@/server/auth";

export type LoginState = { sent?: boolean; devLink?: string; error?: string } | undefined;

function safeNext(next: unknown): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/**
 * Where sign-in links point. In production always the site's own domain, so a
 * link never lands on the *.vercel.app address; locally, wherever you are.
 */
async function origin() {
  if (process.env.VERCEL_ENV === "production") return site.url;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : site.url;
}

/** Staff land in HQ and clients in their Hub, unless the link asked for a page. */
async function landingFor(email: string, next: string | null) {
  if (next) return next;
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email)));
  if (!user) return "/hub";
  return (await loadActor(db, user)).internalRole ? "/hq" : "/hub";
}

/** Signs in only people who already have an AMFIRE account; anyone else is signed straight back out. */
async function admit(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServer>>>, email: string | undefined, next: string | null): Promise<never> {
  const db = await getDb();
  const [user] = email ? await db.select().from(users).where(eq(users.email, normalizeEmail(email))) : [];
  if (!user) {
    await supabase.auth.signOut();
    redirect("/login?error=no-access");
  }
  await audit(db, { actorId: user.id, action: "auth.signed_in", subjectType: "user", subjectId: user.id });
  redirect(await landingFor(user.email, next));
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
      options: { shouldCreateUser: true, emailRedirectTo: `${await origin()}/auth/verify${next ? `?next=${encodeURIComponent(next)}` : ""}` },
    });
    if (error) {
      console.error("[auth] Supabase signInWithOtp failed", error.message);
      // Supabase's built-in email sender allows only a few emails an hour.
      if (error.status === 429 || /rate limit/i.test(error.message)) {
        return { error: "Too many sign-in emails for now. Sign in with your password or Google instead, or try again in an hour." };
      }
      return { error: "We couldn't send the email just now. Please try again in a minute." };
    }
    return { sent: true };
  }

  // Development fallback: show the link on screen.
  const token = await createLoginToken(db, email);
  if (!token || process.env.NODE_ENV === "production") return { sent: true };
  return { sent: true, devLink: `/auth/verify?token=${encodeURIComponent(token)}${next ? `&next=${encodeURIComponent(next)}` : ""}` };
}

/** Email + password sign-in, for people who set a password after signing in once. No email is sent. */
export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim());
  const password = String(formData.get("password") ?? "");
  if (!email.success || !password) return { error: "Enter your email and password." };
  if (!(await rateLimit("login", 10, 15 * 60 * 1000))) return { error: "Too many attempts. Please wait a few minutes." };
  const supabase = await createSupabaseServer();
  if (!supabase) return { error: "Password sign-in isn't available here. Use the email link." };
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email.data), password });
  if (error || !data.user) return { error: "That email and password don't match. If you haven't set a password yet, use the email link once and set one in Account." };
  return admit(supabase, data.user.email, safeNext(formData.get("next")));
}

/** Starts "Continue with Google"; Google sends the person back to /auth/callback. */
export async function signInWithGoogle(formData: FormData) {
  const supabase = await createSupabaseServer();
  if (!supabase) redirect("/login");
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    console.error("[auth] Google sign-in failed to start", error?.message);
    redirect("/login?error=google");
  }
  redirect(data.url);
}

export type PasswordState = { ok?: string; error?: string } | undefined;

/** Lets a signed-in person set or change their password, so later sign-ins need no email. */
export async function setPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const supabase = await createSupabaseServer();
  if (!supabase) return { error: "Passwords aren't available here." };
  const { data: current } = await supabase.auth.getUser();
  if (!current.user) return { error: "Please sign in again first." };
  const password = String(formData.get("password") ?? "");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes("different") ? "Choose a password you haven't used before." : "Couldn't save the password. Please try again." };
  return { ok: "Password saved. Next time, sign in with your email and this password." };
}

/** Completes Google (or any OAuth) sign-in: exchanges the code and admits only existing accounts. */
export async function completeOAuth(code: string, next: string | null) {
  const supabase = await createSupabaseServer();
  if (!supabase || !code) redirect("/login");
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    console.error("[auth] OAuth sign-in failed", error?.message);
    redirect("/login?error=expired");
  }
  return admit(supabase, data.user.email, safeNext(next));
}

const OTP_TYPES = ["email", "magiclink", "signup", "invite"] as const;

/** Completes sign-in after the person presses "Continue" on the confirm page. */
export async function completeSignIn(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const tokenHash = String(formData.get("token_hash") ?? "");
  const code = String(formData.get("code") ?? "");
  const supabase = await createSupabaseServer();

  if (supabase && (tokenHash || code)) {
    const typeRaw = String(formData.get("type") ?? "email");
    const type = (OTP_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as (typeof OTP_TYPES)[number]) : "email";
    // The custom email template sends a token hash (works on any device); Supabase's
    // default template sends a code, which works in the browser that asked for the link.
    const { data, error } = tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user?.email) {
      console.error("[auth] sign-in confirmation failed", error?.message);
      redirect("/login?error=expired");
    }
    return admit(supabase, data.user.email, next);
  }

  const token = String(formData.get("token") ?? "");
  const db = await getDb();
  const result = token && !supabase ? await consumeLoginToken(db, token) : null;
  if (!result) redirect("/login?error=expired");
  await setDevSessionCookie(result.sessionToken);
  const [user] = await db.select().from(users).where(eq(users.id, result.userId));
  redirect(await landingFor(user?.email ?? "", next));
}

export async function signOut() {
  await endSession();
  redirect("/");
}
