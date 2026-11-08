"use server";

// The tracked report link reports its open from the browser, so link
// previews don't count; a signed-in staff member testing it isn't counted.

import { headers } from "next/headers";
import { getDb } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { getActor } from "@/lib/session";
import { isStaff } from "@/server/access";
import { recordAssetOpen } from "@/server/asset-links";

export async function recordAssetOpenAction(token: string) {
  if (!(await rateLimit(`asset-open:${token}`, 20, 60 * 60 * 1000))) return;
  const userAgent = (await headers()).get("user-agent");
  await recordAssetOpen(await getDb(), token, { viewerIsStaff: isStaff(await getActor()), userAgent });
}
