import type { Metadata } from "next";
import { openBrochure } from "@/app/actions/brochure";
import { Flame } from "@/components/brochure/art";
import { SubmitButton } from "@/components/forms";
import { ButtonLink, Container } from "@/components/ui";
import { SERVICES } from "@/knowledge/catalog";
import { readBrochureLink } from "@/server/brochures";

export const metadata: Metadata = { title: "Open your brochure", robots: { index: false } };

// The emailed link lands here. It needs a button press, so email scanners that
// pre-open links can't confirm the address or create a lead on their own.
export default async function OpenBrochurePage({ searchParams }: PageProps<"/brochure/open">) {
  const { t } = await searchParams;
  const token = typeof t === "string" ? t : undefined;
  const req = readBrochureLink(token);

  return (
    <div className="relative overflow-hidden bg-ink text-white">
      <div aria-hidden className="bg-brand absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full opacity-25 blur-3xl" />
      <Container className="relative flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <Flame className="h-24 w-auto" />
        {req ? (
          <>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Hi {req.name.split(" ")[0]}, your brochure is ready.</h1>
            <p className="mt-3 max-w-md text-white/70">Everything you get with amfire {SERVICES[req.plan].name} — in two minutes of scrolling.</p>
            <form action={openBrochure} className="mt-8">
              <input type="hidden" name="t" value={token} />
              <SubmitButton size="lg" pendingLabel="Opening…">
                Open my brochure →
              </SubmitButton>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">This link has expired.</h1>
            <p className="mt-3 max-w-md text-white/70">Links work for 7 days. Ask for a fresh one — it takes ten seconds.</p>
            <ButtonLink href="/brochure/build" className="mt-8">
              Send me a new link
            </ButtonLink>
          </>
        )}
      </Container>
    </div>
  );
}
