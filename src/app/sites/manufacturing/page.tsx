import type { Metadata, Viewport } from "next";
import { demoSite } from "@/sites/manufacturing/demo";
import { ManufacturingSite } from "@/sites/manufacturing/site";

// amfire's manufacturing showcase: a complete website for a fictional company,
// sent to manufacturers as "this could be your site".
export const metadata: Metadata = {
  title: { absolute: `${demoSite.company.name} · a demo website by amfire` },
  description: "A demo manufacturing website by amfire: precision parts in 3D, open specs, a machine list and a drawing-upload quote form.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b0d10" };

export default function ManufacturingDemoPage() {
  return <ManufacturingSite site={demoSite} />;
}
