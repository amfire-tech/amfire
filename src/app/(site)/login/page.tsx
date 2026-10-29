import type { Metadata } from "next";
import { Container, Notice } from "@/components/ui";
import { site } from "@/config/site";
import { supabaseConfig } from "@/lib/supabase/config";
import { googleSignInEnabled } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const ERRORS: Record<string, string> = {
  expired: "That sign-in link has expired or was already used. Request a new one below.",
  "no-access": "That account doesn't have access to amfire yet. Use the email address we have for you, or contact us.",
  google: "Google sign-in couldn't start. Try again, or use your password or an email link.",
  switch: "Please sign in with the email address this link was sent to.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const passwordEnabled = supabaseConfig() !== null;
  const googleEnabled = await googleSignInEnabled();
  return (
    <div className="bg-subtle">
      <Container className="max-w-md py-12 sm:py-24">
        <div className="rounded-card bg-surface p-6 ring-1 ring-line sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">For amfire clients and team members.</p>
          {typeof error === "string" && ERRORS[error] && (
            <div className="mt-5">
              <Notice tone="error">{ERRORS[error]}</Notice>
            </div>
          )}
          <div className="mt-6">
            <LoginForm next={typeof next === "string" ? next : ""} passwordEnabled={passwordEnabled} googleEnabled={googleEnabled} />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Trouble signing in?{" "}
          <a href={`mailto:${site.contactEmail}`} className="font-medium text-fg underline underline-offset-4">
            Contact a person
          </a>
        </p>
      </Container>
    </div>
  );
}
