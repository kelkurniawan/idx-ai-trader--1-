import { runAgentPipeline } from '../agent/pipeline';

// ─── Background agent runner (no BullMQ) ──────────────────────
// We intentionally avoid BullMQ/Redis for the agent here. On a free, sleeping
// Render instance, BullMQ's worker constantly polls Redis (draining the Upstash
// free command quota) and its blocking connections hang the process. Instead we
// run the pipeline in the background of the Node process — the external trigger
// (GitHub Actions / cron) keeps the instance awake for the short run.
//
// A single in-process flag enforces concurrency:1 (one run at a time), mirroring
// the previous BullMQ worker behavior. Dedup still uses Redis via cache/redis.ts,
// which connects correctly from the full REDIS_URL.

let running = false;

export function isAgentRunning(): boolean {
  return running;
}

/**
 * Fire-and-forget: start the agent pipeline in the background.
 * Returns { started } — false if a run is already in progress (so callers can
 * respond immediately without queuing a duplicate run).
 */
export function runAgentInBackground(agentRunId: string): { started: boolean } {
  if (running) {
    return { started: false };
  }
  running = true;
  void runAgentPipeline(agentRunId)
    .catch((err) => console.error('[Agent] Background run failed:', err))
    .finally(() => {
      running = false;
    });
  return { started: true };
}
