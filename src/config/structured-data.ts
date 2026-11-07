// schema.org descriptions of amfire, rendered as JSON-LD on the public site.

import { FOUNDERS } from "@/config/founders";
import { site } from "@/config/site";

export const ORGANIZATION_ID = `${site.url}/#organization`;

const absolute = (path: string) => `${site.url}${path}`;

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
