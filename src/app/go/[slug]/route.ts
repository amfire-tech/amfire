// Tracked links for posts: /go/{slug} counts the click and forwards to the
// site with UTM tags, which the proxy then records as the visitor's source.

import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { followTrackedLink } from "@/server/growth";

export async function GET(request: NextRequest, ctx: RouteContext<"/go/[slug]">) {
  const { slug } = await ctx.params;
  const target = /^[a-z0-9-]{3,48}$/.test(slug) ? await followTrackedLink(await getDb(), slug) : null;
  return Response.redirect(new URL(target ?? "/", request.nextUrl.origin), 302);
}
