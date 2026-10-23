import { notFound } from "next/navigation";
import { ReelStage } from "./reel-stage";

// Render target for scripts/render-reel.ts — development only.
export default async function ReelPage({ searchParams }: PageProps<"/reel">) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  return <ReelStage start={Number(sp.t ?? 0) || 0} play={"play" in sp} />;
}
