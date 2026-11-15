import type { Metadata, Viewport } from "next";
import { OpsOneDemo } from "@/components/opticvyu-demo/ops-one";

// A working demo of Ops One, prepared for OpticVyu. Private link, never indexed.
// Every client, site and figure in it is illustrative.
export const metadata: Metadata = {
  title: { absolute: "Ops One · OpticVyu" },
  description: "One connected operating system for OpticVyu: command centre, billing, payments, work orders, cameras, people and agents.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function OpticVyuDemoPage({ searchParams }: PageProps<"/for/opticvyu/demo">) {
  const q = await searchParams;
  const screen = typeof q.screen === "string" && /^[a-z]{3,12}$/.test(q.screen) ? q.screen : null;
  return <OpsOneDemo screen={screen} shot={q.shot === "1" || !!screen} />;
}
