// The HQ connector for Claude (MCP over streamable HTTP, JSON responses only).
// Claude Code connects with the bearer token in HQ_CONNECTOR_TOKEN; see
// .mcp.json and docs/growth-engine.md.

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "@/db";
import { handleMcpMessage } from "@/server/connector";

export const maxDuration = 60;

const digest = (value: string) => createHash("sha256").update(value).digest();

function authorised(request: NextRequest) {
  const token = process.env.HQ_CONNECTOR_TOKEN;
  if (!token || token.length < 32) return false;
  const header = request.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(header), digest(`Bearer ${token}`));
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  const db = await getDb();
  if (Array.isArray(body)) {
    const answers = (await Promise.all(body.map((m) => handleMcpMessage(db, m)))).filter(Boolean);
    return answers.length ? Response.json(answers) : new Response(null, { status: 202 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400 });
  }
  const answer = await handleMcpMessage(db, body);
  return answer ? Response.json(answer) : new Response(null, { status: 202 });
}

// No server-initiated stream: every answer comes back on the POST.
export function GET() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}
