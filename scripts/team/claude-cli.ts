// Every detail of driving the Claude Code CLI lives here, so a CLI update
// that changes a flag or the stream format breaks one file, not the runner.
// Verified against Claude Code 2.1.316 (8 Nov 2026):
//   - `-p` with the prompt on stdin, `--output-format stream-json` needs `--verbose`
//   - `--json-schema` makes the final `result` message carry `structured_output`
//   - a `rate_limit_event` carries { status, resetsAt (epoch s), unifiedWindows.{five_hour,seven_day}.utilization }
//   - `--restricted` drops Bash and the other code-running tools and ignores
//     user/project settings; `--tools` names what's left
//   - never `--bare`: it switches to API-key auth and drops the subscription login

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createWriteStream } from "node:fs";
import path from "node:path";

/** CLI versions this adapter was checked against. Others need AMFIRE_TEAM_ALLOW_UNTESTED=1. */
export const TESTED_VERSIONS = ["2.1.316"];

export type RateLimit = { status: string; resetsAt: Date | null; fiveHour: number | null; sevenDay: number | null };

export type RunOptions = {
  bin: string;
  cwd: string;
  prompt: string;
  systemPrompt: string;
  model: string;
  /** Built-in tools to keep, e.g. ["WebFetch", "WebSearch"]. */
  tools: string[];
  /** Tools that run without asking (everything else is denied). */
  allowedTools: string[];
  /** Path of an MCP config file (holds the run key, so not on the command line). */
  mcpConfigPath?: string;
  jsonSchema: object;
  maxTurns: number;
  timeoutMs: number;
  /** One line per tool call, e.g. "Reading tofler.in/…". Never page text. */
  onProgress?: (line: string) => void;
  onRateLimit?: (r: RateLimit) => void;
  /** Where the raw stream is kept on the laptop for debugging (HQ never sees it). */
  transcriptPath?: string;
  /** Stops the run (lease lost, runner stopping). */
  signal?: AbortSignal;
};

export type RunOutcome =
  | { kind: "ok"; output: Record<string, unknown>; costUsd: number; turns: number; durationMs: number }
  | { kind: "usage_limit"; resetsAt: Date | null; message: string }
  | { kind: "auth"; message: string }
  | { kind: "capped"; message: string }
  | { kind: "aborted"; message: string }
  | { kind: "error"; message: string; retryable: boolean };

export function claudeVersion(bin: string) {
  const r = spawnSync(bin, ["--version"], { encoding: "utf8", windowsHide: true, timeout: 60_000 });
  if (r.error || r.status !== 0) return null;
  return (r.stdout.match(/\d+\.\d+\.\d+/) ?? [null])[0];
}

export function buildArgs(o: Pick<RunOptions, "systemPrompt" | "model" | "tools" | "allowedTools" | "mcpConfigPath" | "jsonSchema">) {
  const args = [
    "-p",
    "--verbose",
    "--output-format",
    "stream-json",
    "--model",
    o.model,
    "--restricted",
    "--tools",
    o.tools.join(","),
    "--strict-mcp-config",
    "--permission-mode",
    "dontAsk",
    "--permission-prompts",
    "none",
    "--no-session-persistence",
    "--no-chrome",
    "--system-prompt",
    o.systemPrompt,
    "--json-schema",
    JSON.stringify(o.jsonSchema),
  ];
  if (o.mcpConfigPath) args.push("--mcp-config", o.mcpConfigPath);
  if (o.allowedTools.length) args.push("--allowedTools", ...o.allowedTools);
  return args;
}

/** Kills the CLI and everything it started (MCP clients, fetches). `child.kill()` alone leaves grandchildren on Windows. */
export function killTree(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
  else child.kill("SIGKILL");
}

const shortUrl = (u: unknown) => String(u ?? "").replace(/^https?:\/\/(www\.)?/, "").slice(0, 80);

/** A tool call as one progress line. */
export function describeToolUse(name: string, input: Record<string, unknown>) {
  if (name === "WebFetch") return `Reading ${shortUrl(input.url)}`;
  if (name === "WebSearch") return `Searching “${String(input.query ?? "").slice(0, 80)}”`;
  if (name === "StructuredOutput") return "Writing the result";
  if (name.startsWith("mcp__amfire-hq__")) return `HQ: ${name.slice("mcp__amfire-hq__".length)}`;
  return `Using ${name}`;
}

const ratio = (v: unknown) => (typeof v === "number" ? (v > 1 ? v / 100 : v) : null);

export function parseRateLimit(info: Record<string, unknown>): RateLimit {
  const windows = (info.unifiedWindows ?? {}) as Record<string, { utilization?: number }>;
  const resets = typeof info.resetsAt === "number" ? new Date(info.resetsAt * 1000) : null;
  return { status: String(info.status ?? "allowed"), resetsAt: resets, fiveHour: ratio(windows.five_hour?.utilization), sevenDay: ratio(windows.seven_day?.utilization) };
}

const USAGE = /usage limit|rate limit|limit reached|resets at|quota/i;
const AUTH = /log ?in|logged out|authenticat|invalid api key|oauth|credentials/i;

/** Runs one agent: resolves with what happened. Never throws. */
export function runClaude(o: RunOptions): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = false;
    let turns = 0;
    let limit: RateLimit | null = null;
    let result: Record<string, unknown> | null = null;
    let stderr = "";
    const transcript = o.transcriptPath ? createWriteStream(o.transcriptPath) : null;

    const child = spawn(o.bin, buildArgs(o), {
      cwd: o.cwd,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, DISABLE_AUTOUPDATER: "1", CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
    });

    const finish = (outcome: RunOutcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      killTree(child);
      transcript?.end();
      resolve(outcome);
    };
    const timer = setTimeout(() => finish({ kind: "capped", message: `Stopped after ${Math.round(o.timeoutMs / 60000)} minutes.` }), o.timeoutMs);
    const onAbort = () => finish({ kind: "aborted", message: String(o.signal?.reason ?? "Stopped.") });
    if (o.signal?.aborted) onAbort();
    o.signal?.addEventListener("abort", onAbort, { once: true });

    // stream-json lines can arrive split across chunks.
    let buffer = "";
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (chunk: string) => {
      transcript?.write(chunk);
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.type === "assistant") {
          turns++;
          const content = ((msg.message as { content?: unknown[] })?.content ?? []) as { type: string; name?: string; input?: Record<string, unknown> }[];
          for (const c of content) if (c.type === "tool_use" && c.name) o.onProgress?.(describeToolUse(c.name, c.input ?? {}));
          if (turns > o.maxTurns) finish({ kind: "capped", message: `Stopped after ${o.maxTurns} turns.` });
        } else if (msg.type === "rate_limit_event") {
          limit = parseRateLimit((msg.rate_limit_info ?? {}) as Record<string, unknown>);
          o.onRateLimit?.(limit);
        } else if (msg.type === "result") {
          result = msg;
        }
      }
    });
    child.stderr!.setEncoding("utf8");
    child.stderr!.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-4000);
    });
    child.on("error", (err) => finish({ kind: "error", message: `Couldn't start Claude Code (${o.bin}): ${err.message}`, retryable: false }));
    child.on("close", (code) => {
      const r = result;
      const text = `${String(r?.result ?? "")} ${stderr}`;
      const blocked = limit && limit.status !== "allowed" && limit.status !== "allowed_warning";
      if (r && r.is_error !== true && r.structured_output && typeof r.structured_output === "object") {
        return finish({ kind: "ok", output: r.structured_output as Record<string, unknown>, costUsd: Number(r.total_cost_usd ?? 0), turns, durationMs: Date.now() - started });
      }
      if (blocked || r?.api_error_status === 429 || USAGE.test(text)) return finish({ kind: "usage_limit", resetsAt: limit?.resetsAt ?? null, message: text.trim().slice(0, 300) || "Usage limit reached." });
      if (AUTH.test(text)) return finish({ kind: "auth", message: text.trim().slice(0, 300) });
      const why = r ? `Claude finished without a valid result (${String(r.subtype ?? "unknown")}).` : `Claude Code exited with code ${code}.`;
      finish({ kind: "error", message: `${why} ${text.trim().slice(0, 300)}`.trim(), retryable: true });
    });

    child.stdin!.end(o.prompt);
  });
}

/** Where a run's files live on the laptop: never the repo (its settings allow every HQ tool). */
export function runsRoot() {
  const base = process.env.LOCALAPPDATA ?? path.join(process.env.HOME ?? ".", ".local", "share");
  return path.join(base, "amfire-team", "runs");
}
