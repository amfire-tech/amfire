// The HQ connector for Claude (MCP over streamable HTTP, JSON responses only).
// Claude Code connects with a bearer key: the shared HQ_CONNECTOR_TOKEN (acts
// as the owner), or a person's own key from HQ (acts as them, so hunts run on
// their own Claude plan are credited to them). See .mcp.json.

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import type { Actor } from "@/server/access";
import { handleMcpMessage } from "@/server/connector";
import { actorForConnectorKey } from "@/server/hunts";

export const maxDuration = 60;

const digest = (value: string) => createHash("sha256").update(value).digest();

/** `undefined` = the shared key (the owner), an Actor = a personal key, null = refused. */
async function caller(request: NextRequest): Promise<Actor | undefined | null> {
  const header = request.headers.get("authorization") ?? "";
  const shared = process.env.HQ_CONNECTOR_TOKEN;
  if (shared && shared.length >= 32 && timingSafeEqual(digest(header), digest(`Bearer ${shared}`))) return undefined;
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key.startsWith("amf_")) return null;
  return actorForConnectorKey(await getDb(), key);
}

export async function POST(request: NextRequest) {
  const actor = await caller(request);
  if (actor === null) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  const db = await getDb();
  if (Array.isArray(body)) {
    const answers = (await Promise.all(body.map((m) => handleMcpMessage(db, m, actor)))).filter(Boolean);
    return answers.length ? Response.json(answers) : new Response(null, { status: 202 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400 });
  }
  const answer = await handleMcpMessage(db, body, actor);
  return answer ? Response.json(answer) : new Response(null, { status: 202 });
}

// No server-initiated stream: every answer comes back on the POST.
export function GET() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}
