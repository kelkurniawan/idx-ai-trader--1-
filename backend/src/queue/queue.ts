import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedis } from '../cache/redis';
import { runAgentPipeline } from '../agent/pipeline';

const CONNECTION = getRedis();

// ─── Queue definition ─────────────────────────────────────────
export const agentQueue = new Queue('agent-runs', {
  connection: CONNECTION,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 15_000 },
    removeOnComplete: { count: 50 },  // keep last 50 completed jobs
    removeOnFail:     { count: 20 },  // keep last 20 failed jobs
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
    connection: CONNECTION,
    concurrency: 1,  // one agent run at a time
    limiter: {
      max: 1,
      duration: 10_000, // prevent bursting
    },
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
const queueEvents = new QueueEvents('agent-runs', { connection: getRedis() });

queueEvents.on('waiting', ({ jobId }) =>
  console.log(`[Queue] Job ${jobId} waiting`)
);

export { worker };
