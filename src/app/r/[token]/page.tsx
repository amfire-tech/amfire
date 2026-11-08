// A prospect's tracked report link: /r/{token} counts the open (from the
// browser, see Forward) and forwards to their readiness report or check.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo, buttonClass } from "@/components/ui";
import { getDb } from "@/db";
import { getAssetLink } from "@/server/asset-links";
import { Forward } from "./forward";

export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  const link = await getAssetLink(await getDb(), token);
  return {
    title: link ? `A note for ${link.org}` : "Link not found",
    description: link ? `Prepared for ${link.org} by amfire.` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function ReportLinkPage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const link = await getAssetLink(await getDb(), token);
  if (!link) notFound();

  return (
    <main className="grid flex-1 place-items-center bg-subtle px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 text-center shadow-sm ring-1 ring-line">
        <Logo className="mx-auto h-6" />
        <p className="mt-6 text-sm text-muted">Opening the note prepared for</p>
        <p className="mt-1 font-semibold text-balance">{link.org}</p>
        <a href={link.target} className={buttonClass("primary", "md", "mt-6 w-full")}>
          Open it
        </a>
      </div>
      <Forward token={token} target={link.target} />
    </main>
  );
}
