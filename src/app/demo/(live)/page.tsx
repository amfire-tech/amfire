import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { OpsDemo } from "@/components/ops-demo/ops-demo";
import { Logo } from "@/components/ui";

// The shareable demo: amfire.in/demo opens straight into the live operating system of a
// demo company, filling the screen on a laptop or a phone. Sent in outreach so a founder
// can try it before any call. It sits outside the (site) layout on purpose: no marketing
// header, just the logo, one line and the way to talk to us.

const TITLE = "See a company run by agents";
const DESCRIPTION =
  "A live demo of an operating system built by amfire: every order tracked from enquiry to payment, every department on one screen, and you approve only what matters. Click anything.";

export const metadata: Metadata = {
  title: "Live demo",
  description: DESCRIPTION,
  alternates: { canonical: "/demo" },
  openGraph: { title: `${TITLE} · amfire`, description: DESCRIPTION, url: "/demo" },
  twitter: { title: `${TITLE} · amfire`, description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#0b0b0c" };

export default function DemoPage() {
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
          <span className="max-md:hidden"> · a company run by agents. Click anything, approve a decision, track an order.</span>
        </p>
        <Link href="/start" className="shrink-0 rounded-full bg-[#f2f1ec] px-4 py-2 text-[13px] font-medium text-[#0b0b0c] transition-colors hover:bg-white max-lg:hidden">
          Start a conversation
        </Link>
      </header>
      <div className="min-h-0 flex-1 sm:px-3 sm:pb-3">
        <OpsDemo page />
      </div>
    </main>
  );
}
