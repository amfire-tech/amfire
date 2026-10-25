"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const ITEMS = [
  { href: "/hq", label: "Today", exact: true },
  { href: "/hq/ask", label: "Ask HQ" },
  { href: "/hq/pipeline", label: "Pipeline" },
  { href: "/hq/leads", label: "Leads" },
  { href: "/hq/clients", label: "Clients" },
  { href: "/hq/projects", label: "Projects" },
  { href: "/hq/requests", label: "Requests" },
  { href: "/hq/money", label: "Money" },
  { href: "/hq/growth", label: "Growth" },
  { href: "/hq/agents", label: "AI team" },
  { href: "/hq/activity", label: "Activity" },
];

export function HqNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="HQ" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:px-0 [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "shrink-0 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap lg:py-2",
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
