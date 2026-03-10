import { Request, Response, NextFunction } from 'express';

/**
 * Global error boundary.
 * Catches any error passed via next(err) and returns a clean JSON response.
 * Never exposes raw stack traces in production.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction        // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  const status: number = typeof err.status === 'number' ? err.status : 500;
  const isDev = process.env.NODE_ENV !== 'production';

  // Log full error in all environments (structured for log aggregators)
  console.error(JSON.stringify({
    level: 'ERROR',
    method: req.method,
    path: req.path,
    status,
    message: err.message,
    stack: isDev ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  }));

  const body: Record<string, unknown> = {
    error: status === 500 ? 'Internal server error' : err.message,
  };

  // Only expose stack in development
  if (isDev && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}
