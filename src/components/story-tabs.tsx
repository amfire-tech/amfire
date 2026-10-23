"use client";

import { useState } from "react";
import type { ServicePathId, ServiceStory as Story } from "@/knowledge/catalog";
import { ServiceStory } from "./service-story";
import { cx } from "./ui";

type Item = { path: ServicePathId; name: string; tagline: string; story: Story };

/** One owner story per service, switchable with tabs. */
export function StoryTabs({ stories }: { stories: Item[] }) {
  const [active, setActive] = useState(0);
  const current = stories[active];

  return (
    <div>
      {/* Phones: a compact three-way switch with the tagline under it; larger screens: three cards. */}
      <div role="tablist" aria-label="Stories by service" className="grid grid-cols-3 gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line sm:gap-2 sm:bg-transparent sm:p-0 sm:ring-0">
        {stories.map((s, i) => (
          <button
            key={s.path}
            role="tab"
            id={`story-tab-${s.path}`}
            aria-selected={active === i}
            aria-controls="story-panel"
            onClick={() => setActive(i)}
            className={cx(
              "min-h-11 rounded-xl px-2 py-2.5 text-center transition sm:rounded-2xl sm:px-5 sm:py-4 sm:text-left sm:ring-1",
              active === i ? "bg-fg text-page sm:ring-fg" : "text-fg/75 hover:text-fg sm:bg-surface sm:ring-line sm:hover:ring-fg/30",
            )}
          >
            <span className="block text-sm font-semibold">{s.name}</span>
            <span className={cx("hidden text-xs sm:block", active === i ? "opacity-70" : "text-muted")}>{s.tagline}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-sm text-muted sm:hidden">{current.tagline}</p>
      <div role="tabpanel" id="story-panel" aria-labelledby={`story-tab-${current.path}`} className="mt-4 animate-rise sm:mt-5" key={current.path}>
        <ServiceStory story={current.story} />
      </div>
    </div>
  );
}
