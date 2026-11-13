import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { OneClickBooking } from "@/components/cal-booking";
import { OpsDemo } from "@/components/ops-demo/ops-demo";
import { Logo } from "@/components/ui";
import { getDb } from "@/db";
import { getDemoInvite, isDemoUnlockCode } from "@/server/demo-visits";
import { MobileNotice } from "./mobile-notice";

// The shareable demo: amfire.in/demo opens straight into the live operating system of a
// demo company, filling the screen on a laptop or a phone. Sent in outreach so a founder
// can try it before any call. It sits outside the (site) layout on purpose: no marketing
// header, just the logo, one line and the way to talk to us.

const TITLE = "See a company run by agents";
const DESCRIPTION =
  "A live demo of an operating system built by amfire: every order tracked from enquiry to payment, every department on one screen, and you approve only what matters. Click anything.";

const BASE: Metadata = {
  title: "Live demo",
  description: DESCRIPTION,
  alternates: { canonical: "/demo" },
  openGraph: { title: `${TITLE} · amfire`, description: DESCRIPTION, url: "/demo" },
  twitter: { title: `${TITLE} · amfire`, description: DESCRIPTION },
};

// A personal link is kept out of search engines, and a personal demo's WhatsApp
// preview names their company.
export async function generateMetadata({ searchParams }: PageProps<"/demo">): Promise<Metadata> {
  const { p } = await searchParams;
  if (typeof p !== "string") return BASE;
  const invite = await getDemoInvite(await getDb(), p);
  if (!invite) return { ...BASE, robots: { index: false, follow: false } };
  const title = invite.persona ? `${invite.persona.company}, run by agents` : `Live demo for ${invite.org}`;
  return {
    ...BASE,
    title,
    robots: { index: false, follow: false },
    openGraph: { ...BASE.openGraph, title: `${title} · amfire` },
    twitter: { ...BASE.twitter, title: `${title} · amfire` },
  };
}

export const viewport: Viewport = { themeColor: "#0b0b0c" };

// A personal link (/demo?p={linkToken}, from the prospect's page in HQ) says who it was
// prepared for and ties the visit to them; without it the visit is recorded anonymously.
// The unlock link (/demo?unlock={code}) is what the founder sends back on WhatsApp; the
// code is checked here on the server and opens the full demo for that browser.
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const { p, unlock } = await searchParams;
  const token = typeof p === "string" ? p : null;
  const invite = await getDemoInvite(await getDb(), token);
  const granted = isDemoUnlockCode(unlock);
  return (
    <main
      className="flex h-dvh flex-col overflow-hidden bg-[#0b0b0c] text-[#ededea]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <Link href="/" aria-label="amfire home" className="shrink-0">
          <Logo inverse className="h-6" priority />
        </Link>
        <p className="min-w-0 truncate text-[13px] text-[#8b8b92]">
          <span className="text-[#ededea]">Live demo</span>
          {invite ? (
            <span>
              {" "}
              · prepared for <span className="text-[#ededea]">{invite.org}</span>
            </span>
          ) : (
            <span className="max-md:hidden"> · a company run by agents. Click anything, approve a decision, track an order.</span>
          )}
        </p>
        <Link href="/start" className="shrink-0 rounded-full bg-[#f2f1ec] px-4 py-2 text-[13px] font-medium text-[#0b0b0c] transition-colors hover:bg-white max-lg:hidden">
          Start a conversation
        </Link>
      </header>
      <div className="min-h-0 flex-1 sm:px-3 sm:pb-3">
        {/* Someone we sent a personal link sees everything; everyone else unlocks it on WhatsApp. */}
        <OpsDemo
          page
          locked={!invite && !granted}
          grant={granted}
          persona={invite?.persona ?? null}
          track={{ page: "demo", token: invite ? token : null, startOnLoad: true }}
        />
      </div>
      {/* Every "Start a conversation" here opens the calendar over the demo, not the /start page. */}
      <OneClickBooking />
      <MobileNotice />
    </main>
  );
}
