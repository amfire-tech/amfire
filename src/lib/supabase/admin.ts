import "server-only";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

/**
 * Supabase admin client (service role). Used only on the server to create
 * sign-in links without Supabase sending the email, so AMFIRE sends it
 * through Resend instead and Supabase's hourly email limit doesn't apply.
 */
export function supabaseAdmin() {
  const config = supabaseConfig();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!config || !serviceKey) return null;
  return createClient(config.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

// No 0/O, 1/l/I: easy to copy from an email.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** A readable one-time password, e.g. "Kp7m-X2qR-9tNw". */
export function generateOneTimePassword(): string {
  const part = () => Array.from({ length: 4 }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join("");
  return `${part()}-${part()}-${part()}`;
}

/**
 * Gives an AMFIRE user a one-time password to sign in with (creating their
 * Supabase login if needed). They must change it on first sign-in.
 * Returns null when Supabase isn't set up (local development).
 */
export async function issueOneTimePassword(email: string): Promise<string | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  const password = generateOneTimePassword();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (!created.error) return password;
  // Already has a login: find it (generateLink returns the user) and set the password.
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.user) throw new Error(error?.message ?? "Couldn't find the sign-in account.");
  const updated = await admin.auth.admin.updateUserById(data.user.id, { password, email_confirm: true });
  if (updated.error) throw new Error(updated.error.message);
  return password;
}

/**
 * A one-time sign-in token for an existing AMFIRE user, as a hash our confirm
 * page verifies. Creates the Supabase login the first time someone signs in.
 */
export async function createSignInToken(email: string): Promise<string | null> {
  const admin = supabaseAdmin();
  if (!admin) return null;
  let { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error && /not.*found|no user/i.test(error.message)) {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error) throw new Error(created.error.message);
    ({ data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email }));
  }
  if (error) throw new Error(error.message);
  return data.properties?.hashed_token ?? null;
}
