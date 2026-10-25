import type { Metadata } from "next";
import Link from "next/link";
import { Container, Notice } from "@/components/ui";
import { requireActor } from "@/lib/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage() {
  const actor = await requireActor("/account");
  return (
    <div className="bg-subtle">
      <Container className="max-w-md py-12 sm:py-20">
        <div className="rounded-card bg-surface p-6 ring-1 ring-line sm:p-8">
          <p className="text-sm text-muted">
            <Link href={actor.internalRole ? "/hq" : "/hub"} className="hover:underline">
              ← Back to {actor.internalRole ? "HQ" : "your Client Hub"}
            </Link>
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Your password</h1>
          <p className="mt-2 text-sm text-muted">
            Signed in as <strong className="text-fg">{actor.email}</strong>. With a password you can sign in without waiting for an email.
          </p>
          <div className="mt-6">
            {supabaseConfig() ? <PasswordForm /> : <Notice>Passwords are available on the live site. Locally, use the on-screen sign-in link.</Notice>}
          </div>
        </div>
      </Container>
    </div>
  );
}
