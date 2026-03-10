import cron from 'node-cron';
import { prisma } from '../db/prisma';
import { agentQueue } from './queue';

// IDX Market Hours (WIB = UTC+7):
//   Pre-market:    08:45 – 09:00 WIB = 01:45 – 02:00 UTC
//   Session 1:     09:00 – 12:00 WIB = 02:00 – 05:00 UTC
//   Session 2:     13:30 – 15:49 WIB = 06:30 – 08:49 UTC
//   Post-market:   15:50 – 16:15 WIB = 08:50 – 09:15 UTC
//
// We run every 15 minutes, Mon–Fri, from 01:45 UTC to 09:15 UTC.
// Default AGENT_CRON_SCHEDULE: "45 1,2,3,4,5,6,7,8,9 * * 1-5" 
// (simplified to "*/15 1-9 * * 1-5" per spec)

// UTC bounds for IDX session (minutes since midnight)
const MARKET_OPEN_UTC_MIN  = 1 * 60 + 45;  //  1:45 UTC = 08:45 WIB
const MARKET_CLOSE_UTC_MIN = 9 * 60 + 15;  //  9:15 UTC = 16:15 WIB

function isMarketHours(): boolean {
  const now = new Date();
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const utcDay = now.getUTCDay(); // 0 = Sun, 6 = Sat
  return utcDay >= 1 && utcDay <= 5 && utcMin >= MARKET_OPEN_UTC_MIN && utcMin <= MARKET_CLOSE_UTC_MIN;
}

export function startScheduler(): void {
  const schedule = process.env.AGENT_CRON_SCHEDULE ?? '*/15 1-9 * * 1-5';

  cron.schedule(
    schedule,
    async () => {
      // Secondary guard: skip if cron fires slightly out of bounds
      if (!isMarketHours()) {
        console.log('[Scheduler] Skipping — outside IDX market hours');
        return;
      }

      console.log('[Scheduler] Market hours: triggering agent run...');

      try {
        const run = await prisma.agentRun.create({
          data: { agentType: 'scheduled', status: 'running' },
        });

        await agentQueue.add(
          'run-agent',
          { agentRunId: run.id },
          {
            jobId: `scheduled-${run.id}`,  // stable ID prevents queue floods
            attempts: 2,
            backoff: { type: 'exponential', delay: 15_000 },
          }
        );

        console.log(`[Scheduler] Queued agent run: ${run.id}`);
      } catch (err) {
        console.error('[Scheduler] Failed to queue agent run:', err);
      }
    },
    {
      timezone: 'UTC',
      scheduled: true,
    }
  );

  console.log(`[Scheduler] Started — cron: "${schedule}" (UTC), IDX hours: 08:45–16:15 WIB`);
}
