// The amfire revenue team's laptop runner. Start it yourself, when you want
// the team working:
//
//   npm run team                 work until stopped (Ctrl+C)
//   npm run team -- --once       do one task and stop
//   npm run team -- --skip-self-test
//
// It needs AMFIRE_RUNNER_KEY (HQ → Signal engine → Set up your Claude →
// Laptop runner). It runs Claude Code on YOUR subscription, one task at a
// time, each in an empty folder with a key that can only read that task's
// data. HQ never runs Claude; everything here stops when the laptop does.
//
// Optional: AMFIRE_HQ_URL (default https://www.amfire.in), CLAUDE_BIN (path to
// claude.exe), AMFIRE_TEAM_MODEL (default sonnet), AMFIRE_TEAM_MAX_UTIL
// (stop taking work above this share of the 5-hour usage window, default
// 0.85, so you keep room for your own Claude), AMFIRE_TEAM_ALLOW_UNTESTED=1.

import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as z from "zod";
import { TASK_RESULTS, type ResearchBatchResult } from "../src/knowledge/team";
import { checkCitations } from "./team/citations";
import { claudeVersion, runClaude, runsRoot, TESTED_VERSIONS, type RunOutcome } from "./team/claude-cli";
import { BadResult, hqClient, StaleRun, type ClaimedTask } from "./team/hq";

const RUNNER_VERSION = "0.1.0";
const MINUTE = 60_000;
const RENEW_EVERY = 4 * MINUTE;
const PROGRESS_EVERY = 3000;

const args = new Set(process.argv.slice(2));
const log = (...parts: unknown[]) => console.log(new Date().toLocaleTimeString("en-IN", { hour12: false }), ...parts);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- Roles -----------------------------------------------------------------------------

const ROLES = {
  research_batch: {
    role: "research",
    tools: ["WebFetch", "WebSearch"],
    allowed: ["WebFetch", "WebSearch", "get_task_packet", "get_engine_playbook", "find_targets", "get_prospect", "list_prospects"],
    maxTurns: 120,
    timeoutMs: 35 * MINUTE,
  },
  message_pack: {
    role: "sdr",
    tools: [],
    allowed: ["get_task_packet", "get_prospect", "get_engine_playbook", "list_notes"],
    maxTurns: 60,
    timeoutMs: 20 * MINUTE,
  },
} as const;

const mcpTool = (name: string) => (name === "WebFetch" || name === "WebSearch" ? name : `mcp__amfire-hq__${name}`);
const repoRoot = path.resolve(__dirname, "..");
function rolePrompt(role: string) {
  const text = readFileSync(path.join(repoRoot, "team", "roles", `${role}.md`), "utf8");
  return { text, version: createHash("sha256").update(text).digest("hex").slice(0, 10) };
}
const schemaFor = (type: keyof typeof TASK_RESULTS) => {
  const schema = z.toJSONSchema(TASK_RESULTS[type], { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
};

// --- Config ------------------------------------------------------------------------------

function findClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const native = path.join(os.homedir(), ".local", "bin", process.platform === "win32" ? "claude.exe" : "claude");
  return existsSync(native) ? native : process.platform === "win32" ? "claude.exe" : "claude";
}

const config = {
  hq: (process.env.AMFIRE_HQ_URL ?? "https://www.amfire.in").replace(/\/+$/, ""),
  key: process.env.AMFIRE_RUNNER_KEY ?? "",
  bin: findClaude(),
  model: process.env.AMFIRE_TEAM_MODEL ?? "sonnet",
  maxUtil: Number(process.env.AMFIRE_TEAM_MAX_UTIL ?? 0.85),
};

// --- One runner per laptop -----------------------------------------------------------------------

const lockPath = path.join(path.dirname(runsRoot()), "runner.lock");
function takeLock() {
  mkdirSync(path.dirname(lockPath), { recursive: true });
  if (existsSync(lockPath)) {
    const pid = Number(JSON.parse(readFileSync(lockPath, "utf8")).pid);
    try {
      process.kill(pid, 0);
      throw new Error(`Another runner is already working (process ${pid}). Stop it first.`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ESRCH") throw err;
    }
  }
  writeFileSync(lockPath, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
}
const releaseLock = () => {
  try {
    if (existsSync(lockPath) && Number(JSON.parse(readFileSync(lockPath, "utf8")).pid) === process.pid) rmSync(lockPath);
  } catch {
    /* already gone */
  }
};

// --- Self-test: the CLI still behaves the way this runner expects ----------------------------------

async function selfTest(version: string) {
  const dir = path.join(runsRoot(), `self-test-${randomUUID().slice(0, 8)}`);
  mkdirSync(dir, { recursive: true });
  const outcome = await runClaude({
    bin: config.bin,
    cwd: dir,
    prompt: 'Return ok: true and the word "ready".',
    systemPrompt: "You are a self-test. Answer only through the structured output.",
    model: "haiku",
    tools: [],
    allowedTools: [],
    jsonSchema: { type: "object", properties: { ok: { type: "boolean" }, word: { type: "string" } }, required: ["ok", "word"] },
    maxTurns: 6,
    timeoutMs: 2 * MINUTE,
  });
  rmSync(dir, { recursive: true, force: true });
  if (outcome.kind !== "ok" || outcome.output.ok !== true) throw new Error(`Self-test against Claude Code ${version} failed: ${JSON.stringify(outcome).slice(0, 300)}`);
  log(`Self-test passed (Claude Code ${version}, structured output works).`);
}

// --- The loop ------------------------------------------------------------------------------------

const hq = hqClient(config.hq, config.key);
let pausedUntil = 0;
let stopping = false;
let current: AbortController | null = null;
let claudeVer = "unknown";

const pauseUntil = (when: number, why: string) => {
  if (when > pausedUntil) {
    pausedUntil = when;
    log(`Pausing new work until ${new Date(when).toLocaleTimeString("en-IN", { hour12: false })}: ${why}`);
  }
};

async function runTask(claim: ClaimedTask) {
  const { task, fence, runKey } = claim;
  const spec = ROLES[task.type];
  const prompt = rolePrompt(spec.role);
  const dir = path.join(runsRoot(), `${task.id}-${fence}`);
  mkdirSync(dir, { recursive: true });
  // The run key lives in a file in the run's own folder, not on the command line.
  const mcpPath = path.join(dir, "mcp.json");
  writeFileSync(mcpPath, JSON.stringify({ mcpServers: { "amfire-hq": { type: "http", url: `${config.hq}/api/mcp`, headers: { Authorization: `Bearer ${runKey}` } } } }));

  log(`Task ${task.id.slice(0, 8)}: ${task.type} (attempt ${task.attempts}), role ${spec.role} v${prompt.version}`);
  const abort = new AbortController();
  current = abort;
  const pending: string[] = [`Started: ${spec.role} v${prompt.version} on Claude Code ${claudeVer}`];
  let lastTick = Date.now();

  const flush = async () => {
    if (!pending.length) return;
    const lines = pending.splice(0, 50);
    try {
      await hq.progress(task.id, fence, lines);
    } catch (err) {
      if (err instanceof StaleRun) abort.abort("HQ handed the task on (lease lost).");
    }
  };
  const progressTimer = setInterval(flush, PROGRESS_EVERY);
  const renewTimer = setInterval(async () => {
    // A big gap means the laptop slept: the lease may be gone, and the renewal will say so.
    const gap = Date.now() - lastTick;
    lastTick = Date.now();
    if (gap > RENEW_EVERY * 2) log(`Woke up after ${Math.round(gap / MINUTE)} minutes; checking the lease.`);
    try {
      await hq.renew(task.id, fence);
    } catch (err) {
      if (err instanceof StaleRun) abort.abort("HQ handed the task on (lease lost).");
    }
  }, RENEW_EVERY);

  let outcome: RunOutcome;
  try {
    outcome = await runClaude({
      bin: config.bin,
      cwd: dir,
      prompt: [
        `Task ${task.id} (attempt ${task.attempts}), type ${task.type}.`,
        `Payload: ${JSON.stringify(task.payload)}`,
        "Call get_task_packet first, then follow your instructions and return the structured result.",
      ].join("\n"),
      systemPrompt: prompt.text,
      model: config.model,
      tools: [...spec.tools],
      allowedTools: spec.allowed.map(mcpTool),
      mcpConfigPath: mcpPath,
      jsonSchema: schemaFor(task.type),
      maxTurns: spec.maxTurns,
      timeoutMs: spec.timeoutMs,
      transcriptPath: path.join(dir, "transcript.jsonl"),
      signal: abort.signal,
      onProgress: (line) => pending.push(line),
      onRateLimit: (r) => {
        if (r.status !== "allowed" && r.status !== "allowed_warning") pauseUntil(r.resetsAt?.getTime() ?? Date.now() + 30 * MINUTE, `usage limit (${r.status})`);
        else if (r.fiveHour !== null && r.fiveHour >= config.maxUtil && r.resetsAt) pauseUntil(r.resetsAt.getTime(), `5-hour usage at ${Math.round(r.fiveHour * 100)}%, keeping room for you`);
      },
    });
  } finally {
    clearInterval(progressTimer);
    clearInterval(renewTimer);
    rmSync(mcpPath, { force: true });
    current = null;
  }
  await flush();

  try {
    switch (outcome.kind) {
      case "ok": {
        let output = outcome.output;
        if (task.type === "research_batch") {
          const parsed = TASK_RESULTS.research_batch.safeParse(output);
          if (parsed.success) {
            const { result, report } = await checkCitations(parsed.data as ResearchBatchResult);
            output = result;
            if (report.removed.length) log(`Citation check removed ${report.removed.length} of ${report.checked} contact details.`);
          }
        }
        await hq.complete(task.id, fence, output);
        log(`Done in ${Math.round(outcome.durationMs / 1000)}s, ${outcome.turns} turns, ~$${outcome.costUsd.toFixed(2)} of usage.`);
        break;
      }
      case "usage_limit": {
        const until = outcome.resetsAt?.getTime() ?? Date.now() + 30 * MINUTE;
        pauseUntil(until, "usage limit reached");
        await hq.fail(task.id, fence, { error: "Paused for the Claude usage limit.", usageLimit: true, retryAfterMs: Math.max(until - Date.now(), MINUTE) });
        break;
      }
      case "auth":
        await hq.fail(task.id, fence, { error: "Claude Code isn't logged in on the laptop.", retryable: true, retryAfterMs: 10 * MINUTE });
        log("Claude Code isn't logged in. Run `claude`, log in, then start the team again.");
        stopping = true;
        break;
      case "aborted":
        if (stopping) await hq.fail(task.id, fence, { error: "The runner was stopped on the laptop.", retryable: true, retryAfterMs: 0 }).catch(() => undefined);
        log(`Run stopped: ${outcome.message}`);
        break;
      case "capped":
      case "error":
        await hq.fail(task.id, fence, { error: outcome.message, retryable: outcome.kind === "capped" || outcome.retryable });
        log(`Run failed: ${outcome.message}`);
        break;
    }
  } catch (err) {
    if (err instanceof StaleRun) log("HQ had already handed the task on, so this result was dropped.");
    else if (err instanceof BadResult) {
      log(`HQ rejected the result's shape: ${err.message}`);
      await hq.fail(task.id, fence, { error: `Result didn't match its shape: ${err.message}`.slice(0, 1000), retryable: true }).catch(() => undefined);
    } else throw err;
  }
}

async function main() {
  if (!config.key.startsWith("amf_")) {
    console.error("Set AMFIRE_RUNNER_KEY to the runner key from HQ (Signal engine → Set up your Claude → Laptop runner).");
    process.exit(1);
  }
  const version = claudeVersion(config.bin);
  if (!version) throw new Error(`Couldn't run Claude Code at ${config.bin}. Install it, or set CLAUDE_BIN.`);
  claudeVer = version;
  if (!TESTED_VERSIONS.includes(version) && process.env.AMFIRE_TEAM_ALLOW_UNTESTED !== "1") {
    throw new Error(`Claude Code ${version} hasn't been tested with this runner (tested: ${TESTED_VERSIONS.join(", ")}). Set AMFIRE_TEAM_ALLOW_UNTESTED=1 to try anyway.`);
  }
  takeLock();
  const shutdown = () => {
    if (stopping) process.exit(1);
    stopping = true;
    log("Stopping after handing back the current task…");
    current?.abort("The runner was stopped on the laptop.");
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", releaseLock);

  if (!args.has("--skip-self-test")) await selfTest(version);
  log(`amfire team runner ${RUNNER_VERSION} on ${os.hostname()}, HQ ${config.hq}, model ${config.model}. Ctrl+C to stop.`);

  while (!stopping) {
    let pollAfter = 30_000;
    try {
      const beat = await hq.heartbeat({
        version: RUNNER_VERSION,
        host: os.hostname().slice(0, 80),
        claudeVersion: version,
        running: 0,
        capacity: 1,
        ...(pausedUntil > Date.now() ? { pausedUntil: new Date(pausedUntil).toISOString() } : {}),
      });
      pollAfter = beat.pollAfterMs;
      if (pausedUntil > Date.now()) {
        await sleep(Math.min(pausedUntil - Date.now(), MINUTE));
        continue;
      }
      const claim = await hq.claim();
      if (!claim.task) {
        if (args.has("--once")) {
          log("Nothing in the queue.");
          break;
        }
        await sleep(pollAfter);
        continue;
      }
      await runTask(claim as ClaimedTask);
      if (args.has("--once")) break;
    } catch (err) {
      log(`Problem: ${err instanceof Error ? err.message : String(err)}`);
      if (err instanceof Error && err.message.startsWith("HQ refused")) break;
      await sleep(pollAfter);
    }
  }
  releaseLock();
  log("Runner stopped.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  releaseLock();
  process.exit(1);
});
