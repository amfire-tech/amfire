import type { Metadata } from "next";
import { Container, Notice } from "@/components/ui";
import { site } from "@/config/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <div className="bg-subtle">
      <Container className="max-w-md py-12 sm:py-24">
        <div className="rounded-card bg-surface p-6 ring-1 ring-line sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">For AMFIRE clients and team members. No password needed.</p>
          {error === "expired" && (
            <div className="mt-5">
              <Notice tone="error">That sign-in link has expired or was already used. Request a new one below.</Notice>
            </div>
          )}
          <div className="mt-6">
            <LoginForm next={typeof next === "string" ? next : "/hub"} />
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
