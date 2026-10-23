import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CURRENCY_COOKIE } from "@/knowledge/pricing";
import { supabaseConfig } from "@/lib/supabase/config";

const AUTH_PATHS = ["/hq", "/hub", "/auth", "/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;
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
  return response;
}

export const config = {
  matcher: [
    "/hq/:path*",
    "/hub/:path*",
    "/auth/:path*",
    "/login",
    // Pages (not assets or files) for visitors who have no currency yet.
    { source: "/((?!api|_next/static|_next/image|.*\\..*).*)", missing: [{ type: "cookie", key: "currency" }] },
  ],
};
