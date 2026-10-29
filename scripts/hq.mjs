// Calls an HQ connector tool from the command line, for Claude runs that can't
// use the amfire-hq MCP connection (cloud routines on claude.ai). Same tools,
// same rules. Usage:
//   node scripts/hq.mjs --list
//   node scripts/hq.mjs claim_hunt
//   node scripts/hq.mjs find_targets '{"segment":"school","minScore":60}'
//   node scripts/hq.mjs upsert_targets @targets.json      (arguments from a file)
// Needs AMFIRE_HQ_TOKEN: your personal key from HQ → Signal engine → Your Claude.

import { readFileSync } from "node:fs";

const [tool, raw] = process.argv.slice(2);
const token = process.env.AMFIRE_HQ_TOKEN;
const url = process.env.AMFIRE_HQ_URL ?? "https://www.amfire.in/api/mcp";

if (!tool) {
  console.error("Usage: node scripts/hq.mjs <tool> ['{json}' | @file.json]   or   node scripts/hq.mjs --list");
  process.exit(2);
}
if (!token) {
  console.error("AMFIRE_HQ_TOKEN is not set. Add your personal key from HQ (Signal engine → Your Claude) to this environment.");
  process.exit(2);
}

let args = {};
if (raw) {
  const text = raw.startsWith("@") ? readFileSync(raw.slice(1), "utf8") : raw;
  try {
    args = JSON.parse(text);
  } catch {
    console.error("The arguments aren't valid JSON.");
    process.exit(2);
  }
}

const body = tool === "--list" ? { jsonrpc: "2.0", id: 1, method: "tools/list" } : { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } };

let res;
try {
  res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
} catch (err) {
  console.error(`Couldn't reach HQ at ${url}: ${err instanceof Error ? err.message : err}. In a cloud environment, allow network access to www.amfire.in.`);
  process.exit(1);
}
if (res.status === 401) {
  console.error("HQ refused the key. Create a new one in HQ (Signal engine → Your Claude) and update AMFIRE_HQ_TOKEN.");
  process.exit(1);
}
const json = await res.json();
if (json.error) {
  console.error(json.error.message ?? JSON.stringify(json.error));
  process.exit(1);
}
if (tool === "--list") {
  for (const t of json.result.tools) console.log(`${t.name}: ${t.description}`);
} else {
  const text = json.result.content?.[0]?.text ?? "";
  if (json.result.isError) {
    console.error(text);
    process.exit(1);
  }
  console.log(text);
}
