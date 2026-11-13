import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { CASE_STUDIES } from "@/knowledge/case-studies";

/**
 * When each page's content last changed. Search engines use lastmod only while it
 * stays accurate, so this is a real date, not the build time: update the entry
 * whenever you change what a page says.
 */
const CHANGED = {
  home: "2026-11-08",
  services: "2026-11-13",
  howWeWork: "2026-11-07",
  work: "2026-11-07",
  caseStudies: "2026-11-08",
  about: "2026-11-07",
  start: "2026-11-07",
  agencies: "2026-11-07",
  partners: "2026-11-07",
  privacy: "2026-11-06",
  terms: "2026-11-07",
} as const;

/**
 * Public pages that carry the current message. Retired pages (solutions,
 * industries, the illustrative examples) redirect and stay out; so do the /audit
 * outreach tool, the gated /demo, workspaces and sign-in.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, changed: string, priority: number, changeFrequency: "weekly" | "monthly" = "monthly") => ({
    url: `${site.url}${path}`,
    lastModified: changed,
    changeFrequency,
    priority,
  });

  return [
    page("", CHANGED.home, 1, "weekly"),
    page("/services", CHANGED.services, 0.9),
    page("/how-we-work", CHANGED.howWeWork, 0.9),
    page("/work", CHANGED.work, 0.9),
    ...CASE_STUDIES.map((c) => page(`/work/${c.slug}`, CHANGED.caseStudies, 0.8)),
    page("/about", CHANGED.about, 0.8),
    page("/start", CHANGED.start, 0.8),
    page("/agencies", CHANGED.agencies, 0.5),
    page("/partners", CHANGED.partners, 0.5),
    page("/privacy", CHANGED.privacy, 0.2),
    page("/terms", CHANGED.terms, 0.2),
  ];
}
