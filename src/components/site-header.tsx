"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink, Logo, cx } from "./ui";

// Few doors, each worth opening. Approach and Insights join once those pages exist.
const LINKS = [
  { href: "/how-we-work", label: "How we work" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
];

export const CONVERSATION_CTA = "Start a conversation";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the phone menu on navigation or Escape.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // While the phone menu is open the page behind it doesn't scroll.
  useEffect(() => {
    if (!mobileOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [mobileOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-page/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="amfire home" className="shrink-0 py-2">
          <Logo className="h-6 sm:h-7" priority />
        </Link>

        <div className="flex items-center gap-2 sm:gap-8">
          <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
            {LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cx("py-2 text-sm transition-colors hover:text-fg", isActive(item.href) ? "text-fg" : "text-muted")}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <ButtonLink href="/start" size="sm">
            <span className="sm:hidden">Talk to us</span>
            <span className="max-sm:hidden">{CONVERSATION_CTA}</span>
          </ButtonLink>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-md ring-1 ring-line md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 9h16M4 15h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="max-h-[calc(100dvh-4rem)] animate-rise overflow-y-auto overscroll-contain border-t border-line bg-page px-4 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:hidden"
        >
          {LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="block border-b border-line py-4 text-lg tracking-tight">
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="block py-4 text-sm text-muted">
            Client sign-in
          </Link>
          <ButtonLink href="/start" size="lg" className="mt-2 w-full">
            {CONVERSATION_CTA}
          </ButtonLink>
        </nav>
      )}
    </header>
  );
}
