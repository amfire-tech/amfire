"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SERVICES, type ServicePathId } from "@/knowledge/catalog";
import { ThemeToggle } from "./theme-toggle";
import { ButtonLink, Logo, cx } from "./ui";

const LINKS = [
  { href: "/work", label: "Our work" },
  { href: "/industries", label: "Industries" },
  { href: "/about", label: "About" },
];
const PATHS = Object.keys(SERVICES) as ServicePathId[];

export function SiteHeader() {
  const pathname = usePathname();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on navigation, Escape or outside click.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setServicesOpen(false);
    setMobileOpen(false);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setServicesOpen(false);
        setMobileOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setServicesOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
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
    <header className="sticky top-0 z-40 border-b border-line/70 bg-page/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="AMFIRE home" className="shrink-0 py-2">
          <Logo className="h-6 sm:h-7" priority />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-expanded={servicesOpen}
              aria-controls="services-menu"
              onClick={() => setServicesOpen((o) => !o)}
              className={cx(
                "flex items-center gap-1 rounded-full px-3 py-2 text-sm hover:bg-subtle",
                isActive("/services") ? "font-medium text-fg" : "text-fg/75",
              )}
            >
              Services
              <svg aria-hidden viewBox="0 0 20 20" className={cx("size-4 transition", servicesOpen && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 8l5 5 5-5" />
              </svg>
            </button>
            {servicesOpen && (
              <div id="services-menu" className="absolute top-full left-1/2 mt-2 w-[560px] -translate-x-1/2 animate-rise rounded-2xl bg-surface p-2 shadow-2xl ring-1 ring-line">
                <div className="grid grid-cols-3 gap-1">
                  {PATHS.map((p) => (
                    <Link key={p} href={`/services/${p}`} className="group rounded-xl p-3 hover:bg-subtle">
                      <span className="bg-brand block h-1 w-6 rounded-full" aria-hidden />
                      <span className="mt-2 block font-semibold">{SERVICES[p].name}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted">{SERVICES[p].tagline}</span>
                    </Link>
                  ))}
                </div>
                <Link href="/services" className="mt-1 block rounded-xl px-3 py-2 text-sm text-muted hover:bg-subtle hover:text-fg">
                  Compare all three →
                </Link>
              </div>
            )}
          </div>
          {LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cx("rounded-full px-3 py-2 text-sm hover:bg-subtle", isActive(item.href) ? "font-medium text-fg" : "text-fg/75")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden rounded-full px-3 py-2 text-sm text-fg/75 hover:bg-subtle sm:inline-flex">
            Sign in
          </Link>
          <ButtonLink href="/start" size="sm" className="max-sm:hidden">
            Book free demo
          </ButtonLink>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full ring-1 ring-line lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile"
          className="max-h-[calc(100dvh-4rem)] animate-rise overflow-y-auto overscroll-contain border-t border-line bg-page px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:hidden"
        >
          <p className="px-3 pt-2 text-xs font-semibold tracking-widest text-muted uppercase">Services</p>
          {PATHS.map((p) => (
            <Link key={p} href={`/services/${p}`} className="block rounded-xl px-3 py-3 hover:bg-subtle active:bg-subtle">
              <span className="font-medium">{SERVICES[p].name}</span>
              <span className="block text-xs text-muted">{SERVICES[p].tagline}</span>
            </Link>
          ))}
          <div className="my-2 border-t border-line" />
          {[...LINKS, { href: "/how-we-work", label: "How we work" }, { href: "/login", label: "Sign in" }].map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-3 font-medium hover:bg-subtle active:bg-subtle">
              {item.label}
            </Link>
          ))}
          <ButtonLink href="/start" size="lg" className="mt-4 w-full">
            Book free demo
          </ButtonLink>
        </nav>
      )}
    </header>
  );
}
