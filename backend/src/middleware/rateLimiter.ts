import rateLimit from 'express-rate-limit';

/**
 * Public news endpoints: 120 req/min per IP
 * Generous enough for frontend pagination but blocks scrapers
 */
export const publicLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
  skipSuccessfulRequests: false,
});

/**
 * Admin endpoints (agent trigger/status): 20 req/min per IP
 * Strict limit — these endpoints are for operators only
 */
export const adminLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests.' },
});
