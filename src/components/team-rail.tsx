"use client";

import { useEffect, useState } from "react";
import { cx } from "./ui";

/**
 * The pinned list of teams beside "Find your team" on /services. Plain anchor links,
 * so it works without JavaScript; the script only marks the team being read.
 */
export function TeamRail({ teams, elseHref }: { teams: { id: string; name: string }[]; elseHref: string }) {
  const [active, setActive] = useState(teams[0]?.id);

  // The team being read is the last one whose top has passed a line a third of the way down the screen.
  useEffect(() => {
    const update = () => {
      const line = window.innerHeight * 0.35;
      let current = teams[0]?.id;
      for (const t of teams) {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= line) current = t.id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [teams]);

  return (
    <nav aria-label="Teams" className="grid grid-cols-2 gap-x-6 self-start border-t border-line lg:sticky lg:top-24 lg:grid-cols-1">
      {teams.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          aria-current={active === t.id ? "true" : undefined}
          className={cx(
            "flex items-center justify-between border-b border-line py-3 text-[15px] transition-colors hover:text-fg",
            active === t.id ? "font-medium text-fg" : "text-muted",
          )}
        >
          {t.name}
          {active === t.id && <span aria-hidden className="hidden size-1.5 rounded-full bg-fg lg:block" />}
        </a>
      ))}
      <a href={elseHref} className="border-b border-line py-3 text-[15px] font-medium hover:underline">
        Something else →
      </a>
    </nav>
  );
}
