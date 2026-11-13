import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Almost every non-marketing page reads live business records, so we use
  // classic dynamic rendering instead of Cache Components.
  cacheComponents: false,
  // PGlite ships WASM + data files that must be loaded by Node, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Proposal PDFs (up to 4 MB) are uploaded through a server action.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  // Retired public pages (7 Nov 2026 premium rebuild). They described the old
  // Build / Operate / Automate offer for small businesses, so their addresses now
  // lead to the pages that carry the current message.
  async redirects() {
    const examples = [
      "whatsapp-orders-into-tally",
      "gst-reconciliation-for-ca-firm",
      "collections-for-fmcg-distributor",
      "dealer-ordering-app",
      "diagnostic-chain-booking-and-reports",
      "coaching-institute-fees-and-parents",
      "online-presence-for-showroom",
      "d2c-brand-festive-sale",
      "taking-over-a-legacy-erp",
      "hospital-systems-support",
    ];
    return [
      { source: "/pricing", destination: "/", permanent: true },
      { source: "/services/:path", destination: "/services", permanent: true },
      { source: "/solutions", destination: "/how-we-work", permanent: true },
      { source: "/industries", destination: "/work", permanent: true },
      ...examples.map((slug) => ({ source: `/work/${slug}`, destination: "/work", permanent: true })),
      // Pages from the site before this codebase that Google still had indexed on
      // 13 Nov 2026 (SEO audit). They returned 404; these send their visitors and
      // link value to the nearest current page.
      { source: "/contact", destination: "/start", permanent: true },
      { source: "/blog/:path*", destination: "/work", permanent: true },
      { source: "/industries/:path+", destination: "/services", permanent: true },
      { source: "/careers", destination: "/about", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
