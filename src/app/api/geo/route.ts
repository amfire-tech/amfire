import type { NextRequest } from "next/server";

// The visitor's city, from the location Vercel resolves for the request IP. Used by the
// Services demo to place the demo company's plants near the visitor without asking the
// browser for permission. Empty outside Vercel (local development); the page then uses Pune.
export function GET(request: NextRequest) {
  const read = (name: string) => {
    const raw = request.headers.get(name);
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  };
  return Response.json(
    { city: read("x-vercel-ip-city"), region: read("x-vercel-ip-country-region"), country: read("x-vercel-ip-country") },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
