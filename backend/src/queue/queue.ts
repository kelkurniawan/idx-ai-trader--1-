import { Queue, Worker, QueueEvents } from 'bullmq';
import { runAgentPipeline } from '../agent/pipeline';

// ─── Queue definition ─────────────────────────────────────────
const connection = {
  host: process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : 'localhost',
  port: process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || '6379') : 6379,
};

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
