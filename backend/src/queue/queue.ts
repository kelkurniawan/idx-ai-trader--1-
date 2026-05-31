import { Queue, Worker, QueueEvents } from 'bullmq';
import { runAgentPipeline } from '../agent/pipeline';

// ─── Connection ───────────────────────────────────────────────
// Build a full ioredis connection from REDIS_URL so it works with hosted
// providers like Upstash: include auth (username/password) and TLS for
// rediss:// URLs. `maxRetriesPerRequest: null` is REQUIRED by BullMQ.
function buildConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    return { host: 'localhost', port: 6379, maxRetriesPerRequest: null as null };
  }
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null as null,
  };
}

const connection = buildConnection();

export const agentQueue = new Queue('agent-runs', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 15_000 },
    removeOnComplete: { count: 50 },
    removeOnFail:     { count: 20 },
  },
});

// ─── Worker: single concurrency to prevent parallel DB writes ─
const worker = new Worker(
  'agent-runs',
  async (job) => {
    const { agentRunId } = job.data as { agentRunId: string };
    console.log(`[Queue] Processing job ${job.id} — agentRunId: ${agentRunId}`);
    await runAgentPipeline(agentRunId);
  },
  {
    connection,
    concurrency: 1,  // one agent run at a time
  }
);

// ─── Worker event listeners ───────────────────────────────────
worker.on('completed', (job) => {
  console.log(`[Queue] ✅ Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Queue] ❌ Job ${job?.id} failed:`, err.message);
});

// ─── Queue events (for monitoring) ───────────────────────────
const queueEvents = new QueueEvents('agent-runs', { connection });

queueEvents.on('waiting', ({ jobId }) =>
  console.log(`[Queue] Job ${jobId} waiting`)
);

export { worker };
