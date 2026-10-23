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
      <div role="tablist" aria-label="Stories by service" className="grid gap-2 sm:grid-cols-3">
        {stories.map((s, i) => (
          <button
            key={s.path}
            role="tab"
            id={`story-tab-${s.path}`}
            aria-selected={active === i}
            aria-controls="story-panel"
            onClick={() => setActive(i)}
            className={cx(
              "rounded-2xl px-5 py-4 text-left ring-1 transition",
              active === i ? "bg-fg text-page ring-fg" : "bg-surface ring-line hover:ring-fg/30",
            )}
          >
            <span className="block text-sm font-semibold">{s.name}</span>
            <span className={cx("block text-xs", active === i ? "opacity-70" : "text-muted")}>{s.tagline}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id="story-panel" aria-labelledby={`story-tab-${current.path}`} className="mt-5 animate-rise" key={current.path}>
        <ServiceStory story={current.story} />
      </div>
    </div>
  );
}
