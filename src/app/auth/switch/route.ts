// A Client Hub link opened by the wrong account (another client, or amfire staff
// in the same browser): sign that session out, then sign in again and return to
// the link. The wrong account never sees the page or learns whether it exists.

import type { NextRequest } from "next/server";
import { endSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "";
  const safeNext = /^\/hub(\/[\w-]+)*$/.test(next) ? next : "/hub";
  await endSession();
  const login = new URL("/login", request.nextUrl.origin);
  login.searchParams.set("next", safeNext);
  login.searchParams.set("error", "switch");
  return Response.redirect(login, 303);
}
