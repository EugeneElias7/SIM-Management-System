import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';
import { isTest } from '../config/env.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (isTest) {
    next();
    return;
  }
  const startedAt = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level](
      {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      },
      'request completed',
    );
  });
  next();
}
