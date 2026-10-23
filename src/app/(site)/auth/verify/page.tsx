import type { Metadata } from "next";
import { completeSignIn } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Confirm sign in", robots: { index: false } };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const params = await searchParams;
  return (
    <div className="bg-subtle">
      <Container className="max-w-md py-16 sm:py-24">
        <form action={completeSignIn} className="rounded-card bg-surface p-6 text-center ring-1 ring-line sm:p-8">
          {/* Local fallback uses `token`; Supabase magic links use `token_hash` + `type`. */}
          <input type="hidden" name="token" value={str(params.token)} />
          <input type="hidden" name="token_hash" value={str(params.token_hash)} />
          <input type="hidden" name="type" value={str(params.type) || "email"} />
          <input type="hidden" name="next" value={str(params.next) || "/hub"} />
          <h1 className="text-2xl font-semibold tracking-tight">Confirm sign in</h1>
          <p className="mt-2 text-sm text-muted">Continue to your AMFIRE workspace.</p>
          <SubmitButton className="mt-6 w-full" pendingLabel="Signing in…">
            Continue
          </SubmitButton>
        </form>
      </Container>
    </div>
  );
}
