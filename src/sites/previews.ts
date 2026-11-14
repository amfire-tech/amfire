import { demoSite } from "./manufacturing/demo";
import type { MfgSite } from "./manufacturing/types";

// Personal previews: one entry per prospect, served at /p/<slug> and hidden from Google.
//
// Quick swap (about 2 minutes): copy the example below, change the slug, company,
// hero eyebrow details and contact. Everything else falls back to the demo.
// Full swap (20–30 minutes): also replace capabilities, industries, machines, photos
// and customers with what the prospect's own website and Google listing show.
// Never invent certificates, customers or numbers for a real company: leave the
// demo's figures out (set them to what they publish) before sending.

type Preview = { base: MfgSite; overrides: DeepPartial<MfgSite> };
type DeepPartial<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

const previews: Record<string, Preview> = {
  // Example entry. Fictional, so it is safe to keep as a template.
  "example-forge": {
    base: demoSite,
    overrides: {
      company: { name: "Example Forge & Machining", short: "EXAMPLE", descriptor: "Forge & Machining", area: "Bhosari", since: 2006 },
      accent: "#E8590C",
    },
  },
};

function merge<T>(base: T, over: DeepPartial<T> | undefined): T {
  if (!over) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" && !Array.isArray(b) ? merge(b, v as never) : v;
  }
  return out as T;
}

export function getPreview(slug: string): MfgSite | null {
  const p = previews[slug];
  if (!p) return null;
  return { ...merge(p.base, p.overrides), slug, mode: "preview" };
}
