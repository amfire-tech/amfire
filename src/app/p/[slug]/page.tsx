import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { ManufacturingSite } from "@/sites/manufacturing/site";
import { getPreview } from "@/sites/previews";

// A concept website made for one prospect (see src/sites/previews.ts). Never indexed.
export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const site = getPreview(slug);
  return {
    title: { absolute: site ? `${site.company.name} · website preview` : "Preview" },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = { themeColor: "#0b0d10" };

export default async function PreviewPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const site = getPreview(slug);
  if (!site) notFound();
  return <ManufacturingSite site={site} />;
}
