import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config/site";
import { CURRENCY_COOKIE } from "@/knowledge/pricing";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE, readTouch, shouldReplaceTouch, touchFromVisit } from "@/lib/attribution";
import { supabaseConfig } from "@/lib/supabase/config";

const AUTH_PATHS = ["/hq", "/hub", "/auth", "/login", "/account"];

export async function proxy(request: NextRequest) {
  const { pathname, hostname, search } = request.nextUrl;

  // The live site has one address: the production *.vercel.app domains forward to it.
  // (Previews keep their own addresses; /api is never matched, so Vercel Cron is unaffected.)
  if (process.env.VERCEL_ENV === "production" && hostname.endsWith(".vercel.app") && !new URL(site.url).hostname.endsWith(".vercel.app")) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, site.url), 308);
  }
  // A sign-in link that fell back to Supabase's Site URL arrives at the home page with a code.
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    return NextResponse.redirect(new URL(`/auth/verify${search}`, request.nextUrl.origin));
  }

  let response = NextResponse.next({ request });
  const config = supabaseConfig();

  // Keeps the Supabase session cookie fresh. Authorisation is NOT decided here —
  // every page and action checks permissions on the server against the database.
  if (config && AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  // First visit: price in rupees for visitors in India and US dollars elsewhere,
  // using the country Vercel resolves from the visitor's IP. Without that header
  // (local development) the pre-paint script in the root layout falls back to
  // the device's time zone. Readable by that script and the currency switch.
  const country = request.headers.get("x-vercel-ip-country");
  if (country && !request.cookies.has(CURRENCY_COOKIE)) {
    response.cookies.set(CURRENCY_COOKIE, country === "IN" ? "INR" : "USD", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  // Lead attribution: remember where a visitor first came from (LinkedIn,
  // Google…) so a later booking is saved with its source. Website pages only.
  if (!AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const existing = readTouch(request.cookies.get(ATTRIBUTION_COOKIE)?.value);
    const touch = touchFromVisit(request.nextUrl, request.headers.get("referer"), request.nextUrl.hostname);
    if (shouldReplaceTouch(existing, touch)) {
      response.cookies.set(ATTRIBUTION_COOKIE, JSON.stringify(touch), {
        path: "/",
        maxAge: ATTRIBUTION_MAX_AGE,
        sameSite: "lax",
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
      });
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/hq/:path*",
    "/hub/:path*",
    "/auth/:path*",
    "/login",
    "/account",
    // Any page on a *.vercel.app address (forwarded to the live domain in production)…
    { source: "/((?!api|_next/static|_next/image|.*\\..*).*)", has: [{ type: "host", value: ".*\\.vercel\\.app" }] },
    // …a sign-in code that landed on the home page…
    { source: "/", has: [{ type: "query", key: "code" }] },
    // Pages (not assets or files) for visitors who have no currency yet…
    { source: "/((?!api|_next/static|_next/image|.*\\..*).*)", missing: [{ type: "cookie", key: "currency" }] },
    // …no attribution cookie yet (ATTRIBUTION_COOKIE), or who arrive from a tagged link.
    { source: "/((?!api|_next/static|_next/image|.*\\..*).*)", missing: [{ type: "cookie", key: "first_touch" }] },
    { source: "/((?!api|_next/static|_next/image|.*\\..*).*)", has: [{ type: "query", key: "utm_source" }] },
  ],
};
