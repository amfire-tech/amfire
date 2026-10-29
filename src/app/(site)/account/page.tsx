import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, Notice } from "@/components/ui";
import { getActor } from "@/lib/session";
import { supabaseConfig } from "@/lib/supabase/config";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { next } = await searchParams;
  const safeNext = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
  // Not requireActor: it sends anyone who must change their password here.
  const actor = await getActor();
  if (!actor) redirect("/login?next=/account");
  const firstTime = actor.mustChangePassword;
  return (
    <div className="bg-subtle">
      <Container className="max-w-md py-12 sm:py-20">
        <div className="rounded-card bg-surface p-6 ring-1 ring-line sm:p-8">
          {!firstTime && (
            <p className="mb-3 text-sm text-muted">
              <Link href={actor.internalRole ? "/hq" : "/hub"} className="hover:underline">
                ← Back to {actor.internalRole ? "HQ" : "your Client Hub"}
              </Link>
            </p>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">{firstTime ? "Choose your password" : "Your password"}</h1>
          <p className="mt-2 text-sm text-muted">
            Signed in as <strong className="text-fg">{actor.email}</strong>.{" "}
            {firstTime
              ? "You signed in with a one-time password. Choose your own to continue; you'll use it from now on."
              : "With a password you can sign in without waiting for an email."}
          </p>
          <div className="mt-6">
            {supabaseConfig() ? (
              <PasswordForm next={safeNext} />
            ) : (
              <Notice>Passwords are available on the live site. Locally, use the on-screen sign-in link.</Notice>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
