import { Router, Request, Response, NextFunction } from 'express';
import { requireJwt, requireRole } from '../../middleware/auth';
import { adminLimiter } from '../../middleware/rateLimiter';
import { agentQueue } from '../../queue/queue';
import { prisma } from '../../db/prisma';

const router = Router();

// All admin routes: strict rate limiting + JWT admin role
router.use(adminLimiter, requireJwt, requireRole('admin'));

/**
 * @swagger
 * /news/agent/trigger:
 *   post:
 *     summary: Manually trigger an agent run
 *     description: Creates a new AgentRun record and queues a BullMQ job to run the full pipeline. Requires admin JWT.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Agent job accepted and queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Agent queued" }
 *                 agentRunId: { type: string, format: uuid }
 *                 jobId: { type: string }
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: JWT role is not admin
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/agent/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await prisma.agentRun.create({
      data: { agentType: 'manual_trigger', status: 'running' },
    });

    const job = await agentQueue.add(
      'run-agent',
      { agentRunId: run.id },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      }
    );

    res.status(202).json({
      message: 'Agent queued',
      agentRunId: run.id,
      jobId: job.id,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @swagger
 * /news/agent/status:
 *   get:
 *     summary: Get recent agent run statuses
 *     description: Returns the last 10 AgentRun records with token usage and cost data. Requires admin JWT.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Array of recent AgentRun records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AgentRun'
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: JWT role is not admin
 */
router.get('/agent/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(50, parseInt((req.query.limit as string) ?? '10', 10) || 10);
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    res.json(runs);
  } catch (e) {
    next(e);
  }
});

export { router as adminRouter };
