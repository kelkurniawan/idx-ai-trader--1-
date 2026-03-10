import morgan from 'morgan';
import { Request, Response } from 'express';

// Custom token: response time in ms
morgan.token('response-time-ms', (_req: Request, res: Response) => {
  const start = (res as any).__startTime;
  if (!start) return '-';
  return `${Date.now() - start}ms`;
});

/**
 * HTTP request logger.
 * Dev:  coloured, human-readable (tiny format)
 * Prod: JSON-structured for log aggregators (e.g. Datadog, CloudWatch)
 */
export const requestLogger = morgan(
  process.env.NODE_ENV === 'production'
    ? (tokens, req, res) => JSON.stringify({
        level: 'INFO',
        method:  tokens.method(req, res),
        url:     tokens.url(req, res),
        status:  tokens.status(req, res),
        ms:      tokens['response-time'](req, res),
        ip:      tokens['remote-addr'](req, res),
        ts:      new Date().toISOString(),
      })
    : 'dev'
);
