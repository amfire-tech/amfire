import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { rateLimit } from "@/lib/rate-limit";
import { getActor } from "@/lib/session";
import { isStaff } from "@/server/access";
import { startDemoVisit, updateDemoVisit } from "@/server/demo-visits";

// The live demo reports its visits here: "start" when it opens (or, on the Services
// page, on the first click), then "update" every few seconds and when the tab is
// hidden or closed (sent with keepalive, so it survives the page closing).
// Visitors aren't signed in, so both are rate limited by hashed IP.

const header = (req: NextRequest, name: string) => {
  const raw = req.headers.get(name);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const db = await getDb();

  if (body.op === "start") {
    if (!(await rateLimit("demo-visit-start", 30, 60 * 60 * 1000))) return Response.json({ ok: false }, { status: 429 });
    const utm = (body.utm && typeof body.utm === "object" ? body.utm : {}) as Record<string, unknown>;
    const visit = await startDemoVisit(db, {
      token: str(body.token),
      visitorId: str(body.visitorId),
      page: body.page === "services" ? "services" : "demo",
      referrer: str(body.referrer),
      utm: { source: str(utm.source), medium: str(utm.medium), campaign: str(utm.campaign) },
      geo: { city: header(req, "x-vercel-ip-city"), region: header(req, "x-vercel-ip-country-region"), country: header(req, "x-vercel-ip-country") },
      userAgent: req.headers.get("user-agent"),
      viewerIsStaff: isStaff(await getActor()),
    });
    return Response.json({ ok: true, id: visit?.id ?? null });
  }

  if (body.op === "update") {
    if (!(await rateLimit("demo-visit-update", 400, 60 * 60 * 1000))) return Response.json({ ok: false }, { status: 429 });
    const id = str(body.id);
    const ok = id ? await updateDemoVisit(db, id, { activeSeconds: body.activeSeconds, views: body.views, actions: body.actions }) : false;
    return Response.json({ ok });
  }

  return Response.json({ ok: false }, { status: 400 });
}
