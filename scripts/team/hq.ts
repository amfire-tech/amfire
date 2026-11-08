// The runner's line to HQ (/api/team), with the runner key.

export type ClaimedTask = {
  task: { id: string; type: "research_batch" | "message_pack"; payload: Record<string, unknown>; attempts: number; maxAttempts: number };
  fence: number;
  runKey: string;
};

/** HQ says this run no longer holds the task: drop the result. */
export class StaleRun extends Error {}
/** HQ says the result doesn't match the task's shape. */
export class BadResult extends Error {}

export function hqClient(baseUrl: string, runnerKey: string) {
  async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
    let lastError: unknown;
    // Network blips (laptop waking, Wi-Fi switching) get three tries.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${baseUrl}/api/team`, {
          method: "POST",
          headers: { Authorization: `Bearer ${runnerKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...body }),
          signal: AbortSignal.timeout(70_000),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 409) throw new StaleRun(json.error ?? "Stale run.");
        if (res.status === 422) throw new BadResult(json.error ?? "Result rejected.");
        if (res.status === 401 || res.status === 403) throw new Error(`HQ refused the runner key (${res.status}): ${json.error ?? ""}. Create a new one in HQ → Signal engine → Set up your Claude.`);
        if (!res.ok) throw new Error(`HQ ${action} failed (${res.status}): ${json.error ?? ""}`);
        return json as T;
      } catch (err) {
        if (err instanceof StaleRun || err instanceof BadResult || (err instanceof Error && err.message.startsWith("HQ refused"))) throw err;
        lastError = err;
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    throw lastError;
  }
  return {
    heartbeat: (info: Record<string, unknown>) => call<{ ok: boolean; queued: number; pollAfterMs: number }>("heartbeat", info),
    claim: (types?: string[]) => call<ClaimedTask | { task: null }>("claim", types ? { types } : {}),
    renew: (taskId: string, fence: number) => call<{ leaseExpiresAt: string }>("renew", { taskId, fence }),
    progress: (taskId: string, fence: number, lines: string[]) => call("progress", { taskId, fence, lines }),
    complete: (taskId: string, fence: number, output: Record<string, unknown>) => call("complete", { taskId, fence, output }),
    fail: (taskId: string, fence: number, f: { error: string; retryable?: boolean; retryAfterMs?: number; usageLimit?: boolean }) => call("fail", { taskId, fence, ...f }),
  };
}
