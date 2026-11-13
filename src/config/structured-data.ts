// schema.org descriptions of amfire, rendered as JSON-LD on the public site.

import { FOUNDERS } from "@/config/founders";
import { site } from "@/config/site";
import type { CaseStudy } from "@/knowledge/case-studies";

export const ORGANIZATION_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

const absolute = (path: string) => `${site.url}${path}`;

/** The site itself, on the homepage, so Google shows "amfire" as the site name in results. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    alternateName: "amfire.in",
    url: absolute("/"),
    inLanguage: "en-IN",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/** Where a page sits under the homepage, shown by search engines in place of the bare URL. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

/** A service amfire offers to one kind of buyer, on that buyer's landing page. */
export function serviceJsonLd({ path, name, serviceType, description, audience }: { path: string; name: string; serviceType: string; description: string; audience: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": absolute(`${path}#service`),
    name,
    serviceType,
    description,
    url: absolute(path),
    provider: { "@id": ORGANIZATION_ID },
    audience: { "@type": "BusinessAudience", name: audience },
  };
}

/**
 * amfire as a local business in Pune, on the Pune page only. It shares the organisation's
 * @id, so search engines merge it with the sitewide entry; the sitewide entry deliberately
 * names no service area, and this one adds the belts we visit in person.
 */
export function puneJsonLd(areas: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORGANIZATION_ID,
    name: site.name,
    url: site.url,
    telephone: site.contactPhone,
    email: site.contactEmail,
    address: { "@type": "PostalAddress", addressLocality: "Pune", addressRegion: "Maharashtra", addressCountry: "IN" },
    areaServed: areas.map((name) => ({ "@type": "Place", name })),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "10:00",
      closes: "19:00",
    },
  };
}

/** A case study as an article written by amfire about a client it built for. */
export function caseStudyJsonLd(study: CaseStudy) {
  const amfire = { "@type": "Organization", "@id": ORGANIZATION_ID, name: site.name, url: site.url };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": absolute(`/work/${study.slug}#article`),
    headline: study.title,
    description: study.summary,
    image: absolute(study.cover),
    datePublished: study.published,
    author: amfire,
    publisher: amfire,
    about: { "@type": "Organization", name: study.client, url: study.url },
    mainEntityOfPage: absolute(`/work/${study.slug}`),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORGANIZATION_ID,
    name: site.name,
    slogan: site.tagline,
    description: site.description,
    url: site.url,
    logo: absolute("/brand/icon-512.png"),
    image: absolute("/opengraph-image"),
    email: site.contactEmail,
    telephone: site.contactPhone,
    // Where we are, not a limit on who we serve: no areaServed, no price range.
    address: { "@type": "PostalAddress", addressLocality: "Pune", addressRegion: "Maharashtra", addressCountry: "IN" },
    knowsLanguage: ["en"],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: site.contactEmail,
      telephone: site.contactPhone,
      availableLanguage: ["English", "Hindi"],
    },
    ...(site.profiles.length > 0 && { sameAs: site.profiles }),
    ...(FOUNDERS.length > 0 && {
      founder: FOUNDERS.map((f) => ({
        "@type": "Person",
        name: f.name,
        jobTitle: f.role,
        ...(f.photo && { image: absolute(f.photo) }),
        ...(f.linkedin && { sameAs: [f.linkedin] }),
      })),
    }),
  };
}
