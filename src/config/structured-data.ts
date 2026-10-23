// schema.org descriptions of AMFIRE, rendered as JSON-LD on the public site.

import { FOUNDERS } from "@/config/founders";
import { site } from "@/config/site";
import { SERVICES, type ServicePathId } from "@/knowledge/catalog";
import { STARTING_PRICE } from "@/knowledge/pricing";

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
    areaServed: { "@type": "Country", name: "India" },
    knowsLanguage: ["en-IN", "hi-IN"],
    priceRange: "₹₹",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: site.contactEmail,
      telephone: site.contactPhone,
      areaServed: "IN",
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
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: (Object.keys(SERVICES) as ServicePathId[]).map((p) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: `${SERVICES[p].name} — ${SERVICES[p].tagline}`, url: absolute(`/services/${p}`) },
      })),
    },
  };
}

export function serviceJsonLd(path: ServicePathId, name: string) {
  const service = SERVICES[path];
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    serviceType: service.tagline,
    description: service.description,
    url: absolute(`/services/${path}`),
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: "India" },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      // A "starts from" price, not a fixed one.
      priceSpecification: {
        "@type": path === "operate" ? "UnitPriceSpecification" : "PriceSpecification",
        priceCurrency: "INR",
        minPrice: STARTING_PRICE[path].INR / 100,
        ...(path === "operate" && { unitText: "MONTH" }),
      },
    },
  };
}
