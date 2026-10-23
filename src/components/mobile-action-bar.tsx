"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { contact } from "@/config/site";
import { FREE_DEMO } from "@/knowledge/catalog";
import { PhoneIcon, WhatsAppIcon } from "./contact";
import { buttonClass } from "./ui";

// Pages where the bar would compete with the page's own form.
const HIDDEN = ["/start", "/login", "/auth"];

/**
 * Phones only: call, WhatsApp and the free-demo booking stay within thumb
 * reach on every public page. A spacer of the same height keeps the footer
 * from sitting underneath it.
 */
export function MobileActionBar() {
  const pathname = usePathname();
  if (HIDDEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const round = "grid size-12 shrink-0 place-items-center rounded-full bg-surface text-fg ring-1 ring-line active:bg-subtle";
  return (
    <>
      {/* Follows the footer, so it shares its colour. */}
      <div aria-hidden className="h-[calc(4.75rem+env(safe-area-inset-bottom))] bg-ink lg:hidden" />
      <nav
        aria-label="Quick contact"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-page/90 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl in-data-[menu=open]:hidden lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-center gap-2">
          <a href={contact.call} aria-label="Call AMFIRE" className={round}>
            <PhoneIcon className="size-5" />
          </a>
          <a href={contact.whatsapp()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp AMFIRE" className={`${round} text-[#128c4b]`}>
            <WhatsAppIcon className="size-5" />
          </a>
          <Link href="/start" className={buttonClass("primary", "md", "h-12 flex-1 text-[15px]")}>
            {FREE_DEMO.cta}
          </Link>
        </div>
      </nav>
    </>
  );
}
