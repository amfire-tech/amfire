import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Workspaces, sign-in and per-booking pages are private or worthless to search engines.
      disallow: ["/hq", "/hub", "/login", "/auth/", "/start/thanks", "/reel"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
