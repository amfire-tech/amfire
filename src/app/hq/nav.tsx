"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const ITEMS = [
  { href: "/hq", label: "Overview", exact: true },
  { href: "/hq/leads", label: "Leads" },
  { href: "/hq/projects", label: "Projects" },
  { href: "/hq/agents", label: "Agent runs" },
  { href: "/hq/activity", label: "Activity" },
];

export function HqNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="HQ" className="-mx-1 flex gap-1 overflow-x-auto lg:mx-0 lg:flex-col">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-xl px-3 py-2 text-sm whitespace-nowrap",
              active ? "bg-fg font-medium text-page" : "text-fg/75 hover:bg-subtle hover:text-fg",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      <Link href="/" className="rounded-xl px-3 py-2 text-sm whitespace-nowrap text-fg/60 hover:bg-subtle lg:mt-2">
        View website ↗
      </Link>
    </nav>
  );
}
