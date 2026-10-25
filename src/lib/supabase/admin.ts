import "server-only";
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
