"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const ITEMS = [
  { href: "/hub", label: "Home", exact: true },
  { href: "/hub/ask", label: "Ask amfire AI" },
  { href: "/hub/todo", label: "To-do", badge: "todo" },
  { href: "/hub/projects", label: "Projects", also: ["/hub/proposals"] },
  { href: "/hub/billing", label: "Billing", also: ["/hub/invoices"] },
  { href: "/hub/support", label: "Support" },
  { href: "/hub/activity", label: "Activity" },
  { href: "/hub/team", label: "Team" },
] as const;

export function HubNav({ todo }: { todo: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Client Hub" className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:px-0 [&::-webkit-scrollbar]:hidden">
      {ITEMS.map((item) => {
        const paths = [item.href, ...("also" in item ? item.also : [])];
        const active = "exact" in item && item.exact ? pathname === item.href : paths.some((p) => pathname.startsWith(p));
        const count = "badge" in item && item.badge === "todo" ? todo : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm whitespace-nowrap lg:py-2",
              active ? "bg-fg font-medium text-page" : "text-fg/75 hover:bg-subtle hover:text-fg",
            )}
          >
            {item.label}
            {count > 0 && (
              <span className={cx("rounded-full px-2 py-0.5 text-xs font-semibold", active ? "bg-page text-fg" : "bg-brand text-ink")}>{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
