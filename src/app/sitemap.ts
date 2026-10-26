import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { SERVICES, type ServicePathId } from "@/knowledge/catalog";
import { CASE_STUDIES } from "@/knowledge/case-studies";
import { EXAMPLES } from "@/knowledge/examples";

/** Public website pages. Workspaces (/hq, /hub) and sign-in stay out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number, changeFrequency: "weekly" | "monthly" = "monthly") => ({
    url: `${site.url}${path}`,
    changeFrequency,
    priority,
  });

  return [
    page("", 1, "weekly"),
    page("/start", 0.9),
    page("/services", 0.9),
    ...(Object.keys(SERVICES) as ServicePathId[]).map((p) => page(`/services/${p}`, 0.9)),
    page("/how-we-work", 0.7),
    page("/industries", 0.7),
    page("/work", 0.8),
    ...CASE_STUDIES.map((c) => page(`/work/${c.slug}`, 0.8)),
    ...EXAMPLES.map((e) => page(`/work/${e.slug}`, 0.6)),
    page("/about", 0.6),
    page("/partners", 0.5),
  ];
}
