// Vercel Cron calls this every morning (vercel.json): the AI team runs, the
// brief goes to the owner by email/WhatsApp where configured, and on the 1st
// the investor update is drafted.

import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { runTeam } from "@/server/agents/team";
import { draftInvestorUpdate } from "@/server/brain";
import { deliverBrief } from "@/server/notify";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const db = await getDb();
  const now = new Date();
  const istDay = Number(new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" }).format(now));
  if (istDay === 1) await draftInvestorUpdate(db, null, { system: true, now });
  const result = await runTeam(db, { now });
  const delivered = await deliverBrief(db, result.brief.headline, result.brief.body);
  return Response.json({ ok: true, pending: result.pending, signals: result.signals, delivered });
}
