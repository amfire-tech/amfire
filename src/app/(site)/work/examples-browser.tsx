"use client";

import { useState } from "react";
import { ExampleCard } from "@/components/example-card";
import { cx } from "@/components/ui";
import { SERVICES, type ServicePathId } from "@/knowledge/catalog";
import type { Example } from "@/knowledge/examples";

const FILTERS: { id: ServicePathId | "all"; label: string }[] = [
  { id: "all", label: "All" },
  ...(Object.keys(SERVICES) as ServicePathId[]).map((id) => ({ id, label: SERVICES[id].name })),
];

export function ExamplesBrowser({ examples }: { examples: Example[] }) {
  const [filter, setFilter] = useState<ServicePathId | "all">("all");
  const shown = filter === "all" ? examples : examples.filter((e) => e.path === filter);

  return (
    <>
      <div role="group" aria-label="Filter examples by service" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={cx(
              "rounded-full px-4 py-2 text-sm font-medium ring-1 transition",
              filter === f.id ? "bg-fg text-page ring-fg" : "bg-surface ring-line hover:ring-fg/30",
            )}
          >
            {f.label}
            <span className="ml-1.5 opacity-60">{f.id === "all" ? examples.length : examples.filter((e) => e.path === f.id).length}</span>
          </button>
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        {shown.map((e) => (
          <ExampleCard key={e.slug} example={e} />
        ))}
      </div>
    </>
  );
}
