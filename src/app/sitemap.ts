import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { CASE_STUDIES } from "@/knowledge/case-studies";

/**
 * Public pages that carry the current message. Retired pages (solutions,
 * industries, the illustrative examples) redirect and stay out; so do the /audit
 * outreach tool, workspaces and sign-in.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" = "monthly") => ({
    url: `${site.url}${path}`,
    changeFrequency,
    priority,
  });

  return [
    page("", 1, "weekly"),
    page("/services", 0.9),
    page("/how-we-work", 0.9),
    page("/work", 0.9),
    ...CASE_STUDIES.map((c) => page(`/work/${c.slug}`, 0.8)),
    page("/about", 0.8),
    page("/start", 0.8),
    page("/agencies", 0.5),
    page("/partners", 0.5),
    page("/privacy", 0.2),
    page("/terms", 0.2),
  ];
}
