// The laptop runner's control line to HQ (scripts/team-runner.ts). Only a
// runner key works here; it never reaches the agents themselves, who get a
// short-lived run key for the MCP connector instead. One POST per action:
//
//   { action: "heartbeat", version, host, running, capacity, pausedUntil? }
//   { action: "claim", types? }                   → { task, fence, runKey } | { task: null }
//   { action: "renew", taskId, fence }
//   { action: "progress", taskId, fence, lines }
//   { action: "complete", taskId, fence, output, summary? }
//   { action: "fail", taskId, fence, error, retryable?, retryAfterMs?, usageLimit? }
//
// 409 means this run no longer holds the task (its lease ran out): drop the result.

import type { NextRequest } from "next/server";
import * as z from "zod";
import { getDb } from "@/db";
import { AccessDenied } from "@/server/access";
import { actorForConnectorKey } from "@/server/hunts";
import { claimTask, completeTask, failTask, renewLease, reportProgress, runnerHeartbeat, TaskError } from "@/server/team-tasks";

export const maxDuration = 60;

const ACTIONS = {
  heartbeat: runnerHeartbeat,
  claim: claimTask,
  renew: renewLease,
  progress: reportProgress,
  complete: completeTask,
  fail: failTask,
} as const;

export async function POST(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const db = await getDb();
  const actor = key ? await actorForConnectorKey(db, key) : null;
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  if (actor.agent?.kind !== "runner") return Response.json({ error: "Use a laptop runner key from HQ for this." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    body = parsed as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Send a JSON object with an action." }, { status: 400 });
  }
  const { action, ...input } = body;
  const run = ACTIONS[String(action) as keyof typeof ACTIONS];
  if (!run) return Response.json({ error: `Unknown action. Use one of: ${Object.keys(ACTIONS).join(", ")}.` }, { status: 400 });

  try {
    const result = await run(db, actor, input as never);
    return Response.json(action === "claim" && !result ? { task: null } : result);
  } catch (err) {
    if (err instanceof TaskError) return Response.json({ error: err.message }, { status: 409 });
    if (err instanceof z.ZodError) return Response.json({ error: err.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ") }, { status: 400 });
    if (err instanceof AccessDenied) return Response.json({ error: err.message }, { status: 403 });
    console.error("[team]", err);
    return Response.json({ error: "HQ failed on that action. Try again." }, { status: 500 });
  }
}

export function GET() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}
