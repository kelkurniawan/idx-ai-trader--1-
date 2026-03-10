import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { newsRouter } from './api/news/news.router';
import { adminRouter } from './api/admin/admin.router';
import { publicLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { setupSwagger } from './swagger/swagger';
import { startScheduler } from './queue/scheduler';

// ─── App setup ────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// ─── Global middleware ────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

// ─── Health check (no auth, no rate limit) ────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sahamgue-news-api',
    timestamp: new Date().toISOString(),
  });
});

// ─── Swagger UI (no auth required) ───────────────────────────
setupSwagger(app);

// ─── News routes ──────────────────────────────────────────────
app.use('/api/news', publicLimiter, newsRouter);

// ─── Admin routes (JWT + admin role enforced in router) ───────
app.use('/api/news', adminRouter);

// ─── 404 handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error boundary ───────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  SahamGue News API running on http://localhost:${PORT}`);
  console.log(`📖  Swagger docs: http://localhost:${PORT}/api/docs`);
  console.log(`💊  Health check: http://localhost:${PORT}/health`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV ?? 'development'}\n`);

  // Start IDX market hours cron scheduler
  startScheduler();
});

export default app;
