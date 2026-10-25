// Google (OAuth) sign-in lands here with a code, which becomes a session.

import type { NextRequest } from "next/server";
import { completeOAuth } from "@/app/actions/auth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  await completeOAuth(params.get("code") ?? "", params.get("next"));
}
