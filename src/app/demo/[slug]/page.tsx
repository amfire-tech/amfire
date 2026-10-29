import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo, buttonClass } from "@/components/ui";
import { contact, site } from "@/config/site";
import { getDb } from "@/db";
import { getPublicDemo } from "@/server/demos";
import { DemoChat } from "./demo-chat";

export async function generateMetadata({ params }: PageProps<"/demo/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const demo = await getPublicDemo(await getDb(), slug);
  return {
    title: demo ? `${demo.businessName}: your AI salesperson` : "Demo",
    description: demo ? `A demo amfire built for ${demo.businessName}: an AI salesperson that answers customers on WhatsApp, 24×7.` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function DemoPage({ params }: PageProps<"/demo/[slug]">) {
  const { slug } = await params;
  const demo = await getPublicDemo(await getDb(), slug);
  if (!demo) notFound();
  const wa = contact.whatsapp(`Hi amfire, I tried the AI salesperson demo for ${demo.businessName}. I'd like to set it up.`);

  return (
    <main className="flex-1 bg-subtle">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label="amfire home">
            <Logo className="h-6" />
          </Link>
          <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>
            Set this up for me
          </a>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-[1fr_24rem] lg:py-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <div>
            <p className="text-sm font-medium tracking-wide text-signal uppercase">Made for {demo.businessName}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your AI salesperson on WhatsApp</h1>
            <p className="mt-3 max-w-xl text-lg text-muted">
              Meta has launched a free AI agent inside WhatsApp Business in India. We set it up with {demo.businessName}’s products, prices and timings, so every customer gets an answer
              in seconds, even at 11 pm. Try it: message it the way your customers do.
            </p>
          </div>
        </div>

        {/* One chat for every screen size: beside the text on desktop, under the intro on phones. */}
        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-6">
            <DemoChat slug={demo.slug} businessName={demo.businessName} greeting={demo.greeting} sampleQuestions={demo.sampleQuestions} />
          </div>
        </aside>

        <div className="space-y-6 lg:col-start-1 lg:row-start-2">
          {demo.audit.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold">What we noticed</h2>
              {demo.audit.map((a) => (
                <div key={a.title} className="rounded-card bg-surface p-5 ring-1 ring-line">
                  <p className="font-semibold">{a.title}</p>
                  <p className="mt-1 text-fg/85">{a.finding}</p>
                  <p className="mt-2 text-sm">
                    <span className="font-medium text-[#b42318]">What it costs: </span>
                    <span className="text-fg/80">{a.impact}</span>
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="font-medium text-success">The fix: </span>
                    <span className="text-fg/80">{a.fix}</span>
                  </p>
                </div>
              ))}
            </section>
          )}

          <section className="rounded-card bg-surface p-6 ring-1 ring-line">
            <h2 className="text-xl font-semibold">What amfire does</h2>
            <ul className="mt-3 space-y-2 text-fg/85">
              <li>✓ Set up the AI salesperson in 48 hours, trained on your catalogue, prices and FAQs</li>
              <li>✓ You see every chat and can take over any conversation</li>
              <li>✓ Every enquiry lands in one list and gets followed up, so no lead goes cold</li>
              <li>✓ Monthly report: enquiries answered, leads captured, what customers ask most</li>
            </ul>
            <p className="mt-4 text-sm text-muted">Setup is free for our first founding clients on the monthly Operate plan.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
                WhatsApp amfire
              </a>
              <a href={contact.call} className={buttonClass("secondary")}>
                Call {site.contactPhone}
              </a>
            </div>
          </section>

          <p className="text-xs text-muted">
            This is a demo built by amfire from {demo.businessName}’s public information, to show what’s possible. It isn’t connected to your WhatsApp, and answers may be incomplete.
          </p>
        </div>

      </div>
    </main>
  );
}
