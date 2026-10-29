import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Almost every non-marketing page reads live business records, so we use
  // classic dynamic rendering instead of Cache Components.
  cacheComponents: false,
  // PGlite ships WASM + data files that must be loaded by Node, not bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Proposal PDFs (up to 4 MB) are uploaded through a server action.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  // Prices live in one section near the end of the home page.
  async redirects() {
    return [{ source: "/pricing", destination: "/#pricing", permanent: false }];
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
